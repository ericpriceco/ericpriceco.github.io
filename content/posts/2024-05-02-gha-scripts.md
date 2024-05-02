---
title: Batch remove GHA workflow runs and logs 
date: 2024-05-02 10:00:00 -0700
tags:
    - gha
keywords:
    - gha
---

If you remove a GHA workflow from a repo and there is a history of runs, it doesn't actually remove it from the Github UI until you clean up the old runs. This is a script to remove all runs and/or logs for a given workflow. Your Github organization will need to set on the endpoint or removed entirely if not part of an organization.

```bash
#!/usr/bin/env bash

# Delete all logs or runs for a given workflow
# Usage: workflow_cleanup.sh <repository> <workflow-name> <job (logs or runs)>

set -oe pipefail

REPOSITORY=$1
WORKFLOW_NAME=$2
JOB=$3

# Validate arguments
if [[ -z "$REPOSITORY" ]]; then
  echo "Repository is required"
  exit 1
fi

if [[ -z "$WORKFLOW_NAME" ]]; then
  echo "Workflow name is required"
  exit 1
fi

echo "Getting all completed runs for workflow $WORKFLOW_NAME in $REPOSITORY"

RUNS=$(
  gh api \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/repos/<org>/$REPOSITORY/actions/workflows/$WORKFLOW_NAME/runs" \
    --paginate \
    --jq '.workflow_runs[] | select(.conclusion != "") | .id'
)

echo "Found $(echo "$RUNS" | wc -l) completed runs for workflow $WORKFLOW_NAME"

# Delete logs for each run
if [ "$JOB" == "logs" ]; then
  for RUN in $RUNS; do
    echo "Deleting logs for run $RUN"
    gh api \
      --silent \
      --method DELETE \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "/repos/<org>/$REPOSITORY/actions/runs/$RUN/logs" || echo "Failed to delete logs for run $RUN"

    # Sleep for 100ms to avoid rate limiting
    sleep 0.1
  done
fi

# Delete all runs for a workflow
if [ "$JOB" == "runs" ]; then
  for RUN in $RUNS; do
    echo "Deleting run $RUN"
    gh api \
      --silent \
      --method DELETE \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "/repos/<org>/$REPOSITORY/actions/runs/$RUN" \

    # Sleep for 100ms to avoid rate limiting
    sleep 0.1
  done
fi
```

I also had an issue with a workflow step that is always set to run and was set to the a runner type that doesn't exist (self-hosted runners) and there was no way to stop it through the UI. This is a script to force stop that job. Your Github organization will need to set on the endpoint or removed entirely if not part of an organization.

```bash
#!/usr/bin/env bash

# Force cancel a workflow. Jobs that have an "always" run flag are not cancellable through the UI.
# Usage: workflow_force_stop.sh <repository> <run_id>

set -oe pipefail

REPOSITORY=$1
RUN_ID=$2

# Validate arguments
if [[ -z "$REPOSITORY" ]]; then
  echo "Repository is required"
  exit 1
fi

if [[ -z "$RUN_ID" ]]; then
  echo "Run ID is required"
  exit 1
fi

gh api \
  --silent \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/<org>/$REPOSITORY/actions/runs/$RUN_ID/force-cancel"
```
