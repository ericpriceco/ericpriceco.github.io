---
layout: post
title: Centralized Logging in Docker with Fluentd, Elasticsearch and Kibana
date: 2016-05-08
tags: docker
categories: docker
published: true
---

This guide will describe the steps to setup a centralized logging system for docker containers. A properly configured docker image will send its log output to stdout, so the docker daemon can view them. This is where the Fluentd log driver, that’s built into docker, comes into play by taking those logs, applying optional filtering and sending it to Elasticsearch, Mongdb or other services. There's no need to setup a Logstash server since Fluentd can send it directly to Elasticsearch.

I’ll be using docker-compose in my example stack with Fluentd, Nginx, Elasticsearch and Kabana.

**docker-compose.yml:**

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

  elasticsearch:
    image: elasticsearch
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - /usr/share/elasticsearch/data:/usr/share/elasticsearch/data
    networks:
      - lognet

  kibana:
    image: kibana
    restart: always
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_URL=http://elasticsearch:9200
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

In the compose file, we are telling Fluentd to mount a local folder with the config file and run a script to install the Elasticsearch gem on startup. The nginx container is set to use the built-in logging driver to send its logs to the Fluentd container at localhost:24224.

**fluent.conf:**

```yaml
<source>
  type forward
</source>

<match *.*>
  type elasticsearch
  host elasticsearch
  logstash_format true
  flush_interval 10s
</match>
```

**start.sh:**

```
#!/bin/sh

gem install fluent-plugin-elasticsearch
exec fluentd -c /fluentd/etc/$FLUENTD_CONF -p /fluentd/plugins $FLUENTD_OPT
```

Make start.sh executable:

```bash
$ chmod a+x start.sh
```

Start your stack:

```bash
$ docker-compose up -d
```

It will take a couple of minutes for Elasticsearch and Kibana to start up fully. You can monitor the progress with the 'docker logs' command. Once you see "Connection opened to Elasticsearch" from the Fluentd container, it should be ready to start forwarding logs to Elasticsearch.

Hit up http://localhost to generate some Nginx logs and verify events going to your Elasticsearch container with:

```bash
$ curl -XGET 'http://localhost:9200/_all/_search?q=*'
```

Visit the Kibana page (http://localhost:5601) to setup your new index and view your logs.

In my next post, I'll be showing how to setup Fluentd with Amazon's ElasticSearch service.

