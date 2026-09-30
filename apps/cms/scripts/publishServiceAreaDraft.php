<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/wordpress/wp-load.php';

$slug = 'domestic-assistance-brisbane';
$draft_path = dirname(__DIR__) . '/content-drafts/' . $slug . '.md';
$markdown = file_get_contents($draft_path);
if ($markdown === false) {
    fwrite(STDERR, "Draft not found: {$draft_path}\n");
    exit(1);
}

function draft_inline(string $text): string {
    return preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', esc_html($text));
}

function draft_to_html(string $markdown): string {
    $start = strpos($markdown, "## Find domestic assistance in Brisbane");
    if ($start === false) {
        throw new RuntimeException('Draft article body heading was not found.');
    }

    $lines = preg_split('/\R/', trim(substr($markdown, $start)));
    $html = [];
    $paragraph = [];
    $list = [];

    $flush_paragraph = static function () use (&$paragraph, &$html): void {
        if ($paragraph) {
            $html[] = '<p>' . draft_inline(implode(' ', $paragraph)) . '</p>';
            $paragraph = [];
        }
    };
    $flush_list = static function () use (&$list, &$html): void {
        if ($list) {
            $html[] = '<ul>' . implode('', array_map(
                static fn (string $item): string => '<li>' . draft_inline($item) . '</li>',
                $list
            )) . '</ul>';
            $list = [];
        }
    };

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '') {
            $flush_paragraph();
            $flush_list();
            continue;
        }
        if (preg_match('/^(#{2,3})\s+(.+)$/', $line, $match)) {
            $flush_paragraph();
            $flush_list();
            $tag = strlen($match[1]) === 2 ? 'h2' : 'h3';
            $html[] = '<' . $tag . '>' . draft_inline($match[2]) . '</' . $tag . '>';
            continue;
        }
        if (preg_match('/^-\s+(.+)$/', $line, $match)) {
            $flush_paragraph();
            $list[] = $match[1];
            continue;
        }
        $flush_list();
        $paragraph[] = $line;
    }

    $flush_paragraph();
    $flush_list();
    return implode("\n", $html);
}

function draft_metadata(string $markdown, string $label): string {
    $pattern = '/^\\*\\*' . preg_quote($label, '/') . ':\\*\\*\\s*(.+)$/m';
    if (!preg_match($pattern, $markdown, $match)) {
        throw new RuntimeException("Missing draft metadata: {$label}");
    }
    return trim($match[1]);
}

$body_start = strpos($markdown, "## Find domestic assistance in Brisbane");
$article_markdown = $body_start === false ? '' : substr($markdown, $body_start);
$paragraphs = preg_split('/\R\s*\R/', trim($article_markdown));
$intro = '';
foreach ($paragraphs as $paragraph) {
    if (!preg_match('/^#{2,3}\s/', $paragraph) && !preg_match('/^-\s/m', $paragraph)) {
        $intro = trim(preg_replace('/\s+/', ' ', $paragraph));
        break;
    }
}
if ($intro === '') {
    fwrite(STDERR, "Could not extract the article introduction.\n");
    exit(1);
}

$content = draft_to_html($markdown);
$seo_title = draft_metadata($markdown, 'SEO title');
$seo_description = draft_metadata($markdown, 'Meta description');
if (!post_type_exists('service_area_page')) {
    fwrite(STDERR, "The service_area_page post type is unavailable; check that SolDirectory Content is active.\n");
    exit(1);
}

$existing = get_posts([
    'post_type' => 'service_area_page',
    'name' => $slug,
    'post_status' => 'any',
    'numberposts' => 1,
]);
$post = [
    'post_type' => 'service_area_page',
    'post_status' => 'publish',
    'post_name' => $slug,
    'post_title' => 'Domestic assistance in Brisbane',
    'post_content' => $content,
];
if ($existing) {
    $post['ID'] = $existing[0]->ID;
}

$post_id = wp_insert_post($post, true);
if (is_wp_error($post_id)) {
    fwrite(STDERR, 'WordPress publish failed: ' . $post_id->get_error_message() . "\n");
    exit(1);
}

update_post_meta($post_id, 'service_name', 'Domestic assistance');
update_post_meta($post_id, 'suburb', 'Brisbane');
update_post_meta($post_id, 'state', 'QLD');
update_post_meta($post_id, 'intro_paragraph', $intro);
update_post_meta($post_id, 'seo_title', $seo_title);
update_post_meta($post_id, 'seo_description', $seo_description);

printf("Published service-area page: %s (post ID %d)\n", $slug, $post_id);
