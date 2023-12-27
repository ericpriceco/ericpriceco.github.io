---
title: Setup Cert-Manager and Cloudflare
date: 2023-12-20 19:00:00 -0700
tags:
    - eks
    - cert-manager
    - terraform
keywords:
    - eks
    - cert-manager
    - terraform
---

In this guide, I'm going to describe how to setup Cert-Manager on EKS with Terraform and DNS validation on Cloudflare. I will also provide an example of how to request a certificate on your ingress manifest.
All the referenced Terraform code can be obtained [here](https://github.com/eric-price/terraform_modules).

These are the providers that we'll be using in the environment. You may need to adjust how the helm and kubectl providers are getting the cluster name and token for your environment.

## Providers/Versions

### providers.tf
```terraform
locals {
  env    = "sandbox"
  region = "us-east-1"
}

provider "aws" {
  region = local.region
  default_tags {
    tags = {
      env       = local.env
      terraform = true
    }
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks-cluster.endpoint
    cluster_ca_certificate = base64decode(module.eks-cluster.certificate)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      # This requires the awscli to be installed locally where Terraform is executed
      args        = ["eks", "get-token", "--cluster-name", module.eks-cluster.name]
      command     = "aws"
    }
  }
}
```

### versions.tf
```terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11.0"
    }
  }
  required_version = "~> 1.5.7"
}
```

## Module

Initialize the module where needed.

```terraform
module "cert_manager" {
  source               = "../../aws/eks-addons/cert_manager"
  env                  = var.env
  cert_manager_version = "v1.13.3"
}
```

## Module files

Here we're installing cert-manager through Helm and setting a nodeaffinity to my core managed group, so they don't slotted into any nodes created by Karpenter. It's recommended to install the CRD's used by cert-manager separately for production workloads to avoid certificate resources being removed if the Helm release is removed.

In this example, my DNS provider is CloudFlare and creating a secret with the token stored in SecretsManager. When a certificate is requested, you can show ownership through DNS or HTTP and in this example, its using the CloudFlare provider to prove ownership. The plus side to the DNS method is the ability to get wildcard certifcates.

Next we're creating two cluster issuers; one for testing (staging) and one for non-testing (prod). The staging endpoint will give non-official certificates without an API limit for testing.

### main.tf

```terraform
resource "helm_release" "cert_manager" {
  namespace        = "cert-manager"
  create_namespace = true
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = var.cert_manager_version
  values = [
    <<-EOT
    installCRDs: false
    affinity:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: role
              operator: In
              values:
              - core
    EOT
  ]
  depends_on = [
    kubectl_manifest.crds
  ]
}

data "http" "crd_manifest" {
  url = "https://github.com/cert-manager/cert-manager/releases/download/${var.cert_manager_version}/cert-manager.crds.yaml"
}

locals {
  crd_manifests = split("---", data.http.crd_manifest.response_body)
}

resource "kubectl_manifest" "crds" {
  count     = length(local.crd_manifests)
  yaml_body = element(local.crd_manifests, count.index)
}

resource "kubernetes_secret" "cloudflare_token" {
  metadata {
    name      = "cloudflare-api-token-secret"
    namespace = "cert-manager"
  }
  data = {
    api-token = jsondecode(data.aws_secretsmanager_secret_version.cloudflare_api_token.secret_string)["cert-manager"]
  }
  depends_on = [
    helm_release.cert_manager
  ]
}

resource "kubectl_manifest" "cluster_issuer_test" {
  yaml_body = <<-YAML
  apiVersion: cert-manager.io/v1
  kind: ClusterIssuer
  metadata:
    name: letsencrypt-test
    namespace: cert-manager
  spec:
    acme:
      email: your@email
      server: https://acme-staging-v02.api.letsencrypt.org/directory
      privateKeySecretRef:
        name: letsencrypt-staging
      solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token-secret
              key: api-token
  YAML

  depends_on = [
    kubernetes_secret.cloudflare_token,
    helm_release.cert_manager
  ]
}

resource "kubectl_manifest" "cluster_issuer" {
  yaml_body = <<-YAML
  apiVersion: cert-manager.io/v1
  kind: ClusterIssuer
  metadata:
    name: letsencrypt
    namespace: cert-manager
  spec:
    acme:
      email: your@email
      server: https://acme-v02.api.letsencrypt.org/directory
      privateKeySecretRef:
        name: letsencrypt-prod
      solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token-secret
              key: api-token
  YAML

  depends_on = [
    kubernetes_secret.cloudflare_token,
    helm_release.cert_manager
  ]
}
```

### data.tf
```terraform
data "aws_secretsmanager_secret" "cloudflare_api_token" {
  name = "cloudflare-api-token"
}

data "aws_secretsmanager_secret_version" "cloudflare_api_token" {
  secret_id = data.aws_secretsmanager_secret.cloudflare_api_token.id
}
```

### variables.tf
```terraform
variable "env" {
  type = string
}
variable "cert_manager_version" {
  type = string
}
```

## Demo

Here we're creating an ingress using the test cluster issuer. By setting the cert-manager annotation, it will discover this and automatically create a certificate resource and store the cert keypair in the secret specified in the TLS section.

Once the certificate has a "true" issued status, which can take a minute sometimes, it will create the secret to be used by whichever method you use for TLS.

When testing is done, changing to the prod cluster issuer will give an official letsencrypt cert.

### ingress.yaml
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-test
  name: demo-app
  namespace: sandbox
spec:
  rules:
  - host: demo.sandbox.example.com
    http:
      paths:
      - pathType: Prefix
        path: /
        backend:
          service:
            name: demo-app
            port:
              number: 8000
  tls:
  - hosts:
    - demo.sandbox.example.com
    secretName: demo-sandbox
```
