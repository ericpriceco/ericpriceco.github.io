---
title: Use AWS IAM role in Github Actions
date: 2023-12-11 15:00:00 -0700
tags:
    - aws
    - terraform
    - github-actions
keywords:
    - aws
    - terraform
    - github-actions
---

This post will describe how to use AWS's OIDC identity provider to give Github action workflows access to AWS resources. I'll use Terraform to set this up on AWS and an example GHA workflow to build and push a Docker image.

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
```

### versions.tf
```terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = "~> 1.5.7"
}
```

## Module

Initialize the module where needed.

```terraform
module "github_actions" {
  source = "../../modules/github_actions"
  env    = local.env
}
```

## Module files

Here we're creating the OpenID provider for the GHA url and automatically getting the thumbprint using the TLS data source. You will need to set your Github org in the assume role policy and you could be more specific by giving a specific repo and/or branch. This example is only for building images and pushing to ECR, so you may need to adjust it for your needs.

### iam.tf
```terraform
locals {
  irsa_oidc_provider_url = replace(aws_iam_openid_connect_provider.gha.arn, "/^(.*provider/)/", "")
  account_id             = data.aws_caller_identity.current.account_id
}

resource "aws_iam_openid_connect_provider" "gha" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.gha.certificates[0].sha1_fingerprint]
  url             = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.gha.arn]
    }
    condition {
      test     = "StringLike"
      variable = "${local.irsa_oidc_provider_url}:sub"
      values   = ["repo:<github-org>/*"]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.irsa_oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "gha" {
  name               = "github-actions-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  managed_policy_arns = [
    aws_iam_policy.gha.arn
  ]
}

resource "aws_iam_policy" "gha" {
  name        = "github-actions-${var.env}"
  description = "Policy for Github actions"
  policy      = data.aws_iam_policy_document.policy.json
}

data "aws_iam_policy_document" "policy" {
  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart"
    ]
    resources = [
      "arn:aws:ecr:*:${data.aws_caller_identity.current.account_id}:repository/*"
    ]
  }
  statement {
    actions = [
      "ecr:GetAuthorizationToken"
    ]
    resources = [
      "*"
    ]
  }
}
```

### data.tf
```terraform
data "aws_caller_identity" "current" {}

data "tls_certificate" "gha" {
  url = "https://token.actions.githubusercontent.com"
}
```

### variables.tf
```terraform
variable "env" {}
```

## Github Action Workflow

In this workflow example, we're using the "configure-aws-credentials" provider to specify the role ARN to assume that was created earlier and the ECR login step will automatically used the credentials from the previous step.

```yaml
name: Build and Push to ECR
on:
  push:
    branches: [ main ]
env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: image-app
  IMAGE_TAG: latest
permissions:
      id-token: write
      contents: read
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    - name: configure aws credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: arn:aws:iam::111111111111:role/github-actions-sandbox
        aws-region: ${{ env.AWS_REGION }}
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ env.IMAGE_TAG }}
```
