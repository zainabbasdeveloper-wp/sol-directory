<?php
/**
 * Seeds the 5 real Mega Menu Tab posts (Service/Condition/Funding/
 * Coordinator/Language), each with their full Column -> Link
 * structure via ACF/SCF's update_field() — matching exactly the
 * content in apps/web/src/data/staticMegaMenuFallback.ts, so the
 * live WordPress-driven menu and the offline fallback show identical
 * content once this has run.
 *
 * For the Service tab specifically: rather than recomputing slugs,
 * this looks up each already-seeded 'service' post by title (from
 * seed-ndis-services.php) and uses its REAL slug — guaranteed
 * correct, not guessed twice.
 *
 * Idempotent — updates an existing tab with the same tab_key instead
 * of creating a duplicate, so it's safe to re-run after editing this
 * script.
 *
 * Run from apps/cms: php seed-mega-menu-tabs.php
 */

require_once __DIR__ . '/wordpress/wp-load.php';

if (!post_type_exists('mega_menu_tab')) {
    die("ERROR: 'mega_menu_tab' post type not found. Is the SolDirectory Content plugin active with the latest post-types.php?\n");
}
if (!function_exists('update_field')) {
    die("ERROR: ACF/SCF's update_field() isn't available. Is Secure Custom Fields active?\n");
}

function sd_get_or_create_tab(string $tabKey, string $label, string $description): int {
    $existing = get_posts([
        'post_type' => 'mega_menu_tab',
        'meta_key' => 'tab_key',
        'meta_value' => $tabKey,
        'posts_per_page' => 1,
    ]);
    if ($existing) {
        $id = $existing[0]->ID;
        wp_update_post(['ID' => $id, 'post_title' => $label, 'post_status' => 'publish']);
    } else {
        $id = wp_insert_post(['post_type' => 'mega_menu_tab', 'post_title' => $label, 'post_status' => 'publish']);
    }
    update_field('tab_key', $tabKey, $id);
    update_field('description', $description, $id);
    update_field('active', true, $id);
    return $id;
}

// Real 'service' post lookup, by title -> real slug. Falls back to a
// computed slug only if that exact service post doesn't exist yet
// (so this script still works even if seed-ndis-services.php hasn't
// been run, though results will be less reliable in that case).
function sd_real_service_url(string $title): string {
    $post = get_page_by_title($title, OBJECT, 'service');
    if ($post) return '/services/' . $post->post_name;
    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', str_replace(["'", '"', '(', ')', '&'], '', $title)), '-'));
    return '/services/' . $slug;
}

function sd_combo_url(string $title): string {
    $suburb = ($title === 'Nursing') ? 'bankstown' : 'sydney';
    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', str_replace(["'", '"', '(', ')', '&'], '', $title)), '-'));
    return "/services/$slug/$suburb";
}

function sd_links(array $titles, string $urlFn): array {
    return array_map(fn($t) => [
        'label' => $t, 'url' => $urlFn($t), 'description' => '', 'icon' => '',
        'badge' => '', 'open_in_new_tab' => false, 'active' => true,
    ], $titles);
}

function sd_columns(array $groups, string $urlFn): array {
    return array_map(fn($g) => ['title' => $g[0], 'links' => sd_links($g[1], $urlFn)], $groups);
}

