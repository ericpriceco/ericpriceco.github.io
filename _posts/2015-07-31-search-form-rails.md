---
layout: post
title: Search Form in Rails
date: 2015-07-31
tags: rails
published: true
---

I'm going to go through the steps to setup a simple search form in Rails 4 that uses rails built-in fuctionality. This search function will search across models and will work in two ways: go to the exact item page if the search matches or list the results if it finds more than one result.

I like to seperate the search function by creating its own controller and model.

### Generate Search Controller

```ruby
rails generate controller search
```

### Add Search Route

Add the line below to your routes file to direct the app to the search results page.

```ruby
get 'search' => 'search#index', as: :search
```

### Search Controller

You will need to edit the following code for your specific controller you will be searching. In this case, I'm searching my Inventory and Contract controllers. You also need to modify the field you want to search. In the example below, I'm searching the name and contract_name fields. 

Here is where you have your logic for exact search recognition. There is an if statement that will jump to the item page if it finds an exact match by name. If not, it goes to the search results page.

```ruby
class SearchController < ApplicationController
  def index
    if jump = jump_target
      redirect_to jump
    else
      @results = Search.for(params[:keyword])
    end
  end

  private
    def jump_target
      Inventory.find_by(name: params[:keyword]) ||
      Contract.find_by(contract_number: params[:keyword])
    end
end
```

### Generate Search Model

```ruby
rails generate model search
```

Apply the database changes:

```ruby
rake db:migrate
```

### Search Model

Copy the following code into your Search model and again modify it for your models. 

```ruby
class Search
  def self.for(keyword)
    Inventory.where("name LIKE ?", "%#{keyword.downcase}%") +
    Contract.where("contract_number LIKE ?", "%#{keyword.downcase}%")
  end
end
```

### Search View

Place this in your Search view. This will render your search results.

```html
<ul class='results'>
  <% if @results.blank? %>
    <li><i>No Results</i></li>
  <% else %>
    <% @results.each do |result| %>
      <li>
        <%= link_to result.try(:name), inventory_path(result) %>
      </li>
    <% end %>
  <% end %>
</ul>
```

### Search Form

The search box can be placed any where you like. This will use the 'search-path' set in the routes file to direct to the search results page.

```ruby
<%= form_tag search_path, class: "navbar-form", method: :get do %>
    <%= text_field_tag 'keyword', nil %>
    <%= submit_tag "Search", :name => nil %>
<% end %>
```

Happy searching!
        


