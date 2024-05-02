---
title: Install minikube on arm based (M1/M2) Mac
date: 2022-06-15 00:00:00 -0700
tags:
    - kubernetes
    - mac
keywords:
    - kubernetes
    - mac
---

If you have a Mac with the M1 (arm) processor, you can still run minikube by changing the driver to Docker. Of course, you will need Docker already installed for this to work.

### Install

Download the binary:
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-arm64
sudo install minikube-darwin-arm64 /usr/local/bin/minikube
```

Or install via Homebrew
```bash
brew install minikube
```

### Run

If you run just 'minikube start', you should see an error like this:
```bash
Exiting due to DRV_UNSUPPORTED_OS: The driver 'parallels' is not supported on darwin/arm64
```

Use the Docker driver to create a container or containers depending on the cluster setip
```bash
minikube start --driver=docker
```

Stopping the local cluster doesn't require the driver flag
```bash
minikube stop
```
