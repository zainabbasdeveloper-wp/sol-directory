<?php
// Runs the REAL plugin code against a fake WordPress, using ACF-format meta.
error_reporting(E_ALL);
$GLOBALS['LOG'] = $LOG = sys_get_temp_dir() . '/sd_harness_errors.log'; @unlink($LOG); ini_set('error_log', $LOG); ini_set('log_errors', '1');
set_error_handler(function ($no, $str, $file, $line) { throw new ErrorException($str, 0, $no, $file, $line); });

define('ABSPATH', __DIR__ . '/');
$PLUGIN = $argv[1];

// ---------- minimal WordPress ----------
$GLOBALS['META'] = [];      // [post_id][key] => value (arrays stay arrays, like unserialized ACF relationship values)
$GLOBALS['TYPES'] = [];     // post_id => post_type
$GLOBALS['ACTIONS'] = [];
$GLOBALS['FILTERS'] = [];
$GLOBALS['OPTIONS'] = [];
$GLOBALS['ROUTES'] = [];
$GLOBALS['POSTS'] = [];     // id => WP_Post

class WP_Post { public $post_excerpt = ''; public $post_content = ''; public $post_name = ''; public $ID; public $post_type; public $post_title; public $post_status = 'publish'; public function __construct($id, $type, $title = '') { $this->ID = $id; $this->post_type = $type; $this->post_title = $title ?: "Post $id"; } }
class WP_REST_Response { private $d; public $status; public function __construct($d = null, $s = 200) { $this->d = $d; $this->status = $s; } public function get_data() { return $this->d; } public function set_data($d) { $this->d = $d; } }

function add_action($h, $cb, $p = 10, $a = 1) { $GLOBALS['ACTIONS'][$h][] = $cb; }
function add_filter($h, $cb, $p = 10, $a = 1) { $GLOBALS['FILTERS'][$h][] = $cb; }
function register_rest_route($ns, $route, $args) { $GLOBALS['ROUTES']["$ns$route"] = $args; }
function register_post_meta() {}
function current_user_can() { return true; }
function get_post_type($id) { return $GLOBALS['TYPES'][$id] ?? false; }
function get_post_meta($id, $key = '', $single = false) { $v = $GLOBALS['META'][$id][$key] ?? ''; return $v; }
function update_post_meta($id, $key, $value) { $GLOBALS['META'][$id][$key] = $value; return true; }
function metadata_exists($t, $id, $key) { return isset($GLOBALS['META'][$id][$key]); }
function get_option($k, $d = false) { return $GLOBALS['OPTIONS'][$k] ?? $d; }
function update_option($k, $v, $a = null) { $GLOBALS['OPTIONS'][$k] = $v; return true; }
function wp_json_encode($v, $f = 0) { return json_encode($v, $f); }
function maybe_unserialize($v) { $r = @unserialize($v); return $r === false && $v !== 'b:0;' ? $v : $r; }
function wp_get_attachment_url($id) { return $id === 77 ? 'https://cdn.test/uploads/77.jpg' : false; }
function get_posts($args) {
    $types = (array) $args['post_type'];
    $out = [];
    foreach ($GLOBALS['POSTS'] as $p) {
        if (!in_array($p->post_type, $types, true)) continue;
        $out[] = ($args['fields'] ?? '') === 'ids' ? $p->ID : $p;
    }
    return $out;
}
function get_post($id) { return $GLOBALS['POSTS'][$id] ?? ($id === 3 || $id === 4 ? (function () use ($id) { $p = new WP_Post($id, 'service', "Related $id"); $p->post_name = "related-$id"; return $p; })() : null); }
function get_post_thumbnail_id($id) { return 0; }
function get_post_field($f, $id) { $p = $GLOBALS['POSTS'][$id] ?? null; return $p ? $p->$f : ''; }
function wp_update_post($a) { $p = $GLOBALS['POSTS'][$a['ID']]; foreach ($a as $k => $v) if ($k !== 'ID') $p->$k = $v; return $a['ID']; }
function esc_html($s) { return htmlspecialchars((string) $s); }
function do_action($h, ...$a) { foreach ($GLOBALS['ACTIONS'][$h] ?? [] as $cb) $cb(...$a); }

