// STICKY NAVIGATION ---->
$(function() {

	var windowWidth = $(window).width();
	if (windowWidth > 767) {

		// grab the initial top offset of the navigation 
		var sticky_navigation_offset_top = $('.nav').offset().top;

		// our function that decides weather the navigation bar should have "fixed" css position or not.
		var sticky_navigation = function() {
			var scroll_top = $(window).scrollTop(); // our current vertical position from the top

			// if we've scrolled more than the navigation, change its position to fixed to stick to top,
			// otherwise change it back to relative
			if (scroll_top > sticky_navigation_offset_top) {
				$('.nav').css({
					'position': 'fixed',
					'top': 0,
					'left': 0,
					'opacity': 1,
				});
			} else {
				$('.nav').css({
					'position': 'relative',
					'opacity': 1,
				});
			}
		};

		// run our function on load
		sticky_navigation();

		// and run it again every time you scroll
		$(window).scroll(function() {
			sticky_navigation();
		});
	}
});


// RESPONSIVE SELECT NAVIGATION ---->
$(document).ready(function() {
	//build dropdown
	$("<select />").appendTo(".nav");

	// Create default option "Go to..."
	$("<option />", {
		"selected": "selected",
		"value": "",
		"text": "Go to..."
	}).appendTo(".nav select");

	// Populate dropdowns with the first menu items
	$(".nav li a").each(function() {
		var el = $(this);
		$("<option />", {
			"value": el.attr("href"),
			"text": el.text()
		}).appendTo(".nav select");
	});
	//make responsive dropdown menu actually work			
	$(".nav select").change(function() {
		window.location = $(this).find("option:selected").val();
	});
});