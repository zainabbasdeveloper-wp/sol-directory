<?php
/**
 * Fills the service posts' content fields, with SEO, from editorial text kept
 * in this plugin (content-services-1/2/3.php + baseline-services.php).
 *
 * WHAT IT WRITES (only into fields that are blank or hold an obvious
 * placeholder such as "ABC"; anything an editor wrote is never touched):
 *   who_for, eligibility, funding_info, plan_management_info, how_to_pay,
 *   registration_info, hero eyebrow + CTA, seo_title, seo_description,
 *   faq_repeater (5 questions), credentials_repeater, regulator cards,
 *   finder + CTA copy, and related_services (internal links).
 *
 * WHAT IT DELIBERATELY DOES NOT WRITE: prices, typical costs, waiting times,
 * hours, availability or "how long it takes" - those vary by provider and by
 * person and would go stale or be wrong. Funding and eligibility are described
 * in general terms (how an NDIS plan works), never as a promise that a given
 * person qualifies.
 *
 * HOW IT RUNS: once, on the first wp-admin load after deploy; and on demand from
 * Tools > Service content (fills anything still blank, e.g. after you delete a
 * duplicate post or clear a field). Every post it touches is marked
 * (_sd_content_v3). Editing anything afterwards is safe.
 */

if (!defined('ABSPATH')) exit;

const SOLDIRECTORY_CONTENT_VERSION = '3';
const SOLDIRECTORY_CONTENT_OPTION = 'soldirectory_service_content_v3';

/** Title => [group, who, [[q, a] x3]] */
function soldirectory_service_editorial(): array {
    static $all = null;
    if ($all !== null) return $all;
    $all = [];
    foreach ([1, 2, 3] as $n) {
        $part = require __DIR__ . "/content-services-{$n}.php";
        if (is_array($part)) $all = array_merge($all, $part);
    }
    return $all;
}

/** Title => long-form guide content (overview paragraphs, how to choose, getting started, extra FAQs, register category). */
function soldirectory_service_long(): array {
    static $all = null;
    if ($all !== null) return $all;
    $all = [];
    foreach ([1, 2, 3, 4, 5, 6, 7, 8] as $n) {
        $part = require __DIR__ . "/content-long-{$n}.php";
        if (is_array($part)) $all = array_merge($all, $part);
    }
    return $all;
}

/** Official pages the content relies on. Root sites only, so a link can never go stale. */
function soldirectory_source_links(array $keys): array {
    $all = [
        'ndis' => ['title' => 'NDIS: how the NDIS works, plans and price limits', 'url' => 'https://www.ndis.gov.au'],
        'ndiscommission' => ['title' => 'NDIS Quality and Safeguards Commission: find a registered provider, make a complaint', 'url' => 'https://www.ndiscommission.gov.au'],
        'ahpra' => ['title' => 'AHPRA: check a health practitioner\'s registration', 'url' => 'https://www.ahpra.gov.au'],
        'jobaccess' => ['title' => 'JobAccess: workplace adjustments and employment support', 'url' => 'https://www.jobaccess.gov.au'],
    ];
    $out = [];
    foreach (array_unique(array_merge(['ndis', 'ndiscommission'], $keys)) as $k) if (isset($all[$k])) $out[] = $all[$k];
    return $out;
}

/** How costs work, in general terms only - never a price. */
function soldirectory_cost_text(string $group, string $name): string {
    $quote = ' Before you start, ask for a written quote that lists each support, the hours and the price, and check it against the current NDIS Pricing Arrangements and Price Limits on the NDIS website. A provider may charge less than a limit. If you pay privately, the provider sets its own fees. Plan-managed and self-managed participants can also use providers who are not registered, and those providers set their own prices.';
    switch ($group) {
        case 'capital':
            return "Higher-cost items such as home modifications, vehicle modifications and specialist housing are usually priced by quote rather than by the hour. Ask for itemised quotes so that you can see exactly what {$name} includes, and expect to compare more than one." . $quote;
        case 'at':
            return "Equipment prices vary widely with the type of item and how it is set up for you. Ask for a written quote that separates the item, fitting and training, and for information about warranty and servicing for {$name}." . $quote;
        default:
            return "Supports such as {$name} that are funded by the NDIS are paid at rates that follow the NDIS Pricing Arrangements and Price Limits, which the NDIA reviews regularly. Many items have a maximum price, and some prices are higher in remote areas." . $quote;
    }
}

