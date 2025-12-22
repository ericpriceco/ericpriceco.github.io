---
title: Migrate from IRSA to Pod Identity on EKS
date: 2025-12-22 11:00:00 -0700
tags:
    - terraform
    - eks
keywords:
    - terraform
    - eks
---

In this post, I'm going to describe how to migrate from IRSA (IAM Roles for Service Accounts) to the newer EKS Pod Identity. Pod Identity simplifies the authentication between Kubernetes service accounts and IAM roles by removing the need for OIDC provider configuration and service account annotations. Pod Identity is an EKS add-on and runs as a DaemonSet on your cluster and uses the service principal (`pods.eks.amazonaws.com`) to establish that trust between an IAM role and a Kubernetes service account. I've described how to setup IRSA in a previous post [here](https://eric-price.net/posts/2023-11-30-eks-oidc-provider/).

## Prerequisites

Before migrating, ensure you have the EKS Pod Identity Agent addon enabled on your cluster:

```terraform
resource "aws_eks_addon" "pod_identity_agent" {
  cluster_name                = aws_eks_cluster.cluster.name
  addon_name                  = "eks-pod-identity-agent"
  addon_version               = "v1.0.0"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  depends_on = [
    aws_eks_cluster.cluster,
    aws_eks_node_group.core
  ]
}
```

## Migration Steps

### 1. Update IAM Trust Policy

The trust policy changes from OIDC federation to a service principal trust.

**Before (IRSA):**
```terraform
data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    condition {
      test     = "StringEquals"
      variable = "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:sub"
      values   = ["system:serviceaccount:${var.env}:${var.app}"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
    principals {
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}"]
      type        = "Federated"
    }
  }
}
```

**After (Pod Identity):**
```terraform
data "aws_iam_policy_document" "pod_identity_trust" {
  statement {
    sid    = "EKSPodIdentityTrust"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
    actions = [
      "sts:AssumeRole",
      "sts:TagSession"
    ]
  }
}
```

### 2. Update IAM Role

Update your IAM role to use the new trust policy:

```terraform
resource "aws_iam_role" "app" {
  name               = "${var.app}-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_trust.json
  tags = {
    service = var.app
  }
}

resource "aws_iam_role_policy" "app" {
  name = "${var.app}-${var.env}"
  role = aws_iam_role.app.name
  policy = jsonencode({
    Version : "2012-10-17",
    Statement : [
      {
        Effect : "Allow",
        Action : ["secretsmanager:GetSecretValue"],
        Resource : [
          "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:${var.env}/${var.app}-??????"
        ]
      }
    ]
  })
}
```

### 3. Create Pod Identity Association

Add the Pod Identity Association to link your IAM role to your Kubernetes service account:

```terraform
resource "aws_eks_pod_identity_association" "app" {
  cluster_name    = var.eks_cluster
  namespace       = var.env
  service_account = var.app
  role_arn        = aws_iam_role.app.arn
}
```

This resource creates the binding between your cluster, namespace, service account, and IAM role. The EKS Pod Identity Agent handles the credential injection automatically.

## Kubernetes Changes

The good news is that your Kubernetes manifests require minimal changes. With IRSA, you needed to annotate your service account with the role ARN:

**IRSA Service Account:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/my-app-production
```

**Pod Identity Service Account:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
```

The annotation is no longer needed. The Pod Identity Agent uses the association defined in Terraform to determine which role to assume.


4. **External Secrets Operator**: If using External Secrets Operator, update your SecretStore to remove the IRSA-specific configuration. The operator will automatically use Pod Identity when configured.

## Verification

After applying your changes, verify the association is working:

```bash
# List pod identity associations
aws eks list-pod-identity-associations --cluster-name your-cluster

# Describe a specific association
aws eks describe-pod-identity-association \
  --cluster-name your-cluster \
  --association-id <association-id>

# Test from within a pod
kubectl exec -it <pod-name> -n <namespace> -- aws sts get-caller-identity
```

The `get-caller-identity` command should return the assumed role ARN, confirming the Pod Identity is working correctly.

You will see the mapping of the IAM role ARN and service account in the Access tab in the EKS console under "Pod Identity associations".