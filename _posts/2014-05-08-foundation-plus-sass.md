---
published: false
---

![foundation sass](/_posts/foundation-sass.png)

In this article I'm going to show you how to use SASS with the Foundation framework. Since it's not recommended to edit the massive stylesheet that comes with Foundation, SASS comes into play with its partial file system that compiles your custom stylesheet with foundations. I will talk more about partials and variables in my next post. Visit their basics page for more info. (http://sass-lang.com/guide)

A partial will house your custom CSS and compile together with Foundations stylesheet. SASS also allows you to apply the DRY (Dont Repeat Yourself) pinciple to your coding with the use of variables.

Imagine a client doesn't like one of the primary colors on your site that is used in several elements on the page and having to change the color code on each of those elements in your stylesheet. Pain in the a##. You can assign a color code to a variable and call that variable anywhere in the SASS file allowing you to make the change once. This is just a couple of the amazing things SASS can do. Visit their basics page for more info. (http://sass-lang.com/guide)

The guide below is for Mac users

1. Install Xcode through the App Store
    Xcode is a requirement for these installations. Includes required development libraries. After it installed, open Xode to Accept the agreement and finish the install.

          

2. Install Homebrew
     Homebrew is package manager for OSX similar to macports that comes with OSX; however, Homebrew has a better community with more frequent package updates. Plus, a package will not overwrite a similar native OSX package causing future problems.

ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)”

During the install it will prompt for your user account password. A prompt will come up asking to install “Xcode-select”, which is the Xcode CLI tools. Click the Install button.

When finished run:
     brew doctor
     brew update

Brew doctor scans your home-brew environment for any possible issues before installing a package and brew update refreshes the repository list.

If you get a warning after running brew doctor saying your Xcode-select CLI tools are out of date, you can grab the latest version outside the app store from the link below:

https://developer.apple.com/downloads/index.action

Update Xcode-select and re-run brew doctor until you get: “Your system is ready to brew"

3. Install Rbenv (https://github.com/sstephenson/rbenv)
     Another similar ruby packager is RVM, but I ran into issues where RVM screwed my ruby environment and was a pain to clean up. I have yet to experience this issue with Rbenv.

     Command:
     brew install rbenv ruby-build
     
     Once installed run Rbenv to install version 2.1.0 of Ruby :
     rbenv init
     rbenv install 2.1.0

      Run brew doctor again to scan the package system before moving on:
      brew doctor
     brew update
     
     Next we are going to install NodeJS and NPM with the command below:
     brew install node
          
     Install latest version of Foundation through Ruby:
     sudo gem install foundation

     Install Bower, which is the tool Foundation uses to install or update a Foundation project.
     sudo npm install -g bower grunt-cli

     The Compass gem will need to be installed next. Compass is CSS authoring framework that uses SASS to generate your stylesheets automatically in real-time.

     sudo gem install compass

     Next we are going to create a Foundation project. Change to the directory you want to store your project and run:
     foundation new new-project

     We now need to do the first SASS compile using compass to generate the CSS files.
     cd new-project
     compass compile

Congratulations for using the command line to start your next Foundation project. Happy coding!



