---
layout: post
title: Rails - Configure Paperclip for AWS S3
date: 2015-08-10
tags: rails
published: true
---

This is going to assume you already have Paperclip setup for local storage in your rails app. If not, Thoughtbot's [quickstart](https://github.com/thoughtbot/paperclip#quick-start) guide on their github page will get you going very easily.

There are plenty of reasons for using cloud storage service like S3 for your rails app; performance being a big one. The main reason I use it, is it still allows me to use Heroku's hosting service. This guide will be more focused on using Heroku with S3.

If you haven't created an AWS account, head over [here](https://aws.amazon.com/) to create one. Take note of your access-id and secret-key for use later. If you need them again, they will need to be regenerated in the Security Credentials screen. Select the S3 service and create a new 'bucket' to store your files.

The first thing you need to do is add the AWS gem to your gemfile.

### Gemfile

```ruby
#AWS SDK for S3
gem 'aws-sdk', '< 2.0'
```

The version specification is very important. As of right now, the 2.x version of the aws-sdk gem will most likely give you a method instance error when attaching a file.

Install your gem.

```ruby
bundle install
```

Restart your rails server to apply the changes.

### Setup Development Environment

Create a new file called 'aws.yml' in the config folder and put in your keys. The AWS-SDK gem will automatically read this file.

```ruby
development:
  access_key_id: YOUR ACCESS KEY
  secret_access_key: YOUR SECRET KEY
```

You could setup a production section in this file here as well, but I'm going to set that up a little differently with Heroku.

VERY IMPORTANT!! Add the 'aws.yml' file to '.gitignore' to prevent anyone from seeing your access keys after pushing these changes.

.gitignore

```ruby
# Ignore application configuration
/config/aws.yml
```

Open 'config/environments/development.rb':

```ruby
config.paperclip_defaults = {
  :storage => :s3,
  :s3_host_name => 's3-us-west-2.amazonaws.com',
  :s3_credentials => {
    :bucket => 'bucketname'
    }
  }
```

The S3 host name will vary depending on what region you select when creating your 'bucket'. That line is not actually needed if the region is US Standard.

### Setup Production Environment

Open 'config/environments/production.rb':

```ruby
  config.paperclip_defaults = {
  :storage => :s3
  :s3_host_name => 's3-us-west-2.amazonaws.com',
  :s3_credentials => {
    :bucket => ENV['S3_BUCKET_NAME'],
    :access_key_id => ENV['AWS_ACCESS_KEY_ID'],
    :secret_access_key => ENV['AWS_SECRET_ACCESS_KEY']
    }
  }
```

Again, the S3 host name will vary. The difference here is the bucket and keys are variables that we will setup on Heroku in the next section.

### Setup Heroku

Open your terminal:

```bash
$ heroku config:set S3_BUCKET_NAME=your_bucket_name
$ heroku config:set AWS_ACCESS_KEY_ID=your_access_key_id
$ heroku config:set AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

These commands will create the config variables for the specific Heroku app.

### End Thoughts

Again, don't forget to add the aws.yml file to your gitignore. Avoid that surprise of a AWS bill in the thousands due to someone using your AWS keys.

If you get any permission errors, check the AWS IAM console for any permission problems, especially if you created a user/group through there specifically for this.

Like me, you may want to use S3 only for the production side since we now have it working. Just need to comment out the 'config.paperclip_defaults' section in 'development.rb' and it will go back to using local storage.