function soldirectory_group_label(string $group): string {
    return [
        'core' => 'NDIS Core support',
        'cb' => 'NDIS Capacity Building support',
        'capital' => 'NDIS Capital support',
        'at' => 'Assistive technology',
        'general' => 'NDIS support',
    ][$group] ?? 'NDIS support';
}

function soldirectory_funding_text(string $group, string $name): string {
    $price = ' Many NDIS supports have price limits, so ask providers for a quote and check it against the current NDIS Pricing Arrangements and Price Limits.';
    switch ($group) {
        case 'core':
            return "Core supports help with everyday activities and are usually the most flexible part of an NDIS plan. If {$name} is in your plan, it is normally paid from a Core budget. Your plan shows how much you have and how it can be used." . $price;
        case 'cb':
            return "Capacity Building supports help you build skills and independence. If {$name} is in your plan, it is normally paid from a Capacity Building budget. These budgets are usually set for particular types of support, so check which one your plan uses." . $price;
        case 'capital':
            return "Capital supports cover higher-cost items such as home modifications, vehicle modifications and specialist housing. They are generally included only where the NDIS has decided they are reasonable and necessary, often based on assessments and quotes from qualified professionals. Ask your planner what evidence is needed for {$name}.";
        case 'at':
            return "Assistive technology is funded according to its cost and complexity: lower-cost items are usually paid from a Core budget, and higher-cost or more complex items from a Capital budget, sometimes needing an assessment or quote. Your planner or an assistive technology advisor can explain how this applies to {$name}.";
        default:
            return "Which part of an NDIS plan pays for {$name} depends on the specific support and on how your plan is set up. Your planner, Local Area Coordinator or support coordinator can confirm where it fits, and providers can give you a quote to check against your budget." . $price;
    }
}

function soldirectory_eligibility_text(string $name): string {
    return "You can use NDIS funding for {$name} if it is included in your NDIS plan. The NDIS funds supports that are reasonable and necessary: they relate to your disability, help you pursue your goals and represent value for money. Not sure whether it is in your plan? Check your plan, or ask your planner, Local Area Coordinator or support coordinator. You can also arrange it privately.";
}

/** Trim to a limit at a word boundary, adding an ellipsis when cut. */
function soldirectory_fit(string $s, int $max): string {
    $s = trim($s);
    if (strlen($s) <= $max) return $s;
    $cut = substr($s, 0, $max - 1);
    $cut = preg_replace('/\s+\S*$/', '', $cut) ?: $cut;
    return rtrim($cut, " ,;:-") . '…';
}

function soldirectory_seo_title_for(string $title): string {
    foreach (["{$title}: guide and providers | SolDirectory", "{$title} | SolDirectory"] as $candidate) {
        if (strlen($candidate) <= 60) return $candidate;
    }
    return soldirectory_fit($title, 60);
}

function soldirectory_seo_description_for(string $overview): string {
    $first = soldirectory_baseline_excerpt($overview);
    $tail = ' Compare providers, see how it is funded and get matched for free.';
    return strlen($first . $tail) <= 158 ? $first . $tail : soldirectory_fit($first, 158);
}

/** The FAQ rows this feature writes. $long null = the earlier (short-only) set, used to recognise it. */
function soldirectory_machine_faq_rows(string $title, array $entry, ?array $long): array {
    $rows = [];
    foreach ($entry[2] as [$q, $a]) $rows[] = ['question' => $q, 'answer' => $a];
    if ($long) foreach ($long['faq'] as [$q, $a]) $rows[] = ['question' => $q, 'answer' => $a];
    $rows[] = [
        'question' => "Can I use my NDIS plan to pay for {$title}?",
        'answer' => "If {$title} is in your NDIS plan and is reasonable and necessary for you, then yes. Check with your planner, Local Area Coordinator or support coordinator. You can also arrange it privately.",
    ];
    $rows[] = [
        'question' => "How do I find a {$title} provider near me?",
        'answer' => "Browse providers on SolDirectory, or send a free enquiry with your location and what you need and suitable providers will review it. Then ask each one about availability, a quote and a service agreement before you decide. Details come from providers and registers, so confirm them directly.",
    ];
    return $rows;
}

