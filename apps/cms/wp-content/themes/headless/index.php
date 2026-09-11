<?php
// Deliberately blank. Nobody should ever see this rendered — every
// real request that matters goes to /wp-json/* (the REST API), which
// bypasses theme templates entirely. If someone lands here directly,
// send them to the real site instead of showing broken/empty markup.
$frontend = $_ENV['FRONTEND_ORIGIN'] ?? getenv('FRONTEND_ORIGIN') ?: '/';
wp_redirect($frontend);
exit;
