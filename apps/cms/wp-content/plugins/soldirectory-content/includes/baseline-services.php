<?php
/**
 * Baseline "what is this support?" text for the service posts.
 *
 * The service posts were created with a title and nothing else, so every
 * /services/<slug> page was empty. This gives each one a short, plain
 * description of WHAT the support is - and deliberately nothing else. It makes
 * no claim about eligibility, funding, price, waiting times, availability or
 * quality; those depend on a person's plan and on each provider, and belong to
 * an editor or to live data. The first sentence is also used as the excerpt
 * (the page's meta description and hero text).
 *
 * It is written only into fields that are BLANK, once, and every post it
 * touches is marked (_sd_baseline_content) so editors can find and replace it.
 * Editing any of it in wp-admin is safe: it is never applied again.
 */

if (!defined('ABSPATH')) exit;

const SOLDIRECTORY_BASELINE_VERSION = '1';
const SOLDIRECTORY_BASELINE_OPTION = 'soldirectory_baseline_services_v1';

/** Title (as shown in wp-admin, entities decoded) => description. */
function soldirectory_baseline_service_text(): array {
    return [
        'AT repairs, maintenance, rental and trial' => 'This covers looking after and accessing assistive technology: repairing or servicing equipment, renting it for a period, or trying it out before committing to buy. It helps keep equipment working and suited to the person using it.',
        'Activity-based transport' => 'Transport to and from activities, such as community outings, classes or social events, when getting there is part of the support. A support worker or driver helps the person travel safely.',
        'Assistance animal training and assessment' => 'Assessment and training to prepare an assistance animal, such as a guide or hearing dog, and to check that the animal and handler work well together. Training is usually delivered by a specialist provider.',
        'Assistance animal upkeep' => 'Help with the ongoing costs and care of an assistance animal, such as food, veterinary care and grooming, so the animal stays healthy and able to do its work.',
        'Assistance animals' => 'Assistance animals are trained to help a person with day-to-day tasks or to support them to take part in the community. This support relates to sourcing and working with a trained animal.',
        'Assistive technology assessment and training' => 'An assessment by a qualified professional to work out which equipment or technology suits a person, followed by training in how to set it up and use it well.',
        'Behaviour support implementation' => 'Putting a behaviour support plan into practice day to day. Support workers use the strategies in the plan to help the person feel safe, build skills and reduce distress.',
        'Communication and information equipment' => 'Equipment and technology that helps a person communicate or access information, such as communication devices, software and adapted computers or phones.',
        'Community nursing care' => 'Nursing care delivered in the person\'s home or community by a registered or enrolled nurse, for example wound care, medication management or help with complex health needs.',
        'Complex home modifications' => 'Larger changes to a home so it suits a person\'s disability, such as structural work, bathroom reconstruction or fitting lifts. These jobs usually need assessment, quotes and qualified tradespeople.',
        'Continence products' => 'Products used to manage continence, such as pads, catheters and related supplies, along with advice on choosing what suits the person.',
        'Counselling' => 'Talking with a trained counsellor to work through difficult feelings, life changes or challenges, and to build coping strategies.',
        'Cultural, religious and civic participation' => 'Support to take part in cultural, religious or civic life, for example attending a place of worship, a community event or a local group.',
        'Customised prosthetics and orthotics' => 'Prosthetics replace a missing body part, and orthotics support or correct a part of the body. Customised devices are designed and fitted for one person by a qualified practitioner.',
        'Daily living and life skills development' => 'Coaching and practice to build everyday skills, such as cooking, budgeting, using public transport or managing a household, so the person can do more for themselves.',
        'Dietitian' => 'A dietitian gives evidence-based advice about food and nutrition, including for medical conditions, feeding difficulties or specific dietary needs.',
        'Early Childhood Intervention' => 'Early support for young children with developmental delay or disability, often involving therapists working with the child and the family to build skills and support daily routines.',
        'Employment assessment and counselling' => 'Help to work out what kind of work suits a person and what support they need, followed by guidance on finding and preparing for a job.',
        'Exercise physiology' => 'An exercise physiologist designs safe, tailored exercise programs to improve strength, movement, fitness and long-term health, including for people with chronic conditions or disability.',
        'Financial and organisational skills' => 'Support to build skills in managing money, paperwork and routines, such as budgeting, paying bills and keeping appointments organised.',
        'Group / shared living support' => 'Support for people who live with others in a shared home, covering the everyday help each person needs while living as part of a household.',
        'Group and centre-based activities' => 'Activities run for a group at a centre or community venue, such as social programs, skill-building sessions and recreation, with support workers on hand.',
        'Group skills development' => 'Skill-building delivered in a group setting, where people learn and practise together, for example communication, independence or social skills.',
        'Hearing equipment' => 'Equipment that helps a person who is deaf or hard of hearing, such as hearing aids, alerting devices and other assistive listening technology.',
        'Hearing services and audiology' => 'Audiologists assess hearing, recommend and fit devices such as hearing aids, and give advice on managing hearing loss.',
        'High-intensity personal care' => 'Personal care that needs additional skills or training, for example complex health needs where support workers are trained for specific tasks under a health professional\'s guidance.',
        'Higher education and training support' => 'Support to take part in study at university, TAFE or another training provider, such as help with organisation, access needs and study routines.',
        'Home enteral nutrition (HEN)' => 'Nutrition delivered through a feeding tube at home. This includes the formula and supplies, along with training and guidance from a health professional.',
        'House cleaning and household tasks' => 'Help with regular cleaning and other household tasks, such as laundry, tidying and keeping the home safe and comfortable to live in.',
        'Household management' => 'Support to run a home, such as planning meals, shopping, organising bills and keeping the household running smoothly.',
        'Household task equipment' => 'Equipment that makes household tasks easier or possible, such as adapted kitchen tools, reachers and other aids for cooking, cleaning and daily chores.',
        'Housing search and matching' => 'Help to look for a suitable home, understand housing options and be matched with a place that fits the person\'s needs and preferences.',
        'Individualised Living Options (ILO)' => 'A way of designing a living arrangement around one person\'s goals, needs and preferences, rather than choosing from a set of existing housing models.',
        'Innovative community participation' => 'Support for new or creative ways of taking part in the community, going beyond standard programs to suit what the person wants to do.',
        'Interpreting and translation' => 'Interpreting (spoken) and translation (written) so a person can communicate with providers and understand information in the language they use, including Auslan.',
        'Job coaching and workplace assistance' => 'On-the-job support to help a person learn a role, settle into a workplace and keep working, including practical help and coaching at work.',
        'Life transition planning and mentoring' => 'Planning and mentoring to help a person prepare for a major change, such as leaving school, moving out or starting work.',
        'Low-cost assistive technology' => 'Simple, lower-cost equipment that supports independence, such as adapted utensils, grab rails, alarms and other everyday aids.',
        'Meal preparation' => 'Help with planning, preparing and cooking meals, either by supporting the person to cook or by preparing meals for them.',
        'Medication assistance' => 'Support to take medication safely as prescribed, such as reminders, prompting and help with preparing or administering doses.',
        'Medium Term Accommodation (MTA)' => 'Accommodation for a temporary period, while a person waits for a long-term home, a modification to be finished, or another arrangement to be in place.',
        'Minor home modifications' => 'Smaller changes to a home that make it easier and safer to use, such as fitting handrails, ramps or adjusting fixtures.',
        'Mobility equipment' => 'Equipment that helps a person move around, such as wheelchairs, walking frames, scooters and transfer aids.',
        'Music therapy and art therapy' => 'Therapy that uses music or art to support communication, wellbeing, emotional expression and skill development, led by a qualified therapist.',
        'Nursing training for support workers' => 'Training delivered by a nurse so support workers can safely carry out specific health-related tasks for the person they support.',
        'Occupational therapy' => 'Occupational therapists help people do the everyday activities that matter to them, by assessing needs, building skills and recommending equipment or changes to the environment.',
        'One-to-one community access' => 'A support worker accompanies a person one-to-one to take part in the community, for example shopping, appointments, hobbies or social outings.',
        'Overnight support' => 'Support provided overnight, either awake or asleep on site, for people who need help or supervision during the night.',
        'Personal care' => 'Help with everyday personal tasks such as showering, dressing, grooming, eating and getting around the home, delivered with respect for the person\'s privacy and choices.',
        'Personal care and safety equipment' => 'Equipment that supports personal care and safety, such as shower chairs, bed rails, toilet aids and personal alarms.',
        'Personal training' => 'One-to-one fitness training tailored to a person\'s abilities and goals, to build strength, movement and confidence.',
        'Physiotherapy' => 'Physiotherapists assess and treat problems with movement and physical function, using exercise, manual therapy and education to improve mobility and reduce pain.',
        'Plan management' => 'A plan manager handles the paperwork and payments for a person\'s NDIS plan, such as paying providers\' invoices and keeping track of the budget, so the person can use any registered or unregistered provider.',
        'Podiatry' => 'Podiatrists look after foot and lower-limb health, treating pain and injury, managing conditions such as diabetes-related foot problems and advising on footwear.',
        'Psychology' => 'Psychologists assess and treat mental health and behaviour concerns using evidence-based therapies, and can help a person build skills and manage emotions.',
        'Psychosocial Recovery Coaching' => 'A recovery coach supports people with psychosocial disability to set goals, build skills and take part in daily life and the community on their own terms.',
        'Recreation equipment' => 'Equipment that lets a person take part in sport, hobbies and leisure activities, such as adapted bikes, sports wheelchairs or specialised gear.',
        'Recurring transport allowance' => 'A regular allowance related to travel, for people who can\'t use public transport because of their disability.',
        'School Leaver Employment Supports (SLES)' => 'Support for young people finishing school to build work skills and move towards employment, including work experience and job preparation.',
        'Self-management training' => 'Training for people who manage their own NDIS plan, covering topics such as budgeting, choosing providers, keeping records and making claims.',
        'Short Term Accommodation (STA) / respite' => 'A short stay away from home, giving the person a break or a change and giving family or carers a period of respite.',
        'Skill-building camps and classes' => 'Camps and classes where people build skills such as independence, social confidence and recreation in a supported setting.',
        'Skill-building community access' => 'Community outings with a focus on learning a skill, such as using public transport, handling money or joining a local group.',
        'Social and recreation activities' => 'Activities that help people enjoy leisure time and connect with others, such as sport, hobbies, social groups and outings.',
        'Social skills and relationship development' => 'Coaching to build the skills for making friends, communicating and keeping healthy relationships, in one-to-one or group settings.',
        'Social work' => 'Social workers help people work through practical and emotional challenges, connect with services and understand their rights and options.',
        'Specialised driver training' => 'Driver assessment and training for people with a disability, including learning to use vehicle modifications and adaptive controls.',
        'Specialised transport' => 'Transport in a vehicle suited to a person\'s needs, for example one with a wheelchair lift or extra assistance for getting in and out.',
        'Specialist Disability Accommodation (SDA)' => 'Specialist Disability Accommodation is housing with special design features for people with very high support needs or extreme functional impairment. It covers the building, not the support services delivered inside it.',
        'Specialist Positive Behaviour Support' => 'A specialist practitioner works to understand the reasons behind behaviours of concern and develops a positive behaviour support plan that focuses on the person\'s needs and quality of life.',
        'Specialist Support Coordination (Level 3)' => 'A higher level of support coordination for people in complex situations, who need extra help to resolve barriers and get supports working together.',
        'Speech pathology' => 'Speech pathologists assess and treat difficulties with speaking, understanding, communication, and with eating and swallowing.',
        'Study and learning skills' => 'Support to build the skills needed for study, such as planning, note-taking, time management and confidence in learning.',
        'Support Connection (Level 1)' => 'Help to understand a plan and connect with providers and community services, without ongoing coordination.',
        'Support Coordination (Level 2)' => 'A support coordinator helps a person put their plan into action by finding providers, setting up services and building the person\'s ability to manage their supports.',
        'Supported Independent Living (SIL)' => 'Supported Independent Living is help with daily tasks in a shared home, so a person can live as independently as possible. It covers the support provided, not the housing itself.',
        'Supported employment' => 'Ongoing support in a workplace for people who need it to keep working, delivered by a provider that works alongside the employer and the person.',
        'Supported holidays and camps' => 'Holidays and camps with the support a person needs to take part, whether in a group or with one-to-one help.',
        'Tenancy and accommodation assistance' => 'Help to find, apply for and keep a rental or other accommodation, including understanding a lease and dealing with a landlord.',
        'Tenancy skills and sustainment' => 'Building the skills to keep a tenancy going, such as paying rent on time, looking after the home and communicating with a landlord or agent.',
        'Therapy assistants' => 'Therapy assistants work under the guidance of a qualified therapist to carry out parts of a therapy program, such as practising exercises or activities.',
        'Training for carers and parents' => 'Training to help family members and carers understand a person\'s needs and learn practical ways to support them.',
        'Transition to further education' => 'Support to plan and settle into further study after school, such as choosing a course, enrolling and getting the right supports in place.',
        'Transport to activities and appointments' => 'Help getting to and from activities and appointments, either by a support worker travelling with the person or through arranged transport.',
        'Vehicle modifications' => 'Changes to a vehicle so a person can drive it or travel in it, such as hand controls, hoists or a wheelchair-accessible conversion.',
        'Vision and orientation & mobility' => 'Support for people who are blind or have low vision, including orientation and mobility training to travel safely and independently, along with skills for everyday life.',
        'Vision equipment' => 'Equipment that supports people who are blind or have low vision, such as magnifiers, screen readers, braille devices and adapted technology.',
        'Volunteering and community groups' => 'Support to take part in volunteering or join community groups, helping people build connections and contribute to their community.',
        'Yard maintenance and gardening' => 'Help keeping a yard or garden safe and tidy, such as mowing, weeding and clearing, for people who can\'t do this themselves.',
    ];
}

