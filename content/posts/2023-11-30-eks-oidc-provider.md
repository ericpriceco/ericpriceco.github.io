---
title: IAM roles with Kubernetes service accounts using EKS OIDC provider
date: 2023-11-30 19:00:00 -0700
tags:
    - eks
    - iam
    - terraform
keywords:
    - eks
    - iam
    - terraform
---

In this post, I'm going to describe how to setup the OIDC provider in AWS and use IAM roles on Kubernetes service accounts. This will allow your services to access AWS resources using roles instead of access keys. No need for user accounts or key rotations! I'm going to go through all the Terraform code, but it can be referenced [here](https://github.com/eric-price/terraform_modules) in the EKS module. This doesn't cover setting up an EKS cluster; however, you can see how to do that [here](https://eric-price.net/posts/2023-11-16-eks-terraform-module/).

After creating your EKS cluster, setting up the OIDC provider is easy and after creating this, you can locate in on the IAM console page. Look for providers.
```terraform
data "tls_certificate" "cluster" {
  url = aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = data.tls_certificate.cluster.url
}
```

Next I'm going to through an example app that uses a role with the OIDC provider. Here the OIDC provider is allowed to assume the role and a basic policy that allows access to an s3 bucket.

data.tf
```terraform
data "aws_caller_identity" "current" {}
```

iam.tf
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
    "Version" : "2012-10-17",
    "Statement" : [
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
      }
    ]
  })
}
```

The next step is to tell our Kubernetes service account to use this specific role when accessing AWS resources by adding an annotation with the ARN of the role we just created.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: test-app
  namespace: sandbox
  labels:
    helm.sh/chart: test-app-0.1.0
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: test-app
    app.kubernetes.io/instance: test-app
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account_id>:role/test-app-sandbox
automountServiceAccountToken: true
```