require $PLUGIN . '/includes/custom-fields.php';
require $PLUGIN . '/includes/acf-compat.php';
require $PLUGIN . '/includes/custom-fields-engine.php';
require $PLUGIN . '/includes/custom-fields-rest.php';
require $PLUGIN . '/includes/baseline-services.php';
require $PLUGIN . '/includes/content-services.php';

$pass = 0; $fail = 0;
function check($label, $ok, $extra = '') { global $pass, $fail; $ok ? $pass++ : $fail++; echo ($ok ? 'PASS' : 'FAIL') . "  $label" . ($ok ? '' : "  -> $extra") . "\n"; }

// ---------- generate ACF-format storage from the plugin's own field definitions ----------
function sample_value(array $f, string $path) {
    switch ($f['type']) {
        case 'select': return array_key_first($f['choices'] ?? ['x' => 1]);
        case 'number': return 5;
        case 'true_false': return true;
        case 'image': return 77;                 // ACF stores the attachment ID
        case 'relationship': return [3, 4];
        case 'group': $o = []; foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; $o[$sf['name']] = sample_value($sf, "$path.{$sf['name']}"); } return $o;
        case 'repeater': $rows = []; for ($i = 0; $i < 2; $i++) { $r = []; foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; $r[$sf['name']] = sample_value($sf, "$path.$i.{$sf['name']}"); } $rows[] = $r; } return $rows;
        default: return 'v:' . $path;
    }
}
function write_acf(int $id, array $f, $value, string $prefix = '') {
    $key = $prefix . $f['name'];
    switch ($f['type']) {
        case 'repeater':
            $GLOBALS['META'][$id][$key] = (string) count($value);           // ACF stores the row COUNT
            foreach ($value as $i => $row) foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; write_acf($id, $sf, $row[$sf['name']], $key . '_' . $i . '_'); }
            break;
        case 'group':
            foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; write_acf($id, $sf, $value[$sf['name']], $key . '_'); }
            break;
        case 'relationship': $GLOBALS['META'][$id][$key] = $value; break;       // unserialized array
        case 'true_false': $GLOBALS['META'][$id][$key] = $value ? '1' : '0'; break;
        case 'number': $GLOBALS['META'][$id][$key] = (string) $value; break;
        default: $GLOBALS['META'][$id][$key] = $value;
    }
}
function expected_value(array $f, $v) {
    switch ($f['type']) {
        case 'image': return 'https://cdn.test/uploads/77.jpg';
        case 'group': $o = []; foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; $o[$sf['name']] = expected_value($sf, $v[$sf['name']]); } return $o;
        case 'repeater': $rows = []; foreach ($v as $row) { $r = []; foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; $r[$sf['name']] = expected_value($sf, $row[$sf['name']]); } $rows[] = $r; } return $rows;
        default: return $v;
    }
}