// --- Service ---
$serviceGroups = [
    ['Personal & Nursing Care', ['Personal care', 'Medication assistance', 'Overnight support', 'High-intensity personal care', 'Community nursing care']],
    ['Accommodation & Living Supports', ['Supported Independent Living (SIL)', 'Individualised Living Options (ILO)', 'Short Term Accommodation (STA) / respite', 'Medium Term Accommodation (MTA)', 'Group / shared living support']],
    ['Household Tasks', ['House cleaning and household tasks', 'Meal preparation', 'Yard maintenance and gardening', 'Tenancy and accommodation assistance', 'Household management']],
    ['Community Participation', ['One-to-one community access', 'Group and centre-based activities', 'Social and recreation activities', 'Cultural, religious and civic participation', 'Supported holidays and camps', 'Innovative community participation', 'Volunteering and community groups']],
    ['Transport', ['Transport to activities and appointments', 'Recurring transport allowance', 'Activity-based transport', 'Specialised transport']],
    ['Consumables', ['Continence products', 'Low-cost assistive technology', 'Home enteral nutrition (HEN)', 'Interpreting and translation', 'Assistance animal upkeep']],
    ['Support Coordination', ['Support Connection (Level 1)', 'Support Coordination (Level 2)', 'Specialist Support Coordination (Level 3)', 'Psychosocial Recovery Coaching']],
    ['Capacity Building — Daily Living', ['Housing search and matching', 'Tenancy skills and sustainment', 'Skill-building community access', 'Life transition planning and mentoring', 'Group skills development', 'Skill-building camps and classes']],
    ['Employment & Education Supports', ['School Leaver Employment Supports (SLES)', 'Employment assessment and counselling', 'Supported employment', 'Job coaching and workplace assistance', 'Higher education and training support']],
    ['Behaviour & Allied Health', ['Specialist Positive Behaviour Support', 'Behaviour support implementation', 'Social skills and relationship development', 'Dietitian', 'Exercise physiology', 'Personal training']],
    ['Life & Plan Skills', ['Transition to further education', 'Study and learning skills', 'Plan management', 'Self-management training', 'Financial and organisational skills']],
    ['Therapeutic Supports', ['Occupational therapy', 'Physiotherapy', 'Speech pathology', 'Psychology', 'Social work', 'Counselling', 'Podiatry', 'Music therapy and art therapy', 'Therapy assistants', 'Early Childhood Intervention']],
    ['Training & Assessments', ['Assistive technology assessment and training', 'Specialised driver training', 'Hearing services and audiology', 'Vision and orientation & mobility', 'Daily living and life skills development', 'Training for carers and parents', 'Assistance animal training and assessment', 'Nursing training for support workers']],
    ['Assistive Technology & Equipment', ['Mobility equipment', 'Personal care and safety equipment', 'Communication and information equipment', 'Vision equipment', 'Hearing equipment', 'Household task equipment', 'Recreation equipment', 'Customised prosthetics and orthotics', 'Vehicle modifications', 'AT repairs, maintenance, rental and trial', 'Assistance animals']],
    ['Home Modifications & SDA', ['Minor home modifications', 'Complex home modifications', 'Specialist Disability Accommodation (SDA)']],
];
$id = sd_get_or_create_tab('service', 'Service', 'NDIS, aged care, allied health, and more');
update_field('columns', sd_columns($serviceGroups, 'sd_real_service_url'), $id);
echo "Seeded: Service ($id)\n";

// --- Condition ---
$conditionGroups = [
    ['Developmental', ['Autism', 'ADHD', 'Intellectual Disability', 'Global Developmental Delay', 'Down Syndrome', 'Fragile X Syndrome', 'Cerebral Palsy', 'Speech & Language Delay']],
    ['Mobility & Physical', ['Spinal Cord Injury', 'Amputation & Limb Loss', 'Muscular Dystrophy', 'Multiple Sclerosis', 'Arthritis', 'Spina Bifida', 'Chronic Pain']],
    ['Hearing, Vision & Sensory', ['Deafness & Hearing Loss', 'Blindness & Low Vision', 'Deafblindness', 'Auslan Support', 'Sensory Processing']],
    ['Psychosocial & Mental Health', ['Schizophrenia', 'Bipolar Disorder', 'PTSD', 'Anxiety Disorders', 'Depression', 'Eating Disorders', 'Borderline Personality Disorder', 'Dual Diagnosis']],
    ['Chronic & Complex Medical', ['Epilepsy', 'Diabetes', 'Cystic Fibrosis', 'Renal Failure', 'Cancer Care', 'Motor Neurone Disease', "Parkinson's Disease"]],
    ['ABI, Stroke & Neuro Rehab', ['Acquired Brain Injury', 'Stroke Recovery', 'Traumatic Brain Injury', "Huntington's Disease", 'Neuro Physiotherapy']],
];
$id = sd_get_or_create_tab('condition', 'Condition', 'Find support by diagnosis or need');
update_field('columns', sd_columns($conditionGroups, 'sd_combo_url'), $id);
echo "Seeded: Condition ($id)\n";

