<?php
/**
 * Replaces ACF/SCF entirely for this plugin's post types with plain
 * WordPress meta boxes: our own PHP rendering, our own save_post
 * handling, our own small vanilla-JS file for repeater rows and the
 * image picker. No ACF/SCF function is called anywhere below.
 *
 * WHY: on the live site, ACF/SCF's own admin JavaScript (the bundle
 * that defines `window.acf` and wires up every Add row / image /
 * toggle button) fails to load — reported as "Uncaught ReferenceError:
 * acf is not defined" in the browser console, with Add row doing
 * nothing but scroll to the top (the default behaviour of the plain
 * `href="#"` link ACF's own JS never got the chance to bind a click
 * handler to). That failure is outside this plugin's control — it's
 * ACF/SCF's own bundle, on this specific host, for reasons a git repo
 * can't diagnose without direct access to the live site's Network
 * tab. Removing the dependency entirely removes the failure mode.
 *
 * Field values keep the EXACT SAME meta key names and REST shapes the
 * old ACF-based version produced (see soldirectory_get_group_defs()
 * below, transcribed field-for-field from the previous acf-fields.php)
 * — apps/web needed zero changes for this.
 *
 * Storage convention (deliberately simple, no ACF-internal format):
 *  - scalar fields (text/textarea/number/select/true_false/image/
 *    wysiwyg) -> one plain post meta value.
 *  - repeater  -> ONE post meta value holding a JSON-encoded array of
 *    row objects.
 *  - group     -> ONE post meta value holding a JSON-encoded object.
 *  - relationship/post_object -> ONE post meta value holding a
 *    JSON-encoded array of post IDs.
 */

if (!defined('ABSPATH')) exit;

// =============================================================
// Field-group definitions — the single source of truth both the
// admin renderer/saver and the REST exposer below read from.
// =============================================================

/**
 * A field is: ['name','label','type', ...type-specific keys].
 * A tab divider (purely visual, stores nothing) is: ['tab' => 'Label'].
 * Repeater/group fields carry 'sub_fields' (same shape, recursively).
 */
