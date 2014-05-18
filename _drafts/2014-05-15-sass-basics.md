---
published: false
---

## Basics of SASS and Compass

SASS has made my web development life so much easier and I want to share some of the basics I've learned using it on a daily basis. If you're not familiar with SASS, it's a CSS preprocessor that allows you to use variables, mixins and partials. You can read more on their documentation page [here](http://sass-lang.com/documentation/file.SASS_REFERENCE.html). If you haven't installed it yet, you can find the steps in my last post on the getting started with Foundation and SASS. ([http://eric-price.co/blog/foundation-plus-sass/](http://eric-price.co/blog/foundation-plus-sass/))

Using SASS allows you to apply the [DRY](http://en.wikipedia.org/wiki/Don't_repeat_yourself) (Dont Repeat Yourself) principle to your website development with variables and mixins. For example, you can assign a color code to a variable and call that variable anywhere in your stylesheet. The plus side to doing this, is you only have to modify that one variable to apply that change everywhere it was called.

I'm going to use the Foundation framework in this article; however, you can use SASS with almost anything with a little know how. Using SASS with Foundation is practically a neccesity to take advantage of their built-in SASS variables. When starting a Foundation project, the first thing to do is create a partial file to hold your custom settings since it's not recommended to touch the original Foundation settings.

#### Partials

Partials allow you to split up your CSS code into logical separate files, which will then be compiled into a single stylesheet with @import. Partial file names start with an underscore to tell SASS what they are.

When you install the SASS version of Foundation (see my post), you will find a folder called "scss". This is where you will store you custom settings. You can name the file anything as long as it starts with an underscore and ends with the ".scss" extension. (ex: \_custom.scss)

We need to point Foundation to the new partial. Open up "app.scss" in the scss folder and add your partial below "@import foundation;". It's important that it's last to load so it will be compiled into the stylesheet last.

app.scss:

	@import "settings";
	@import "foundation";
	@import "custom";

After adding in some CSS to your custom partial you need to compile it. In the root of your project run:

	compass watch
    
While running compass in watch mode, it will automatically compile your sass when it detects a change after saving. You can also compile one time with:

	compass compile
    
#### Variables

Variables is where it starts to get fun. You can assign a declaration to a variable and call it anywhere in your CSS. This means you can apply the [DRY](http://en.wikipedia.org/wiki/Don't_repeat_yourself) (Dont Repeat Yourself) principle to your website development. Imagine only needing to change a single variable for a color that is used is several places across your site. Beautiful!

SASS variables start with a $ and can be named anything you want as long as it hasn't been used previously. These example variables would be placed in your custom partial file before they called:

	$primary-color: #f7f7f7;
    $secondary-color: #f2f2f2;
    $box-margin: 2em;

Calling the variable in your declaration:

	h4 {color: $primary-color;}
    p {margin: $box-margin;}
    button {color: $secondary-color;}
    
SASS will convert it to CSS after compiling.
    
    
    







