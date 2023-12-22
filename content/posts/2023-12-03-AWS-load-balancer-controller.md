---
title: Setup AWS Load Balancer Contoller on EKS
date: 2023-12-03 13:00:00 -0700
tags:
    - eks
    - terraform
keywords:
    - eks
    - terraform
---

This post will guide you through installing and using the AWS load balancer controller on EKS with Terraform and an example ingress manifest. I won't go into details how to setup the VPC and EKS cluster; that can be found in my previous posts.
All the referenced Terraform code can be obtained [here](https://github.com/eric-price/terraform_modules).

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

provider "kubernetes" {
  host                   = module.eks-cluster.endpoint
  cluster_ca_certificate = base64decode(module.eks-cluster.certificate)
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

Initialize the module where needed. The "count" here is where it can be enabled or not through the EKS module and can be removed.

```terraform
module "lb-controller" {
  count                  = var.addons["lb_controller"]["enable"] ? 1 : 0
  source                 = "../../aws/eks-addons/lb-controller"
  cluster_name           = var.env
  env                    = var.env
  irsa_oidc_provider_arn = aws_iam_openid_connect_provider.cluster.arn
  controller_version     = var.addons["lb_controller"]["version"]
  depends_on = [
    aws_eks_node_group.core
  ]
}
```

## Module files

Here I'm targeting my "core" node group, so your affinity rule may need to change.

### main.tf
```terraform
resource "helm_release" "lb_controller" {
  namespace        = "kube-system"
  create_namespace = false
  name             = "aws-load-balancer-controller"
  repository       = "https://aws.github.io/eks-charts"
  chart            = "aws-load-balancer-controller"
  version          = var.controller_version

  values = [
    <<-EOT
    clusterName: ${var.cluster_name}
    serviceAccount:
      create: false
      name: aws-load-balancer-controller
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

  depends_on = [kubernetes_service_account.service_account]
}

resource "kubernetes_service_account" "service_account" {
  metadata {
    name      = "aws-load-balancer-controller"
    namespace = "kube-system"
    labels = {
      "app.kubernetes.io/name"      = "aws-load-balancer-controller"
      "app.kubernetes.io/component" = "controller"
    }
    annotations = {
      "eks.amazonaws.com/role-arn"               = aws_iam_role.lb.arn
      "eks.amazonaws.com/sts-regional-endpoints" = "true"
    }
  }
}
```

The IAM policy referenced here is a long one and can be obtained [here](https://github.com/eric-price/terraform_modules/tree/master/aws/eks-addons/lb-controller/files).

### iam.tf
```terraform
locals {
  irsa_oidc_provider_url = replace(var.irsa_oidc_provider_arn, "/^(.*provider/)/", "")
  account_id             = data.aws_caller_identity.current.account_id
}

data "aws_iam_policy_document" "irsa_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.irsa_oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.irsa_oidc_provider_url}:sub"
      values   = ["system:serviceaccount:kube-system:aws-load-balancer-controller"]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.irsa_oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lb" {
  name               = "eks-lb-controller-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role.json
  inline_policy {
    name   = "eks-lb-controller"
    policy = file("../../modules/aws/eks-addons/lb-controller/files/iam_policy.json")
  }
}
```

### data.tf
```terraform
data "aws_caller_identity" "current" {}
```

### variables.tf
```terraform
variable "cluster_name" {
  type = string
}
variable "env" {
  type = string
}
variable "irsa_oidc_provider_arn" {
  type = string
}
variable "controller_version" {
  type = string
}
variable "cert" {
  type = string
}
```

## Demo

There are several annotations in this example and more in the docs to setup the load balancer to your specifications. A few to highlight is "group.name" that will use a shared load balancer or create one if it doesn't exist, the certificate ARN if using SSL, and the scheme, which in this case is creating a public load balancer. This will create the target group for the app as well and the rules section will create the listeners on the load balancer.

### ingress.yaml
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flask-app
  namespace: sandbox
  labels:
    helm.sh/chart: flask-app-0.1.0
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: flask-app
    app.kubernetes.io/instance: flask-app
  annotations:
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/group.name: sandbox-public
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: "30"
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-port: "8000"
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/load-balancer-name: sandbox-public
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-FS-1-2-2019-08
    alb.ingress.kubernetes.io/tags: environment=sandbox
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: <certificate_arn>
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  ingressClassName: alb
  rules:
    - host: app.sandbox.test.site # FQDN
      http:
        paths:
        - path: "/"
          pathType: Prefix
          backend:
            service:
              name: flask-app
              port:
                number: 8000
```
