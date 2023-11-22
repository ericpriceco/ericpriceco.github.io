---
title: Setup Karpenter using Terraform
date: 2023-11-21 17:00:00 -0700
tags:
    - eks
    - karpenter
    - terraform
keywords:
    - eks
    - karpenter
    - terraform
---

I'm going to go through setting up Karpenter for EKS using Terraform and no third-party modules. The required networking and EKS cluster will need to be setup beforehand. You can see how to setup an EKS cluster [here](https://eric-price.net/posts/2023-11-16-eks-terraform-module/). If you're wondering why use Karpenter over the standard Cluster Autoscaler, there are a few big/quality of life reasons: able to work with as many instance families as you choose without creating multiple node groups, zone and price awareness, and flexible/granular scaling options.
All the referenced Terrafom code can be obtained [here](https://github.com/eric-price/terraform_modules).

These are the providers that we'll be using in the environment.

providers.tf
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

Initialize the module where needed. Here we're pulling some output data from the EKS module.

```terraform
module "karpenter" {
  source                 = "../../modules/karpenter"
  env                    = local.env
  region                 = local.region
  cluster_name           = module.eks-cluster.name
  cluster_endpoint       = module.eks-cluster.endpoint
  irsa_oidc_provider_arn = module.eks-cluster.oidc_provider_arn
  eks_node_role_arn      = module.eks-cluster.node_role_arn
  karpenter_version      = "v0.32.1"
}
```

### Module files

Deploying Karpenter via Helm to the EKS cluster provided and updating the "aws-auth" configmap to include the Karpenter node role. Using the kubectl provider, we're setting the NodeClass and NodePool manifests and one important thing to highlight in these is we're targeting subnets and security groups by the "karpenter.sh/discovery" tag, so make sure your tags are set before running. Another thing to note is this example is it's using the Bottlerocket OS for nodes.

Karpenters API docs explain each of the settings in NodeClass and NodePool.

main.tf
```terraform
resource "helm_release" "karpenter" {
  namespace        = "karpenter"
  create_namespace = true
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = var.karpenter_version

  values = [
    <<-EOT
    settings:
      clusterName: ${var.cluster_name}
      clusterEndpoint: ${var.cluster_endpoint}
      interruptionQueueName: ${aws_sqs_queue.karpenter.name}
      aws:
        defaultInstanceProfile: ${aws_iam_instance_profile.karpenter.name}
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: ${aws_iam_role.karpenter_irsa.arn}
    EOT
  ]
}

resource "kubectl_manifest" "aws_auth_config" {
  yaml_body = <<-YAML
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: aws-auth
      namespace: kube-system
    data:
      mapRoles: |
        - groups:
          - system:bootstrappers
          - system:nodes
          rolearn: "${var.eks_node_role_arn}"
          username: system:node:{{EC2PrivateDNSName}}
        - groups:
          - system:bootstrappers
          - system:nodes
          rolearn: "${aws_iam_role.karpenter_node.arn}"
          username: system:node:{{EC2PrivateDNSName}}
  YAML

  depends_on = [
    helm_release.karpenter
  ]
}

resource "kubectl_manifest" "karpenter_node_class" {
  yaml_body = <<-YAML
    apiVersion: karpenter.k8s.aws/v1beta1
    kind: EC2NodeClass
    metadata:
      name: default
    spec:
      amiFamily: Bottlerocket
      role: "karpenter-node-${var.cluster_name}"
      subnetSelectorTerms:
        - tags:
            karpenter.sh/discovery: "${var.cluster_name}"
      securityGroupSelectorTerms:
        - tags:
            karpenter.sh/discovery: "${var.cluster_name}"
      tags:
        platform: eks
        Name: "eks-karpenter-${var.env}"
        karpenter.sh/discovery: "${var.cluster_name}"
      metadataOptions:
        httpEndpoint: enabled
        httpProtocolIPv6: disabled
        httpPutResponseHopLimit: 2
        httpTokens: required
      blockDeviceMappings:
        # Root device
        - deviceName: /dev/xvda
          ebs:
            volumeSize: 4Gi
            volumeType: gp3
            encrypted: true
        # Data device: Container resources such as images and logs
        - deviceName: /dev/xvdb
          ebs:
            volumeSize: 20Gi
            volumeType: gp3
            encrypted: true
  YAML

  depends_on = [
    helm_release.karpenter
  ]
}

resource "kubectl_manifest" "karpenter_node_pool" {
  yaml_body = <<-YAML
    apiVersion: karpenter.sh/v1beta1
    kind: NodePool
    metadata:
      name: default
    spec:
      template:
        spec:
          requirements:
            - key: kubernetes.io/arch
              operator: In
              values: ["amd64"]
            - key: kubernetes.io/os
              operator: In
              values: ["linux"]
            - key: karpenter.sh/capacity-type
              operator: In
              values: ["spot", "on-demand"]
            - key: karpenter.k8s.aws/instance-category
              operator: In
              values: [ "m", "r", "c"]
            - key: karpenter.k8s.aws/instance-generation
              operator: Gt
              values: ["2"]
          nodeClassRef:
            name: default
          kubelet:
            maxPods: 110
      limits:
        cpu: 1000
      disruption:
        consolidationPolicy: WhenUnderutilized
        expireAfter: 720h # 30 * 24h = 720h
  YAML

  depends_on = [
    helm_release.karpenter
  ]
}
```

data.tf
```terraform
data "aws_caller_identity" "current" {}
```

The IRSA role used by the Karpenter controller and node role assigned to nodes. An OIDC provider will need to be setup for the service account to assume an IAM role. The scoped out IRSA role that is referenced below can be found [here](https://github.com/eric-price/terraform_modules/tree/master/karpenter/files). If you get an error on the Spot service linked role, you may already have it setup for your account.

iam.tf
```terraform
locals {
  irsa_oidc_provider_url = replace(var.irsa_oidc_provider_arn, "/^(.*provider/)/", "")
  account_id             = data.aws_caller_identity.current.account_id
}

resource "aws_iam_instance_profile" "karpenter" {
  name = "karpenter-irsa-${var.env}"
  role = aws_iam_role.karpenter_irsa.name
}

# Create service account role for spot support
resource "aws_iam_service_linked_role" "spot" {
  aws_service_name = "spot.amazonaws.com"
}

resource "aws_iam_role" "karpenter_node" {
  name = "karpenter-node-${var.env}"
  assume_role_policy = jsonencode({
    Statement : [
      {
        Action : "sts:AssumeRole",
        Effect : "Allow",
        Principal : {
          "Service" : "ec2.amazonaws.com"
        }
      }
    ],
    Version : "2012-10-17"
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  ]
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
      values   = ["system:serviceaccount:karpenter:karpenter"]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.irsa_oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "karpenter_irsa" {
  name               = "karpenter-irsa-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role.json
  managed_policy_arns = [
    aws_iam_policy.karpenter_irsa.arn
  ]
}

resource "aws_iam_policy" "karpenter_irsa" {
  name = "karpenter-irsa-${var.env}"
  policy = templatefile("../../modules/karpenter/files/irsa_policy.json", {
    AWS_ACCOUNT_ID = data.aws_caller_identity.current.account_id
    AWS_REGION     = var.region
    CLUSTER_NAME   = var.cluster_name
  })
}
```

This SQS queue will notify Karpenter for spot interruptions and instance health events.

sqs.tf
```terraform
resource "aws_sqs_queue" "karpenter" {
  message_retention_seconds = 300
  name                      = "${var.cluster_name}-karpenter"
}

resource "aws_sqs_queue_policy" "karpenter" {
  policy    = data.aws_iam_policy_document.node_termination_queue.json
  queue_url = aws_sqs_queue.karpenter.url
}

data "aws_iam_policy_document" "node_termination_queue" {
  statement {
    resources = [aws_sqs_queue.karpenter.arn]
    sid       = "EC2InterruptionPolicy"
    actions   = ["sqs:SendMessage"]
    principals {
      type        = "Service"
      identifiers = [
        "events.amazonaws.com",
        "sqs.amazonaws.com"
      ]
    }
  }
}
```

These are the Cloudwatch health events mentioned above that will send events to the SQS queue.

cloudwatch.tf
```terraform
locals {
  events = {
    health_event = {
      name        = "HealthEvent"
      description = "Karpenter interrupt - AWS health event"
      event_pattern = {
        source      = ["aws.health"]
        detail-type = ["AWS Health Event"]
      }
    }
    spot_interupt = {
      name        = "SpotInterrupt"
      description = "Karpenter interrupt - EC2 spot instance interruption warning"
      event_pattern = {
        source      = ["aws.ec2"]
        detail-type = ["EC2 Spot Instance Interruption Warning"]
      }
    }
    instance_rebalance = {
      name        = "InstanceRebalance"
      description = "Karpenter interrupt - EC2 instance rebalance recommendation"
      event_pattern = {
        source      = ["aws.ec2"]
        detail-type = ["EC2 Instance Rebalance Recommendation"]
      }
    }
    instance_state_change = {
      name        = "InstanceStateChange"
      description = "Karpenter interrupt - EC2 instance state-change notification"
      event_pattern = {
        source      = ["aws.ec2"]
        detail-type = ["EC2 Instance State-change Notification"]
      }
    }
  }
}

resource "aws_cloudwatch_event_rule" "this" {
  for_each = { for k, v in local.events : k => v }

  name_prefix   = "${each.value.name}-"
  description   = each.value.description
  event_pattern = jsonencode(each.value.event_pattern)

  tags = merge(
    { "ClusterName" : var.cluster_name },
  )
}

resource "aws_cloudwatch_event_target" "this" {
  for_each = { for k, v in local.events : k => v }

  rule      = aws_cloudwatch_event_rule.this[each.key].name
  target_id = "KarpenterInterruptionQueueTarget"
  arn       = aws_sqs_queue.karpenter.arn
}
```

variables.tf
```terraform
variable "cluster_name" {}
variable "cluster_endpoint" {}
variable "env" {}
variable "region" {}
variable "irsa_oidc_provider_arn" {}
variable "eks_node_role_arn" {}
```

An easy way to test this is using the pause container to force autoscaling. Adjust the CPU cores depending on your instance type.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inflate
spec:
  replicas: 0
  selector:
    matchLabels:
      app: inflate
  template:
    metadata:
      labels:
        app: inflate
    spec:
      terminationGracePeriodSeconds: 0
      containers:
        - name: inflate
          image: public.ecr.aws/eks-distro/kubernetes/pause:3.7
          resources:
            requests:
              cpu: 1
```
```bash
kubectl apply -f ./test.yaml
kubectl scale deployment inflate --replicas 5
```

You should see additional nodes being created fairly quickly to assign these new pods. If you don't see any activity, you can view the logs with this command:
```bash
kubectl logs -f -n karpenter -l app.kubernetes.io/name=karpenter -c controller
```
