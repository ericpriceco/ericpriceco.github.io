---
layout: post
title: Animate a Navigation Bar on Scroll
date: 2015-03-20
tags: jquery
published: true
---

For a better user experience, especially on a mobile screen, the fixed navigation bar takes precious screen real estate that can be used for content. I've created a couple of jQuery code samples that can be used for different scenarios.

Make sure you have the jQuery script at the bottom of your page to make these work.

```html
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
```

### Demo 1

The first demo pulls down the navigation bar when the someone scrolls down a specified length and hides when they scroll back up to the top. A good case for this is a slimmer navbar that comes down making navigation available at all times and disappears when they reach the top where there might be a larger nav menu with more options.

### HTML

```html
<nav>
<!--
Your navigation content here.
-->
</nav>
```

### CSS

```css
nav {
    background: #fff;
    height: 40px;
    border-bottom: 1px solid #dedede;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 99;
    width: 100%;
}
```

The height of the navigation bar can be adjusted.

### Javascript

```javascript
$(function() {
    'use strict';
    var navBar = $('nav'); //Targets nav element
    var myWindow = $(window);

    navBar.hide();

    myWindow.on('scroll', function() {
        if ($(this).scrollTop() > 400) { //height from top to trigger slideDown
            navBar.slideDown();
        }
        else if ($(this).scrollTop() < 50) { //height from top to hide navbar
            navBar.slideUp();
        }
    });
});
```

Tip: It's best practice to store your javascript in a separate file and calling after your jQuery source tag instead of including it in your markup.

### See it in Action

Here you can see it running: [https://jsfiddle.net/eric2025/xj4t7rfk/4/](https://jsfiddle.net/eric2025/xj4t7rfk/4/)

### Demo 2

This demo is my favorite method since it frees the screen of any navigation bars until the user starts to scroll up. When they reach the top, it hides itself. The same HTML and CSS snippets from the first demo apply here, so I will just show the javascript.

### Javascript

```javascript
$(function() {
    'use strict';
    var navBar = $('nav'); //Targets nav element
    var myWindow = $(window);
    var myPosition;
    var navScroll;

    navBar.hide();

    myWindow.on('scroll', function() {
        navScroll = myWindow.scrollTop();
        if (navScroll < myPosition) { //height from top to trigger slideDown
            navBar.slideDown();  
        }
        else {
            navBar.slideUp();
        }
        myPosition = myWindow.scrollTop();
        if ($(this).scrollTop() === 0) { //hides when reached top
            navBar.slideUp();
        }
    });
});
```

### See it in Action

Here you can see it running: [https://jsfiddle.net/eric2025/retnvt6q/2/](https://jsfiddle.net/eric2025/retnvt6q/2/)