$next = 100;
foreach (soldirectory_field_groups() as $type => $groups) {
    $id = $next++;
    $GLOBALS['TYPES'][$id] = $type;
    $GLOBALS['POSTS'][$id] = new WP_Post($id, $type);
    $samples = [];
    foreach ($groups as $group) foreach ($group['fields'] as $f) {
        if (isset($f['tab'])) continue;
        $s = sample_value($f, $f['name']);
        $samples[$f['name']] = [$f, $s];
        write_acf($id, $f, $s);
    }
    if ($type === 'mega_menu_tab') { $GLOBALS['META'][$id]['active'] = '1'; }

    // 1) REST injection must not throw, even with NO `meta` key in the response (the production crash).
    $post = $GLOBALS['POSTS'][$id];
    $crash = null;
    $resp = new WP_REST_Response(['id' => $id, 'slug' => "p$id"]);   // deliberately no 'meta'
    try { foreach ($GLOBALS['FILTERS']["rest_prepare_$type"] ?? [] as $cb) $resp = $cb($resp, $post); } catch (\Throwable $e) { $crash = $e; }
    check("$type: REST injection with no meta key does not throw", $crash === null, $crash ? $crash->getMessage() : '');
    $meta = $resp->get_data()['meta'] ?? [];
    check("$type: injection logged no swallowed error", !file_exists($GLOBALS['LOG']) || strpos(file_get_contents($GLOBALS['LOG']), 'injection failed') === false, file_exists($GLOBALS['LOG']) ? file_get_contents($GLOBALS['LOG']) : '');
    if ($type === 'service_area_page') {
        $m = (array) $meta;
        check('service_area_page: glance_json is [label,value] tuples', isset($m['glance_json']) && is_array(json_decode($m['glance_json'], true)[0]) && count(json_decode($m['glance_json'], true)[0]) === 2, json_encode($m['glance_json'] ?? null));
        check('service_area_page: hero_stats_json is a JSON string; hero_stats_group removed', isset($m['hero_stats_json']) && is_string($m['hero_stats_json']) && !isset($m['hero_stats_group']));
        check('service_area_page: related_services resolved to objects', is_array($m['related_services'] ?? null) && ($m['related_services'][0]['slug'] ?? '') === 'related-3');
        check('service_area_page: finder_group passes through as an object', is_array($m['finder_group'] ?? null));
    }
    if ($type === 'service') {
        $m = (array) $meta;
        check('service: seo_og_image is a URL (not the attachment id)', ($m['seo_og_image'] ?? '') === 'https://cdn.test/uploads/77.jpg', json_encode($m['seo_og_image'] ?? null));
        check('service: *_repeater fields exposed as *_json strings', count(array_filter(array_keys($m), fn($k) => str_ends_with($k, '_json'))) > 0, implode(',', array_keys($m)));
    }
    check("$type: response has a meta array", is_array($meta) || is_object($meta));

    // 2) Migration: every repeater/group/relationship/image round-trips to the JSON storage.
    $bad = [];
    foreach ($samples as $name => [$f, $s]) {
        if (!in_array($f['type'], ['repeater', 'group', 'relationship', 'image'], true)) continue;
        $raw = $GLOBALS['META'][$id][$name] ?? null;
        $got = in_array($f['type'], ['image'], true) ? $raw : json_decode((string) $raw, true);
        $want = expected_value($f, $s);
        if ($f['type'] === 'relationship') $want = [3, 4];
        if ($got !== $want) $bad[] = $name . ' got ' . substr(json_encode($got), 0, 80) . ' want ' . substr(json_encode($want), 0, 80);
    }
    check("$type: all ACF repeaters/groups/relationships/images migrated exactly", !$bad, implode(' | ', array_slice($bad, 0, 3)));
    check("$type: marked migrated", ($GLOBALS['META'][$id][SOLDIRECTORY_ACF_MIGRATED_META] ?? '') === '1');

    // 3) The admin reader (meta box) now sees the content.
    $ok = true;
    foreach ($samples as $name => [$f, $s]) {
        if (!in_array($f['type'], ['repeater', 'group'], true)) continue;
        $val = soldirectory_get_meta_value($id, $name, $f['type']);
        if (!$val) { $ok = false; break; }
    }
    check("$type: meta-box reader returns migrated content", $ok);
}

// 4) A post with real JSON already (saved via the new meta boxes) is never overwritten.
$id = $next++;
$GLOBALS['TYPES'][$id] = 'service_area_page';
$GLOBALS['META'][$id]['glance_repeater'] = json_encode([['label' => 'Kept', 'value' => '1']]);
$GLOBALS['META'][$id]['glance_repeater_0_label'] = 'ACF version';
soldirectory_migrate_post_from_acf($id);
check('existing JSON content is not overwritten by stale ACF keys', json_decode($GLOBALS['META'][$id]['glance_repeater'], true)[0]['label'] === 'Kept');

// 5) Second migration of the same post is a no-op (marker), even if data changed.
$id2 = $next++;
$GLOBALS['TYPES'][$id2] = 'service_area_page';
soldirectory_migrate_post_from_acf($id2);   // nothing to migrate; marks
$GLOBALS['META'][$id2]['glance_repeater'] = '1'; $GLOBALS['META'][$id2]['glance_repeater_0_label'] = 'late';
unset($GLOBALS['META'][$id2][SOLDIRECTORY_ACF_MIGRATED_META]);
soldirectory_migrate_post_from_acf($id2);   // static cache: already handled in this request
check('migration runs at most once per post per request', ($GLOBALS['META'][$id2]['glance_repeater'] ?? '') === '1');

