---
published: false
---

## Basics of SASS and Compass

SASS has made my web development life so much easier and I want to share some of the basics I've learned using it on a daily basis. If you're not familiar with SASS, it's a CSS preprocessor that allows you to use variables, mixins and partials. You can read more on their documentation page [here](http://sass-lang.com/documentation/file.SASS_REFERENCE.html). If you haven't installed it yet, you can find the steps in my last post on the getting started with Foundation and SASS. ([http://eric-price.co/blog/foundation-plus-sass/](http://eric-price.co/blog/foundation-plus-sass/))

Using SASS allows you to apply the [DRY](http://en.wikipedia.org/wiki/Don't_repeat_yourself) (Dont Repeat Yourself) principle to your website development with variables and mixins. For example, you can assign a color code to a variable and call that variable anywhere in your stylesheet. The plus side to doing this, is you only have to modify that one variable to apply that change everywhere it was called.

I'm going to use the Foundation framework in this article; however, you can use SASS with anything with a little know how. Using SASS with Foundation is practically a neccisity to take advantage of their built-in SASS variables. When starting a Foundation project, the first thing to do is create a partial file to hold your custom settings since it's not recommended to touch the original Foundation settings.

#### Partials

Partials allow you to split up your CSS code into logical separate files, which will then be compiled into a single stylesheet with the @import option. Partial files start with an underscore to tell SASS what they are.

When you install the SASS version of Foundation (see my post), you will find a folder called "scss". This is where you will store you custom settings. You can name the file anything as long as it starts with an underscore and ends with the ".scss" extension. (ex: \_custom.scss)

Now we point Foundation to the new partial. Open up "app.scss" in the scss folder and add your partial below "@import foundation;". It's important that it's last to load so it will be compiled into the stylesheet last.

app.scss:

	@import "settings";
	@import "foundation";
	**@import "custom";**

