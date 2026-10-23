/*
* Greedy Navigation
*
* http://codepen.io/lukejacksonn/pen/PwmwWV
*
*/

var $nav = $('#site-nav');
var $btn = $('#site-nav .nav-toggle');
var $vlinks = $('#site-nav .visible-links');
var $hlinks = $('#site-nav .hidden-links');

// Explicit secondary links always live in More; without JS they remain visible.
$vlinks.children('[data-overflow-only]').appendTo($hlinks);
var breaks = [];

function updateNav() {

  var availableSpace = $btn.hasClass('hidden') ? $nav.width() : $nav.width() - $btn.width() - 30;

  // The visible list is overflowing the nav
  if($vlinks.width() > availableSpace && $vlinks.children().length > 1) {

    // Record the width of the list
    breaks.push($vlinks.width());

    // Move item to the hidden list
    $vlinks.children().last().prependTo($hlinks);

    // Show the dropdown btn
    if($btn.hasClass('hidden')) {
      $btn.removeClass('hidden');
    }

  // The visible list is not overflowing
  } else {

    // There is space for another item in the nav
    if(availableSpace > breaks[breaks.length-1]) {

      // Move the item to the visible list
      $hlinks.children(':not([data-overflow-only])').first().appendTo($vlinks);
      breaks.pop();
    }

    // Hide the dropdown btn if hidden list is empty
    if($hlinks.children().length < 1) {
      $btn.addClass('hidden');
      $hlinks.addClass('hidden');
      $btn.removeClass('close').attr('aria-expanded', 'false');
    }
  }

  // Keep counter updated
  $btn.attr("count", $hlinks.children().length);

  // Recur if the visible list is still overflowing the nav
  if($vlinks.width() > availableSpace && $vlinks.children().length > 1) {
    updateNav();
  }

}

// Window listeners

$(window).resize(function() {
  updateNav();
});

$btn.on('click', function() {
  $hlinks.toggleClass('hidden');
  $(this).toggleClass('close').attr('aria-expanded', String(!$hlinks.hasClass('hidden')));
});

updateNav();
// Local font metrics can change the space available after the first layout.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(updateNav);
}
$nav.on('keydown', function(event) {
  if (event.key === 'Escape' && !$hlinks.hasClass('hidden')) {
    $hlinks.addClass('hidden');
    $btn.removeClass('close').attr('aria-expanded', 'false').trigger('focus');
  }
});
