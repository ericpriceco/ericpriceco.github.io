---
title: Creating a AWS GovCloud account and sub-accounts
date: 2025-01-16 10:00:00 -0700
tags:
    - aws
    - govcloud
keywords:
    - aws
    - govcloud
---

Creating a AWS GovCloud account is not very straightforward and the docs are not very clear on all the steps, so I'm going to go through this process to help you out.

Before creating a GovCloud account, you first need a commercial account. The billing side of things is handled through the commercial account and the only interaction between commercial and GovCloud is billing. When you create a GovCloud account, it creates an additonal linked commercial account for those billing purposes. I suggest using AWS Organizations before starting this as it really helps reference and "organize" all these AWS accounts.

## Setup the main/management GovCloud account

If you're using AWS Organizations, you will want to sign-up for GovCloud through the master account. Login as the root user in the master commercial account and go to the "My Account" page by clicking the root username in the top right and clicking "Account". Scroll down near the bottom and look for a sign-up link for GovCloud. It will require signing an addendum and then you wait for an email saying it's approved with a link to set the name for the new account.

GovCloud accounts don't use a root user and instead use an IAM user "Administrator". This user is affected by the password expiration policy, so be mindful for that in the future.

If you look at AWS Organizations on the commercial side, you should see a new account; however, this account ID is not the same account ID on the GovCloud side and again is mainly for that billing link.

You will need to setup AWS Organizations on the GovCloud side since it's not aware of anything on the commercial side.

## Setup a sub-account on GovCloud

Creating a sub-account is a little different from the commercial side since you don't know what the GovCloud account ID is right away.

On the commercial side, run the following command on your master account. The profile will differ for your setup.
```bash
aws organizations create-gov-cloud-account \                                                                            --email "govmain@example.com" \
  --account-name "Gov Cloud Main" \
  --profile commercial-main
```

This will take a few minutes and you will eventually see a new account on the commercial side, but like I mentioned, this account ID is not your GovCloud account ID and is just an empty account for billing purposes.

To see the GovCloud account ID, run the following command:
```bash
aws organizations list-gov-cloud-accounts --profile commercial-main
```
This will show the linked account IDs. Copy the account ID for the GovCloud account and invite it to your GovCloud organization by going to Accounts > Invitations and enter the GovCloud account ID.

## Accept the sub-account invitation

Sub-accounts in GovCloud don't have any root or "Administrator" users and require going through the master account.

Login in as the Administrator user on the GovCloud management/master account and click the user in the top right and click "Switch Role". Enter the new sub-account ID and "OrganizationAccountAccessRole" for the role. Go to AWS Organizations and click accept under Invitations.
