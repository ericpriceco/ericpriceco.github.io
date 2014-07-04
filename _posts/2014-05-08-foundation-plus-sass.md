---
layout: blogpost
title: Getting Started with SASS and Foundation
date: 2014-05-08
tags: sass foundation
categories: sass foundation
image: /images/blog/sass-foundation.png
published: true
---

In this article I'm going to show you how to use SASS with the Foundation framework. Since it's not recommended to edit the massive stylesheet that comes with Foundation, SASS can come into play with its partial system that will compile your custom style sheet with Foundations into one file. I will talk more about partials and variables in my next post. Visit SASS's basic page for more information. [http://sass-lang.com/guide](http://sass-lang.com/guide)

Note: This guide is tailored to Mac users. Sorry PC and Linux users. I will work on a guide for you too.

There are programs out there like CodeKit that can do all this for you, but where's the fun in that plus this is free.

### 1. Install Xcode

The first step is to install Xcode from the App Store. It includes development libraries needed for most of the packages we will install. After it's installed, open Xcode to accept the license agreement and finish the install. 

### 2. Install Homebrew

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

Update Xcode-select and re-run brew doctor until you get: “Your system is ready to brew"

### 3. Install Rbenv
[https://github.com/sstephenson/rbenv](https://github.com/sstephenson/rbenv)

Another similar ruby packager is RVM, but I ran into issues where RVM screwed my ruby environment and was a pain to clean up. I have yet to experience this issue with Rbenv.

Command:

```
brew install rbenv ruby-build
```
     
### 4. Install Ruby

Run Rbenv to install version 2.1.0 of Ruby:

```
rbenv init
rbenv install 2.1.0
```

Run brew doctor again to scan the package system before moving on:

```
brew doctor
brew update
```
     
### 5. Install NodeJS and NPM (node package manager)

Next we are going to install NodeJS and NPM:

```
brew install node
```

### 6. Install Foundation

Install latest version of Foundation through Ruby:

```
sudo gem install foundation
```

### 7. Install Bower

Bower is the tool Foundation uses to install or update a Foundation project.

```
sudo npm install -g bower grunt-cli
```

### 8. Install Compass

Compass is CSS authoring framework that uses SASS to generate your stylesheets manually or in real-time during editing.

```
sudo gem install compass
```

### 9. Create Foundation Project

Next we are going to create a Foundation project. Change to the directory you want to store your project and run:

```
foundation new test-project
```

If you were to open index.html in your new project, you will see no styling at all. That's because the scss file needs to be compiled into a stylesheet. Change to your project folder and compile:

```     
cd test-project
compass compile
```
    
You can have compass watch for changes in real-time and it will auto compile your stylesheet when you save a change to your scss files.

```
compass watch
```

Congratulations for taking the first steps in what should make your development life easier.
