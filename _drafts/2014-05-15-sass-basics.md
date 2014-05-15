## Basics of SASS and Compass

SASS has made my web development life so much easier and I want to share some of the basics I've learned using it on a daily basis. If you're not familiar with SASS, it's a CSS preprocessor that allows you to use variables, mixins and partials. You can read more on their documentation page [here](http://sass-lang.com/documentation/file.SASS_REFERENCE.html). If you haven't installed it yet, you can find the steps in my last post on the basics of SASS and Foundation. ([http://eric-price.co/blog/foundation-plus-sass/](http://eric-price.co/blog/foundation-plus-sass/))

Using SASS allows you to apply the [DRY](http://en.wikipedia.org/wiki/Don't_repeat_yourself) (Dont Repeat Yourself) principle to your website development with variables and mixins. Finally we get to take advantage of such a common task in software development. 

I like to use a small spectrum of colors in my sites, but use them in a multitude of places (buttons, page sections/containers and navigation) to create a cohesive look. Let's say I decide to change my primary color either by choice or a client request; I will be changing the color code in several spots in my stylesheet. Now I can create a variable, assign a color to it and call that variable wherever I want. If I want to change it, I only need to change the variable. Simple!

I'm going to use the Foundation framework in this article; however, you can use SASS with anything with a little know how. Using SASS with Foundation is practically a neccisity to take advantage of their built-in SASS variables. When starting a Foundation project, the first thing to do before making your changes is to create a partial file.

#### Partials

Partials allow you to split up your CSS snippets into logical separate files, which will then be compiled into a single stylesheet with the @import option. Partial files start with an underscore to tell SASS what they are. It's a good idea not to touch the stylesheets that come with Foundation for two reasons: you can't break it and avoid any future issues upgrading Foundation for that project.

When you install the SASS version of Foundation (see my post),

