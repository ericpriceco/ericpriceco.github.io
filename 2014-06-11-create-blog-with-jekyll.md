I'm going to go through the steps to create a site and blog using Jekyll. This assumes you already have Jekyll installed on your system. If you dont, my previous post goes through the beginning steps on setting up Jekyll. 

Even if you dont want a blog, Jekyll can make the development process easier with the use of its partial system. If you have worked with Wordpress or similar CMS, this will be familiar to you. This allows you to splice up your site into seperate files such as header, footer and navigation, and called on any number of pages. This means you only need to edit a single file for a header or footer that is used across the site.

#### Create a Jekyll Project

Open up your terminal, change to the folder you want to store your project and create your new jekyll project with the name of your choosing:

	jekyll new myblog
	cd myblog
    
#### Jekyll Folder Structure

\_includes: This folder is where you store your partials like your header.html and footer.html. You can have as many partials as you need.

\_layouts: How your pages are structured is located here. For example, I have a main.html file that most of my pages use and a specific layout of blogposts. Your pages will call this layout to use.

\_posts: Thos folder contains your posts in Markdown format.

#### Existing or New Site

For my projects I use the SASS version of the Foundation framework, but you can use anything for your Jekyll project. My typical process is to create a Foundation project and copy over the needed contents to the new Jekyll project folder. I will then start creating my layouts and partials. See my post on setting up a Foundation project using SASS.

#### Includes (Partials)

First we are going to start by creating the partial files that will be included in your layout file. Change to the \_includes folder and create two files: header.html and footer.html. The header file should contain everything from the top HTML tag to the opening BODY tag. If your navigation menu is the same on each page, copy that as well.

Example header.html:

	<!doctype html>
	<html class="no-js" lang="en">
  	<head>
    <title>{{ page.title }}</title>
    </head>
   	<body>
   	< Menu Bar Content >
    
Change your page title name to the following in your head tag: 

 	<title>{{ page.title }}</title>

This will grab the title set in your pages. I'll explain more on this in the next section.

Open up your footer.html file and copy content that will be used on each page and the closing BODY and HTML tags.

footer.html:
	
    < FOOTER CONTENT ON EACH PAGE >
	< JS SCRIPTS >
  	</body>
	</html>

#### Layouts

Jekyll layout files are the main structure of your pages and can include any number of partials. Change to the \_layouts folder and create a new file called main.html. Copy the following to it and save.

	{% include header.html %}

	{{ content }}

	{% include footer.html %}

Basically this layout is telling it to grab the header and footer partials and in the middle include the content from the page that is using this layout. Moving on to creating pages next.

You can create different layouts if needed for specific pages. For example, I have two layouts, a main layout and a blog post layout. On the blog post layout, I added some html after the {{ content }} line for social sharing buttons. Doing this, I don't have to add this code for every blogpost I create; it's there automatically.

#### Pages

If you open the index.html file that is created when you make your Jekyll project, you will see this below at the top:





	


