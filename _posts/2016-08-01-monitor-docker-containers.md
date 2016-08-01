---
layout: post
title: Monitor Docker containers
date: 2016-07-31
tags: docker
categories: docker
published: true
---

Monitoring containers can easily be accomplished with a Prometheus, Grafana, and cAdvisor stack. Using Docker, the monitoring server stack can be stood up quickly.

[**Prometheus:**](https://prometheus.io/) time series database and stats data scrapper from exporters such as cAdvisor and node-exporter.

[**Grafana:**](https://grafana.net/) dashboards and graphing of Prometheus data.

[**cAdvisor:**](https://github.com/google/cadvisor) daemon that collects, aggregates, processes, and exports information about running containers.

[**node-exporter:**](https://github.com/prometheus/node_exporter) collects metrics on the host.

You will need a recent version of the Docker engine and docker-compose.

### Getting Started

In the following docker-compose file, we are using the official containers for Prometheus, Grafana, cAdvisor, and node-exporter. The data for Prometheus and Grafana is saved to the Docker host where the docker-compose file is launched. 

**docker-compose.yml**

```yaml
version: '2'

services:

  prometheus:
    image: prom/prometheus:latest
    command:
        - '-config.file=/etc/prometheus/prometheus.yml'
    links:
      - cadvisor:cadvisor
    ports:
        - '9090:9090'
    volumes:
      - ./prometheus_data:/prometheus
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - '9100:9100'

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=pass
    depends_on:
      - prometheus
    ports:
      - "3000:3000"
    volumes:
      - ./grafana_data:/var/lib/grafana
    
  cadvisor:
    image: google/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
```

Below is the prometheus.yml settings file that is mapped in docker-compose.yml.

**prometheus.yml**

```yaml
global:
    scrape_interval: 5s
    external_labels:
      monitor: 'docker-monitor'

scrape_configs:
  - job_name: 'monitor'
    static_configs:
      - targets: ['localhost:9090','cadvisor:8080','node-exporter:9100']
```

Start your containers:

```
 docker-compose up
```

### Set data source

First check that your prometheus config file loaded correctly by going to: http://localhost:9090/config

Login to Grafana with 'admin' and 'pass' and add a new data source here: http://localhost:3000/datasources

![grafana data source](/img/posts/grafana-datasource.png)

### Dashboards

You can grab a great starter Docker dashboard [here](https://grafana.net/dashboards/179) like the one pictured below:

![grafana dashboard](/img/posts/grafana-dashboard.png)

### Summary

Adding additional Docker hosts is as simple as adding the cAdvisor container and giving Prometheus the endpoint to scrap the data. Standalone hosts can be added as well with node-exporter. In my next post, I'm going to test a monitoring stack using InfluxDB with Telegraf instead of Prometheus.