// 6) Garbage in meta never crashes the reader.
$id3 = $next++;
$GLOBALS['TYPES'][$id3] = 'mega_menu_tab';
$GLOBALS['POSTS'][$id3] = new WP_Post($id3, 'mega_menu_tab', 'Broken');
$GLOBALS['META'][$id3]['columns'] = '3';              // count with no rows behind it
$GLOBALS['META'][$id3]['cta'] = 'not json';
$GLOBALS['META'][$id3]['active'] = '1';
$crash = null;
try { $r = new WP_REST_Response(['meta' => []]); foreach ($GLOBALS['FILTERS']['rest_prepare_mega_menu_tab'] as $cb) $r = $cb($r, $GLOBALS['POSTS'][$id3]); } catch (\Throwable $e) { $crash = $e; }
check('garbage meta values do not throw', $crash === null, $crash ? $crash->getMessage() : '');

// 7) The mega-menu endpoint against ACF-format tabs.
do_action('rest_api_init');
$cb = $GLOBALS['ROUTES']['soldirectory/v1/mega-menu']['callback'];
$crash = null; $out = null;
// only real ACF-format tab: the generated one (first mega_menu_tab post)
foreach ($GLOBALS['POSTS'] as $pid => $p) if ($p->post_type === 'mega_menu_tab' && $pid !== $id3) $tabId = $pid;
$GLOBALS['POSTS'] = array_filter($GLOBALS['POSTS'], fn($p) => $p->ID === $tabId || $p->ID === $id3);
try { $out = $cb()->get_data(); } catch (\Throwable $e) { $crash = $e; }
check('mega-menu endpoint does not throw', $crash === null, $crash ? $crash->getMessage() : '');
$tabs = $out['tabs'] ?? [];
check('mega-menu: real tab has 2 columns each with links', count($tabs) >= 1 && count($tabs[0]['columns'] ?? []) === 2 && count($tabs[0]['columns'][0]['links'] ?? []) === 2, json_encode($tabs[0] ?? null));
check('mega-menu: cta group came through', is_array($tabs[0]['cta'] ?? null) && count($tabs[0]['cta']) > 0);

// 8) One-time full migration on admin_init
$before = count($GLOBALS['META']);
do_action('admin_init');
check('admin_init full migration sets its once-only option', !empty($GLOBALS['OPTIONS'][SOLDIRECTORY_ACF_MIGRATED_ALL_OPTION]));

// 9) Baseline service text: fills blanks once, never overwrites, decodes entities, leaves unknown titles alone.
$GLOBALS['POSTS'] = []; $GLOBALS['OPTIONS'] = [];
$mk = function ($id, $title, $excerpt = '', $content = '') { $p = new WP_Post($id, 'service', $title); $p->post_excerpt = $excerpt; $p->post_content = $content; $GLOBALS['POSTS'][$id] = $p; $GLOBALS['TYPES'][$id] = 'service'; };
$mk(501, 'Vision and orientation &amp; mobility');
$mk(502, 'Physiotherapy');
$mk(503, 'Physiotherapy', 'Editor wrote this excerpt', '<p>Editor content</p>');
$mk(504, 'Some Title Nobody Wrote Text For');
$mk(505, 'Specialist Disability Accommodation (SDA)');
$GLOBALS['META'][502]['overview_content'] = 'Editor-written overview';
$GLOBALS['META'][502]['eligibility'] = 'ABC';
do_action('admin_init');
check('baseline: entity-encoded title matches and is filled', strpos($GLOBALS['META'][501]['overview_content'] ?? '', 'blind or have low vision') !== false && ($GLOBALS['META'][501]['overview_heading'] ?? '') === 'About Vision and orientation & mobility');
check('baseline: excerpt is the first sentence only', $GLOBALS['POSTS'][505]->post_excerpt !== '' && strpos($GLOBALS['POSTS'][505]->post_excerpt, 'It covers the building') === false && substr($GLOBALS['POSTS'][505]->post_excerpt, -1) === '.', $GLOBALS['POSTS'][505]->post_excerpt);
check('baseline: editor-written overview is never overwritten', $GLOBALS['META'][502]['overview_content'] === 'Editor-written overview');
check('baseline: existing excerpt/content untouched', $GLOBALS['POSTS'][503]->post_excerpt === 'Editor wrote this excerpt' && $GLOBALS['POSTS'][503]->post_content === '<p>Editor content</p>');
check('baseline: unknown titles are left alone', !isset($GLOBALS['META'][504]['overview_content']) && !isset($GLOBALS['META'][504]['_sd_baseline_content']));
check('baseline: other fields (eligibility etc.) are never written', $GLOBALS['META'][501]['eligibility'] ?? '' === '' && !isset($GLOBALS['META'][501]['funding_info']) && !isset($GLOBALS['META'][501]['typical_cost']) && !isset($GLOBALS['META'][501]['wait_time']));
check('baseline: touched posts are marked', ($GLOBALS['META'][501]['_sd_baseline_content'] ?? '') === '1');
$GLOBALS['META'][501]['overview_content'] = 'Editor replaced it';
do_action('admin_init');
check('baseline: runs once - an editor\'s later edit is not undone', $GLOBALS['META'][501]['overview_content'] === 'Editor replaced it');
$all = soldirectory_baseline_service_text();
$bad = array_filter($all, fn($t) => preg_match('/(?<![-\w])(eligible|eligibility|cost|price|free of charge|waiting time|wait time)\b|\$/i', $t));
check('baseline text makes no eligibility/cost/wait-time claims', !$bad, implode(', ', array_keys($bad)));
check('baseline has 89 descriptions (one per unique service title)', count($all) === 89, (string) count($all));
if (getenv('SD_DUMP_BASELINE_KEYS')) file_put_contents(getenv('SD_DUMP_BASELINE_KEYS'), json_encode(array_keys($all)));


