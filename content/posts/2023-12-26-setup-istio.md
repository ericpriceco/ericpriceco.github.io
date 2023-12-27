---
title: Istio Service Mesh with Cert-Manager and AWS Load Balancer Controller
date: 2023-12-26 11:00:00 -0700
tags:
    - istio
    - cert-manager
    - kubernetes
    - aws
keywords:
    - istio
    - cert-manager
    - kubernetes
    - aws
---

In this post, I'm going to go through the steps to setup the Istio service mesh using Terraform. Cert-manager is used to fetch LetsEncrypt SSL certificates and Istio will use the AWS Load Balancer Controller to spin up a network LB. Using a service mesh like Istio is going to give us flexibility with traffic routing, observability metrics with service-to-service communication going through Istio's gateway and security with its authorization policies.

Cert-manager and the AWS Load Balancer controller will need to be installed beforehand to use the demo app or example Istio ingress gateways. You can see how to set those up [here](https://eric-price.net/posts/2023-12-20-cert-manager/) and [here](https://eric-price.net/posts/2023-12-03-aws-load-balancer-controller/). If you're not on AWS, you should be able to swap out the annotations on the gateways.

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

To get the Istios sidecar proxy to automatically inject itself for all our pods in a specific namespace, we can label our namespace like so:

```terraform
resource "kubernetes_namespace" "env" {
  metadata {
    name = var.env
    labels = {
      istio-injection = "enabled"
    }
  }
}
```

## Module

Initialize the module where needed. The list of domains will be used by the cluster SSL certs further below.

```terraform
module "istio" {
  source        = "../../aws/eks-addons/istio"
  cluster_name  = aws_eks_cluster.cluster.name
  env           = var.env
  istio_version = "1.20.1"
  domains       = ["*.${local.env}.example.com"]
  depends_on = [
    aws_eks_node_group.core
  ]
}
```

## Module files

Here we're installing the base Istio helm chart that consists of CRD's required before installing other components. We're setting the defaultRevision value to default as recommended by the docs. Next is IstioD that is the service discovery component and setting a nodeaffinity to make sure it stays on my core nodes.

### main.tf
```terraform
resource "helm_release" "istio" {
  namespace        = "istio-system"
  create_namespace = true
  name             = "istio-base"
  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "base"
  version          = var.istio_version

  values = [
    <<-EOT
    defaultRevision: default
    EOT
  ]
}

resource "helm_release" "istiod" {
  namespace        = "istio-system"
  create_namespace = true
  name             = "istiod"
  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "istiod"
  version          = var.istio_version
  depends_on       = [helm_release.istio]

  values = [
    <<-EOT
    pilot:
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
}
```

These two resources are the ingress gateways that, in this case, will setup two network load balancers using the AWS Load Balancer controller. Having workloads that can be either public or internal use, I'm creating both LB's here. There are several more annotations values that can be found [here](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.6/guide/service/annotations/).

One thing to note is the label being applied to each ingress controller. These will be referenced when creating a Gateway later.

```terraform
resource "helm_release" "istio_ingress_external" {
  namespace        = "istio-ingress"
  create_namespace = true
  name             = "istio-gateway-external"
  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "gateway"
  version          = var.istio_version

  values = [
    <<-EOT
    labels:
      istio: "ingressgateway-external"
    service:
      annotations:
        service.beta.kubernetes.io/aws-load-balancer-name: "${var.env}-network-external"
        service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
        service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
        service.beta.kubernetes.io/aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"
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
  depends_on = [helm_release.istiod]
}

resource "helm_release" "istio_ingress_internal" {
  namespace        = "istio-ingress"
  create_namespace = false
  name             = "istio-gateway-internal"
  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "gateway"
  version          = var.istio_version

  values = [
    <<-EOT
    labels:
      istio: "ingressgateway-internal"
    service:
      annotations:
        service.beta.kubernetes.io/aws-load-balancer-name: "${var.env}-network-internal"
        service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
        service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
        service.beta.kubernetes.io/aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"
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
    helm_release.istiod,
    helm_release.istio_ingress_external
  ]
}
```

For TLS termination on our applications, I'm creating two cluster wide certificates; one for staging/testing and one for production. This will use cert-manager to fetch LetsEncrypt certificates and create a keypair secret that will be mounted on the Gateway.

### manifests.tf
```terraform
locals {
  certs          = ["prod", "staging"]
  load_balancers = ["external", "internal"]
}

resource "kubectl_manifest" "cluster_certs" {
  for_each = { for cert in local.certs : cert => cert }
  yaml_body = templatefile("../../modules/aws/eks-addons/istio/files/cluster_cert.yaml.tftpl", {
    DOMAINS = var.domains
    TYPE    = each.value
  })
  depends_on = [
    helm_release.istio_ingress_external,
    helm_release.istio_ingress_internal
  ]
}
```

Two shared Gateways are being created, each for the external and internal load balancers.

```terraform
resource "kubectl_manifest" "gateways" {
  for_each = { for lb in local.load_balancers : lb => lb }
  yaml_body = templatefile("../../modules/aws/eks-addons/istio/files/gateways.yaml.tftpl", {
    DOMAINS = var.domains
    LB      = each.value
  })
  depends_on = [
    helm_release.istio_ingress_external,
    helm_release.istio_ingress_internal
  ]
}
```

### cluster_cert.yaml.tftpl
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: letsencrypt-${TYPE}
  namespace: istio-ingress
spec:
  secretName: letsencrypt-${TYPE}
  dnsNames:
  %{ for domain in DOMAINS ~}
  - "${domain}"
  %{ endfor ~}
  issuerRef:
    name: letsencrypt-${TYPE}
    kind: ClusterIssuer
```

### gateway.yaml.tftpl

This is our Gateway manifest that will manage inbound/outbound traffic for the cluster. In this example, HTTP traffic will be redirected to HTTPS and we're setting the SSL cert created earlier.

The selector value is pointing the gateway to the specific Ingress Gateway Controller created earlier.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: gateway-${LB}
  namespace: istio-ingress
spec:
  selector:
    istio: ingressgateway-${LB}
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: letsencrypt-cert-prod
    hosts:
  %{ for domain in DOMAINS ~}
    - "${domain}"
  %{ endfor ~}
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
  %{ for domain in DOMAINS ~}
    - "${domain}"
  %{ endfor ~}
```

### variables.tf
```terraform
variable "cluster_name" {
  type = string
}
variable "env" {
  type = string
}
variable "istio_version" {
  type = string
}
variable "domains" {
  type = list(string)
}
```

## Demo

Instead of the typical Ingress manifest, we will instead create a VirtualService that sends traffic to our app and binds to a named gateway created earlier. In the VirtualService, we can finely tune routing; however, in this example, I just want all traffic to reach my one endpoint and send it to my service "demo-app" listening on port 8000. For any existing apps, they will need to be restarted for the proxy sidecar container to automatically inject itself.

Since the shared gateway was installed to the istio-ingress namespace, I'm specifying the exact location with the namespace.

### ingress.yaml
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: demo-app
  namespace: sandbox
spec:
  hosts:
  - "demo.sandbox.example.com"
  gateways:
  - istio-ingress/gateway-external
  http:
  - match:
    - uri:
        exact: /
    route:
    - destination:
        host: demo-app
        port:
          number: 8000
```
