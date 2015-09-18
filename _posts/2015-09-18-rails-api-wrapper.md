---
layout: post
title: Rails - Create an API wrapper with HTTParty
date: 2015-09-18
tags: rails
published: true
---

HTTParty is a very cool ruby gem that uses the normal HTTP request methods and automatically parses the returned object, whether that is JSON or XML. I'm going to show how you can use HTTParty to create an API wrapper for use in your Ruby on Rails project. I'll be using the [Wunderground](http://www.wunderground.com/weather/api) weather API.

### Setup

Add these two gems to your Gemfile and run 'bundle install'.

```ruby
#Gemfile

gem 'httparty'
gem 'figaro'
```

The figaro gem will be used to hide your API key and call it through an environmental variable.

After running bundle, install figaro:

```ruby
figaro install
```

This will create an 'application.yml' file under /config and add it to the .gitignore file.

### Wrapping the API

HTTParty can be setup in multiple ways. You can do a simple GET request in your controller and parse through the information you need there. I suggest using the 'curl' tool or your browser to see what kind of data this request gets.

```ruby
response = HTTParty.get("http://api.wunderground.com/api/#{ENV["YOUR_API_KEY"]}/conditions/q/#{state}/#{city}.json")
```

The cleaner approach is to wrap it in a class and call it in the controller.

Create a file under the '/lib' directory to house the new class.

```ruby
# /lib/Wunderground.rb

require 'httparty'

class Wunderground
  include HTTParty
  format :json

  base_uri 'api.wunderground.com'

  attr_accessor :temp, :location, :icon, :desc, :url, :feel_like

  def initialize(response)
    @temp = response['current_observation']['temp_f']
    @location = response['current_observation']['display_location']['full']
    @icon = response['current_observation']['icon_url']
    @desc = response['current_observation']['weather']
    @url = response['current_observation']['forecast_url']
    @feel_like = response['current_observation']['feelslike_f']
  end

  def self.get_weather(state, city)
    response = get("/api/#{ENV["wunderground_key"]}/conditions/q/#{state}/#{city}.json")
    if response.success?
      new(response)
    else
      raise response.response
    end
  end

end
```

Here we are using some of the built-in functionality of HTTParty by setting a base_uri and the format. It's initializing the variables I need, while grabbing the array data from the JSON response object.

If you make any changes to the class library, you need to restart the Rails server to apply it. It might be easier to write and test your class in the Ruby console before bringing it over to your Rails project.

### API key

Add your API key to application.yml:

```ruby
# /config/application.yml

wunderground_key: "YOUR_API_KEY"
```

### Routes

```ruby
# /config/routes.rb

root 'home#index'
get 'wunderground', to: 'home#wunderground'
```

### Controller

```ruby
# /app/controllers/home_controller.rb

require 'Wunderground'

def wunderground
  @weather = Wunderground.get_weather(params[:state], params[:city])
end
```

The first line is pulling in the new class, followed by the 'wunderground' action that will create a new instance of the Wunderground class with data from the user.

### View

```html
# /app/views/wunderground.html.erb

<div>
    <%= form_tag wunderground_path, method: "get", class: "form-inline" do %>
    <%= text_field_tag :city, nil, class: "form-control", placeholder: "City Name" %>
    <%= select_tag :state, options_for_select(@states), :prompt => "Please select", class: "form-control" %>
    <%= submit_tag "Check Weather", name: nil, class: "btn btn-primary" %>
    <% end %>
</div>

<div>
<% if @weather.present? %>
  <h3><%= @weather.location %></h3>

  <p>The temperature is:
    <%= @weather.temp %></p>
  <p>Feels like:
    <%= @weather.feel_like %></p>

  <p>
    <%= @weather.desc %>
    <%= image_tag @weather.icon %>
  </p>
  <p>
    <%=link_to "Full Forecast", @weather.url, target: "_blank" %>
  </p>
</div>

<% end %>
```

There you have it! You could easily create a gem for the API wrapper if you choose so other people can use it.