// 10) Service content (eligibility/funding/FAQ/SEO/related) -----------------------------------
$editorial = soldirectory_service_editorial();
check('content: 89 services have editorial text', count($editorial) === 89, (string) count($editorial));
check('content: every baseline title has editorial text and vice versa', array_keys($editorial) == array_keys(soldirectory_baseline_service_text()) || !array_diff(array_keys(soldirectory_baseline_service_text()), array_keys($editorial)) && !array_diff(array_keys($editorial), array_keys(soldirectory_baseline_service_text())));
$badShape = []; $badGroup = []; $numbers = [];
foreach ($editorial as $t => $e) {
    if (count($e) !== 3 || !is_string($e[1]) || strlen($e[1]) < 30 || !is_array($e[2]) || count($e[2]) !== 3) $badShape[] = $t;
    foreach (($e[2] ?? []) as $qa) if (count($qa) !== 2 || substr(trim($qa[0]), -1) !== '?' || strlen($qa[1]) < 40) $badShape[] = "$t (faq)";
    if (!in_array($e[0], ['core', 'cb', 'capital', 'at', 'general'], true)) $badGroup[] = $t;
    // no prices, dollar figures, or specific timeframes/percentages stated as fact
    $blob = $e[1] . ' ' . implode(' ', array_map(fn($qa) => $qa[0] . ' ' . $qa[1], $e[2]));
    if (preg_match('/\$|\d+\s*(%|percent|weeks|months|years|days)|\b\d{2,}\b/i', $blob)) $numbers[] = $t;
}
check('content: every entry has who + exactly 3 well-formed FAQs', !$badShape, implode('; ', array_slice($badShape, 0, 4)));
check('content: every entry has a valid group', !$badGroup, implode('; ', $badGroup));
check('content: editorial text states no prices, percentages or timeframes', !$numbers, implode('; ', $numbers));
$questions = []; foreach ($editorial as $t => $e) foreach ($e[2] as $qa) $questions[] = strtolower($qa[0]);
check('content: FAQ questions are unique across services', count($questions) === count(array_unique($questions)), 'dupes: ' . implode(' | ', array_slice(array_keys(array_filter(array_count_values($questions), fn($n) => $n > 1)), 0, 3)));