/** First sentence, used as the excerpt. */
function soldirectory_baseline_excerpt(string $text): string {
    $pos = strpos($text, '. ');
    return $pos === false ? $text : substr($text, 0, $pos + 1);
}

/**
 * Fills BLANK fields on service posts whose title has baseline text. Never
 * overwrites anything an editor wrote. Returns the number of posts changed.
 */
function soldirectory_apply_baseline_services(): int {
    $text = soldirectory_baseline_service_text();
    $ids = get_posts([
        'post_type' => 'service',
        'post_status' => 'any',
        'numberposts' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
    ]);

    $changed = 0;
    foreach ($ids as $id) {
        $id = (int) $id;
        try {
            if (get_post_meta($id, '_sd_baseline_content', true)) continue;
            $title = html_entity_decode((string) get_post_field('post_title', $id), ENT_QUOTES, 'UTF-8'); // raw title: get_the_title() texturizes & and quotes
            if (!isset($text[$title])) continue;

            $touched = false;
            $post = get_post($id);
            if ($post && trim((string) $post->post_excerpt) === '' && trim((string) $post->post_content) === '') {
                wp_update_post(['ID' => $id, 'post_excerpt' => soldirectory_baseline_excerpt($text[$title])]);
                $touched = true;
            }
            if (trim((string) get_post_meta($id, 'overview_content', true)) === '') {
                update_post_meta($id, 'overview_content', $text[$title]);
                if (trim((string) get_post_meta($id, 'overview_heading', true)) === '') {
                    update_post_meta($id, 'overview_heading', 'About ' . $title);
                }
                $touched = true;
            }
            if ($touched) {
                update_post_meta($id, '_sd_baseline_content', SOLDIRECTORY_BASELINE_VERSION);
                $changed++;
            }
        } catch (\Throwable $e) {
            error_log('[soldirectory] baseline service content failed for post ' . $id . ': ' . $e->getMessage());
        }
    }
    return $changed;
}

// Once, on the first wp-admin load after deploy - after the ACF migration, so
// content that already exists in the old format counts as "not blank".
add_action('admin_init', function () {
    if (get_option(SOLDIRECTORY_BASELINE_OPTION)) return;
    if (!current_user_can('edit_posts')) return;
    $ids = get_posts(['post_type' => 'service', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'no_found_rows' => true]);
    foreach ($ids as $id) soldirectory_migrate_post_from_acf((int) $id);
    soldirectory_apply_baseline_services();
    update_option(SOLDIRECTORY_BASELINE_OPTION, gmdate('c'), false);
}, 20);
