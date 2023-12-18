---
title: Getting Started with Argo Rollouts and AWS ALB
date: 2023-12-14 14:00:00 -0700
tags:
    - aws
    - ci/cd
    - argo-rollouts
keywords:
    - aws
    - ci/cd
    - argo-rollouts
---

This post will get you started using Argo Rollouts and ALB on AWS with the Terraform code to install Rollouts and an example app to demonstrate a canary deployment.
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

## Module

Initialize the module where needed. Here we're installing Argo Rollouts to your K8s cluster through Helm and providing a values file through the templatefile function so we can have variable subsitution. In this demo, I'm using a public LB; however, it's important to stick it behind an internal LB with access by VPN.

```terraform
module "argo_rollouts" {
  source                = "../../modules/argo_rollouts"
  name                  = "argo-rollouts"
  env                   = local.env
  region                = local.region
  argo_rollouts_version = "2.32.7"
  loadbalancer_dns      = module.public_loadbalancer.dns_name
  fqdn                  = "argorollouts.sandbox.demo"
}
```

## Module files

### main.tf
```terraform
resource "helm_release" "argocd" {
  namespace        = "argo-rollouts"
  create_namespace = true
  name             = "argo-rollouts"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-rollouts"
  version          = var.argo_rollouts_version
  values = ["${templatefile("../../modules/argo_rollouts/files/values.yaml", {
    ENV     = var.env
    FQDN    = var.fqdn
    LB_NAME = "${var.env}-public-application"
  })}"]
}
```

In this values file, we're enabling the dashboard and using the ALB controller for the ingress. This example is using a shared LB by setting the "group.name" annotation and also take note of the node affinity to my core node group since we don't want these pods shifted to nodes managed by Karpenter.

### values.yaml
```yaml
dashboard:
  enabled: true
  ingress:
    enabled: true
    ingressClassName: alb
    hosts:
      - ${FQDN}
    annotations:
      alb.ingress.kubernetes.io/backend-protocol: HTTP
      alb.ingress.kubernetes.io/group.name: ${LB_NAME}
      alb.ingress.kubernetes.io/healthcheck-interval-seconds: "30"
      alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
      alb.ingress.kubernetes.io/load-balancer-attributes: routing.http2.enabled=true
      alb.ingress.kubernetes.io/load-balancer-name: ${LB_NAME}
      alb.ingress.kubernetes.io/scheme: internet-facing
      alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-FS-1-2-2019-08
      alb.ingress.kubernetes.io/tags: "env=${ENV},terraform=true"
      alb.ingress.kubernetes.io/target-type: ip
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: role
            operator: In
            values:
            - core
controller:
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

### variables.tf
```terraform
variable "argo_rollouts_version" {}
variable "env" {}
variable "fqdn" {}
variable "loadbalancer_dns" {}
variable "name" {}
variable "region" {}
```

Change this to your DNS provider.

### dns.tf
```terraform
resource "cloudflare_record" "argocd" {
  zone_id         = "your_zone_id"
  name            = "argorollouts.${var.env}"
  value           = var.loadbalancer_dns
  type            = "CNAME"
  ttl             = 3600
  allow_overwrite = true
}
```

## Demo App

Once it's installed to your K8s cluster, you should be able to reach the Argo Rollouts dashboard. You won't see anything yet until we deploy an app with the rollout CRD. For this demo, I'm going to use Argo's demo app since it has a nifty UI that shows the canary deployment steps in real time.

The rollout CRD is replacing our deployment manifest and most of structure is the same under "template". There are few things I want to point out:
- We're specifying two services that you will create in the next steps.
- The rollbackWindow setting will tell it how many revisions that we can instantly rollback to.
- The steps section can be more or less depending on your needs. The durations are short here for demo purposes.
- We're setting ALB as our traffic routing mechanism. This will modify our LB rule with 2 weights for our canary and stable (original) target groups.

### rollout.yaml
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo
  namespace: demo
spec:
  strategy:
    canary:
      canaryService: rollouts-demo-canary
      stableService: rollouts-demo-stable
      maxSurge: "25%"
      maxUnavailable: 0
      dynamicStableScale: true
      trafficRouting:
        alb:
          ingress: rollouts-demo-ingress
          servicePort: 80
      steps:
      - setWeight: 5
      - pause: { duration: 30s }
      - setWeight: 10
      - pause: { duration: 30s }
      - setWeight: 15
      - pause: { duration: 30s }
      - setWeight: 25
      - pause: { duration: 30s }
  rollbackWindow:
    revisions: 3
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app: rollouts-demo
  template:
    metadata:
      labels:
        app: rollouts-demo
    spec:
      containers:
      - name: rollouts-demo
        image: argoproj/rollouts-demo:blue
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        resources:
          requests:
            memory: 32Mi
            cpu: 5m
```

Only need this if you already use HPA with a key part that will tell HPA to modify the rollout CRD.

### hpa.yaml
```yaml
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: rollouts-demo
  namespace: demo
spec:
  maxReplicas: 6
  minReplicas: 2
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: rollouts-demo
  targetCPUUtilizationPercentage: 80
```

Here we're creating two services to differentiate between releases. Important for the ALB controller and separate target groups.

### services.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: rollouts-demo-canary
  namespace: demo
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: rollouts-demo
---
apiVersion: v1
kind: Service
metadata:
  name: rollouts-demo-stable
  namespace: demo
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: rollouts-demo
```

The hostname will need to be modified for your environment. In this example, I'm using an existing public ALB with SSL. My post on setting up a ALB can be seen [here](https://eric-price.net/posts/2023-12-03-aws-load-balancer-controller/).

### ingress.yaml
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rollouts-demo-ingress
  namespace: demo
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/group.name: sandbox-public-application
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: "30"
    alb.ingress.kubernetes.io/healthcheck-path: /
    alb.ingress.kubernetes.io/healthcheck-port: "8080"
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/load-balancer-name: sandbox-public-application
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-FS-1-2-2019-08
    alb.ingress.kubernetes.io/tags: environment=sandbox,service=networking
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rollouts-demo-stable
            port:
              name: use-annotation
    host: demo.sandbox.demo
```

Once the demo app is up and running, you should see a very cool UI that continuously sends traffic to show which app version is active. Also, if you check out your ALB ruleset, you should see it pointing to two target groups; one with 100% of traffic and the other 0%.

The Argo Rollout dashboard should also show the app under the namespace it was deployed to. There you can see the list of steps and once we start the deploy, it will show the progress in realtime.

Now the fun begins with seeing it in action. Change "argoproj/rollouts-demo" image tag in the rollouts manifest from "blue" to "yellow" and save. You will see the demo app start to show traffic being sent to the yellow version. If you look at your ALB ruleset you will see the weight rules being changed at each step. After all the steps complete, 100% of traffic will be sent to the latest version.

In a future post, I will demonstrate how to use the analysis feature that can query prometheus metrics for 500's and rollback automatically if it reaches the threshold. 
