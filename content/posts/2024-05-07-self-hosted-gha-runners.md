---
title: Self-hosted Github Action runners on Kubernetes using Karpenter and ARC
date: 2024-05-02 10:00:00 -0700
tags:
    - gha
    - arc
    - kubernetes
    - karpenter
keywords:
    - gha
    - arc
    - kubernetes
    - karpenter
---

In this post, I'm going to show how to setup self-hosted Github Action runners on Kubernetes using the [Actions Runner Controller (ARC)](https://github.com/actions/actions-runner-controller) and Karpenter using Terraform. Using Karpenter is not a requirement; however, it will make life easier when using multiple instance types and a mix of spot and on-demand. This post won't get into the details on setting up Karpenter since that is done [here](https://eric-price.net/posts/2023-11-21-karpenter-terraform/).

This first section is an example Terraform module for GHA ARC on EKS. As of this writing, there is a bug with version '0.9.1' that will kill a new runner node before its fully ready, so avoid that release for now.

## Module

### main.tf
```terraform
module "gha_arc" {
  source      = "../../../../modules/aws/eks_services/gha_arc"
  arc_version = "0.9.0"
}

```
### providers.tf
```terraform
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.ops.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.ops.certificate_authority[0].data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      # This requires the awscli to be installed locally where Terraform is executed
      args    = ["eks", "get-token", "--cluster-name", data.aws_eks_cluster.ops.name]
      command = "aws"
    }
  }
}
```

## Module files

ARC consists of two Helm charts; one for the controller and one for the runner scale sets. First need to install the controller.

### variables.tf
```terraform
variable "arc_version" {
  type = string
}
```
### main.tf

This is the controller service that is put into the "arc-systems" namespace.

The values are optional, but I'll explain the reasoning behind these. I use Grafa and turning on metrics and adding an annotation to scrap the metrics provided. Setting a node affinity to avoid the controller pod being placed in a node provisioned by Karpenter.

```terraform
resource "helm_release" "arc_systems" {
  namespace        = "arc-systems"
  create_namespace = true
  reuse_values     = false
  name             = "actions-runner-controller"
  repository       = "oci://ghcr.io/actions/actions-runner-controller-charts"
  chart            = "gha-runner-scale-set-controller"
  version          = var.arc_version
  values = [
    <<-EOT
    podAnnotations:
      k8s.grafana.com/scrape: "true"
    metrics:
      controllerManagerAddr: ":8080"
      listenerAddr: ":8080"
      listenerEndpoint: "/metrics"
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

For my GHA workflows, I have jobs that require different core counts, so here there are two different runner scale sets requesting specific core sizes. 

Here is a general workload runner with two core counts. I found that if I request two cores exactly, Karpenter would request a four core instance due to daemon pods on the node, so I set "1.5" to get that two core instance type working.

On the values settings:
- telling Karpenter to do-not-disrupt the node for any case such as bin-packing, so as not to kill a running job.
- setting "dind" mode for the public actions that use Dockerfiles
- since the ARC runner image is bare minimum (not the same as a Github hosted runner), I've set a workaround to get "git" installed immediately on startup. You could potentially use a custom runner image; however, I didn't have any luck with that. Installing "git" at a minimum will allow the "actions/checkout" stepto use git to checkout the repo instead of downloading an archive of the repo since git isn't installed.
- installing the listener pods on the core nodes and not temporary nodes setup by Karpenter
- telling the runner pod to run on my "general" node type in the Karpenter pool

```terraform
resource "helm_release" "arc_runners" {
  namespace        = "arc-runners"
  create_namespace = true
  reuse_values     = false
  name             = "arc-runner-set"
  repository       = "oci://ghcr.io/actions/actions-runner-controller-charts"
  chart            = "gha-runner-scale-set"
  version          = var.arc_version

  values = [
    <<-EOT
    githubConfigUrl: "https://github.com/FreeWillPBC"
    githubConfigSecret: arc-app
    runnerGroup: k8s
    runnerScaleSetName: k8s-runner
    minRunners: 0
    maxRunners: 100
    containerMode:
      type: "dind"
    template:
      spec:
        metadata:
          annotations:
            karpenter.sh/do-not-disrupt: "true"
        containers:
          - name: runner
            image: ghcr.io/actions/actions-runner:latest
            command: ["/bin/bash","-c","sudo apt-get update && sudo apt-get install git -y && /home/runner/run.sh"]
            resources:
              requests:
                cpu: "1.5"
        nodeSelector:
          node-type: general
    listenerTemplate:
      spec:
        containers:
          - name: listener
            securityContext:
              runAsUser: 1000
        nodeSelector:
          role: core
    EOT
  ]
  depends_on = [
    helm_release.arc_systems
  ]
}
```

Larger core count runner scale set:
```terraform
resource "helm_release" "arc_runners_performance" {
  namespace        = "arc-runners"
  create_namespace = true
  reuse_values     = false
  name             = "arc-runner-set-performance"
  repository       = "oci://ghcr.io/actions/actions-runner-controller-charts"
  chart            = "gha-runner-scale-set"
  version          = var.arc_version

  values = [
    <<-EOT
    githubConfigUrl: "https://github.com/FreeWillPBC"
    githubConfigSecret: arc-app
    runnerGroup: k8s
    runnerScaleSetName: k8s-runner-8-core
    minRunners: 0
    maxRunners: 100
    template:
      spec:
        metadata:
          annotations:
            karpenter.sh/do-not-disrupt: "true"
        containers:
          - name: runner
            image: ghcr.io/actions/actions-runner:latest
            command: ["/bin/bash","-c","sudo apt-get update && sudo apt-get install git -y && /home/runner/run.sh"]
            resources:
              requests:
                cpu: "7.5"
        nodeSelector:
          node-type: performance
    listenerTemplate:
      spec:
        containers:
          - name: listener
            securityContext:
              runAsUser: 1000
        nodeSelector:
          role: core
    EOT
  ]
  depends_on = [
    helm_release.arc_systems
  ]
}
```

## Karpenter

Here's a quick run down of what the Karpenter module looks like and the two node pools. You can set instance families instead of specfic node types, but I like to be specific here.

```terraform
module "karpenter" {
  source                 = "../../../../modules/aws/eks_services/karpenter"
  env                    = local.env
  region                 = local.region
  karpenter_version      = "0.36.0"
  cluster_name           = data.aws_eks_cluster.ops.name
  cluster_endpoint       = data.aws_eks_cluster.ops.endpoint
  irsa_oidc_provider_arn = data.terraform_remote_state.eks.outputs.oidc_provider_arn
  eks_node_role_arn      = data.aws_iam_role.node_ops.arn
  general_node_types = [
    "c5.large",
    "c5a.large",
    "c6.large",
    "c6a.large",
    "c7a.large"
  ]
  general_node_capacity_types = ["on-demand", "spot"]
  perf_node_types = [
    "c5.2xlarge",
    "c5a.2xlarge",
    "c6.2xlarge",
    "c6a.2xlarge",
    "c7a.2xlarge"
  ]
  perf_node_capacity_types = ["on-demand", "spot"]
  node_arch                = ["amd64"]
  node_volume_size         = 50
}

One important setting to highlight here is the disruption setting. The default is "underUtilized" and this is more for stateless workloads that can be disrupted when Karpenter is trying to bin-pack the nodes. We don't want this for GHA workflow jobs and have them killed while working.

General node pool (2 cores)
```yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: general
spec:
  template:
    metadata:
      labels:
        node-type: general
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ${INSTANCE_ARCH}
        - key: kubernetes.io/os
          operator: In
          values: ["linux"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ${GENERAL_CAPACITY_TYPES}
        - key: node.kubernetes.io/instance-type
          operator: In
          values: ${GENERAL_NODE_TYPES}
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["2"]
      nodeClassRef:
        name: bottlerocket
      kubelet:
        maxPods: 110
  limits:
    cpu: 100
  disruption:
    consolidationPolicy: WhenEmpty
    consolidateAfter: 30s
```

Larger 8 core node pool
```yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: performance
spec:
  template:
    metadata:
      labels:
        node-type: performance
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ${INSTANCE_ARCH}
        - key: kubernetes.io/os
          operator: In
          values: ["linux"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ${PERF_CAPACITY_TYPES}
        - key: node.kubernetes.io/instance-type
          operator: In
          values: ${PERF_NODE_TYPES}
        - key: karpenter.k8s.aws/instance-cpu
          operator: In
          values: ["8"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["2"]
      nodeClassRef:
        name: bottlerocket
      kubelet:
        maxPods: 110
  limits:
    cpu: 200
  disruption:
    consolidationPolicy: WhenEmpty
    consolidateAfter: 30s
```
