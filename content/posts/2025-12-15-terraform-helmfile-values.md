---
title: Generate values for Helmfile from Terraform
date: 2025-12-15 11:00:00 -0700
tags:
    - helmfile
    - terraform
keywords:
    - helmfile
    - terraform
---

I use [Helmfile](https://github.com/helmfile/helmfile) to manage third-party helm charts such as Karpenter for my EKS clusters since it's simple and flexible to use across multiple environments. I used to use Terraform to manage third-party helm charts; however, I came across random weirdness when running a Terraform plan/apply and it also required myself to be on the VPN to run Terraform commands to talk to the EKS control plane API.

Below I'm going to show two ways to generate values from Terraform such as EKS cluster and IAM role details to be referenced in values files used by Helmfile. No need to hardcode the files!

If you have a monorepo with your Helmfiles and Terraform, it's pretty simple to do this.

Most of these values are used for the Karpenter helm chart as you can see. In this example, it's saving a values file in the helm directory outside the Terraform directory.

### Terraform
```terraform
resource "local_file" "helmfile_values" {
  filename = "../../../../helm/services/terraform/${local.env}_values.yaml"
  content = yamlencode({
    region                          = local.region
    cluster_name                    = module.eks.name
    "${local.env}_cluster_name"     = module.eks.name
    cluster_endpoint                = module.eks.endpoint
    "${local.env}_cluster_endpoint" = module.eks.endpoint
    "${local.env}_cluster_cert"     = module.eks.certificate
    karpenter_interruption_queue    = module.karpenter.sqs_queue_name
    karpenter_iam_role              = module.karpenter.iam_controller_role
    karpenter_iam_instance_profile  = module.karpenter.iam_instance_profile
    lb_controller_iam_role          = module.lb_controller.iam_role
  })
}
```

Here we're simply referencing the generated values file that could be used for any of the helm charts in your helmfile. You can also add a reference to the values file under a specific helm chart if you didn't want it global.

### Helmfile
```yaml
environments:
  default:
    values:
      - env:
          name: "staging"
      - ../../services/terraform/staging_values.yaml
```

Below is a more advanced method I currently use if your helmfiles are located in another repo.

Here we're saving the generated values to AWS SSM and these will be pulled in by Helmfile with a hook during runtime.

### Terraform
```terraform
resource "aws_ssm_parameter" "helmfile_values" {
  name = "/eks/${local.env}/helmfile_values"
  type = "SecureString"
  value = jsonencode({
    region                          = local.region
    cluster_name                    = module.eks.name
    "${local.env}_cluster_name"     = module.eks.name
    cluster_endpoint                = module.eks.endpoint
    "${local.env}_cluster_endpoint" = module.eks.endpoint
    "${local.env}_cluster_cert"     = module.eks.certificate
    karpenter_interruption_queue    = module.karpenter.sqs_queue_name
    karpenter_iam_role              = module.karpenter.iam_controller_role
    karpenter_iam_instance_profile  = module.karpenter.iam_instance_profile
    lb_controller_iam_role          = module.lb_controller.iam_role
  })
}
```

The main difference in this method is a bash script that runs first and generates the values file. I would advise setting the values files in .gitignore.

### Helmfile
```yaml
hooks:
  - events: ["prepare"]
    showlogs: true
    command: "bash"
    args:
      - "../../services/terraform/sync-ssm.sh"
      - "staging"

environments:
  default:
    values:
      - env:
          name: "staging"
      - ../../services/terraform/staging_values.yaml
```

This bash script will fetch the SSM parameter and format it.

```bash
#!/bin/bash
# Sync helmfile values from AWS SSM Parameter Store
# Usage: ./sync-ssm.sh <environment> [profile]

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
if [[ -z "$1" ]]; then
  echo "Usage: $0 <environment> [profile]"
  echo "Examples:"
  echo "  $0 staging              - Sync staging environment"
  exit 1
fi

ENV="$1"
PROFILE="$2"
OUTPUT_FILE="${SCRIPT_DIR}/${ENV}_values.yaml"

echo "Syncing SSM values for ${ENV} using AWS profile ${PROFILE}..."

if aws ssm get-parameter \
     --name "/eks/${ENV}/helmfile_values" \
     --query "Parameter.Value" \
     --output text \
     --profile "${PROFILE}" 2>/dev/null | \
   jq -r 'to_entries | map("\"\(.key)\": \"\(.value)\"") | .[]' > "${OUTPUT_FILE}"; then
  echo "✓ Synced to ${OUTPUT_FILE}"
else
  echo "✗ Failed to fetch ${ENV} (parameter may not exist)" >&2
  exit 1
fi
```

That's it for avoiding the need to put some of those hardcoded values in your helmfiles.