$GLOBALS['POSTS'] = []; $GLOBALS['OPTIONS'] = []; $GLOBALS['META'] = [];
$mk = function ($id, $title) { $p = new WP_Post($id, 'service', $title); $GLOBALS['POSTS'][$id] = $p; $GLOBALS['TYPES'][$id] = 'service'; };
$mk(601, 'Physiotherapy'); $mk(602, 'Occupational therapy'); $mk(603, 'Psychology'); $mk(604, 'Speech pathology'); $mk(605, 'Podiatry'); $mk(606, 'Dietitian');
$mk(607, 'Specialist Disability Accommodation (SDA)'); $mk(608, 'Vision and orientation &amp; mobility'); $mk(609, 'Vision and orientation &amp; mobility'); $mk(610, 'Not a known service');
$GLOBALS['META'][607]['eligibility'] = 'ABC';                       // placeholder -> replaced
$GLOBALS['META'][607]['funding_info'] = 'Funding text written by an editor that is definitely not a placeholder.';   // kept
$GLOBALS['META'][601]['seo_title'] = 'My own SEO title';             // kept
$GLOBALS['META'][602]['faq_repeater'] = json_encode([['question' => 'Editor Q?', 'answer' => 'Editor A.']]);   // kept
$sum = soldirectory_apply_service_content(false);
check('content: applies to known services only', $sum['posts'] === 9 && !isset($GLOBALS['META'][610]['who_for']), json_encode($sum));
$m601 = $GLOBALS['META'][601];
check('content: SEO title/description within search limits', strlen($GLOBALS['META'][603]['seo_title']) <= 60 && strlen($GLOBALS['META'][603]['seo_description']) <= 158 && strlen($GLOBALS['META'][603]['seo_description']) >= 70, ($GLOBALS['META'][603]['seo_title'] ?? '') . ' / ' . ($GLOBALS['META'][603]['seo_description'] ?? ''));
check('content: an editor-written SEO title is never replaced', $GLOBALS['META'][601]['seo_title'] === 'My own SEO title');
check('content: editor FAQ is never replaced', json_decode($GLOBALS['META'][602]['faq_repeater'], true)[0]['question'] === 'Editor Q?' && count(json_decode($GLOBALS['META'][602]['faq_repeater'], true)) === 1);
check('content: placeholder "ABC" eligibility is replaced', strpos($GLOBALS['META'][607]['eligibility'], 'reasonable and necessary') !== false);
check('content: real editor funding text is kept', strpos($GLOBALS['META'][607]['funding_info'], 'written by an editor') !== false);
$faq = json_decode($GLOBALS['META'][603]['faq_repeater'], true);
check('content: FAQ has 8 rows of {question, answer} (3 short + 3 long + 2 shared) ending with the find-a-provider one', count($faq) === 8 && isset($faq[0]['question'], $faq[0]['answer']) && strpos($faq[7]['question'], 'provider near me') !== false, (string) count($faq));
$cred = json_decode($GLOBALS['META'][603]['credentials_repeater'], true); $reg = json_decode($GLOBALS['META'][603]['regulator_cards_repeater'], true);
check('content: credentials + regulator cards have the row shapes the frontend reads', count($cred) === 3 && isset($cred[0]['title'], $cred[0]['description']) && count($reg) === 2 && isset($reg[0]['title'], $reg[0]['phone'], $reg[0]['website'], $reg[0]['cta']));
$rel = json_decode($GLOBALS['META'][603]['related_services'], true);
check('content: related services are real sibling post ids, not self, no duplicates-of-titles', is_array($rel) && count($rel) >= 1 && !in_array(603, $rel, true) && count($rel) === count(array_unique($rel)) && !array_diff($rel, array_keys($GLOBALS['POSTS'])), json_encode($rel));
check('content: hero + CTA use action keys the frontend understands', $GLOBALS['META'][603]['hero_cta_url'] === 'get_matched' && $GLOBALS['META'][603]['cta_primary_action'] === 'get_matched' && $GLOBALS['META'][603]['cta_secondary_action'] === '/directory');
check('content: no cost / wait / hours / availability fields are written', !isset($GLOBALS['META'][603]['typical_cost']) && !isset($GLOBALS['META'][603]['wait_time']) && !isset($GLOBALS['META'][603]['hours']) && !isset($GLOBALS['META'][603]['availability']));
check('content: the two duplicate posts both get content but related links use ONE post per title', isset($GLOBALS['META'][608]['who_for']) && isset($GLOBALS['META'][609]['who_for']));
check('content: marked with the version', ($GLOBALS['META'][603]['_sd_content_v3'] ?? '') === '3');
$before = $GLOBALS['META'][603];
$sum2 = soldirectory_apply_service_content(false);
check('content: second run without force is a no-op', $sum2['posts'] === 0 && $GLOBALS['META'][603] === $before);
$GLOBALS['META'][603]['who_for'] = '';
$snap = $GLOBALS['META'];
$sum3 = soldirectory_apply_service_content(true);
$changedKeys = []; foreach ($GLOBALS['META'] as $pid => $mm) foreach ($mm as $k => $v) if (($snap[$pid][$k] ?? null) !== $v) $changedKeys[] = "$pid:$k";
check('content: forced run re-fills only what is blank', $sum3['fields'] === 1 && $GLOBALS['META'][603]['who_for'] !== '' && $changedKeys === ['603:who_for'], json_encode($changedKeys));
$phones = []; foreach ($GLOBALS['META'] as $mm) if (isset($mm['regulator_cards_repeater'])) foreach (json_decode($mm['regulator_cards_repeater'], true) as $c) $phones[$c['phone']] = 1;
check('content: only the two known regulator phone numbers appear', array_keys($phones) == ['1800 035 544', '1800 800 110']);