/** Every field this feature writes, for one service. $relatedIds are post IDs of sibling services. */
function soldirectory_service_fields(string $title, array $entry, string $overview, array $relatedIds, ?array $long = null): array {
    [$group, $who, $faqs] = $entry;

    // FAQ order: the three short ones, then the three from the long guide, then the two shared ones.
    $faqRows = soldirectory_machine_faq_rows($title, $entry, $long);

    $extra = [];
    if ($long) {
        $extra = [
            'short_answer' => $long['short'],
            'overview_content' => $long['overview'],
            'how_to_choose' => implode("\n", $long['choose']),
            'getting_started' => implode("\n", $long['start']),
            'cost_info' => soldirectory_cost_text($group, $title),
            'register_category' => $long['cat'],
            'sources_repeater' => soldirectory_source_links($long['src'] ?? []),
        ];
    }

    return $extra + [
        'overview_heading' => "About {$title}",
        'who_for' => $who,
        'eligibility' => soldirectory_eligibility_text($title),
        'funding_info' => soldirectory_funding_text($group, $title),
        'plan_management_info' => 'Whether your plan is managed by the NDIA, by a plan manager or by you, ask for a written quote and a service agreement before you start. If your plan is plan-managed or self-managed you can use providers who are not registered with the NDIS. If it is NDIA-managed you generally need a registered provider.',
        'how_to_pay' => 'If it is in your NDIS plan, you can use your plan funding. You can also pay privately. Ask for a quote first.',
        'registration_info' => 'Registered or unregistered providers',
        'hero_eyebrow' => soldirectory_group_label($group),
        'hero_cta_label' => 'Get matched, free',
        'hero_cta_url' => 'get_matched',
        'seo_title' => soldirectory_seo_title_for($title),
        'seo_description' => soldirectory_seo_description_for($overview),
        'finder_heading' => "{$title} providers",
        'finder_description' => 'Providers on SolDirectory who list this support. Each provider confirms its own availability.',
        'finder_cta_label' => 'Get matched',
        'regulations_heading' => 'Regulation and safeguards',
        'regulations_intro' => 'NDIS providers and their workers must follow the NDIS Code of Conduct, and registered providers are regulated by the NDIS Quality and Safeguards Commission.',
        'cta_heading' => "Looking for {$title}?",
        'cta_description' => 'Tell us where you are and what you need. Suitable providers review your enquiry. It is free.',
        'cta_primary_label' => 'Get matched, free',
        'cta_primary_action' => 'get_matched',
        'cta_secondary_label' => 'Browse the provider directory',
        'cta_secondary_action' => '/directory',
        // repeaters / relationships are stored as JSON (see custom-fields.php)
        'faq_repeater' => $faqRows,
        'credentials_repeater' => [
            ['title' => 'Check registration', 'description' => 'Search the NDIS Commission\'s register of registered providers to see whether a provider is registered and for which types of support. Plan-managed and self-managed participants can also use unregistered providers.'],
            ['title' => 'Ask about worker screening', 'description' => 'Ask whether workers hold a current NDIS Worker Screening Check where their role requires one, and how the provider checks its workers\' identity and qualifications.'],
            ['title' => 'Get it in writing', 'description' => 'Ask for a written quote and a service agreement that describes the support, the prices, how to change or end it and how to make a complaint.'],
        ],
        'regulator_cards_repeater' => [
            ['title' => 'NDIS Quality and Safeguards Commission', 'description' => 'Regulates NDIS providers and handles complaints about the quality and safety of NDIS supports.', 'phone' => '1800 035 544', 'website' => 'https://www.ndiscommission.gov.au', 'cta' => 'Visit the NDIS Commission'],
            ['title' => 'National Disability Insurance Agency (NDIA)', 'description' => 'Runs the NDIS. Contact them about your plan, your funding and eligibility.', 'phone' => '1800 800 110', 'website' => 'https://www.ndis.gov.au', 'cta' => 'Visit the NDIS'],
        ],
        'related_services' => array_values(array_map('intval', $relatedIds)),
    ];
}

