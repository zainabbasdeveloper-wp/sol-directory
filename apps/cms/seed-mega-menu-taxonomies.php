<?php
/**
 * Seeds the 4 mega menu taxonomies that don't have real content yet
 * (Condition/Funding/Coordinator/Language) — using the exact content
 * that was previously hardcoded in apps/web/src/data/megaMenu.ts, so
 * nothing is invented, just moved to where it can be edited from
 * wp-admin instead of requiring a React code change.
 *
 * Service is deliberately NOT re-seeded here — that taxonomy already
 * has your real 89 NDIS services from seed-ndis-services.php.
 *
 * Idempotent — checks for an existing term by name before creating,
 * safe to re-run.
 *
 * Run from apps/cms: php seed-mega-menu-taxonomies.php
 */

require_once __DIR__ . '/wordpress/wp-load.php';

$taxonomies = [
    'condition_category' => [
        'Developmental' => ['Autism', 'ADHD', 'Intellectual Disability', 'Global Developmental Delay', 'Down Syndrome', 'Fragile X Syndrome', 'Cerebral Palsy', 'Speech & Language Delay'],
        'Mobility & Physical' => ['Spinal Cord Injury', 'Amputation & Limb Loss', 'Muscular Dystrophy', 'Multiple Sclerosis', 'Arthritis', 'Spina Bifida', 'Chronic Pain'],
        'Hearing, Vision & Sensory' => ['Deafness & Hearing Loss', 'Blindness & Low Vision', 'Deafblindness', 'Auslan Support', 'Sensory Processing'],
        'Psychosocial & Mental Health' => ['Schizophrenia', 'Bipolar Disorder', 'PTSD', 'Anxiety Disorders', 'Depression', 'Eating Disorders', 'Borderline Personality Disorder', 'Dual Diagnosis'],
        'Chronic & Complex Medical' => ['Epilepsy', 'Diabetes', 'Cystic Fibrosis', 'Renal Failure', 'Cancer Care', 'Motor Neurone Disease', "Parkinson's Disease"],
        'ABI, Stroke & Neuro Rehab' => ['Acquired Brain Injury', 'Stroke Recovery', 'Traumatic Brain Injury', "Huntington's Disease", 'Neuro Physiotherapy'],
    ],
    'funding_category' => [
        'NDIS Plans' => ['Agency Managed', 'Plan Managed', 'Self Managed', 'Plan Reviews', 'Change of Circumstances', 'First Plan Support'],
        'Aged Care' => ['Home Care Packages', 'Commonwealth Home Support', 'Support at Home', 'Residential Fees'],
        'Veterans' => ['DVA Community Nursing', 'DVA Home Care', "Veterans' Home Care", 'Rehabilitation Appliances', 'Open Arms Referrals'],
        'Other Funding' => ['Private Fee for Service', 'iCare & Workers Compensation', 'Private Health Insurance', 'Medicare Care Plans', 'State Funded Programs'],
        'Help With Funding' => ['Plan Managers', 'Bookkeeping & Invoicing', 'Price Guide Explained', 'Funding Eligibility', 'Budget Categories'],
    ],
    'coordinator_category' => [
        'Make a Referral' => ['Single Provider Referral', 'Bulk Referrals', 'Urgent Placement Requests', 'Referral Templates', 'Referral Tracking'],
        'Capacity & Availability' => ['Live Vacancy Board', 'Confirmed Capacity Feed', 'Waitlist Status', 'Response Time Data', 'Service Area Coverage'],
        'Tools for Coordinators' => ['Saved Provider Lists', 'Shortlist Sharing', 'Comparison Sheets', 'Bulk Export', 'Participant Notes'],
        'Compliance' => ['Registration Checks', 'Worker Screening', 'Insurance Certificates', 'Incident History'],
        'Working With Us' => ['Coordinator Accounts', 'Team Access', 'Training & Webinars', 'Contact the Directory Team'],
    ],
    'language_category' => [
        'Most Requested' => ['Arabic', 'Mandarin', 'Cantonese', 'Vietnamese', 'Greek', 'Italian', 'Hindi', 'Punjabi'],
        'Middle East & Africa' => ['Assyrian', 'Persian (Farsi)', 'Dari', 'Turkish', 'Somali', 'Swahili', 'Amharic'],
        'First Nations' => ['Aboriginal & Torres Strait Islander Services', 'Kriol', 'Yolngu Matha', 'Pitjantjatjara'],
        'Europe' => ['Spanish', 'Portuguese', 'Polish', 'Croatian', 'Serbian', 'Russian', 'Macedonian', 'German'],
        'Asia Pacific' => ['Tagalog', 'Indonesian', 'Korean', 'Japanese', 'Nepali', 'Tamil', 'Thai', 'Khmer'],
        'Access & Interpreting' => ['Auslan', 'Deafblind Interpreters', 'TIS National Bookings', 'Easy Read Materials', 'Translated Documents'],
    ],
];

$created = 0;
$skipped = 0;

foreach ($taxonomies as $taxonomy => $groups) {
    if (!taxonomy_exists($taxonomy)) {
        echo "SKIP taxonomy '$taxonomy' — not registered. Is the plugin active with the latest post-types.php?\n";
        continue;
    }

    foreach ($groups as $parentName => $children) {
        $parentTerm = term_exists($parentName, $taxonomy);
        if ($parentTerm) {
            $parentId = $parentTerm['term_id'];
            echo "SKIP (parent exists): $parentName [$taxonomy]\n";
            $skipped++;
        } else {
            $result = wp_insert_term($parentName, $taxonomy);
            if (is_wp_error($result)) {
                echo "ERROR creating parent '$parentName': " . $result->get_error_message() . "\n";
                continue;
            }
            $parentId = $result['term_id'];
            echo "Created parent: $parentName [$taxonomy]\n";
            $created++;
        }

        foreach ($children as $childName) {
            $existing = term_exists($childName, $taxonomy, $parentId);
            if ($existing) {
                echo "  SKIP (already exists): $childName\n";
                $skipped++;
                continue;
            }
            $result = wp_insert_term($childName, $taxonomy, ['parent' => $parentId]);
            if (is_wp_error($result)) {
                echo "  ERROR creating '$childName': " . $result->get_error_message() . "\n";
                continue;
            }
            echo "  Created: $childName\n";
            $created++;
        }
    }
}

echo "\nDone. Created: $created, skipped (already existed): $skipped.\n";
