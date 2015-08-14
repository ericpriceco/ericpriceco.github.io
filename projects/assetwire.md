---
layout: project
title: AssetWire
date: 2015-08-14
published: true
---

For this personal project, I wanted to create an inventory tracking and ticketing system that was clean, easy to use and fast. The plan was going to be creating as much as I could from scratch including the authentication, searching and role system. The overall goal was to have a business intelligence dashboard, an asset and contract inventory system, and a ticketing system. See the source files on [Github](https://github.com/eric-price/AssetWire).

### Assets, Contracts, and Tickets

The asset, contract and ticket pages have paginated tables that can be sorted by category or filtered by type or status. Keeping UX in mind, the tables are fast to sort and zebra striped for easier viewing. Each ticket allows the owner to add their work log before closing it. Attachments can be added to a contract or ticket through the use of the paperclip gem and in production use, the attachments are stored on Amazon S3.

![Assets](/img/projects/assets.png)

### Dashboard

On the dashboard, I'm using the chartkick gem to render charts for various metrics on asset/contract types and ticket status. I put widgets on top that query critical information for any manager or team lead.

![Dashboard](/img/projects/dashboard.png)

### Searching

The search form was created using only the built-in functionality of Rails and allows the user to search for the asset name/owner or contract number. A partial name search will list the results and an exact match will go straight to the asset or contract. Easily customizable for any other search queries. You can read my post [here](http://eric-price.net/blog/search-form-rails/) on how I implemented searching.

### Authentication and Roles

The authentication system was created from scratch using the standard bcrypt gem to encrypt passwords and form validations. Since this app is geared more for internal use for a business, I put the account creation in the hands of the admin role through the Admin panel. Only certain individuals can be given accounts and have access to asset information. This ties into the role system where only accounts with the Admin role can view the user account panel.
