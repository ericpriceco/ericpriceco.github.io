---
title: Analyze and secure Dockerfiles in CI/CD with OPA
date: 2016-12-08 22:54:49
category: notes
tags:
    - docker
    - opa
    - jenkins
keywords:
   - docker
   - opa
   - jenkins
---
This guide will describe how you can use [OPA][opa] (Open Policy Agent) to analyze Dockerfiles in your CI/CD pipelines to enforce best practices and security. I will be using Jenkins in the examples; however, any CI/CD service out there that uses Docker for building will apply.

OPA uses a rule files written in the Rego language and is easily readable to build off of examples.

Here are some basic rules for best practices and security:

```bash
package main

# Looking for latest docker image used
deny[msg] {
    input[i].Cmd == "from"
    val := split(input[i].Value[0], ":")
    contains(lower(val[1]), "latest")
    msg = sprintf("Line %d: do not use 'latest' tag for base images", [i])
}

# Looking for base image name
deny[msg] {
    input[i].Cmd == "from"
    val := split(input[i].Value[0], ":")[0]
    val != "python"
    msg = "Use only official python image"
}

# Looking for ADD command instead using COPY command
deny[msg] {
    input[i].Cmd == "add"
    val := concat(" ", input[i].Value)
    msg = sprintf("Use COPY instead of ADD: %s", [val])
}

# sudo usage
deny[msg] {
    input[i].Cmd == "run"
    val := concat(" ", input[i].Value)
    contains(lower(val), "sudo")
    msg = sprintf("Avoid using 'sudo' command: %s", [val])
}
```

Here I'm strictly requiring a specific base image, but you could use this rule to look for only base images:

```bash
deny[msg] {
    input[i].Cmd == "from"
    val := split(input[i].Value[0], "/")
    count(val) > 1
    msg = sprintf("Line %d: use a trusted base image", [i])
}
```

Adding this to your CI/CD pipeline is very easy using the Conftest docker image. Below is a snippet from a Jenkinsfile but could be applied to any CI/CD service that uses Docker images for its build steps. Conftest looks for any rego files in a directory and will apply those rules to the file you point it at. 

```bash
stage('Conftest') {
    steps {
        script {
            docker.image("openpolicyagent/conftest").inside("--entrypoint=") {
                sh "conftest test -p ./.jenkins/policy ./Dockerfile"
            }
        }
    }
}
```

For added security, I add the Devops group as owners of the rules and build files in the CODEOWNERS file. We're notified if any changes are made in any project repo.

[opa]: https://www.openpolicyagent.org
