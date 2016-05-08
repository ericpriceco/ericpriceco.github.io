---
layout: post
title: Centralized Logging in Docker with AWS Elasticsearch
date: 2016-05-08
tags: docker
categories: docker
published: false
---

In my [last post](/blog/centralized-logging-docker/), I showed how to setup a centralized log stack for Docker containers using Fluentd, Elasticsearch and Kibana containers. Now I'll show how to use Amazon's Elasticsearch service that includes a built-in Kibana interface for your logs.

First create your Elasticsearch domain through AWS. I created an new IAM user account limited to only the Elasticsearch service. You can also use roles in access policy if you choose to.

Using AWS, there is no need for Elasticsearch or Kibana containers; we just need the Fluentd container and specify the Elasticsearch endpoint in the Fluentd config file.

**docker-compose.yml**

```yaml
version: "2"

services:

  fluentd:
    image: fluent/fluentd:latest
    ports:
      - "24224:24224"
    volumes:
      - ./fluentd/etc:/fluentd/etc
    command: /fluentd/etc/start.sh
    networks:
      - lognet

  nginx:
    image: nginx
    ports:
      - "80:80"
    logging:
      driver: fluentd
    networks:
      - lognet

networks:
  lognet:
    driver: bridge
```

In the compose file, we are telling Fluentd to mount a local folder with the config file and run a script to install the aws-elasticsearch gem on startup. The nginx container is set to use the built-in logging driver to send its logs to the Fluentd container at localhost:24224.

**fluent.conf:**

Paste in your access ID, access key and your Elasticsearch endpoint URL.

```yaml
<source>
  type forward
</source>

<match *.*>
  type "aws-elasticsearch-service"
  logstash_format true
  flush_interval 10s

  <endpoint>
    url https://YOUR_ELASTICSEARCH_ENDPOINT
    region us-east-1
    access_key_id "YOUR_ACCESS_ID"
    secret_access_key "YOUR_ACCESS_KEY"
  </endpoint>
</match>
```

**start.sh:**

```
#!/bin/sh

gem install fluent-plugin-elasticsearch
gem install fluent-plugin-aws-elasticsearch-service
exec fluentd -c /fluentd/etc/$FLUENTD_CONF -p /fluentd/plugins $FLUENTD_OPT
```

Start your containers:

```bash
$ docker-compose up -d
```

It may take a few minutes before your logs start to show up. In your Elasticsearch domain on AWS, you will see a link to the built-in Kibana interface to view your indexes.
