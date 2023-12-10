---
title: External secrets and AWS Secrets Manager with Kubernetes
date: 2023-12-03 13:00:00 -0700
tags:
    - kubernetes
    - terraform
    - secrets-manager
    - external-secrets
keywords:
    - kubernetes
    - terraform
    - secrets-manager
    - external-secrets
---

In this post, I'm going to describe how to sync secrets from AWS Secrets Manager to Kubernetes with example Terraform and Kubernetes manifests. I'll be using the [External Secrets Operator](https://external-secrets.io/latest/) to pull and create secrets and [Reloader](https://github.com/stakater/Reloader/tree/master) to restart pods when a secret has changed.

Another option out there is the [Kubernetes Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/) with the [AWS Secrets Store CSI Provider](https://github.com/aws/secrets-store-csi-driver-provider-aws); however, I found limitations with this solution. As of writing this, there is no way to have it automatically update the K8s secret it creates when it's updated in Secrets Manager. It automatically updates the secret volume mounted on the pod, but if you want to set environment variables, you need to rely on the K8s secret it creates and doesn't update. Plus I like the cleaner non-volume method from External Secrets Operator.


All the referenced Terraform code can be obtained [here](https://github.com/eric-price/terraform_modules).

## Providers/Versions

I'm using the EKS module for the endpoint in these providers and you can see how that's setup in the modules repo referenced earlier.

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

## Helm

The "count" here is where it can be enabled or not through the EKS module and can be removed. One thing to highlight for reloader is I'm telling it to watch a specific namespace for changes.

```terraform
resource "helm_release" "external_secrets_operator" {
  count            = var.addons["external_secrets"]["enable"] ? 1 : 0
  namespace        = "external-secrets"
  create_namespace = true
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = var.addons["external_secrets"]["version"]
  depends_on = [
    aws_eks_node_group.core
  ]
}

resource "helm_release" "reloader" {
  namespace        = var.env
  create_namespace = false
  name             = "stakater"
  repository       = "https://stakater.github.io/stakater-charts"
  chart            = "reloader"
  version          = var.addons["reloader"]["version"]
  set {
    name = "reloader.namespaceSelector"
    value = var.env
  }
  depends_on = [
    aws_eks_node_group.core
  ]
}
```

## IAM

The service/app that will be consuming these secrets will need access to said secrets. One of the best ways to do this is to assume an IAM role for that app via OIDC. How to do that is described [here](https://eric-price.net/posts/2023-11-30-eks-oidc-provider/).

Example IAM role and policy with access to its specific secret:
```terraform
locals {
  irsa_oidc_provider_url = replace(var.irsa_oidc_provider_arn, "/^(.*provider/)/", "")
  account_id             = data.aws_caller_identity.current.account_id
}

data "aws_iam_policy_document" "assume_role" {
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
      values   = ["system:serviceaccount:${var.env}:${var.name}"]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.irsa_oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "role" {
  name               = "${var.name}-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  managed_policy_arns = [
    aws_iam_policy.role.arn
  ]
  tags = {
    service   = var.name
  }
}

resource "aws_iam_policy" "role" {
  name = "${var.name}-${var.env}"
  policy = jsonencode({
    Version : "2012-10-17",
    Statement : [
      {
        Effect : "Allow",
        Action : [
          "s3:GetObject",
          "s3:ListBucket",
        ],
        Resource : [
          "${module.s3_bucket.arn}/*",
          module.s3_bucket.arn
        ]
      },
      {
        Effect : "Allow",
        Action : ["secretsmanager:GetSecretValue"],
        Resource : [
          "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:${var.env}/image-app-??????"
        ]
      },
    ]
  })
}
```

## K8s manifests

Here we're creating a SecretStore for this app that uses its own serviceAccount, which is setup for OIDC IAM authentication. Next, we have the ExternalSecret that's pulling two values out of a json based secret on Secrets Manager called "sandbox/image-app" with a refresh interval of 5 minutes.


### SecretStore
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: image-app
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: image-app
```

### ExternalSecret
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: "image-app"
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: image-app
    kind: SecretStore
  target:
    name: image-app
    creationPolicy: Owner
  data:
  - secretKey: db_user
    remoteRef:
      key: "sandbox/image-app"
      property: db_user
  - secretKey: db_password
    remoteRef:
      key: "sandbox/image-app"
      property: db_password
```

Here's a stripped down deployment manifest where I'm creating environment variables for the two values in the "image-app" secret. Take a note of the annotations on this deployment. We're telling Reloader to keep an eye on the "image-app" secret, so when the secret is updated or rotated, Reloader will perform a restart on this app. Hopefully you have your rolling update strategies and pod disruption budgets set to your liking.

### deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-app
  namespace: sandbox
  annotations:
    secret.reloader.stakater.com/reload: image-app
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: image-app
      app.kubernetes.io/instance: image-app
  template:
    metadata:
      labels:
        helm.sh/chart: image-app-0.1.0
        app.kubernetes.io/version: "1.0.0"
        app.kubernetes.io/managed-by: Helm
        app.kubernetes.io/name: image-app
        app.kubernetes.io/instance: image-app
    spec:
      serviceAccountName: image-app
      containers:
        - name: image-app
          securityContext:
            {}
          image: "image_app:v1.0.0"
          env:
            - name: REGION
              value: "us-east-1"
            - name: DBUSER
              valueFrom:
                secretKeyRef:
                  name: "image-app"
                  key: db_user
            - name: DBPASSWORD
              valueFrom:
                secretKeyRef:
                  name: "image-app"
                  key: db_password
```