/** A value that means "nobody has written this": empty, or a short test entry like "ABC". */
function soldirectory_is_blank_or_placeholder($value, bool $allowPlaceholder = false): bool {
    if (is_array($value)) return !soldirectory_value_has_content($value);
    $v = trim((string) $value);
    if ($v === '') return true;
    return $allowPlaceholder && strlen($v) <= 12 && strpos($v, ' ') === false;
}

/**
 * Writes the fields into one service post where they are blank. Returns the
 * names of the fields it wrote.
 */
function soldirectory_fill_service_post(int $id, array $fields, array $replaceable = []): array {
    $written = [];
    $prose = ['who_for', 'eligibility', 'funding_info', 'plan_management_info'];
    foreach ($fields as $name => $value) {
        if ((is_array($value) && !$value) || $value === '') continue; // nothing to write (e.g. no siblings to link to, or no register category)
        $current = get_post_meta($id, $name, true);
        if (is_string($current) && $current !== '' && ($current[0] === '[' || $current[0] === '{')) {
            $decoded = json_decode($current, true);
            if (is_array($decoded)) $current = $decoded;
        }
        $isMachine = false;
        foreach ($replaceable[$name] ?? [] as $old) {
            // Text this feature wrote earlier and nobody has touched: safe to upgrade.
            if ($current === $old || (is_array($current) && is_array($old) && $current == $old)) { $isMachine = true; break; }
        }
        if (!$isMachine && !soldirectory_is_blank_or_placeholder($current, in_array($name, $prose, true))) continue;
        $isJson = is_array($value);
        update_post_meta($id, $name, $isJson ? wp_json_encode($value) : $value);
        $written[] = $name;
    }
    return $written;
}

/**
 * Applies the content to every service post that has editorial text.
 * $force ignores the per-post marker (still blank-only). Returns a summary.
 */
function soldirectory_apply_service_content(bool $force = false): array {
    $editorial = soldirectory_service_editorial();
    $overviews = soldirectory_baseline_service_text();

    $ids = get_posts(['post_type' => 'service', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'no_found_rows' => true, 'orderby' => 'ID', 'order' => 'ASC']);

    // title => first (lowest-ID) post, so related links point at one page per service, not at duplicates
    $byTitle = [];
    $titles = [];
    foreach ($ids as $id) {
        $id = (int) $id;
        $t = html_entity_decode((string) get_post_field('post_title', $id), ENT_QUOTES, 'UTF-8');
        $titles[$id] = $t;
        if (!isset($byTitle[$t])) $byTitle[$t] = $id;
    }
    $siblings = [];
    foreach ($byTitle as $t => $pid) {
        if (isset($editorial[$t])) $siblings[$editorial[$t][0]][] = $t;
    }
    foreach ($siblings as &$list) sort($list, SORT_STRING);
    unset($list);

    $summary = ['posts' => 0, 'fields' => 0, 'skipped' => 0];
    foreach ($ids as $id) {
        $id = (int) $id;
        try {
            $t = $titles[$id];
            if (!isset($editorial[$t])) continue;
            if (!$force && get_post_meta($id, '_sd_content_v3', true)) { $summary['skipped']++; continue; }

            $group = $editorial[$t][0];
            $list = $siblings[$group] ?? [];
            $pos = array_search($t, $list, true);
            $related = [];
            if ($pos !== false && count($list) > 1) {
                // The next few services in the same group (wrapping round), so links spread evenly.
                for ($i = 1; $i <= min(4, count($list) - 1); $i++) {
                    $sib = $list[($pos + $i) % count($list)];
                    if (isset($byTitle[$sib])) $related[] = $byTitle[$sib];
                }
            }

            $overview = (string) ($overviews[$t] ?? '');
            $long = soldirectory_service_long()[$t] ?? null;
            $fields = soldirectory_service_fields($t, $editorial[$t], $overview, $related, $long);
            // Earlier machine-written text (the short overview and the short FAQ set) may be upgraded to the long guide.
            $replaceable = [
                'overview_content' => [trim($overview)],
                'faq_repeater' => [soldirectory_machine_faq_rows($t, $editorial[$t], null)],
            ];
            $written = soldirectory_fill_service_post($id, $fields, $replaceable);
            if ($written) {
                update_post_meta($id, '_sd_content_v3', SOLDIRECTORY_CONTENT_VERSION);
                $summary['posts']++;
                $summary['fields'] += count($written);
            }
        } catch (\Throwable $e) {
            error_log('[soldirectory] service content failed for post ' . $id . ': ' . $e->getMessage());
        }
    }
    return $summary;
}

