---
layout: post
title: Install Jekyll on OSX
date: 2015-01-13
tags: jekyll
categories: jekyll
published: true
---

If you're not familiar with [Jekyll](http://jekyllrb.com/), it's a parsing engine that takes partial html files, text and markdown files and converts them into a working website. The great thing about Jekyll is you can create a dynamic blog using only static files without a need for database.

One big plus is being able to host a site on Github for free. Jekyll is built-in to Github and generates your site for you.

### Install Xcode

The first step is to install Xcode from the App Store. It includes development libraries needed for most of the packages we will install. After it's installed, open Xcode to accept the license agreement and finish the install.

### Install Homebrew

Homebrew is package manager for OSX similar to macports that comes with OSX; however, Homebrew has a better community with more frequent package updates. Plus, a package will not overwrite a similar native OSX package causing future problems.

Open your terminal and run the following command:

```
ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)”
```

During the install it will ask for your user account password. A prompt will come up asking to install “Xcode-select”, which is the Xcode CLI tools. Click the Install button.

When finished run these commands in the terminal:

```
brew doctor
brew update
```

Brew doctor scans your homebrew environment for any possible issues before installing a package and brew update refreshes the repository list.

If you get a warning after running brew doctor saying your Xcode-select CLI tools are out of date, you can grab the latest version outside the app store from the link below:

[https://developer.apple.com/downloads/index.action](https://developer.apple.com/downloads/index.action)

### 3. Install RVM
[https://rvm.io/](https://rvm.io/)

The Ruby Version Manager manages multiple installations of Ruby and ruby gemsets. This command installs the manager along with the current version of ruby.

```
\curl -sSL https://get.rvm.io | bash -s stable --ruby
```

### 4. Brew Check

Run brew doctor again to scan the package system before moving on:

```
brew doctor
brew update
```

### Install Jekyll

```
gem install jekyll
```

That's it! You now have Jekyll installed and the real fun can begin by creating your next Jekyll project.

### Create Jekyll Project

Creating a new jekyll project couldn't be easier. Run the following in a location you want to store your project:

```
jekyll new myblog
cd myblog
```

If you open index.html in a text editor, you will see a [YAML](http://yaml.org/) Frontmatter block at the top separated by three dashes. These three dashes at the top and bottom are needed to tell Jekyll it's a YAML block. Below that you will see some HTML markup and [Liquid](http://jekyllrb.com/docs/templates/) tags. These tags can be pretty powerful and will make your blog a dynamic one.

### Build Project

Now we need to convert the files to a functional site:

```
jekyll build
```

After running the build, you will see a new folder called "\_site". This is where your converted site is located. You can host the site locally by running this command while in the project folder:

```
jekyll serve
```

Open your browser and go to either http://0.0.0.0:4000 or http://localhost:4000 to see your Jekyll powered site.

In my next post I will cover creating a blog with partials and layouts.