// --- Funding ---
$fundingGroups = [
    ['NDIS Plans', ['Agency Managed', 'Plan Managed', 'Self Managed', 'Plan Reviews', 'Change of Circumstances', 'First Plan Support']],
    ['Aged Care', ['Home Care Packages', 'Commonwealth Home Support', 'Support at Home', 'Residential Fees']],
    ['Veterans', ['DVA Community Nursing', 'DVA Home Care', "Veterans' Home Care", 'Rehabilitation Appliances', 'Open Arms Referrals']],
    ['Other Funding', ['Private Fee for Service', 'iCare & Workers Compensation', 'Private Health Insurance', 'Medicare Care Plans', 'State Funded Programs']],
    ['Help With Funding', ['Plan Managers', 'Bookkeeping & Invoicing', 'Price Guide Explained', 'Funding Eligibility', 'Budget Categories']],
];
$id = sd_get_or_create_tab('funding', 'Funding', 'NDIS plans, HCP, CHSP, DVA, and private');
update_field('columns', sd_columns($fundingGroups, 'sd_combo_url'), $id);
echo "Seeded: Funding ($id)\n";

// --- Coordinator ---
$coordinatorGroups = [
    ['Make a Referral', ['Single Provider Referral', 'Bulk Referrals', 'Urgent Placement Requests', 'Referral Templates', 'Referral Tracking']],
    ['Capacity & Availability', ['Live Vacancy Board', 'Confirmed Capacity Feed', 'Waitlist Status', 'Response Time Data', 'Service Area Coverage']],
    ['Tools for Coordinators', ['Saved Provider Lists', 'Shortlist Sharing', 'Comparison Sheets', 'Bulk Export', 'Participant Notes']],
    ['Compliance', ['Registration Checks', 'Worker Screening', 'Insurance Certificates', 'Incident History']],
    ['Working With Us', ['Coordinator Accounts', 'Team Access', 'Training & Webinars', 'Contact the Directory Team']],
];
$id = sd_get_or_create_tab('coordinator', 'Support coordinator referrals', 'Referral pathways for support coordinators');
update_field('columns', sd_columns($coordinatorGroups, 'sd_combo_url'), $id);
echo "Seeded: Support coordinator referrals ($id)\n";

// --- Language ---
$languageGroups = [
    ['Most Requested', ['Arabic', 'Mandarin', 'Cantonese', 'Vietnamese', 'Greek', 'Italian', 'Hindi', 'Punjabi']],
    ['Middle East & Africa', ['Assyrian', 'Persian (Farsi)', 'Dari', 'Turkish', 'Somali', 'Swahili', 'Amharic']],
    ['First Nations', ['Aboriginal & Torres Strait Islander Services', 'Kriol', 'Yolngu Matha', 'Pitjantjatjara']],
    ['Europe', ['Spanish', 'Portuguese', 'Polish', 'Croatian', 'Serbian', 'Russian', 'Macedonian', 'German']],
    ['Asia Pacific', ['Tagalog', 'Indonesian', 'Korean', 'Japanese', 'Nepali', 'Tamil', 'Thai', 'Khmer']],
    ['Access & Interpreting', ['Auslan', 'Deafblind Interpreters', 'TIS National Bookings', 'Easy Read Materials', 'Translated Documents']],
];
$id = sd_get_or_create_tab('language', 'Language', 'Support in a language spoken at home');
update_field('columns', sd_columns($languageGroups, 'sd_combo_url'), $id);
echo "Seeded: Language ($id)\n";

// Set the native page-attributes menu_order to match the intended
// tab display order (Service, Condition, Funding, Coordinator, Language).
global $wpdb;
$order = ['service', 'condition', 'funding', 'coordinator', 'language'];
foreach ($order as $i => $key) {
    $post = get_posts(['post_type' => 'mega_menu_tab', 'meta_key' => 'tab_key', 'meta_value' => $key, 'posts_per_page' => 1]);
    if ($post) wp_update_post(['ID' => $post[0]->ID, 'menu_order' => $i]);
}

echo "\nDone. Visit /wp-json/soldirectory/v1/mega-menu to confirm.\n";