// Once, on the first wp-admin load after deploy - after the ACF migration and
// the baseline text, so existing content counts as "not blank".
add_action('admin_init', function () {
    if (get_option(SOLDIRECTORY_CONTENT_OPTION)) return;
    if (!current_user_can('edit_posts')) return;
    foreach (get_posts(['post_type' => 'service', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'no_found_rows' => true]) as $id) {
        soldirectory_migrate_post_from_acf((int) $id);
    }
    if (function_exists('soldirectory_apply_baseline_services')) soldirectory_apply_baseline_services();
    soldirectory_apply_service_content(false);
    update_option(SOLDIRECTORY_CONTENT_OPTION, gmdate('c'), false);
}, 30);

// Tools > Service content: run it again on demand.
add_action('admin_menu', function () {
    add_management_page('Service content', 'Service content', 'manage_options', 'soldirectory-service-content', 'soldirectory_render_service_content_page');
});

add_action('admin_post_soldirectory_apply_service_content', function () {
    if (!current_user_can('manage_options')) wp_die('Not allowed.');
    check_admin_referer('soldirectory_apply_service_content');
    if (function_exists('soldirectory_apply_baseline_services')) {
        // The baseline (overview + excerpt) is marked per post, so this only touches posts it hasn't handled.
        soldirectory_apply_baseline_services();
    }
    $s = soldirectory_apply_service_content(true);
    wp_safe_redirect(add_query_arg(['page' => 'soldirectory-service-content', 'done' => $s['posts'], 'fields' => $s['fields']], admin_url('tools.php')));
    exit;
});

function soldirectory_render_service_content_page(): void {
    if (!current_user_can('manage_options')) return;
    $total = count(get_posts(['post_type' => 'service', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'no_found_rows' => true]));
    $marked = count(get_posts(['post_type' => 'service', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'no_found_rows' => true, 'meta_key' => '_sd_content_v3']));
    echo '<div class="wrap"><h1>Service content</h1>';
    if (isset($_GET['done'])) {
        echo '<div class="notice notice-success"><p>Filled ' . (int) $_GET['fields'] . ' blank fields on ' . (int) $_GET['done'] . ' service posts.</p></div>';
    }
    echo '<p>Fills the <strong>blank</strong> fields on service posts with a long-form guide (short answer, overview, how to choose a provider, getting started), eligibility, funding and cost guidance, eight FAQs, SEO title and description, regulator information, sources and related links. Anything you have written yourself is never changed; text this tool wrote earlier is upgraded.</p>';
    echo '<p>' . (int) $marked . ' of ' . (int) $total . ' service posts have had content applied.</p>';
    echo '<p>It does not write prices, typical costs, waiting times or availability. Add those per service if you want them.</p>';
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    echo '<input type="hidden" name="action" value="soldirectory_apply_service_content">';
    wp_nonce_field('soldirectory_apply_service_content');
    submit_button('Fill blank fields now');
    echo '</form></div>';
}
