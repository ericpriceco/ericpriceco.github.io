---
layout: blogpost
title: PureCSS with SASS
date: 2015-02-20
tags: sass purecss
categories: sass purecss
image: /images/blog/purecss-sass.png
published: true
---

For this site I wanted a very lightweight boilerplate with some nice features. I found [PureCSS](http://purecss.io/) to give me exactly what I wanted without the bloat. All of PureCSS's modules are only 4.4kb when it's minified and gzipped. The only thing it was missing was support for the SASS preprocessor, so I fixed that and put it on [GitHub](https://github.com/eric2025/PureCSS-SASS) for anyone to use.

You only need a ruby environment setup and the compass and sass gems installed to get started. See my previous post on setting it up. [http://eric-price.co/blog/jekyll-osx/](http://eric-price.co/blog/jekyll-osx/)

### Grab the project

````
git clone https://github.com/eric2025/PureCSS-SASS.git
cd PureCSS-SASS
````

Any custom CSS should go in the custom SCSS file in the scss folder and compiled.

### Compile stylesheet

````
compass watch
````


