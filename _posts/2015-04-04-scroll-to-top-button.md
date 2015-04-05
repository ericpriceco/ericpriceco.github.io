---
layout: post
title: Scroll To Top Button
date: 2015-04-04
tags: jquery
published: true
---

Adding a scroll-to-top button makes a conveniant way for readers to get back to the top navigation, especially for a lengthy scroll on a mobile screen. Below is an example of a scroll-to-top button that appears when scrolling down a specific distance and disappers when scrolled back to the top.

Make sure you have the jQuery script at the bottom of your page to make these work.

```html
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
```

Tip: It's best practice to store your javascript in a separate file and calling it after your jQuery source tag instead of including it in your markup.

### HTML

```html
<a href="#" class="scrollBtn">
    <span>^</span>
</a>
```

### CSS

```css
.scrollBtn {
    text-align: center;
    background: rgba(0,0,0,0.5);
    padding: 0.5em 0.5em 0em 0.5em;
    bottom: 0;
    right: 0;
    margin: 0 1em 0.7em 0;
    position: fixed;
    font-size: 1.5em;
    font-weight: 700;
    color: #f7f7f7;
    border-radius: 3px;
}

a:hover.scrollBtn,a.scrollBtn {
    text-decoration: none;
}
```

### Javascript

```javascript
$(function() {
    'use strict';
    
    var myButton = $('.scrollBtn');
    var myWindow = $(window);
    
    myButton.hide();
    
    myWindow.on('scroll', function() {
            if ($(this).scrollTop() > 800) { //height from top to trigger
                myButton.show();
            }
            else {
                myButton.hide();
            }
    });
    myButton.click(function(){
		$('html, body').animate({scrollTop : 0},800);
		return false;
	});
});
```

You can see this in action on any of my pages. Shoot me a message if you have any questions.