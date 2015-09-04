---
layout: project
title: HealthSource
date: 2015-09-03
published: true
---

HealthSource is an app that makes it easy for school nurses or daycare facilities to keep track of critical health information for their students/children. There are two sides to this app: a user side with a personal summary page and information wells for each category, and an admin panel with a wealth of information on users in a clean table view. My main goal was to create an admin panel from scratch; one that would allow the admin to manage information on behalf of their users if they choose. See the source files on [Github](https://github.com/eric-price/HealthSource).

### User Dashboard

When a user logs in, they are greeted with a summary view of their health profile that includes: allergies, medications, conditions, immunizations, emergency contacts, and basic health information. From here they can begin to fill out their health profile by filling out forms asking specific questions based off the category. They have the option of attaching files on their documents page that would be stored securely on Amazon S3. For the UI, I used panels and wells to fill out the page and make it more appealing to the eye for the user.

![UserDashboard](/img/projects/healthsource-userdash.png)

### Admin Dashboard

For the admin dashboard, they see a responsive table view due to the amount of information that is presented. The user table is paginated and links to a specific users health and profile views. From here an admin can manage anything for their users by editing existing records or adding new ones. An important feature that would allow a school nurse for instance to move away from paper records or at least use this for easy lookup. The admin also has access to the search function to quickly locate a user.

![AdminDashboard](/img/projects/healthsource-admindash1.png)  


![AdminDashboard](/img/projects/healthsource-admindash2.png)

### More features to come...

I plan to implement more features eventually such as a nurse log and the ability to mass import people with an CSV file.
