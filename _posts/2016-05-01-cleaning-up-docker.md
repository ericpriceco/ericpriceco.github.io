---
layout: post
title: Cleaning Up Docker
date: 2016-05-01
tags: docker
categories: docker
published: true
---

In my day to day testing with Docker, I end up with a ton of containers, images and volumes. For testing purposes, I sometimes need a clean slate and clear out absolutely everything. Below are some of the commands that have made that process very easy.

**Remove all containers:**

```bash
$ docker rm $(docker ps -qa)
```

The command 'docker ps -qa' feeds in just the container ID for all running and non-running containers.

To remove all containers and their attached volumes, use the -v option. This will prevent orphaned volumes.

```bash
$ docker rm -v $(docker ps -qa)
```

**Remove all images:**

```bash
$ docker rmi $(docker images -q)
```

**Remove all volumes:**

```bash
$ docker volume rm $(docker volume ls -q)
```

Want to get fancy and only remove a group of containers based off their name.

**Remove containers by name:**

```bash
$ docker rm -v $(docker ps -a | awk '{ print $1 }' | grep magento)
```

**Remove images by name:**

```bash
docker rmi $(docker images -a | awk '{ print $1,$2,$3 }' | grep magento | awk '{print $3 }')
```