// 11) Long-form guides ---------------------------------------------------------------------
$long = soldirectory_service_long();
$baseTitles = array_keys(soldirectory_baseline_service_text());
check('long: every one of the 89 services has a long-form guide', count($long) === 89 && !array_diff($baseTitles, array_keys($long)) && !array_diff(array_keys($long), $baseTitles), (string) count($long) . ' missing: ' . implode('; ', array_diff($baseTitles, array_keys($long))));
$cats = ['', 'Support coordination', 'Plan management', 'Personal care', 'Domestic assistance', 'Transport', 'Therapy services', 'Nursing', 'Housing (SDA & SIL)', 'Community access', 'Respite care', 'Behaviour support', 'Employment & education support', 'Life skills', 'Assistive technology & equipment', 'Home modifications', 'Dementia care', 'Palliative care', 'Residential aged care', 'Support workers'];
$bad = []; $badNum = []; $badBs = []; $words = 0; $allQ = [];
foreach ($long as $t => $l) {
    $paras = preg_split('/\n\n/', $l['overview']);
    if (!in_array($l['cat'], $cats, true)) $bad[] = "$t (cat {$l['cat']})";
    if (strlen($l['short']) < 80 || count($paras) !== 3 || strlen($l['overview']) < 600 || count($l['choose']) !== 5 || count($l['start']) !== 4 || count($l['faq']) !== 3) $bad[] = "$t (shape " . count($paras) . '/' . strlen($l['overview']) . '/' . count($l['choose']) . '/' . count($l['start']) . '/' . count($l['faq']) . ')';
    foreach ($l['faq'] as $qa) { if (substr($qa[0], -1) !== '?' || strlen($qa[1]) < 30) $bad[] = "$t (faq)"; $allQ[] = strtolower($qa[0]); }
    $blob = $l['short'] . ' ' . $l['overview'] . ' ' . implode(' ', $l['choose']) . ' ' . implode(' ', $l['start']) . ' ' . implode(' ', array_map(fn($qa) => $qa[0] . ' ' . $qa[1], $l['faq']));
    if (preg_match('/\$|\d+\s*(%|percent|weeks|months|years|days|hours)|\b\d{2,}\b/i', $blob)) $badNum[] = $t;
    if (strpos($blob, '\\') !== false) $badBs[] = $t;
    $words += str_word_count($blob);
}
check('long: every guide has the full shape (3 paragraphs, 5 choose, 4 steps, 3 FAQs) and a valid register category', !$bad, implode('; ', array_slice($bad, 0, 4)));
check('long: no prices, percentages, or timeframes stated as fact', !$badNum, implode('; ', $badNum));
check('long: no stray backslashes (PHP quoting bug) in any text', !$badBs, implode('; ', $badBs));
foreach ($editorial as $t => $e) foreach ($e[2] as $qa) $allQ[] = strtolower($qa[0]);
check('long: FAQ questions stay unique across short + long sets', count($allQ) === count(array_unique($allQ)), implode(' | ', array_slice(array_keys(array_filter(array_count_values($allQ), fn($n) => $n > 1)), 0, 4)));
check('long: guides average at least 300 words of unique writing each', $words / count($long) >= 300, (string) round($words / count($long)));

