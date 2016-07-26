---
layout: post
title: Dynamic hosts file with Ansible
date: 2016-07-27
tags: ansible
categories: ansible
published: true
---

Below is an Ansible template file I use for generating a hosts file. 

```
127.0.0.1 localhost.localdomain localhost
{% raw %}
{% for item in play_hosts %}
	{% set hostname = item.replace("_", "-") %}
	{% if 'ansible_eth0' in hostvars[item] %}
		{{ hostvars[item]['ansible_eth0']['ipv4']['address'] }} {{ hostname | regex_replace('^sgmc-[a-z]*-', '') }} {{ hostname }} {{ hostname + '.domain.com' }}
	{% endif %}
{% endfor %}
{% endraw %}
```

The first part of the host loop grabs the IP address, then the hostname while removing all text before the server name, followed by the full server name.

In my case when using this with AWS, I specify the EC2 VPC in the ec2.ini file, so the dynamic inventory only talks to its own environment.  In the playbook, I first gather ec2_facts and then generate the hosts file.

```yaml
tasks:

    - name: EC2 Facts
  	  action: ec2_facts

    - name: Generate /etc/hosts file which contains the servers in the VPC
      template: src=hosts dest=/etc/hosts owner=root group=root mode=0644
```