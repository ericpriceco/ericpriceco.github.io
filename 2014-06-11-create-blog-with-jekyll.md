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

For my projects I use the SASS version of the Foundation framework, but you can use anything for your Jekyll project. My typical process is to create a Foundation project and copy over the needed contents to the new Jekyll project folder. I will then start creating my layouts and partials.



	


