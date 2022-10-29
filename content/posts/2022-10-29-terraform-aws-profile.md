---
title: Shell shortcut function for multiple AWS profiles in Terraform
date: 2022-10-12 10:00:00 -0700
tags:
    - aws
    - terraform
    - shell
keywords:
    - aws
    - terraform
    - shell
---

I work with multiple AWS accounts, each with their own profile name in my AWS config file. For Terraform to know which profile to use for credentials, you have a couple of choices: set the profile name in the AWS provider block in the Terraform file or supply an environment variable or Terraform variable.

When working with multiple people, you could all agree on the same profile name in the local configs to put in the provider. In my case, we run a scheduled audit script to report Terraform drift that cannot use profiles, so that option isn't going to work. Since I want as few keystrokes as possible when running my Terraform commands, I came up with a shell function to supply the AWS_PROFILE environment variable depending on my current working directory.

This will change depending on how you structure your multiple account Terraform setup. If you use oh-my-zsh with the Terraform plugin, the "tf" shorcut will conflict.

```bash
function tf() {
  if [[ $PWD == "/Users/username/repo/terraform/account1"* ]]; then
    AWS_PROFILE=account1 terraform $@
  elif [[ $PWD == "/Users/username/repos/terraform/account2"* ]]; then
    AWS_PROFILE=account2 terraform $@
  else
    terraform $@
  fi
}
```
