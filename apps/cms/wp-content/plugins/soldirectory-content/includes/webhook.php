<?php
if (!defined('ABSPATH')) exit;

add_action('save_post', function ($post_id) {
    if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) return;

    $webhook_url = getenv('WEBHOOK_URL');
    $webhook_secret = getenv('WEBHOOK_SECRET');
    if (!$webhook_url || !$webhook_secret) return;

    wp_remote_post($webhook_url, [
        'timeout' => 2,
        'blocking' => false,
        'headers' => ['X-Webhook-Secret' => $webhook_secret, 'Content-Type' => 'application/json'],
        'body' => wp_json_encode(['postId' => $post_id, 'postType' => get_post_type($post_id)]),
    ]);
}, 20, 1);