function soldirectory_field_groups(): array {
    static $groups = null;
    if ($groups !== null) return $groups;

    // Reused across service / service_area_page / location / guide —
    // real per-page control over what search engines and social
    // shares show. Every field optional: the frontend falls back to
    // the post's own real title/excerpt/featured image when blank.
    $seo_fields = [
        ['name' => 'seo_title', 'label' => 'SEO Title', 'type' => 'text', 'instructions' => 'Overrides the title search engines and social shares show. Leave blank to use the page title.'],
        ['name' => 'seo_description', 'label' => 'SEO Description', 'type' => 'textarea', 'rows' => 2, 'instructions' => 'Aim for under 160 characters. Leave blank to use the page summary.'],
        ['name' => 'seo_og_image', 'label' => 'Social Share Image', 'type' => 'image', 'instructions' => 'Shown when this page is shared on social media. Leave blank to use the featured image.'],
        ['name' => 'seo_noindex', 'label' => 'Hide from search engines', 'type' => 'true_false', 'instructions' => 'Turn on while this page is still a draft or duplicate, so it does not show up in Google.'],
    ];

    $groups = [
        'mega_menu_tab' => [
            [
                'id' => 'mega_menu_tab_fields', 'title' => 'Mega Menu Tab Details',
                'fields' => [
                    ['name' => 'tab_key', 'label' => 'Slug / Key', 'type' => 'text', 'required' => true,
                        'instructions' => "Stable identifier the frontend uses to match this tab (e.g. 'service', 'condition', 'funding'). Changing this after launch requires a matching frontend update — coordinate before renaming."],
                    ['name' => 'description', 'label' => 'Tab Description', 'type' => 'text', 'instructions' => 'Short subtext shown under the tab label in the menu rail (e.g. "NDIS, aged care, allied health, and more").'],
                    ['name' => 'icon', 'label' => 'Icon (optional)', 'type' => 'text', 'instructions' => 'An icon identifier or short text/emoji — how this renders depends on the frontend icon system in use.'],
                    ['name' => 'active', 'label' => 'Active', 'type' => 'true_false', 'default' => true, 'instructions' => 'Inactive tabs are hidden from the live menu without deleting them.'],
                    [
                        'name' => 'columns', 'label' => 'Columns', 'type' => 'repeater', 'layout' => 'block', 'button_label' => 'Add column', 'row_label_field' => 'title',
                        'sub_fields' => [
                            ['name' => 'title', 'label' => 'Column Title', 'type' => 'text', 'required' => true],
                            [
                                'name' => 'links', 'label' => 'Links', 'type' => 'repeater', 'layout' => 'block', 'button_label' => 'Add link', 'row_label_field' => 'label',
                                'sub_fields' => [
                                    ['name' => 'label', 'label' => 'Label', 'type' => 'text', 'required' => true, 'width' => 50],
                                    ['name' => 'url', 'label' => 'URL', 'type' => 'text', 'width' => 50, 'instructions' => 'A relative app path (e.g. /services/personal-care) or a full URL.'],
                                    ['name' => 'description', 'label' => 'Description', 'type' => 'text'],
                                    ['name' => 'icon', 'label' => 'Icon', 'type' => 'text', 'width' => 34],
                                    ['name' => 'badge', 'label' => 'Badge', 'type' => 'text', 'width' => 33, 'instructions' => 'e.g. "New" — leave blank for none.'],
                                    ['name' => 'open_in_new_tab', 'label' => 'Open in new tab', 'type' => 'true_false', 'width' => 33],
                                    ['name' => 'active', 'label' => 'Active', 'type' => 'true_false', 'default' => true],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name' => 'cta', 'label' => 'Tab CTA (optional)', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'label', 'label' => 'CTA Label', 'type' => 'text', 'width' => 34],
                            ['name' => 'action', 'label' => 'CTA Action', 'type' => 'text', 'width' => 33,
                                'instructions' => "An action key the frontend interprets (e.g. 'get_matched', 'find_providers') rather than a hardcoded URL — required if the CTA should open an app flow/modal instead of navigating. Leave blank and fill in URL for a plain link instead."],
                            ['name' => 'url', 'label' => 'CTA URL (if not using an action)', 'type' => 'text', 'width' => 33],
                        ],
                    ],
                ],
            ],
        ],

        'service' => [
            [
                'id' => 'service_fields', 'title' => 'Service Information',
                'fields' => [
                    ['name' => 'short_answer', 'label' => 'The short answer', 'type' => 'textarea', 'rows' => 3, 'instructions' => 'Two or three plain sentences shown in a highlighted box at the top of the page. Also the first thing a search engine reads.'],
                    ['name' => 'overview_heading', 'label' => 'Overview Heading', 'type' => 'text'],
                    ['name' => 'overview_content', 'label' => 'Overview Content', 'type' => 'textarea', 'rows' => 10, 'instructions' => 'Separate paragraphs with a blank line.'],
                    ['name' => 'how_to_choose', 'label' => 'How to choose a provider', 'type' => 'textarea', 'rows' => 6, 'instructions' => 'One point per line. Shown as a list.'],
                    ['name' => 'getting_started', 'label' => 'Getting started', 'type' => 'textarea', 'rows' => 5, 'instructions' => 'One step per line. Shown as a numbered list.'],
                    ['name' => 'typical_session', 'label' => 'What a typical session looks like', 'type' => 'textarea', 'rows' => 8, 'instructions' => 'Separate paragraphs with a blank line.'],
                    ['name' => 'who_delivers', 'label' => 'Who delivers this support', 'type' => 'textarea', 'rows' => 4],
                    ['name' => 'plan_fit', 'label' => 'How it fits with the rest of a plan', 'type' => 'textarea', 'rows' => 4],
                    ['name' => 'questions_to_ask', 'label' => 'Questions to ask a provider', 'type' => 'textarea', 'rows' => 6, 'instructions' => 'One question per line. Shown as a list.'],
                    ['name' => 'common_mistakes', 'label' => 'Common mistakes', 'type' => 'textarea', 'rows' => 6, 'instructions' => 'One point per line. Shown as a list.'],
                    ['name' => 'cost_info', 'label' => 'How costs work', 'type' => 'textarea', 'rows' => 4, 'instructions' => 'Explain how this is priced and paid for. Do not put specific prices here unless you can keep them current.'],
                    ['name' => 'register_category', 'label' => 'Register category', 'type' => 'select', 'choices' => ['' => 'None (no register block)', 'Support coordination' => 'Support coordination', 'Plan management' => 'Plan management', 'Personal care' => 'Personal care', 'Domestic assistance' => 'Domestic assistance', 'Transport' => 'Transport', 'Therapy services' => 'Therapy services', 'Nursing' => 'Nursing', 'Housing (SDA & SIL)' => 'Housing (SDA & SIL)', 'Community access' => 'Community access', 'Respite care' => 'Respite care', 'Behaviour support' => 'Behaviour support', 'Employment & education support' => 'Employment & education support', 'Life skills' => 'Life skills', 'Assistive technology & equipment' => 'Assistive technology & equipment', 'Home modifications' => 'Home modifications', 'Dementia care' => 'Dementia care', 'Palliative care' => 'Palliative care', 'Residential aged care' => 'Residential aged care', 'Support workers' => 'Support workers'], 'default' => '', 'instructions' => 'Which public-register support category this service belongs to. Drives the live "providers on the register" tables on the page. Leave as None if no category fits honestly.'],
                    ['name' => 'who_for', 'label' => 'Who Is This Service For?', 'type' => 'textarea', 'rows' => 3],
                    ['name' => 'eligibility', 'label' => 'Eligibility', 'type' => 'textarea', 'rows' => 3],
                    ['name' => 'funding_info', 'label' => 'Funding Options', 'type' => 'textarea', 'rows' => 3],
                    ['name' => 'plan_management_info', 'label' => 'Plan Management Information', 'type' => 'textarea', 'rows' => 2],
                    ['name' => 'availability', 'label' => 'Availability', 'type' => 'text', 'width' => 50, 'instructions' => 'e.g. "Seven days a week"'],
                    ['name' => 'wait_time', 'label' => 'Typical Wait Time', 'type' => 'text', 'width' => 50, 'instructions' => 'e.g. "1-2 weeks" — an editorial estimate, not a live figure.'],
                    ['name' => 'typical_cost', 'label' => 'Typical Cost', 'type' => 'text', 'width' => 50],
                    ['name' => 'how_to_pay', 'label' => 'How to Pay', 'type' => 'text', 'width' => 50, 'instructions' => 'Short sentence, e.g. "Funding options include NDIS Assistive Technology. Eligibility depends on your assessment and plan."'],
                    ['name' => 'hours', 'label' => 'Typical Hours', 'type' => 'text'],
                    ['name' => 'registration_info', 'label' => 'Registration Information', 'type' => 'textarea', 'rows' => 2],
                    [
                        'name' => 'faq_repeater', 'label' => 'FAQ', 'type' => 'repeater', 'layout' => 'block', 'button_label' => 'Add FAQ item', 'row_label_field' => 'question',
                        'sub_fields' => [
                            ['name' => 'question', 'label' => 'Question', 'type' => 'text'],
                            ['name' => 'answer', 'label' => 'Answer', 'type' => 'textarea', 'rows' => 2],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'service_hero_fields', 'title' => 'Service Hero',
                'fields' => [
                    ['name' => 'hero_eyebrow', 'label' => 'Hero Eyebrow', 'type' => 'text', 'instructions' => 'Small label above the headline, e.g. the service category name.'],
                    ['name' => 'hero_headline', 'label' => 'Hero Headline', 'type' => 'text', 'instructions' => 'Leave blank to use the post title.'],
                    ['name' => 'hero_description', 'label' => 'Hero Description', 'type' => 'textarea', 'rows' => 2, 'instructions' => 'Leave blank to use the excerpt.'],
                    ['name' => 'hero_background_image', 'label' => 'Hero Background Image', 'type' => 'image', 'instructions' => 'Leave blank to use the featured image.'],
                    ['name' => 'hero_cta_label', 'label' => 'Hero CTA Label', 'type' => 'text', 'width' => 50],
                    ['name' => 'hero_cta_url', 'label' => 'Hero CTA URL/Action', 'type' => 'text', 'width' => 50, 'instructions' => "A path/URL, or an action key like 'get_matched' for the frontend to interpret as opening an app flow instead of navigating."],
                    [
                        'name' => 'hero_stats_repeater', 'label' => 'Hero Stats', 'type' => 'repeater', 'layout' => 'table',
                        'instructions' => 'Editorial stats only — real provider counts/response times must come from the application, not typed in here.',
                        'sub_fields' => [
                            ['name' => 'label', 'label' => 'Label', 'type' => 'text'],
                            ['name' => 'value', 'label' => 'Value', 'type' => 'text'],
                            ['name' => 'description', 'label' => 'Description', 'type' => 'text'],
                        ],
                    ],
                    [
                        'name' => 'hero_summary_card', 'label' => 'Hero Summary Card', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'title', 'label' => 'Title', 'type' => 'text'],
                            ['name' => 'funding_text', 'label' => 'Funding Text', 'type' => 'text'],
                            ['name' => 'availability_text', 'label' => 'Availability Text', 'type' => 'text'],
                            ['name' => 'response_text', 'label' => 'Response Text', 'type' => 'text'],
                            ['name' => 'cta_label', 'label' => 'CTA Label', 'type' => 'text', 'width' => 50],
                            ['name' => 'cta_url', 'label' => 'CTA URL/Action', 'type' => 'text', 'width' => 50],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'service_finder_fields', 'title' => 'Provider Finder Configuration',
                'fields' => [
                    ['name' => 'finder_heading', 'label' => 'Finder Heading', 'type' => 'text'],
                    ['name' => 'finder_description', 'label' => 'Finder Description', 'type' => 'text'],
                    ['name' => 'finder_default_location', 'label' => 'Default Location', 'type' => 'text'],
                    ['name' => 'finder_cta_label', 'label' => 'Finder CTA Label', 'type' => 'text'],
                    ['name' => 'finder_count', 'label' => 'Number of Providers to Display', 'type' => 'number', 'default' => 6, 'width' => 34],
                    ['name' => 'finder_sort', 'label' => 'Sort Option', 'type' => 'select', 'width' => 33,
                        'choices' => ['relevance' => 'Relevance', 'distance' => 'Distance', 'recent_activity' => 'Recent Activity'], 'default' => 'relevance'],
                    ['name' => 'finder_show_filters', 'label' => 'Show Filters', 'type' => 'true_false', 'default' => true, 'width' => 33],
                    ['name' => 'finder_show_map', 'label' => 'Show Map', 'type' => 'true_false', 'default' => true, 'width' => 34],
                    ['name' => 'finder_show_count', 'label' => 'Show Provider Count', 'type' => 'true_false', 'default' => true, 'width' => 33],
                ],
            ],
            [
                'id' => 'service_cta_fields', 'title' => 'CTA Section',
                'fields' => [
                    ['name' => 'cta_heading', 'label' => 'CTA Heading', 'type' => 'text'],
                    ['name' => 'cta_description', 'label' => 'CTA Description', 'type' => 'text'],
                    ['name' => 'cta_primary_label', 'label' => 'Primary Button Label', 'type' => 'text', 'width' => 50],
                    ['name' => 'cta_primary_action', 'label' => 'Primary Button URL/Action', 'type' => 'text', 'width' => 50],
                    ['name' => 'cta_secondary_label', 'label' => 'Secondary Button Label', 'type' => 'text', 'width' => 50],
                    ['name' => 'cta_secondary_action', 'label' => 'Secondary Button URL/Action', 'type' => 'text', 'width' => 50],
                ],
            ],
            [
                'id' => 'service_related_fields', 'title' => 'Related Services',
                'fields' => [
                    ['name' => 'related_services', 'label' => 'Related Services', 'type' => 'relationship', 'post_type' => 'service',
                        'instructions' => 'Select existing Service posts — the frontend resolves each into its real title, slug, and featured image, so nothing here goes stale if a related service is renamed.'],
                ],
            ],
            [
                'id' => 'service_regulations_fields', 'title' => 'Regulations & Compliance',
                'fields' => [
                    ['name' => 'regulations_heading', 'label' => 'Section Heading', 'type' => 'text'],
                    ['name' => 'regulations_intro', 'label' => 'Introduction', 'type' => 'textarea', 'rows' => 2],
                    [
                        'name' => 'regulator_cards_repeater', 'label' => 'Regulator Cards', 'type' => 'repeater', 'layout' => 'block', 'row_label_field' => 'title',
                        'sub_fields' => [
                            ['name' => 'title', 'label' => 'Title', 'type' => 'text', 'width' => 50],
                            ['name' => 'description', 'label' => 'Description', 'type' => 'text', 'width' => 50],
                            ['name' => 'phone', 'label' => 'Phone', 'type' => 'text', 'width' => 34],
                            ['name' => 'website', 'label' => 'Website', 'type' => 'text', 'width' => 33],
                            ['name' => 'cta', 'label' => 'CTA Label', 'type' => 'text', 'width' => 33],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'service_credentials_fields', 'title' => 'Credentials / Verification Guidance',
                'fields' => [
                    [
                        'name' => 'credentials_repeater', 'label' => 'Credential Checks', 'type' => 'repeater', 'layout' => 'block', 'row_label_field' => 'title',
                        'sub_fields' => [
                            ['name' => 'title', 'label' => 'Title', 'type' => 'text'],
                            ['name' => 'description', 'label' => 'Description', 'type' => 'textarea', 'rows' => 2],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'service_sources_fields', 'title' => 'Sources',
                'fields' => [
                    [
                        'name' => 'sources_repeater', 'label' => 'Sources and further reading', 'type' => 'repeater', 'layout' => 'block', 'row_label_field' => 'title',
                        'instructions' => 'Official pages this content relies on. Shown as links at the bottom of the page.',
                        'sub_fields' => [
                            ['name' => 'title', 'label' => 'Title', 'type' => 'text', 'width' => 50],
                            ['name' => 'url', 'label' => 'URL', 'type' => 'text', 'width' => 50],
                        ],
                    ],
                ],
            ],
            ['id' => 'seo_fields', 'title' => 'SEO', 'fields' => $seo_fields],
        ],

        'location' => [
            [
                'id' => 'location_fields', 'title' => 'Location Details',
                'fields' => [
                    ['name' => 'state', 'label' => 'State', 'type' => 'text'],
                    ['name' => 'population', 'label' => 'Population', 'type' => 'text'],
                    ['name' => 'key_stats', 'label' => 'Key Stats', 'type' => 'textarea', 'rows' => 3],
                ],
            ],
            ['id' => 'seo_fields', 'title' => 'SEO', 'fields' => $seo_fields],
        ],

        'guide' => [
            [
                'id' => 'guide_fields', 'title' => 'Guide Details',
                'fields' => [
                    ['name' => 'reading_time', 'label' => 'Reading Time (minutes)', 'type' => 'number'],
                ],
            ],
            ['id' => 'seo_fields', 'title' => 'SEO', 'fields' => $seo_fields],
        ],

        // Display MIRROR of a real Provider record (see post-types.php's
        // 'provider' CPT comment) — every field here is overwritten on
        // the provider's next sync from Mongo, so it's rendered
        // read-only. The one thing actually edited here is the
        // Featured Image (WordPress core's own media UI, unrelated to
        // any of this), which flows back to Mongo via webhook.php.
        'provider' => [
            [
                'id' => 'provider_fields', 'title' => 'Provider Details (synced from the application database)', 'readonly' => true,
                'fields' => [
                    ['name' => 'mongo_id', 'label' => 'Application Record ID', 'type' => 'text', 'instructions' => 'Links this post to its real record. Do not edit.'],
                    ['name' => 'mongo_slug', 'label' => 'Application Slug', 'type' => 'text', 'instructions' => 'The public /providers/{slug} path on the live site.'],
                    ['name' => 'legal_entity_name', 'label' => 'Legal Entity Name', 'type' => 'text'],
                    ['name' => 'abn', 'label' => 'ABN', 'type' => 'text', 'width' => 50],
                    ['name' => 'contact_email', 'label' => 'Contact Email', 'type' => 'text', 'width' => 50],
                    ['name' => 'address', 'label' => 'Street Address', 'type' => 'text'],
                    ['name' => 'suburb', 'label' => 'Suburb', 'type' => 'text', 'width' => 25],
                    ['name' => 'state', 'label' => 'State', 'type' => 'text', 'width' => 12],
                    ['name' => 'postcode', 'label' => 'Postcode', 'type' => 'text', 'width' => 13],
                    ['name' => 'latitude', 'label' => 'Latitude', 'type' => 'text', 'width' => 50],
                    ['name' => 'longitude', 'label' => 'Longitude', 'type' => 'text', 'width' => 50],
                    ['name' => 'service_suburbs_json', 'label' => 'Areas Served (suburbs)', 'type' => 'textarea', 'rows' => 2, 'instructions' => 'Stored as a JSON array — matches the *_json convention used elsewhere in this plugin.'],
                    ['name' => 'travel_radius_km', 'label' => 'Travel Radius (km)', 'type' => 'text', 'width' => 25],
                    ['name' => 'intake_status', 'label' => 'Intake Status', 'type' => 'text', 'width' => 25],
                    ['name' => 'weekly_capacity_hours', 'label' => 'Weekly Capacity (hours)', 'type' => 'text', 'width' => 25],
                    ['name' => 'roster_size', 'label' => 'Roster Size', 'type' => 'text', 'width' => 25],
                    ['name' => 'after_hours_cover', 'label' => 'After-Hours Cover', 'type' => 'text'],
                ],
            ],
        ],

        'service_area_page' => [
            [
                'id' => 'service_area_page_fields', 'title' => 'Service Area Page Details',
                'fields' => [
                    ['tab' => 'Basics'],
                    ['name' => 'service_name', 'label' => 'Service Name', 'type' => 'text', 'width' => 34],
                    ['name' => 'suburb', 'label' => 'Suburb', 'type' => 'text', 'width' => 33],
                    ['name' => 'state', 'label' => 'State', 'type' => 'text', 'width' => 33],
                    ['name' => 'intro_paragraph', 'label' => 'Intro Paragraph', 'type' => 'textarea', 'rows' => 4],

                    ['tab' => 'FAQ & Suburb Facts'],
                    [
                        // 'q'/'a' specifically, NOT 'question'/'answer' — matches
                        // ServiceAreaPage's real TypeScript type (wordpressApi.ts).
                        'name' => 'faq_repeater', 'label' => 'FAQ', 'type' => 'repeater', 'layout' => 'block', 'row_label_field' => 'q',
                        'sub_fields' => [
                            ['name' => 'q', 'label' => 'Question', 'type' => 'text'],
                            ['name' => 'a', 'label' => 'Answer', 'type' => 'textarea', 'rows' => 2],
                        ],
                    ],
                    [
                        'name' => 'suburb_facts_repeater', 'label' => 'Suburb Facts', 'type' => 'repeater', 'layout' => 'table',
                        'sub_fields' => [
                            ['name' => 'label', 'label' => 'Label', 'type' => 'text'],
                            ['name' => 'value', 'label' => 'Value', 'type' => 'text'],
                            ['name' => 'note', 'label' => 'Note', 'type' => 'text'],
                        ],
                    ],

                    ['tab' => 'Compare & Contents'],
                    [
                        'name' => 'compare_repeater', 'label' => 'Compare Cards', 'type' => 'repeater', 'layout' => 'block', 'row_label_field' => 'title',
                        'sub_fields' => [
                            ['name' => 'title', 'label' => 'Title', 'type' => 'text'],
                            ['name' => 'body', 'label' => 'Body', 'type' => 'textarea', 'rows' => 2],
                            ['name' => 'ask', 'label' => 'Ask', 'type' => 'text'],
                        ],
                    ],
                    [
                        'name' => 'toc_repeater', 'label' => 'Table of Contents', 'type' => 'repeater', 'layout' => 'table',
                        'sub_fields' => [
                            ['name' => 'label', 'label' => 'Label', 'type' => 'text'],
                            ['name' => 'href', 'label' => 'Anchor (e.g. #compare)', 'type' => 'text'],
                        ],
                    ],

                    ['tab' => 'Demand & Stats'],
                    [
                        // Nested repeater — matches ServiceAreaPage.demand's
                        // real shape: { title, rows: [string, number][] }[].
                        'name' => 'demand_repeater', 'label' => 'Who Is Asking (demand panels)', 'type' => 'repeater', 'layout' => 'block', 'row_label_field' => 'title',
                        'sub_fields' => [
                            ['name' => 'title', 'label' => 'Panel Title', 'type' => 'text'],
                            [
                                'name' => 'rows', 'label' => 'Rows', 'type' => 'repeater', 'layout' => 'table',
                                'sub_fields' => [
                                    ['name' => 'label', 'label' => 'Label', 'type' => 'text'],
                                    ['name' => 'value', 'label' => 'Value (%)', 'type' => 'number'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name' => 'glance_repeater', 'label' => 'At a Glance (key/value table)', 'type' => 'repeater', 'layout' => 'table',
                        'sub_fields' => [
                            ['name' => 'label', 'label' => 'Label', 'type' => 'text'],
                            ['name' => 'value', 'label' => 'Value', 'type' => 'text'],
                        ],
                    ],
                    [
                        'name' => 'service_counts_repeater', 'label' => 'Services Available (counts)', 'type' => 'repeater', 'layout' => 'table',
                        'sub_fields' => [
                            ['name' => 'label', 'label' => 'Service', 'type' => 'text'],
                            ['name' => 'count', 'label' => 'Provider Count', 'type' => 'number'],
                        ],
                    ],
                    [
                        'name' => 'requested_repeater', 'label' => 'Most Requested Support', 'type' => 'repeater', 'layout' => 'table',
                        'sub_fields' => [
                            ['name' => 'label', 'label' => 'Label', 'type' => 'text'],
                            ['name' => 'requests', 'label' => 'Requests (display text)', 'type' => 'text'],
                            ['name' => 'providers', 'label' => 'Providers (display text)', 'type' => 'text'],
                            ['name' => 'v', 'label' => 'Bar Value (number)', 'type' => 'number'],
                            ['name' => 'on', 'label' => 'Highlighted?', 'type' => 'true_false'],
                        ],
                    ],

                    ['tab' => 'Languages & Hero Stats'],
                    [
                        'name' => 'languages_repeater', 'label' => 'Language Support Stats', 'type' => 'repeater', 'layout' => 'table',
                        'sub_fields' => [
                            ['name' => 'name', 'label' => 'Language', 'type' => 'text'],
                            ['name' => 'native', 'label' => 'Native Name', 'type' => 'text'],
                            ['name' => 'count', 'label' => 'Speaker Count (display text)', 'type' => 'text'],
                            ['name' => 'share', 'label' => 'Share (display text)', 'type' => 'text'],
                        ],
                    ],
                    [
                        // Not a repeater — one set of hero stats per page.
                        'name' => 'hero_stats_group', 'label' => 'Hero Stats', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'providerCount', 'label' => 'Provider Count', 'type' => 'number', 'width' => 34],
                            ['name' => 'medianResponseMinutes', 'label' => 'Median Response (minutes)', 'type' => 'number', 'width' => 33],
                            ['name' => 'hourlyRate', 'label' => 'Hourly Rate ($)', 'type' => 'number', 'width' => 33],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'service_area_page_extended', 'title' => 'Service Area Page — Extended Details',
                'fields' => [
                    // The PROVIDERS THEMSELVES still come from the real
                    // application database, never from WordPress. These
                    // fields only control how that real finder displays.
                    ['tab' => 'Provider Finder'],
                    [
                        'name' => 'finder_group', 'label' => 'Provider Finder', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'heading', 'label' => 'Heading', 'type' => 'text'],
                            ['name' => 'description', 'label' => 'Description', 'type' => 'text'],
                            ['name' => 'display_count', 'label' => 'Number of Providers to Display', 'type' => 'number', 'default' => 6, 'width' => 50],
                            ['name' => 'sort', 'label' => 'Sort Option', 'type' => 'select', 'width' => 50,
                                'choices' => ['relevance' => 'Relevance', 'distance' => 'Distance', 'recent' => 'Recently Active'], 'default' => 'relevance'],
                            ['name' => 'show_filters', 'label' => 'Show Filters', 'type' => 'true_false', 'default' => true, 'width' => 34],
                            ['name' => 'show_map', 'label' => 'Show Map', 'type' => 'true_false', 'default' => true, 'width' => 33],
                            ['name' => 'show_count', 'label' => 'Show Provider Count', 'type' => 'true_false', 'default' => true, 'width' => 33],
                        ],
                    ],

                    ['tab' => 'Costs'],
                    [
                        'name' => 'cost_group', 'label' => 'Cost & Payment', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'heading', 'label' => 'Heading', 'type' => 'text'],
                            ['name' => 'intro', 'label' => 'Introduction', 'type' => 'textarea', 'rows' => 2],
                            ['name' => 'pricing_info', 'label' => 'Pricing Information', 'type' => 'wysiwyg'],
                            ['name' => 'ndis_info', 'label' => 'NDIS Information', 'type' => 'textarea', 'rows' => 2],
                            ['name' => 'private_info', 'label' => 'Private Payment Information', 'type' => 'textarea', 'rows' => 2],
                            ['name' => 'aged_care_info', 'label' => 'Aged Care Information', 'type' => 'textarea', 'rows' => 2],
                            ['name' => 'dva_info', 'label' => 'DVA Information', 'type' => 'textarea', 'rows' => 2],
                            ['name' => 'notes', 'label' => 'Additional Notes', 'type' => 'textarea', 'rows' => 2],
                        ],
                    ],

                    ['tab' => 'What To Expect'],
                    [
                        'name' => 'expect_group', 'label' => 'What To Expect', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'heading', 'label' => 'Heading', 'type' => 'text'],
                            ['name' => 'intro', 'label' => 'Introduction', 'type' => 'textarea', 'rows' => 2],
                            [
                                'name' => 'steps', 'label' => 'Steps', 'type' => 'repeater', 'layout' => 'block', 'row_label_field' => 'title',
                                'sub_fields' => [
                                    ['name' => 'number', 'label' => 'Step Number', 'type' => 'number', 'width' => 25],
                                    ['name' => 'title', 'label' => 'Title', 'type' => 'text', 'width' => 75],
                                    ['name' => 'description', 'label' => 'Description', 'type' => 'textarea', 'rows' => 2],
                                ],
                            ],
                        ],
                    ],

                    ['tab' => 'Compliance & Response Times'],
                    [
                        'name' => 'regulations_group', 'label' => 'Regulations & Compliance', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'heading', 'label' => 'Heading', 'type' => 'text'],
                            ['name' => 'intro', 'label' => 'Introduction', 'type' => 'textarea', 'rows' => 2],
                            [
                                'name' => 'cards', 'label' => 'Regulator Cards', 'type' => 'repeater', 'layout' => 'block', 'row_label_field' => 'title',
                                'sub_fields' => [
                                    ['name' => 'title', 'label' => 'Title', 'type' => 'text', 'width' => 50],
                                    ['name' => 'description', 'label' => 'Description', 'type' => 'textarea', 'rows' => 2, 'width' => 50],
                                    ['name' => 'phone', 'label' => 'Phone', 'type' => 'text', 'width' => 34],
                                    ['name' => 'website', 'label' => 'Website', 'type' => 'text', 'width' => 33],
                                    ['name' => 'cta_label', 'label' => 'CTA Label', 'type' => 'text', 'width' => 33],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name' => 'response_times', 'label' => 'Response Times By State', 'type' => 'repeater', 'layout' => 'table',
                        'sub_fields' => [
                            ['name' => 'state', 'label' => 'State', 'type' => 'text'],
                            ['name' => 'minutes', 'label' => 'Response Time (minutes)', 'type' => 'number'],
                            ['name' => 'description', 'label' => 'Description', 'type' => 'text'],
                        ],
                    ],

                    // NOT hardcoded to Sydney — this is per-page, so a
                    // Melbourne/Brisbane/etc. page fills in its own values.
                    ['tab' => 'Local Information'],
                    [
                        'name' => 'local_group', 'label' => 'Local Information', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'population', 'label' => 'Population', 'type' => 'text', 'width' => 34],
                            ['name' => 'median_income', 'label' => 'Median Personal Income', 'type' => 'text', 'width' => 33],
                            ['name' => 'postcode', 'label' => 'Postcode', 'type' => 'text', 'width' => 33],
                            ['name' => 'nearest_hospital', 'label' => 'Nearest Hospital', 'type' => 'text', 'width' => 50],
                            ['name' => 'public_transport', 'label' => 'Public Transport', 'type' => 'text', 'width' => 50],
                            ['name' => 'community_info', 'label' => 'Community Information', 'type' => 'textarea', 'rows' => 2],
                            ['name' => 'data_date', 'label' => 'Data Date/Source', 'type' => 'text'],
                        ],
                    ],

                    // Same action-key pattern as the Mega Menu Tab CTA, so
                    // 'get_matched' opens the real app modal instead of a
                    // hardcoded URL.
                    ['tab' => 'Call To Action & Related'],
                    [
                        'name' => 'cta_group', 'label' => 'Page CTA', 'type' => 'group',
                        'sub_fields' => [
                            ['name' => 'heading', 'label' => 'CTA Heading', 'type' => 'text'],
                            ['name' => 'description', 'label' => 'CTA Description', 'type' => 'text'],
                            ['name' => 'primary_label', 'label' => 'Primary Button Label', 'type' => 'text', 'width' => 50],
                            ['name' => 'primary_action', 'label' => 'Primary Button Action (e.g. get_matched)', 'type' => 'text', 'width' => 50],
                            ['name' => 'primary_url', 'label' => 'Primary Button URL (if not using an action)', 'type' => 'text'],
                            ['name' => 'secondary_label', 'label' => 'Secondary Button Label', 'type' => 'text', 'width' => 50],
                            ['name' => 'secondary_action', 'label' => 'Secondary Button Action', 'type' => 'text', 'width' => 50],
                            ['name' => 'secondary_url', 'label' => 'Secondary Button URL', 'type' => 'text'],
                        ],
                    ],

                    // A real relationship to OTHER 'service' posts, so an
                    // admin picks existing services rather than retyping URLs.
                    [
                        'name' => 'related_services', 'label' => 'Related Services', 'type' => 'relationship', 'post_type' => 'service',
                        'instructions' => 'Pick existing Service posts — the frontend receives their real title, slug, and featured image, not manually typed values.',
                    ],
                ],
            ],
            ['id' => 'seo_fields', 'title' => 'SEO', 'fields' => $seo_fields],
        ],
    ];

    return $groups;
}
