---
layout: blogpost
title: Create a Jekyll Blog - Part 2
date: 2014-06-11
tags: jekyll foundation
published: true
---

This is part 2 of my guide on creating a blog using Jekyll. [Click here](http://eric-price.co/blog/create-a-jekyll-blog-part1/) to read part 1. We left off with creating your site pages using defined layouts. Now I'm going to get into the real fun stuff with variables that will make your blog dynamic without the use of database!

By now you should have the basic structure of your site: main layout, footer and header partials, and at least your homepage.

In this guide, I'm going to explain some very helpful variables that I've gathered and created through trial and error making my own blog. I learn best from examples, so I hope this will help you as well.

### Recent Posts

On my homepage I like to include a recent posts section to intice people click through and read, and also to have no content on the homepage every time I write an article. Important part of SEO!

You can easily change this to suit your site. Maybe you want 3 posts, instead of 2 or more words in the snippet.

```
{% raw %}
<div class="large-6 columns">
	<h3>RECENT POSTS</h3>
		{% for post in site.posts limit: 2 %}
		<h4><a href="{{ post.url }}">{{ post.title }}</a></h4>
		<p>{{ post.content | strip_html | truncatewords:65 }}</p>
		<p><a href="{{ post.url }}">Read More</a></p>
		{% endfor %}
</div>
{% endraw %}
```

This is a basic for-end loop. If you come from Wordpress or another CMS like it, you will recognize a loop like this. This loop creates an array of your posts located in your \_posts folder and displays what you call within the loop.

The first line is the start of the loop with a limit of 2 posts. If you wanted to list all your posts, just remove the "limit: 2"

```
{% raw %}{% for post in site.posts limit: 2 %}{% endraw %}
```

These lines are self explanatory. The post.url and post.title variables grab the link and title of each post. On the post.content line, I added a filter to remove any HTML from the post and limit the snippet to 45 words. Removing the HTML ensures the formatting looks how I want it to on the hopepage. You can wrap these variables in any HTML markup for styling and formatting.

```
{% raw %}
<h4><a href="{{ post.url }}">{{ post.title }}</a></h4>
<p>{{ post.content | strip_html | truncatewords:65 }}</p>
{% endraw %}
```

### Blog Post

The blog posts are written in Markdown format. Here's a [cheat sheet](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet) on basic formatting of markdown. It can take some getting used to, but after a couple of posts, you will understand how great markdown is when all you want to do is write. There's no need to include markup in your posts. It's all done automatically when Jekyll coverts it to HTML.

Below is an example YAML Front Matter block in a post file.

```yaml
---
layout: blogpost
title: Create a Jekyll Blog - Part 2
date: 2014-06-11
tags: jekyll foundation
published: true
---
```

This information is critical since Jekyll will use this to pull the data, title, tags. The published line tells Github it's ready to publish and no longer a draft. I will explain the tags later on. The post file must be saved with a markdown extension and have the date first and the name seperated by dashes. Example: "2014-06-13-create-jekyll-blog-part2.md"

### Blog Page

The blog page will use a similar loop, but with a little more features like Tags and dates.

```
{% raw %}
<div class="large-9 large-centered columns">
	{% for post in site.posts limit: 5 %}
	<div class="posts-list">
		<h3><a href="{{ post.url }}">{{ post.title }}</a></h3>
		<p>{{ post.date | date: '%B %d, %Y' }}</p>
		<p>{{ post.excerpt }}</p>
		<p><a href="{{ post.url }}">Read More</a></p>
			<p>Tags:
			{% for tag in post.tags %}
			#<a href="tags/{{ tag }}/">{{ tag }}</a>
			{% endfor %}
			</p>
	</div>
	{% endfor %}
</div>
{% endraw %}
```

For the blog page I increased the post limit to 5 with the same post.url and post.title line. The lines below show the date the post was published with a formatting filter. You can see examples [here](http://joshbranchaud.com/blog/2012/12/24/Date-Formatting-in-Jekyll.html). Post.excerpt creates a snippet of your post by copying the first paragraph.

```
{% raw %}
<p>{{ post.date | date: '%B %d, %Y' }}</p>
<p>{{ post.excerpt }}</p>
{% endraw %}		
```

### Tags

Including tags on your blog page is a tricky one and gets its own section. This is a great way to group your posts into groups if a visitor is looking to read your posts on a specific topic. 

```
{% raw %}
<p>Tags:
	{% for tag in post.tags %}
		#<a href="tags/{{ tag }}/">{{ tag }}</a>
	{% endfor %}
</p>
{% endraw %}
```

This little loop goes through each post listed on the blog page and outputs the tags in the front matter blog and making them links. Since I host my page on Github, I had to create a workaround for this to work. Github only allows a few Jekyll plugins on their servers. If you host your page on your own server, you can make this a lot easier with some of the cool plugins out there. [http://jekyllrb.com/docs/plugins/](http://jekyllrb.com/docs/plugins/)

My workaround is creating a page for each tag. Once you have one created, it's easy enough to create additional tags by copy and paste.

Depending where you store the blog page, either in the root or in a subfolder, you may have to edit the tag link in the loop. Create a "tags" folder and a folder under that for each tag. 

Folder structure:

```
tags
	tag1
		index.html
	tag2
		index.html
```

The index.html file for each tag should look like the example below:

```
{% raw %]
---
layout: main
title: Blog - Eric Price - Freelance Web Design and Developer
---
<section class="blog">
	<div class="row">
		<div class="large-9 large-centered columns">
				{% for post in site.tags.sass limit: 5 %}
				<div class="posts-list">
					<h3><a href="{{ post.url }}">{{ post.title }}</a></h3>
					<p>{{ post.date | date_to_string }}</p>
					<p>{{ post.excerpt }}</p>
					<p><a href="{{ post.url }}">Read More</a></p>
				{% endfor %}
				</div>
		</div>
	</div>
</section>
{% endraw %}
```

When a visitor clicks a tag link on the blog page, they will go to that specific tag page with the loop above. The only line you need to edit for each tag is the one below. In this example I have a tag for "sass". 

```
{% raw %]
{% for post in site.tags.sass limit: 5 %}
{% endraw %}
```

### Permalinks

This part is really just prefence for the link style of your posts. By default, it includes the post date in the link, which I wasn't a fan of. To only include the post title in the post link, you need to edit the **"\_config.yml"** file in the root of the Jekyll project folder. Add the line below:

```
permalink: /blog/:title
```

