<?php
/**
 * Verifies the custom meta fields on 'service' posts actually work,
 * completely bypassing the Gutenberg editor UI — since your real
 * importer will write meta the same way this script does
 * (update_post_meta), whether or not the Custom Fields box ever
 * shows up in the editor is irrelevant to whether this actually works.
 *
 * Run from apps/cms: php test-meta-fields.php "specialist-disability-accommodation-sda"
 * (or any other real service slug you already created)
 */

require_once __DIR__ . '/wordpress/wp-load.php';

$slug = $argv[1] ?? null;
if (!$slug) {
    die("Usage: php test-meta-fields.php <service-slug>\n");
}

$post = get_page_by_path($slug, OBJECT, 'service');
if (!$post) {
    die("No 'service' post found with slug '$slug'.\n");
}

echo "Found post ID {$post->ID}: {$post->post_title}\n\n";

// Write real test values directly, same mechanism your importer will use.
update_post_meta($post->ID, 'eligibility', 'Test eligibility text written directly via update_post_meta.');
update_post_meta($post->ID, 'funding_info', 'Test funding info written directly via update_post_meta.');
update_post_meta($post->ID, 'faq_json', wp_json_encode([
    ['question' => 'Is this a real test?', 'answer' => 'Yes — written directly, bypassing the editor UI entirely.'],
]));

echo "Wrote 3 test meta values. Reading them back:\n\n";
echo "eligibility: " . get_post_meta($post->ID, 'eligibility', true) . "\n";
echo "funding_info: " . get_post_meta($post->ID, 'funding_info', true) . "\n";
echo "faq_json: " . get_post_meta($post->ID, 'faq_json', true) . "\n\n";

echo "Now check the REST API directly:\n";
echo "  http://46.250.242.208:8080/wp-json/wp/v2/services/{$post->ID}\n";
echo "The 'meta' object in that response should show all 3 values above.\n";
echo "If it does, the fields work completely — the Gutenberg UI issue is cosmetic only.\n";
