<?php
/**
 * Notifies the Node API whenever any content changes, so the
 * frontend's cache knows to treat what it has as stale. Fires on
 * save_post (covers create/update/publish/trash for every post type
 * this plugin registers, and WordPress's own built-in Pages/Posts).
 *
 * WEBHOOK_URL and WEBHOOK_SECRET come from .env — same "never
 * hardcode a secret" rule as every other credential in this project.
 */

if (!defined('ABSPATH')) exit;

add_action('save_post', function ($post_id) {
    // Skip autosaves and revisions — those aren't real content
    // changes a visitor would ever see.
    if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) return;

    $webhook_url = $_ENV['WEBHOOK_URL'] ?? getenv('WEBHOOK_URL');
    $webhook_secret = $_ENV['WEBHOOK_SECRET'] ?? getenv('WEBHOOK_SECRET');
    if (!$webhook_url || !$webhook_secret) return; // not configured — silently skip, never break saving a post over this

    // Fire-and-forget, non-blocking — a slow or failing webhook must
    // never delay saving content in wp-admin. wp_remote_post with a
    // short timeout achieves this well enough without a real queue.
    wp_remote_post($webhook_url, [
        'timeout' => 2,
        'blocking' => false,
        'headers' => ['X-Webhook-Secret' => $webhook_secret, 'Content-Type' => 'application/json'],
        'body' => wp_json_encode(['postId' => $post_id, 'postType' => get_post_type($post_id)]),
    ]);
}, 20, 1);
