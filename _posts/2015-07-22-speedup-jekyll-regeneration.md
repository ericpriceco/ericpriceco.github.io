---
layout: post
title: Speed-Up Jekyll Regeneration
date: 2015-07-22
tags: jekyll
published: true
---

When I recently started using Gulp and Gulp-Uncss in my Jekyll projects, my regeneration time went from less than 2 seconds to anywhere from 30-60 seconds. That was for any edit; small or large.

So I looked at the "node_modules" folder that NPM created when I installed Gulp to the project, and it had over 5k of files. No wonder it was taking so long, since it regenerates all these files everytime I save an edit.

After some research I found a helpful line that can be added to the Jekyll config file.

Open "_config.yml" in your Jekyll project and add the following line:

```
exclude: [node_modules, scss]
```

In this example, I also added my scss folder since the scss stylesheets don't need to be in the generated site folder.
