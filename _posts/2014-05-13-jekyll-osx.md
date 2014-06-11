---
layout: blogpost
title: Install Jekyll on OSX
date: 2014-05-10
tags: jekyll
published: true
---

If you're not familiar with [Jekyll](http://jekyllrb.com/), it's a parsing engine that takes partial html files, text and markdown files and converts them into a working website. The great thing about Jekyll is you can create a dynamic blog without a database and only using static files. 

A few things come to mind when you no longer need a database. No single point of failure, backups are easy and you can host your site almost anywhere. I host this site on Github for free and with jekyll built-in to Github, it's a no brainer.

Now let's get started!

#### Install Xcode

The first step is to install Xcode from the App Store. It includes development libraries needed for most of the packages we will install. After it's installed, open Xcode to accept the license agreement and finish the install.

#### Install Homebrew

Homebrew is package manager for OSX similar to macports that comes with OSX; however, Homebrew has a better community with more frequent package updates. Plus, a package will not overwrite a similar native OSX package causing future problems.

Open your terminal and run the following command:

	ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)”

During the install it will ask for your user account password. A prompt will come up asking to install “Xcode-select”, which is the Xcode CLI tools. Click the Install button.

When finished run these commands in the terminal:

	brew doctor
	brew update

Brew doctor scans your homebrew environment for any possible issues before installing a package and brew update refreshes the repository list.

If you get a warning after running brew doctor saying your Xcode-select CLI tools are out of date, you can grab the latest version outside the app store from the link below:

[https://developer.apple.com/downloads/index.action](https://developer.apple.com/downloads/index.action)

#### Install Rbenv (ruby package manager)

[https://github.com/sstephenson/rbenv](https://github.com/sstephenson/rbenv)

Another similar ruby packager is RVM, but I ran into issues where RVM screwed my ruby environment and was a pain to clean up. I have yet to experience this issue with Rbenv.

Command:

	brew install rbenv ruby-build

#### Install Ruby

Run Rbenv to install version 2.1.0 of Ruby:

	rbenv init
	rbenv install 2.1.0

Run brew doctor again to scan the package system before moving on:

	brew doctor
	brew update

#### Install Jekyll

	gem install jekyll

That's it! You now have Jekyll installed and the real fun can begin by creating your next Jekyll project.

#### Create Jekyll Project

Creating a new jekyll project couldn't be easier. Run the following in a location you want to store your project:

	jekyll new myblog
    cd myblog

If you open index.html in a text editor, you will see a [YAML](http://yaml.org/) Frontmatter block at the top separated by three dashes. These three dashes at the top and bottom are needed to tell Jekyll it's a YAML block. Below that you will see some HTML markup and [Liquid](http://jekyllrb.com/docs/templates/) tags. These tags can be pretty powerful and will make your blog a dynamic one.

#### Build Project

Now we need to convert the files to a functional site:

	jekyll build
  
After running the build, you will see a new folder called "\_site". This is where your converted site is located. You can host the site locally by running this command while in the project folder:

	jekyll serve
    
Open your browser and go to either http://0.0.0.0:4000 or http://localhost:4000 to see your Jekyll powered site.

In my next post I will cover creating a blog with partials and layouts.
