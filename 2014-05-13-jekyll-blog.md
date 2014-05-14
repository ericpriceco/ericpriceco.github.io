##  Creating A Blog With Jekyll

If you're not familiar with Jekyl, it's a parsing engine that static site generator that takes partial html files, text and markdown files and converts them into a working website. I'll explain partials and markdown later. The great thing about Jekyll is you can create a dynamic blog without a database. 

There are a few great things not needing a database. No single point of failure, backups are easy and you can host your site almost anywhere. I host this site on Github for free and with jekyll built-in to Github, it's a no brainer.

First things first, we need to install Jekyll on your system. I'm going to go through steps to install Jekyll on OSX Mavericks.

## Install Xcode

The first step is to install Xcode from the App Store. It includes development libraries needed for most of the packages we will install. After it's installed, open Xcode to accept the license agreement and finish the install.

## Install Homebrew

Homebrew is package manager for OSX similar to macports that comes with OSX; however, Homebrew has a better community with more frequent package updates. Plus, a package will not overwrite a similar native OSX package causing future problems.

Open your terminal and run the following command:

	ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)”

During the install it will ask for your user account password. A prompt will come up asking to install “Xcode-select”, which is the Xcode CLI tools. Click the Install button.

When finished run these commands in the terminal:

	brew doctor
	brew update

Brew doctor scans your homebrew environment for any possible issues before installing a package and brew update refreshes the repository list.

If you get a warning after running brew doctor saying your Xcode-select CLI tools are out of date, you can grab the latest version outside the app store from the link below:

https://developer.apple.com/downloads/index.action

## Install Rbenv (ruby package manager)

https://github.com/sstephenson/rbenv

Another similar ruby packager is RVM, but I ran into issues where RVM screwed my ruby environment and was a pain to clean up. I have yet to experience this issue with Rbenv.

Command:

	brew install rbenv ruby-build

## Install Ruby

Run Rbenv to install version 2.1.0 of Ruby:

	rbenv init
	rbenv install 2.1.0

Run brew doctor again to scan the package system before moving on:

	brew doctor
	brew update



