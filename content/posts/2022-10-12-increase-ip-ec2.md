---
title: Increase IP density for EKS nodes
date: 2022-10-12 10:00:00 -0700
tags:
    - eks
    - ec2
    - aws
keywords:
    - eks
    - ec2
    - aws
---

Depending on the EC2 instance type you choose for your EKS nodes, you could be limited on the number of pods for each node. This is due to the set number of network interfaces that can be assigned to that particular instance type. The limits per instance can be found [here](https://github.com/awslabs/amazon-eks-ami/blob/master/files/eni-max-pods.txt). This can be avoided by assigning IP address prefixes (/28) instead of single addresses (/32). Basically for every IP address that can be assigned to the network interface, a group of IP addresses can be assigned.

There are a couple of requirements to be aware of for this to work. The VPC CNI plugin needs to be updated; 1.10.1 or later as of writing this, and there needs to be continuous blocks of address space available to assign these prefixes. It won't pick a group of addresses here and another there in a subnet, so if a subnet is fragmented from other services or instances, there's a chance you will see a limited number of prefixes on a given instance. In my case, I created a dedicated group of subnets for my EKS nodes unaffected by any other service.

You can see the hardcoded max pod limit for each node by running a describe on them. It should be the same number of the IP address limit.
```bash
kubectl describe nodes | grep pods
```

The first step is to turn on prefix assignments on the VPC CNI plugin:
```bash
kubectl set env daemonset aws-node -n kube-system ENABLE_PREFIX_DELEGATION=true
```

Confirm its enabled:
```bash
kubectl describe daemonset -n kube-system aws-node | grep ENABLE_PREFIX_DELEGATION
```

Turning this on will unfortunately not take affect until you re-create your EKS nodes. If you use a managed node group without a launch templete, the maximum number of pods will be automatically set for you. In this case, it will be the best practice value of 110. If using a custom launch template, set the max-pods value either in the bootstrap script or in the settings file:

```bash
bootstrap script addition:
--kubelet-extra-args '--max-pods=110'

OR

bottlerocket OS k8s config settings:
"max-pods" = 110
```

After adding the new node group, you should now see a max pod count of 110 from the describe command earlier. If you look at the Network tab on one of these EC2 instances, you will see a number prefixes on the network interface instead a list of secondary IP addresses.

References:
[https://docs.aws.amazon.com/eks/latest/userguide/cni-increase-ip-addresses.html](https://docs.aws.amazon.com/eks/latest/userguide/cni-increase-ip-addresses.html)