// apply with long content: upgrade rules
$GLOBALS['POSTS'] = []; $GLOBALS['OPTIONS'] = []; $GLOBALS['META'] = [];
$mk = function ($id, $title) { $p = new WP_Post($id, 'service', $title); $GLOBALS['POSTS'][$id] = $p; $GLOBALS['TYPES'][$id] = 'service'; };
$mk(701, 'Physiotherapy'); $mk(702, 'Occupational therapy'); $mk(703, 'Psychology'); $mk(704, 'Speech pathology'); $mk(705, 'Vehicle modifications');
$base = soldirectory_baseline_service_text();
$GLOBALS['META'][701]['overview_content'] = $base['Physiotherapy'];                                  // earlier machine text -> upgraded
$GLOBALS['META'][701]['faq_repeater'] = json_encode(soldirectory_machine_faq_rows('Physiotherapy', $editorial['Physiotherapy'], null)); // earlier machine FAQ -> upgraded
$GLOBALS['META'][702]['overview_content'] = 'My own carefully written overview of occupational therapy for our clients.';           // editor -> kept
$GLOBALS['META'][702]['faq_repeater'] = json_encode([['question' => 'Editor Q?', 'answer' => 'Editor A.']]);                  // editor -> kept
$sumL = soldirectory_apply_service_content(false);
$m = $GLOBALS['META'][701];
check('long: earlier machine overview is upgraded to the long guide (3 paragraphs)', substr_count($m['overview_content'], "\n\n") === 2 && strlen($m['overview_content']) > 600);
check('long: earlier machine FAQ set is upgraded to 8 rows', count(json_decode($m['faq_repeater'], true)) === 8);
check('long: an editor-written overview and FAQ are never replaced', $GLOBALS['META'][702]['overview_content'] === 'My own carefully written overview of occupational therapy for our clients.' && count(json_decode($GLOBALS['META'][702]['faq_repeater'], true)) === 1);
check('long: short answer, how-to-choose (5 lines), getting-started (4 lines), cost info written', strlen($m['short_answer']) > 80 && substr_count($m['how_to_choose'], "\n") === 4 && substr_count($m['getting_started'], "\n") === 3 && strpos($m['cost_info'], 'Pricing Arrangements and Price Limits') !== false);
check('long: cost text names no price', !preg_match('/\$|\d/', $m['cost_info']));
check('long: register category is stored (and none when a service fits no category)', $m['register_category'] === 'Therapy services' && !isset($GLOBALS['META'][705]['register_category']));
$src = json_decode($m['sources_repeater'], true);
check('long: sources are official root sites, always incl. NDIS + Commission, AHPRA for health services', count($src) === 3 && strpos($src[0]['url'], 'https://www.ndis.gov.au') === 0 && strpos($src[1]['url'], 'ndiscommission.gov.au') !== false && strpos($src[2]['url'], 'ahpra.gov.au') !== false, json_encode($src));
$srcAll = []; foreach ($long as $t => $l) foreach (soldirectory_source_links($l['src'] ?? []) as $x) $srcAll[$x['url']] = 1;
check('long: only the known source sites are ever linked', !array_diff(array_keys($srcAll), ['https://www.ndis.gov.au', 'https://www.ndiscommission.gov.au', 'https://www.ahpra.gov.au', 'https://www.jobaccess.gov.au']), implode(',', array_keys($srcAll)));
// Optional: dump what the REST API would return for a real service, so the web/API side can be tested against the true shape.
if (getenv('SD_EMIT_REST')) {
    $out = [];
    foreach ([701 => 'physiotherapy', 705 => 'vehicle-modifications'] as $pid => $slug) {
        $post = $GLOBALS['POSTS'][$pid];
        $post->post_name = $slug;
        $resp = new WP_REST_Response(['id' => $pid, 'slug' => $slug, 'title' => ['rendered' => $post->post_title], 'excerpt' => ['rendered' => '<p>' . $post->post_excerpt . '</p>'], 'content' => ['rendered' => '']]);
        foreach ($GLOBALS['FILTERS']['rest_prepare_service'] ?? [] as $cb) $resp = $cb($resp, $post);
        $out[] = $resp->get_data();
    }
    file_put_contents(getenv('SD_EMIT_REST'), json_encode($out));
}
$again = soldirectory_apply_service_content(true);
check('long: forced re-run changes nothing further (idempotent)', $again['fields'] === 0, json_encode($again));

echo "\n$pass passed, $fail failed\n";
