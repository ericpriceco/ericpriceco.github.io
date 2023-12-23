---
title: Nginx Sidecar for TLS/SSL Termination on Kubernetes
date: 2023-12-22 20:00:00 -0700
tags:
    - nginx
    - cert-manager
keywords:
    - nginx
    - cert-manager
---

If you're not ready for a service mesh like Istio, Cillium or Nginx's own service mesh, an easy way to implement end-to-end encryption from the application LB to your pod or TLS/SSL termination for your pods behind a network LB is a proxy sidecar using Nginx. I'm going to describe how to set this up using cert-manager to fetch a letsencrypt certificate and mount that to the Nginx base image. 

Cert-manager will need to be setup before the next steps and that can be seen [here](https://eric-price.net/posts/2023-12-20-cert-manager).

Snippet from a deployment manifest for the nginx proxy container that is mounting the config and certificate keypair. Just need to make sure the secret created from the ingress manifest is the same name referenced in the volume.

### deployment.yaml
```yaml
...
containers:
    - name: nginx-proxy
      image: public.ecr.aws/nginx/nginx:1.23
      ports:
        - name: https
          containerPort: 443
      volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d
          readOnly: true
        - name: certs
          mountPath: /certs
          readOnly: true
...
volumes:
    - configMap:
        name: nginx
      name: nginx-config
    - name: certs
      secret:
        secretName: demo-app-cert
```

This example ingress manifest is using the AWS LB controller, but the parts to take note of are the TLS section and the cert-manager annotation that will tell cert-manager to generate a certificate and secret with the keypair that will be mounted in the Nginx sidecar.

### ingress.yaml
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-app
  namespace: sandbox
  labels:
    helm.sh/chart: demo-app-0.1.0
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: demo-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
    alb.ingress.kubernetes.io/backend-protocol: HTTPS
    alb.ingress.kubernetes.io/group.name: sandbox-app-external
    alb.ingress.kubernetes.io/healthcheck-port: "443"
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTPS
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/load-balancer-name: sandbox-app-external
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
    - host: demo.sandbox.example.com
      http:
        paths:
        - path: "/"
          pathType: Prefix
          backend:
            service:
              name: demo-app
              port:
                number: 443
  tls:
    - hosts:
      - demo.sandbox.example.com
      secretName: demo-app-cert
```

This configmap is our Nginx config file that will proxy traffic to the app listening on port 8000.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx
data:
  image-app.conf: |
    server {
      listen              443 ssl http2;
      server_name         demo.sandbox.example.com;
      ssl_certificate     /certs/tls.crt;
      ssl_certificate_key /certs/tls.key;
      ssl_session_cache   shared:SSL:10m;
      ssl_session_timeout 1h;
      ssl_buffer_size     8k;

      location / {
          proxy_pass         http://0.0.0.0:8000;
          proxy_set_header   Host $host;
          proxy_set_header   X-Real-IP $remote_addr;
          proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header   X-Forwarded-Host $server_name;
          proxy_set_header   Upgrade $http_upgrade;
          proxy_set_header   Connection 'upgrade';
          proxy_cache_bypass $http_upgrade;
      }
    }
```
