---
layout: post
title: Remove Unused CSS with Gulp-Uncss
date: 2015-07-18
tags: css
published: true
---

If you use any front-end frameworks like Foundation or Bootstrap, you know the biggest downside is the massive stylesheet they come with by default (>200kb). Customizing it and only picking the modules you need still have large (>100kb) stylesheets.

I use the SASS version of Foundation and used to pick only the modules I needed, which shrunk my CSS by around 50%. After minifying it, I got another 30-40% savings in file size. Not too bad, but if I wanted to add anything new later I had to make sure I had the correct css modules enabled. Not anymore with gulp-uncss!

With gulp and uncss, I leave everything enabled in Foundation or Bootstrap and shrink my CSS from 326kb to 12kb. [https://github.com/giakki/uncss](Uncss) uses PhantomJS to load the HTML files and javascript, and only the used stylesheets are parsed out. [https://github.com/ben-eb/gulp-uncss](Gulp-uncss) uses the [http://gulpjs.com/](Gulp) build tool to automate the process. Let's get started.

### Install Node.js

Go to [https://nodejs.org/](Node.js) to get their installer. This will also get you NPM to install the needed packages.

### Install Gulp

On the command line, go to your project folder and run the following command:

```bash
npm install --save-dev gulp
```

This will install Gulp only to your project folder. If you want to install it globally, you can run the command below:

```bash
npm install -global gulp
```

### Install Gulp-Uncss and Gulp-csso

```bash
npm install --save-dev gulp-uncss
npm install --save-dev gulp-csso
```

If you're wondering, gulp-csso will be used to minify your CSS after it's parsed.

### Create Gulp file

In the root of your project folder, create the gulp build file called gulpfile.js with the code below:

```javascript
var gulp = require('gulp');
var uncss = require('gulp-uncss');
var csso = require('gulp-csso');
gulp.task('default', function() {
    gulp.src('stylesheets/app.css')
        .pipe(uncss({
            html: ['index.html', '/blog/index.html', 'http://localhost:4000']
        }))
        .pipe(csso())
        .pipe(gulp.dest('./out'));
});
```

You will need to modify your guild build file to suite your project. On line 5, you will need to specify where your stylesheet is located. On line 7, you will need to include all HTML file locations. The single wildcard will cover all files in a folder and a double wildcard will look in all folders.

In this example build file, I'm using Jekyll and pointed it to the locally running Jekyll server. 

On line 10 is the output destination. This will create a folder called "out" with the new stylesheet leaving the original intact.

### Run Grunt task

Navigate to the root of your project and run the command below:

```bash
gulp
```

Now take a look at your new much smaller stylesheet. Point your site to the new stylesheet and test, test and more test to make sure everything is still working.


 


