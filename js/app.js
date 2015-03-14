//Mobile button to scroll to top

$(function() {
    'use strict';
    
    var myButton = $('.scrollBtn');
    var myWindow = $(window);
    
    myButton.hide();
    
    myWindow.on('scroll', function() {
        if ($(this).scrollTop() > 200) { //height from top to trigger slideDown
            myButton.show();
            myButton.addClass('textCenter');
        }
    });
    myWindow.on('scroll', function() {
        if ($(this).scrollTop() < 50) { //trigger height to slide back up
            myButton.hide();
        }
    });
});

//Smooth Scroll using #scrollTop tag

$(function() {
  $('a[href*=#]:not([href=#])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top
        }, 1000);
        return false;
      }
    }
  });
});

