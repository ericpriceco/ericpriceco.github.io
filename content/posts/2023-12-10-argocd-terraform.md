---
title: Setup ArgoCD using Terraform and ALB Controller
date: 2023-12-10 11:00:00 -0700
tags:
    - kubernetes
    - terraform
    - argocd
keywords:
    - kubernetes
    - terraform
    - argocd
---

This is a guide to getting started with ArgoCD using Terraform and the AWS LB controller as the ingress. You can see my guide [here](https://eric-price.net/posts/2023-12-03-aws-load-balancer-controller/) on how to setup and use the ALB controller. I'm going to go through the Terraform code and a demo app to deploy to your K8s cluster through ArgoCD.
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

provider "kubectl" {
  apply_retry_count      = 5
  host                   = module.eks-cluster.endpoint
  cluster_ca_certificate = base64decode(module.eks-cluster.certificate)
  load_config_file       = false

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    # This requires the awscli to be installed locally where Terraform is executed
    args = ["eks", "get-token", "--cluster-name", module.eks-cluster.name]
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
    kubectl = {
      source  = "alekc/kubectl"
      version = "~> 2.0.3"
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

Initialize the module where needed. Here we're installing ArgoCD to your K8s cluster through Helm and providing a values file through the templatefile function so we can have variable subsitution. In this demo, I'm using a public LB; however, if possible, stick it behind an internal LB with access by VPN.

```terraform
module "argocd" {
  source            = "../../modules/argocd"
  name              = "argocd"
  env               = local.env
  region            = local.region
  argocd_version    = "3.35.4"
  loadbalancer_dns  = module.public_loadbalancer.dns_name
  fqdn              = "argocd.sandbox.demo"
}
```

## Module files

### main.tf
```terraform
resource "helm_release" "argocd" {
  namespace        = "argocd"
  create_namespace = true
  name             = "argo-cd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.argocd_version
  values = ["${templatefile("../../modules/argocd/files/values.yaml", {
    ENV     = var.env
    FQDN    = var.fqdn
    LB_NAME = "${var.env}-public-application"
  })}"]
}
```

In this values file, we're running a basic HA setup and using the ALB controller for the ingress. This example is using a shared LB by setting the "group.name" annotation and creates two LB rules for HTTP and GRPC traffic as recommended by the ArgoCD docs when using an ALB. Also take note of the node affinity to my core node group since we don't want these pods shifted to nodes managed by Karpenter.

### values.yaml
```yaml
redis-ha:
  enabled: true
controller:
  replicas: 1
server:
  replicas: 2
  ingress:
    enabled: true
    ingressClassName: alb
    hosts:
      - ${FQDN}
    annotations:
      alb.ingress.kubernetes.io/backend-protocol: HTTPS
      alb.ingress.kubernetes.io/group.name: ${LB_NAME}
      alb.ingress.kubernetes.io/healthcheck-interval-seconds: "30"
      alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
      alb.ingress.kubernetes.io/load-balancer-attributes: routing.http2.enabled=true
      alb.ingress.kubernetes.io/load-balancer-name: ${LB_NAME}
      alb.ingress.kubernetes.io/scheme: internet-facing
      alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-FS-1-2-2019-08
      alb.ingress.kubernetes.io/tags: "env=${ENV},terraform=true"
      alb.ingress.kubernetes.io/target-type: ip
  ingressGrpc:
    enabled: true
    isAWSALB: true
    awsALB:
      serviceType: ClusterIP
      backendProtocolVersion: GRPC
    hosts:
      - ${FQDN}
repoServer:
  replicas: 2
applicationSet:
  replicas: 2
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: role
          operator: In
          values:
          - core
```

Change this to your DNS provider.

### dns.tf
```terraform
resource "cloudflare_record" "argocd" {
  zone_id         = "your_zone_id"
  name            = "argocd.${var.env}"
  value           = var.loadbalancer_dns
  type            = "CNAME"
  ttl             = 3600
  allow_overwrite = true
}
```


## Demo App

Once it's installed to your K8s cluster, you should be able to reach the login page of ArgoCD. The admin password is generated during the install and saved to a K8s secret that can be obtained by running the command below. For security, it's recommended to delete the secret once you have it.
```bash
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 --decode
```

This demo app is a Helm chart in a github repo and we're going to use Terraform to apply the Application manifest for ArgoCD to manage.

### main.tf
```terraform
resource "kubectl_manifest" "argocd_app" {
  yaml_body = templatefile("../../modules/guestbook/files/app_manifest.yaml", {
    ENV = var.env
  })
}
```

### app_manifest.yaml
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    path: helm-guestbook
    targetRevision: HEAD
  destination:
    server: "https://kubernetes.default.svc"
    namespace: ${ENV}
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=false
      - Validate=true
```

After you apply it via Terraform, you should see the app in the ArgoCD dashboard immediately, where it will then install to the local K8s cluster and sync any changes made from the project repo.
