---
title: Create EKS cluster using Terraform
date: 2023-11-16 12:00:00 -0700
tags:
    - eks
    - aws
    - terraform
keywords:
    - eks
    - aws
    - terraform
---

This post will guide you through all the Terraform code needed to spin up a EKS cluster with Bottlerocket nodes using just the AWS provider instead of using a third-party module. The VPC resources need to be setup beforehand. For the VPC setup, I find having dedicated subnets for EKS clusters beneficial for IP address prefixes since it needs continuous blocks of IP addresses. All the referenced Terraform code can be obtained [here](https://github.com/eric-price/terraform_modules).

Initialize the module where needed.
```terraform
locals {
  env    = "sandbox"
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

module "eks-cluster" {
  source                   = "../../modules/aws/eks"
  cluster_name             = local.env
  env                      = local.env
  cluster_version          = "1.28"
  addon_vpc_version        = "v1.14.1-eksbuild.1"
  addon_ebs_version        = "v1.24.1-eksbuild.1"
  addon_coredns_version    = "v1.10.1-eksbuild.2"
  addon_kube_proxy_version = "v1.28.1-eksbuild.1"
  worker_instance_type     = "t3a.large"
  worker_instance_count    = 3
  worker_volume_size       = 100
  log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]
}
```

### Module files

cluster.tf
```terraform
resource "aws_eks_cluster" "cluster" {
  name     = var.cluster_name
  version  = var.cluster_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = data.aws_subnets.eks_private.ids
    endpoint_private_access = true
    endpoint_public_access  = false
    security_group_ids      = [aws_security_group.cluster.id]
  }

  enabled_cluster_log_types = var.log_types

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  kubernetes_network_config {
    ip_family         = "ipv4"
    service_ipv4_cidr = "172.20.0.0/16"
  }

  tags = {
    "karpenter.sh/discovery" = var.cluster_name
  }

  depends_on = [
    aws_iam_role.cluster,
    aws_kms_key.eks,
    aws_security_group.cluster
  ]
}
```

Adjustments will need to be made here depending on your subnetting. 

data.tf
```terraform
data "aws_vpc" "main" {
  tags = {
    env  = var.env
    Name = var.env
  }
}

data "aws_subnets" "eks_private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = {
    env  = var.env
    type = "eks-private"
  }
}

data "aws_ami" "bottlerocket_image" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["bottlerocket-aws-k8s-${var.cluster_version}-x86_64-*"]
  }
}

data "tls_certificate" "cluster" {
  url = aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}
```

The VPC addon is a requirement for the node groups to turn on prefix delegation before they're created.

addons.tf
```terraform
resource "aws_eks_addon" "vpc" {
  cluster_name                = aws_eks_cluster.cluster.name
  addon_name                  = "vpc-cni"
  addon_version               = var.addon_vpc_version
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  configuration_values = jsonencode({
    env = {
      ENABLE_PREFIX_DELEGATION = "true"
    }
  })
  depends_on = [aws_eks_cluster.cluster]
}

resource "aws_eks_addon" "ebs" {
  cluster_name                = aws_eks_cluster.cluster.name
  addon_name                  = "aws-ebs-csi-driver"
  addon_version               = var.addon_ebs_version
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  depends_on                  = [
    aws_eks_cluster.cluster,
    aws_eks_node_group.core
  ]
}

resource "aws_eks_addon" "coredns" {
  cluster_name                = aws_eks_cluster.cluster.name
  addon_name                  = "coredns"
  addon_version               = var.addon_coredns_version
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  depends_on                  = [
    aws_eks_cluster.cluster,
    aws_eks_node_group.core
  ]
}

resource "aws_eks_addon" "kube-proxy" {
  cluster_name                = aws_eks_cluster.cluster.name
  addon_name                  = "kube-proxy"
  addon_version               = var.addon_kube_proxy_version
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  depends_on                  = [
    aws_eks_cluster.cluster,
    aws_eks_node_group.core
  ]
}
```

iam.tf
```terraform
resource "aws_iam_role" "cluster" {
  name = "eks-cluster-${var.cluster_name}"
  assume_role_policy = jsonencode({
    Statement : [
      {
        Action : "sts:AssumeRole",
        Effect : "Allow",
        Principal : {
          "Service" : "eks.amazonaws.com"
        }
      }
    ],
    Version : "2012-10-17"
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController",
    "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  ]
}

resource "aws_iam_role" "nodes" {
  name = "eks-nodes-${var.cluster_name}"
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

resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = data.tls_certificate.cluster.url
}
```

kms.tf
```terraform
resource "aws_kms_key" "eks" {
  description         = "Encrypt EKS secrets"
  enable_key_rotation = true
  multi_region        = true
}

resource "aws_kms_alias" "eks" {
  name          = "alias/eks-${var.cluster_name}"
  target_key_id = aws_kms_key.eks.key_id
}
```

Here we're automatically pulling the device mappings required by the Bottlerocket AMI and the latest AMI id. The template file path is dependent on how you structure your modules. This example is only one node group called "worker" and the lifecycle block will ignore a new AMI release until ready to update.

launch_template.tf
```terraform
locals {
  device_list = tolist(data.aws_ami.bottlerocket_image.block_device_mappings)
}

resource "aws_launch_template" "core" {
  name                    = "eks-core-${var.cluster_name}"
  disable_api_stop        = false
  disable_api_termination = false
  image_id                = data.aws_ami.bottlerocket_image.id
  instance_type           = var.core_node_type
  user_data = base64encode(templatefile("../../modules/aws/eks/files/node_config.toml.tftpl", {
    cluster_name     = aws_eks_cluster.cluster.name
    cluster_endpoint = aws_eks_cluster.cluster.endpoint
    cluster_ca_data  = aws_eks_cluster.cluster.certificate_authority[0].data
    nodegroup        = "core"
    ami_id           = data.aws_ami.bottlerocket_image.id
    })
  )

  block_device_mappings {
    device_name = local.device_list[0]["device_name"]

    ebs {
      delete_on_termination = true
      volume_size           = 5
      volume_type           = "gp3"
      encrypted             = true
    }
  }

  block_device_mappings {
    device_name = local.device_list[1]["device_name"]

    ebs {
      delete_on_termination = true
      volume_size           = var.core_node_volume_size
      volume_type           = "gp3"
      encrypted             = true
    }
  }

  metadata_options {
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "enabled"
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name                 = "eks-core-${var.cluster_name}"
      terraform            = true
      "eks:cluster-name"   = var.env
      "eks:nodegroup-name" = "core"
      platform             = "eks"
      env                  = var.env
    }
  }

  tag_specifications {
    resource_type = "volume"

    tags = {
      Name                 = "eks-core-${var.cluster_name}"
      terraform            = true
      "eks:cluster-name"   = var.env
      "eks:nodegroup-name" = "core"
      platform             = "eks"
      env                  = var.env
    }
  }

  # Comment out when updating node
  lifecycle {
    ignore_changes = [
      image_id,
      user_data
    ]
  }
}
```

nodes.tf
```terraform
resource "aws_eks_node_group" "core" {
  cluster_name    = aws_eks_cluster.cluster.name
  node_group_name = "core"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = data.aws_subnets.eks_private.ids
  ami_type        = "CUSTOM"
  labels = {
    role = "core"
  }

  launch_template {
    name    = aws_launch_template.core.name
    version = aws_launch_template.core.latest_version
  }

  scaling_config {
    desired_size = var.core_node_count
    max_size     = var.core_node_count
    min_size     = var.core_node_count
  }

  update_config {
    max_unavailable = 1
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_iam_role.nodes,
    aws_eks_cluster.cluster,
    aws_launch_template.core,
    aws_eks_addon.vpc
  ]
}
```

node_config.toml.tftpl
```
[settings.kubernetes]
"cluster-name" = "${cluster_name}"
"api-server" = "${cluster_endpoint}"
"cluster-certificate" = "${cluster_ca_data}"
"cluster-dns-ip" = "172.20.0.10"
"max-pods" = 110
[settings.kubernetes.node-labels]
"eks.amazonaws.com/nodegroup-image" = "${ami_id}"
"eks.amazonaws.com/capacityType" = "ON_DEMAND"
"eks.amazonaws.com/nodegroup" = "${nodegroup}"
"role" = "${nodegroup}"
```

Adjust the security group to allow access within VPC or VPN etc.

security_groups.tf
```terraform
resource "aws_security_group" "cluster" {
  name        = "eks-cluster-${var.cluster_name}"
  description = "EKS cluster security"
  vpc_id      = data.aws_vpc.main.id
  egress {
    description = "full outbound"
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = "0"
    protocol    = "-1"
    self        = "false"
    to_port     = "0"
  }
  ingress {
    description = "self reference"
    from_port   = "0"
    protocol    = "-1"
    self        = "true"
    to_port     = "0"
  }
  ingress {
    security_groups = [aws_security_group.node.id]
    description     = "eks node group"
    from_port       = "0"
    protocol        = "-1"
    self            = "false"
    to_port         = "0"
  }
  tags = {
    Name = "eks-cluster-${var.env}"
  }
}

resource "aws_security_group" "node" {
  name        = "eks-node-${var.cluster_name}"
  description = "EKS node security"
  vpc_id      = data.aws_vpc.main.id
  egress {
    description = "full outbound"
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = "0"
    protocol    = "-1"
    self        = "false"
    to_port     = "0"
  }
  ingress {
    description = "self reference"
    from_port   = "0"
    protocol    = "-1"
    self        = "true"
    to_port     = "0"
  }
  tags = {
    Name                     = "eks-node-${var.env}"
    "karpenter.sh/discovery" = var.cluster_name
  }
}
```

variables.tf
```terraform
variable "addon_coredns_version" {}
variable "addon_ebs_version" {}
variable "addon_kube_proxy_version" {}
variable "addon_vpc_version" {}
variable "cluster_name" {}
variable "cluster_version" {}
variable "env" {}
variable "log_types" {}
variable "worker_instance_count" {}
variable "worker_instance_type" {}
variable "worker_volume_size" {}
```
