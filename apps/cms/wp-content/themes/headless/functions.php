<?php
// Strip the things a headless install never needs — smaller attack
// surface, and prevents half-working visual output if index.php's
// redirect above is ever bypassed by a caching layer.
remove_action('wp_head', 'wp_generator');
add_filter('show_admin_bar', '__return_false');
