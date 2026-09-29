import type { SUPPORT_CATEGORIES } from '../lib/registerMeta';
import { slugify } from '../lib/slugify';

type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

/**
 * Real, general-information content for the 40 conditions/needs shown in
 * the mega menu's "Condition" tab (see staticMegaMenuFallback.ts, which
 * links each one to /condition/:slug/ — ProviderListingPage.tsx reads
 * this file to render the page, since a condition with no real provider
 * tagged yet still needs somewhere honest to send a visitor).
 *
 * Everything here is general educational information, not medical advice
 * or a diagnostic description — each entry says so. Nothing here claims
 * a provider count, a statistic, or a specific provider's experience:
 * that part of the page is always driven by real data (see
 * ProviderListingPage's provider list), separate from this file.
 *
 * `relatedCategories` are real, canonical register/service categories
 * (registerMeta.ts's SUPPORT_CATEGORIES) commonly relevant to the
 * condition — used to link to real, working /directory search filters,
 * never invented category names.
 */

export interface ConditionContent {
  slug: string;
  name: string;
  categoryGroup: string;
  /** General information only — not a diagnosis, not medical advice. */
  summary: string;
  relatedCategories: SupportCategory[];
}

export interface ConditionCategoryGroup {
  title: string;
  /** A short, general note shown once at the top of every page in this group. */
  note?: string;
  items: ConditionContent[];
}

const developmental: ConditionContent[] = [
  {
    slug: 'autism', name: 'Autism', categoryGroup: 'Developmental',
    summary: 'Autism is a lifelong developmental difference that affects how a person communicates, interacts socially, and experiences the world around them, including sensory input. It is not an illness to be cured, and autistic people vary widely in strengths, communication style and support needs — some communicate verbally, others use alternative methods; some need significant daily support, others live largely independently. In Australia, autism is one of the most common primary disability types on NDIS plans. Support commonly focuses on building communication and daily living skills, managing sensory sensitivities, and — for children — early intervention. Many autistic people and their families also value peer and community connections, not just clinical services. Every autistic person’s needs are individual, so a provider’s general experience with autism is a starting point for a conversation, not a guarantee of fit for a specific person.',
    relatedCategories: ['Therapy services', 'Behaviour support', 'Life skills', 'Community access'],
  },
  {
    slug: 'adhd', name: 'ADHD', categoryGroup: 'Developmental',
    summary: 'ADHD (attention-deficit/hyperactivity disorder) affects attention regulation, impulse control and activity levels, and can look different from person to person — some people are more inattentive, others more hyperactive-impulsive, many a mix of both. It is a recognised neurodevelopmental condition, not a matter of effort or discipline, and it commonly continues from childhood into adulthood. Support needs vary: some people manage well with routine, coaching and environmental adjustments; others need more structured behavioural or therapeutic support, particularly where ADHD co-occurs with another condition. Under the NDIS, ADHD alone doesn’t automatically qualify for support — eligibility depends on the functional impact, assessed case by case. Families and adults exploring support often look for help with executive functioning skills, routines and, where relevant, coordinating with schools or workplaces. As with any condition on this page, confirm a provider’s actual experience and approach directly before engaging them.',
    relatedCategories: ['Life skills', 'Behaviour support', 'Support coordination'],
  },
  {
    slug: 'intellectual-disability', name: 'Intellectual Disability', categoryGroup: 'Developmental',
    summary: 'Intellectual disability refers to significant limitations in intellectual functioning (learning, reasoning, problem-solving) and adaptive behaviour (everyday conceptual, social and practical skills), typically identified before adulthood. It ranges widely in level and presentation, and a person’s support needs can change over their life. It is one of the more common primary disabilities supported through the NDIS. Support commonly centres on building daily living and life skills, communication, and community participation, and — depending on the person — assistance with personal care, employment pathways or supported living arrangements. Family and carer involvement is often central to planning support, particularly for younger participants. Language matters here too: person-first, respectful framing is standard practice, and a good provider will take the time to understand a person’s actual abilities and goals rather than making assumptions based on a diagnosis alone.',
    relatedCategories: ['Life skills', 'Personal care', 'Community access', 'Employment & education support'],
  },
  {
    slug: 'global-developmental-delay', name: 'Global Developmental Delay', categoryGroup: 'Developmental',
    summary: 'Global developmental delay (GDD) describes a child who is significantly behind expected milestones across two or more developmental areas — such as motor skills, speech and language, cognition, or social and daily living skills. It’s usually diagnosed in early childhood and is sometimes an early sign of a condition that becomes clearer as the child grows, though for some children the cause is never fully identified. Because GDD is diagnosed young, early intervention is a major focus of support — the NDIS’s Early Childhood approach is specifically built around getting support in place quickly during this window. Families often coordinate several types of therapy at once (for example speech and occupational therapy together) alongside family-centred support and, once school age approaches, transition planning. As a term, GDD describes a pattern of delay rather than a single diagnosis, so what helps varies a lot from child to child.',
    relatedCategories: ['Therapy services', 'Life skills'],
  },
  {
    slug: 'down-syndrome', name: 'Down Syndrome', categoryGroup: 'Developmental',
    summary: 'Down syndrome is a genetic condition caused by an extra copy of chromosome 21, typically associated with some degree of intellectual disability, characteristic physical features, and a higher likelihood of certain health conditions (including heart and hearing considerations), which is why regular health monitoring is often part of a person’s broader care. People with Down syndrome have a very wide range of abilities and, with the right support, many live full, independent or semi-independent lives, complete school and further education, and work. Common areas of support include early intervention therapies in childhood, speech and communication support, and — through school and beyond — life skills and employment pathways. Many families also connect with dedicated Down syndrome associations for peer support alongside formal services. As with any genetic condition, a person’s actual support needs are specific to them, not fully predicted by the diagnosis alone.',
    relatedCategories: ['Therapy services', 'Life skills', 'Nursing', 'Employment & education support'],
  },
  {
    slug: 'fragile-x-syndrome', name: 'Fragile X Syndrome', categoryGroup: 'Developmental',
    summary: 'Fragile X syndrome is a genetic condition and the most common inherited cause of intellectual disability, caused by a change in the FMR1 gene. It affects boys more severely on average than girls, and commonly involves some degree of intellectual disability, delayed speech and language development, and features that overlap with autism, including sensory sensitivities and social anxiety, in a meaningful proportion of cases. Because it’s inherited, a diagnosis can also prompt genetic counselling conversations for the wider family. Support commonly draws on early intervention therapies, speech and language support, and strategies for sensory regulation and anxiety, alongside the general life-skills and education support relevant to intellectual disability more broadly. It’s a less commonly known condition than autism or Down syndrome, so families sometimes find it worth specifically asking a provider whether they’ve supported Fragile X before, rather than assuming general disability experience covers it.',
    relatedCategories: ['Therapy services', 'Life skills', 'Behaviour support'],
  },
  {
    slug: 'cerebral-palsy', name: 'Cerebral Palsy', categoryGroup: 'Developmental',
    summary: 'Cerebral palsy (CP) is a group of permanent conditions affecting movement and posture, caused by disruption to the developing brain, usually before or shortly after birth. It’s the most common physical disability in childhood. CP varies enormously in severity — some people walk independently with minimal support, others use mobility aids or wheelchairs and need support with most daily activities — and it can also come with related considerations such as communication differences, epilepsy or intellectual disability, though many people with CP have typical cognitive ability. Support is often lifelong and multidisciplinary: physiotherapy and occupational therapy to manage movement and prevent secondary complications, equipment and home modifications, and — depending on the person — personal care and community access support. Because presentation varies so much, it’s worth asking a provider specifically what type and level of CP they’ve supported before, rather than assuming a general disability background is enough.',
    relatedCategories: ['Therapy services', 'Personal care', 'Assistive technology & equipment', 'Home modifications'],
  },
  {
    slug: 'speech-language-delay', name: 'Speech & Language Delay', categoryGroup: 'Developmental',
    summary: 'Speech and language delay describes a child developing spoken communication more slowly than expected for their age — this can affect how clearly they speak (speech), how they understand and use language (language), or both, and can occur on its own or alongside another developmental condition. Early identification matters because the years before school are a particularly effective window for speech pathology intervention. Support is generally led by a speech pathologist, often working directly with the child and coaching parents/carers on strategies to use at home, and can include alternative and augmentative communication (AAC) approaches for children who need support beyond spoken words. Many delays resolve substantially with early support, though for some children a language difference continues and support needs evolve as they move through school. A specific speech pathology assessment, not a general checklist, is the right way to understand what a particular child actually needs.',
    relatedCategories: ['Therapy services'],
  },
];

const mobility: ConditionContent[] = [
  {
    slug: 'spinal-cord-injury', name: 'Spinal Cord Injury', categoryGroup: 'Mobility & Physical',
    summary: 'A spinal cord injury (SCI) damages the spinal cord, usually through trauma (such as a vehicle accident or fall), and disrupts the signals between the brain and body below the injury site. The effects depend heavily on where the injury is and how complete it is — ranging from some loss of movement or sensation in the legs (paraplegia) to effects across arms, legs and torso (tetraplegia/quadriplegia). Many people with SCI also manage related considerations like bladder and bowel function, pressure care and pain, alongside mobility. Because an SCI is often sudden, support needs frequently start with an intensive rehabilitation phase before settling into an ongoing plan — commonly including personal care, home modifications, equipment (like a wheelchair suited to the person), and clinical/nursing support for the associated health considerations. Support needs and independence levels vary enormously between individuals, even with a similarly described injury level.',
    relatedCategories: ['Personal care', 'Nursing', 'Assistive technology & equipment', 'Home modifications'],
  },
  {
    slug: 'amputation-limb-loss', name: 'Amputation & Limb Loss', categoryGroup: 'Mobility & Physical',
    summary: 'Limb loss can result from injury, illness (such as vascular disease or cancer) or be present from birth, and affects people very differently depending on which limb, how much of it, and the person’s overall health. For many people the practical focus is on rehabilitation, prosthetic fitting and training, and adapting daily tasks and mobility — sometimes with ongoing equipment needs as a prosthetic wears or a person’s circumstances change over time. Phantom limb sensations and pain are a genuinely common experience worth discussing with a clinician rather than something to just push through. Beyond the physical side, adjusting to limb loss can also have a real emotional impact, and some people benefit from psychological support alongside physiotherapy and occupational therapy. Support needs are highly individual — a person’s own goals (returning to work, sport, specific daily activities) should shape their plan more than the amputation itself.',
    relatedCategories: ['Therapy services', 'Assistive technology & equipment', 'Personal care'],
  },
  {
    slug: 'muscular-dystrophy', name: 'Muscular Dystrophy', categoryGroup: 'Mobility & Physical',
    summary: 'Muscular dystrophy (MD) is a group of genetic conditions that cause progressive muscle weakness over time, with several distinct types that differ in which muscles are affected, how quickly they progress, and at what age symptoms typically start (some appear in early childhood, others in adulthood). Because it’s progressive, support needs generally change over time rather than staying fixed — a person might start with support for specific activities and gradually need more, including mobility equipment, home modifications and, depending on the type, respiratory or cardiac monitoring. Physiotherapy and occupational therapy play an ongoing role in maintaining function and comfort for as long as possible, and equipment needs are usually reviewed regularly rather than set once. Given how much the different types of MD vary, it’s reasonable to ask a provider specifically about the type diagnosed, not muscular dystrophy in general.',
    relatedCategories: ['Therapy services', 'Assistive technology & equipment', 'Nursing', 'Home modifications'],
  },
  {
    slug: 'multiple-sclerosis', name: 'Multiple Sclerosis', categoryGroup: 'Mobility & Physical',
    summary: 'Multiple sclerosis (MS) is a condition of the central nervous system where the immune system affects the protective coating around nerve fibres, disrupting communication between the brain and body. It’s unpredictable by nature — symptoms and their severity vary widely between people and can also fluctuate over time for the same person, including fatigue, mobility changes, vision changes, and cognitive effects. Many people with MS manage it as a relapsing condition with periods of stability; for others it’s more steadily progressive. Because of that variability, support is usually built around the person’s current functional needs rather than a fixed idea of what MS “looks like” — this can include fatigue management strategies, physiotherapy, mobility aids as needed, and psychosocial support, adjusted as things change. If MS is part of someone’s NDIS or aged care plan, it’s worth revisiting support needs periodically rather than assuming they’re fixed.',
    relatedCategories: ['Therapy services', 'Personal care', 'Nursing', 'Assistive technology & equipment'],
  },
  {
    slug: 'arthritis', name: 'Arthritis', categoryGroup: 'Mobility & Physical',
    summary: 'Arthritis covers a range of conditions causing joint inflammation, pain and, over time, reduced movement — the two most common forms are osteoarthritis (wear-related, more common with age) and rheumatoid arthritis (an autoimmune condition that can affect younger people too and often needs specialist medical management). It’s extremely common, particularly in older adults, and is a frequent factor behind reduced mobility and difficulty with everyday tasks addressed through My Aged Care and, for younger people with more severe or complex arthritis, occasionally the NDIS. Support commonly focuses on pain and symptom management (in partnership with medical care), maintaining mobility through appropriate exercise and physiotherapy, home modifications or aids for daily tasks that have become difficult, and practical household support. Because arthritis severity ranges from mild and manageable to significantly disabling, support should be matched to how the condition is actually affecting someone day to day, not to the diagnosis alone.',
    relatedCategories: ['Domestic assistance', 'Therapy services', 'Home modifications', 'Personal care'],
  },
  {
    slug: 'spina-bifida', name: 'Spina Bifida', categoryGroup: 'Mobility & Physical',
    summary: 'Spina bifida is a condition present from birth where the spine and spinal cord don’t form completely, and it ranges from a very mild form with few or no effects through to more significant impacts on mobility, and bladder and bowel function, depending on where along the spine it occurs and how severe it is. Many people with spina bifida also have hydrocephalus (fluid build-up around the brain), which is separately monitored and managed. Because it’s present from birth, support typically starts early and evolves through childhood and into adulthood — commonly including mobility support and equipment, continence management, and ongoing input from a multidisciplinary medical and allied health team. As with other conditions on this page, severity varies enormously between individuals, so support should be based on a specific person’s actual functional needs and medical guidance, not assumptions from the diagnosis name alone.',
    relatedCategories: ['Nursing', 'Personal care', 'Assistive technology & equipment', 'Therapy services'],
  },
  {
    slug: 'chronic-pain', name: 'Chronic Pain', categoryGroup: 'Mobility & Physical',
    summary: 'Chronic pain is pain that persists beyond normal healing time — generally more than three months — and can occur on its own or alongside another diagnosed condition. It’s a genuine, complex health issue in its own right, not simply a symptom to push through, and it can meaningfully affect a person’s mobility, energy, mood and ability to manage everyday tasks. Good chronic pain management is usually multidisciplinary rather than a single fix: it can combine medical pain management, physiotherapy or exercise-based approaches, psychological support (pain and mood are closely linked), and practical adjustments to daily routines and the home environment. Because chronic pain isn’t always visible to others, people managing it sometimes find that being taken seriously — and having support that adapts on a bad day versus a better one — matters as much as the specific services offered. Support access depends on the underlying cause and its documented functional impact.',
    relatedCategories: ['Therapy services', 'Personal care', 'Domestic assistance'],
  },
];

const sensory: ConditionContent[] = [
  {
    slug: 'deafness-hearing-loss', name: 'Deafness & Hearing Loss', categoryGroup: 'Hearing, Vision & Sensory',
    summary: 'Hearing loss ranges from mild to profound and can be present from birth or acquired later in life through illness, injury, noise exposure or ageing — it’s one of the most common reasons older Australians engage with aged care support, and a distinct area of NDIS support for people affected earlier in life. Deaf people and communities vary in how they identify and communicate — some primarily use spoken language with hearing devices, some use Auslan (Australian Sign Language) as a first language and identify with Deaf culture, and many use a mix of both. Support commonly includes hearing devices and their maintenance, audiology services, Auslan interpreting or language support, and — particularly for children — early intervention to support language development regardless of the communication method chosen. Respecting a person’s (or family’s) own preferred communication approach, rather than assuming one is “better,” is a basic starting point for good support.',
    relatedCategories: ['Therapy services', 'Assistive technology & equipment'],
  },
  {
    slug: 'blindness-low-vision', name: 'Blindness & Low Vision', categoryGroup: 'Hearing, Vision & Sensory',
    summary: 'Vision impairment ranges from low vision (some usable sight, which can often be supported with aids and strategies) to total blindness, and can be present from birth or develop later through eye conditions, injury or ageing-related change. It affects daily tasks differently depending on the type and severity of vision loss, and many people who are blind or have low vision live fully independent lives with the right skills, technology and, sometimes, an assistance animal. Support commonly includes orientation and mobility training (learning to navigate safely and confidently), assistive technology (screen readers, magnification, and similar tools), and adaptive daily-living skills. As with hearing loss, it’s worth checking a provider’s specific experience — supporting someone newly experiencing vision loss as an adult is a different skill set to supporting a child who has been blind from birth, even though both fall under the same broad category.',
    relatedCategories: ['Therapy services', 'Assistive technology & equipment', 'Life skills'],
  },
  {
    slug: 'deafblindness', name: 'Deafblindness', categoryGroup: 'Hearing, Vision & Sensory',
    summary: 'Deafblindness is the combination of both hearing and vision loss, in any degree — it is not simply “deaf plus blind” but its own distinct disability, since the two senses often compensate for each other, and having both affected changes how a person accesses information, communicates and moves through the world. It can be present from birth (sometimes linked to a specific syndrome) or acquired later in life, including through age-related change to both senses. Because communication needs are so individual — ranging from tactile Auslan to specific assistive technology combinations — support is generally built around the specific person rather than a standard approach, and often draws on specialist deafblind services alongside more general disability or aged care support. Given how specialised this area is, it’s reasonable to specifically ask a provider about direct deafblind experience rather than assuming hearing- or vision-specific experience alone is sufficient.',
    relatedCategories: ['Therapy services', 'Assistive technology & equipment', 'Community access'],
  },
  {
    slug: 'auslan-support', name: 'Auslan Support', categoryGroup: 'Hearing, Vision & Sensory',
    summary: 'Auslan (Australian Sign Language) is the primary sign language used by the Australian Deaf community — a full, independent language with its own grammar, not a signed version of English. Auslan support generally refers to professional interpreting (for appointments, education, workplaces or events) or Auslan tuition and language development support, most often for Deaf children, their families, or hearing people who work with or care for Deaf people. Booking a NAATI-certified Auslan interpreter, rather than relying on an untrained family member, is standard good practice for anything involving medical, legal, educational or otherwise significant communication, both for accuracy and to avoid putting a family member in an inappropriate position. Demand for Auslan interpreters in regional and rural Australia can outstrip supply, so booking ahead of time where possible makes a real difference.',
    relatedCategories: ['Therapy services', 'Community access'],
  },
  {
    slug: 'sensory-processing', name: 'Sensory Processing', categoryGroup: 'Hearing, Vision & Sensory',
    summary: 'Sensory processing differences describe how a person’s nervous system registers and responds to everyday sensory input — sound, touch, light, movement, taste and more. Some people are more sensitive than typical (sensory input feels overwhelming, e.g. certain sounds or textures are distressing) and others are less responsive and seek out more intense input; many people experience a mix depending on the sense involved. It’s commonly discussed alongside autism and ADHD, though it can occur on its own too. Occupational therapists are usually the lead professional for formal sensory assessment and strategies, which might include environmental adjustments (lighting, noise, seating), sensory tools, or a personalised sensory diet of activities. Because sensory needs are genuinely individual — what regulates one person can overwhelm another — a good provider works from a specific assessment of the person, not a generic sensory program.',
    relatedCategories: ['Therapy services', 'Behaviour support'],
  },
];

const psychosocial: ConditionContent[] = [
  {
    slug: 'schizophrenia', name: 'Schizophrenia', categoryGroup: 'Psychosocial & Mental Health',
    summary: 'Schizophrenia is a serious mental health condition that can affect thinking, perception (including experiences like hallucinations or delusions), motivation and social functioning. It typically first appears in late adolescence or early adulthood and, with appropriate ongoing treatment — usually medical/psychiatric care alongside psychosocial support — many people live meaningful, stable lives, though the course varies significantly between individuals and periods of acute illness can recur. In the NDIS, schizophrenia can be the basis for psychosocial disability support when its impact is significant and likely to be permanent, focused on functional recovery — things like daily routines, social connection, and work or study participation — rather than on clinical treatment itself, which stays with the person’s mental health care team. Stigma remains a real, documented barrier to people with schizophrenia getting appropriate support, so respectful, recovery-oriented language and practice matters in choosing a provider.',
    relatedCategories: ['Life skills', 'Community access', 'Support coordination', 'Employment & education support'],
  },
  {
    slug: 'bipolar-disorder', name: 'Bipolar Disorder', categoryGroup: 'Psychosocial & Mental Health',
    summary: 'Bipolar disorder involves significant shifts in mood, energy and activity levels, cycling between depressive episodes and periods of elevated mood (mania or the milder hypomania), with more stable periods in between for many people. It’s a long-term condition generally managed with a combination of medical/psychiatric treatment (often including medication) and psychosocial support to build routine, stability and coping strategies around triggers. Support through the NDIS’s psychosocial disability pathway is generally about the functional impact on daily life — work, relationships, independent living — not the diagnosis label itself, and is assessed on that basis. Because episodes can be unpredictable, support that’s flexible and responsive (rather than rigidly scheduled) tends to work better for many people, alongside a clear plan for what to do if things start to shift. As always, this is general information — mood changes that concern you or someone you know are worth raising with a GP or mental health professional.',
    relatedCategories: ['Life skills', 'Community access', 'Support coordination'],
  },
  {
    slug: 'ptsd', name: 'PTSD', categoryGroup: 'Psychosocial & Mental Health',
    summary: 'Post-traumatic stress disorder (PTSD) can develop after experiencing or witnessing a traumatic event, and involves symptoms such as intrusive memories, avoidance, negative changes in mood or thinking, and heightened alertness that persist well beyond the event itself. It affects veterans, first responders, survivors of violence or accidents, and many others — trauma exposure isn’t limited to any one group. Effective treatment is generally trauma-focused psychological therapy, sometimes alongside medication, and can genuinely help many people recover significantly. Broader support (including some NDIS psychosocial support, or DVA-funded support for veterans) tends to focus on functional day-to-day impact — sleep, relationships, work, community participation — working alongside, not instead of, clinical trauma treatment. If PTSD relates to service, DVA-specific pathways may also apply. If you’re in crisis, Lifeline (13 11 14) is available 24/7 in Australia.',
    relatedCategories: ['Life skills', 'Community access', 'Support coordination'],
  },
  {
    slug: 'anxiety-disorders', name: 'Anxiety Disorders', categoryGroup: 'Psychosocial & Mental Health',
    summary: 'Anxiety disorders go beyond everyday worry or nervousness — they involve persistent, often disproportionate fear or anxiety that interferes with daily life, and take several distinct forms (generalised anxiety, social anxiety, panic disorder, specific phobias, and others), each with a somewhat different pattern. Anxiety disorders are among the most common mental health conditions in Australia and, encouragingly, some of the most treatable, usually through psychological therapy (cognitive behavioural therapy is well-evidenced), sometimes alongside medication for more severe presentations. Not everyone with an anxiety disorder needs or qualifies for NDIS support — it generally applies when the functional impact is significant and ongoing — but many people benefit from broader mental health support regardless of NDIS eligibility, including through Medicare-subsidised psychology sessions via a GP mental health plan. If anxiety is significantly affecting daily life, a GP is a reasonable, low-barrier first step.',
    relatedCategories: ['Life skills', 'Community access'],
  },
  {
    slug: 'depression', name: 'Depression', categoryGroup: 'Psychosocial & Mental Health',
    summary: 'Depression is more than temporary sadness — it’s a persistent low mood, loss of interest or pleasure, and often changes in sleep, energy, appetite and concentration, lasting weeks or longer and affecting daily functioning. It’s common, treatable, and affects people of all ages and backgrounds, sometimes alongside a physical health condition or as part of a broader life transition (including in older age, where it’s sometimes under-recognised). Treatment usually combines psychological therapy and, where appropriate, medication, coordinated through a GP or psychiatrist. Where depression has a significant, ongoing functional impact, psychosocial disability support (including via the NDIS) can help with rebuilding routine, social connection and independence, working alongside clinical treatment rather than replacing it. Support through My Aged Care may also address mental health and wellbeing for older Australians. If you or someone you know is in crisis, Lifeline (13 11 14) is available 24/7 in Australia.',
    relatedCategories: ['Life skills', 'Community access', 'Support coordination'],
  },
  {
    slug: 'eating-disorders', name: 'Eating Disorders', categoryGroup: 'Psychosocial & Mental Health',
    summary: 'Eating disorders — including anorexia nervosa, bulimia nervosa, binge eating disorder and others — are serious mental health conditions involving a disturbed relationship with food, eating and body image, with real physical health risks alongside the psychological ones. They affect people of any gender, age or body size, and are not a lifestyle choice or something a person can simply decide to stop. Treatment is usually multidisciplinary — medical monitoring, psychological therapy, and dietetic support together — and earlier intervention is generally associated with better outcomes, which is why acting on early concerns matters. Broader disability or psychosocial support can help with the functional day-to-day impact once someone is engaged in appropriate clinical treatment, but it isn’t a substitute for that treatment. The Butterfly Foundation’s National Helpline (1800 33 4673) is a specific, Australian, eating-disorder-focused support line worth knowing about alongside general mental health services.',
    relatedCategories: ['Life skills', 'Nursing', 'Support coordination'],
  },
  {
    slug: 'borderline-personality-disorder', name: 'Borderline Personality Disorder', categoryGroup: 'Psychosocial & Mental Health',
    summary: 'Borderline personality disorder (BPD) involves patterns of intense and fluctuating emotions, difficulty with self-image, and challenges in relationships, often alongside impulsivity and a strong fear of abandonment — patterns that typically become established by early adulthood. It’s frequently misunderstood and unfortunately still carries real stigma, including in some parts of the health system, despite being a genuine, well-recognised and treatable condition. Dialectical behaviour therapy (DBT) is one of the best-evidenced treatments and focuses specifically on building emotional regulation and interpersonal skills. As with other psychosocial conditions, broader disability support generally focuses on functional impact — daily living, relationships, work or study — working alongside clinical treatment, not replacing it. People with BPD often describe finding non-judgemental, consistent support especially valuable, given how often they’ve encountered the opposite. If you’re in crisis, Lifeline (13 11 14) is available 24/7 in Australia.',
    relatedCategories: ['Life skills', 'Support coordination', 'Community access'],
  },
  {
    slug: 'dual-diagnosis', name: 'Dual Diagnosis', categoryGroup: 'Psychosocial & Mental Health',
    summary: 'Dual diagnosis refers to a person experiencing both a mental health condition and a substance use issue at the same time — a common and well-recognised combination, since each can contribute to or worsen the other. Historically, mental health and alcohol/drug services have sometimes operated separately, which made it harder for people with dual diagnosis to get coordinated care; integrated treatment approaches that address both together are now considered better practice. Support needs are genuinely individual and depend on the specific mental health condition and substance involved, but generally benefit from services (or a support coordinator) able to work across both areas rather than treating them in isolation. This is a complex area best navigated with a GP, psychiatrist or dedicated dual diagnosis service as the starting point, alongside any broader disability support once appropriate clinical care is in place.',
    relatedCategories: ['Support coordination', 'Life skills'],
  },
];

const chronicMedical: ConditionContent[] = [
  {
    slug: 'epilepsy', name: 'Epilepsy', categoryGroup: 'Chronic & Complex Medical',
    summary: 'Epilepsy is a neurological condition involving a tendency to have recurring seizures, caused by bursts of unusual electrical activity in the brain. It varies enormously — seizure types range from brief lapses in awareness to convulsive seizures — and many people with epilepsy manage it well with medication and have long seizure-free periods, while others live with more frequent or harder-to-control seizures. Support commonly includes seizure management planning (knowing a person’s specific seizure first-aid needs matters more than generic epilepsy awareness), medication support, and — where epilepsy occurs alongside another condition like intellectual disability or autism, which happens at a higher rate than in the general population — coordinated support across both. Anyone supporting a person with epilepsy should have a clear, person-specific seizure management plan, ideally documented with the person’s neurologist or GP, rather than relying on generic assumptions about what to do.',
    relatedCategories: ['Nursing', 'Support coordination'],
  },
  {
    slug: 'diabetes', name: 'Diabetes', categoryGroup: 'Chronic & Complex Medical',
    summary: 'Diabetes affects how the body regulates blood glucose, and comes in different forms — type 1 (an autoimmune condition, usually starting in childhood or young adulthood, always requiring insulin) and type 2 (more common, often developing in adulthood, managed through a combination of lifestyle factors and medication, sometimes including insulin) being the two main types, alongside gestational diabetes in pregnancy. Well-managed diabetes allows most people to live full lives, but poorly managed diabetes over time carries real risks to eyesight, kidney function, circulation and more, which is why consistent monitoring and management matters. Support needs vary a lot by type, age and how established a person’s condition is — from help with daily blood glucose monitoring and medication routines, to broader support where diabetes-related complications affect mobility or independence (particularly common in aged care contexts). Diabetes-specific dietetic and nursing input is often part of good ongoing support.',
    relatedCategories: ['Nursing', 'Domestic assistance'],
  },
  {
    slug: 'cystic-fibrosis', name: 'Cystic Fibrosis', categoryGroup: 'Chronic & Complex Medical',
    summary: 'Cystic fibrosis (CF) is a genetic condition that causes the body to produce unusually thick mucus, primarily affecting the lungs and digestive system, and requiring ongoing, often daily, management — airway clearance techniques, medications and enzyme replacement for digestion being common parts of a routine. Newer treatments have meaningfully changed outcomes for many people with CF in recent years, and life expectancy and quality of life have improved considerably, though CF remains a serious, lifelong condition requiring specialist medical management, usually through a dedicated CF clinic. Because infection risk between people with CF is a genuine clinical consideration (cross-infection precautions are standard CF care), support arrangements sometimes need to account for that in ways that differ from other conditions. Support beyond direct medical care can include help maintaining daily treatment routines and, for some people, broader disability or nursing support as the condition progresses.',
    relatedCategories: ['Nursing', 'Therapy services'],
  },
  {
    slug: 'renal-failure', name: 'Renal Failure', categoryGroup: 'Chronic & Complex Medical',
    summary: 'Renal (kidney) failure means the kidneys can no longer adequately filter waste and fluid from the blood, and can be acute (sudden, sometimes reversible) or chronic (a long-term, progressive decline, often described in stages). People with significant chronic kidney disease may eventually need dialysis (a time-intensive regular treatment) or, where possible, a kidney transplant. Because dialysis in particular is demanding on time, energy and routine, support needs often centre on practical help around treatment schedules — transport to appointments, fatigue management, dietary support (kidney-friendly eating is quite specific) — alongside the direct medical care from a nephrology team. Chronic kidney disease is common in older Australians and often managed through aged care alongside other health conditions, though younger people with kidney disease may access NDIS support if the functional impact meets the criteria. A renal dietitian and the treating nephrology team are central to getting the medical side right.',
    relatedCategories: ['Nursing', 'Transport', 'Domestic assistance'],
  },
  {
    slug: 'cancer-care', name: 'Cancer Care', categoryGroup: 'Chronic & Complex Medical',
    summary: 'Cancer covers a very wide range of conditions, treatments and outlooks — what someone needs during active treatment (chemotherapy, radiation, surgery), what they need in recovery, and what long-term or palliative support looks like are quite different, and change over the course of a person’s experience with cancer. Fatigue is one of the most common and underestimated effects of cancer and its treatment, and practical everyday support — help around the house, transport to treatment, meal preparation — can matter as much as clinical care during this time. Support may come through the health system directly (oncology social work, cancer-specific nursing), through aged care for older Australians, or occasionally the NDIS where cancer has caused a permanent, significant functional impairment. Cancer Council Australia (13 11 20) is a good general starting point for practical and emotional support information specific to a person’s situation and cancer type.',
    relatedCategories: ['Nursing', 'Domestic assistance', 'Transport', 'Respite care'],
  },
  {
    slug: 'motor-neurone-disease', name: 'Motor Neurone Disease', categoryGroup: 'Chronic & Complex Medical',
    summary: 'Motor neurone disease (MND) is a progressive condition affecting the nerve cells that control voluntary muscle movement, gradually affecting a person’s ability to move, speak, swallow and eventually breathe, while cognition is often (though not always) unaffected. It typically progresses over a period of months to a few years, though the pace varies between individuals, which makes forward planning — for equipment, communication support and care needs — a genuinely important part of good MND support, done proactively rather than only in response to change. A multidisciplinary team (neurology, respiratory, speech pathology, occupational therapy, and others) working together is considered best practice. Because needs change relatively quickly compared with many other conditions, equipment and support plans generally need to be reviewed often rather than set once. MND Australia and state MND associations provide condition-specific information and support alongside NDIS or aged care services.',
    relatedCategories: ['Nursing', 'Therapy services', 'Assistive technology & equipment', 'Respite care'],
  },
  {
    slug: 'parkinson-s-disease', name: "Parkinson's Disease", categoryGroup: 'Chronic & Complex Medical',
    summary: 'Parkinson’s disease is a progressive neurological condition primarily affecting movement — causing tremor, stiffness and slowness of movement — though it can also involve non-movement effects like changes to sleep, mood and, for some people over time, cognition. It usually develops gradually and is managed long-term with medication (timing of doses matters a great deal day to day) alongside physiotherapy, occupational therapy and speech pathology as needed. Parkinson’s most often affects older adults and is commonly supported through My Aged Care, though younger-onset Parkinson’s occurs too and may involve NDIS support instead. Because symptoms can fluctuate through the day as medication wears on and off, support that’s flexible around a person’s actual functional state — rather than assuming a fixed level of ability — tends to work better. Parkinson’s Australia and state-based Parkinson’s organisations offer condition-specific information alongside general aged care or disability services.',
    relatedCategories: ['Therapy services', 'Personal care', 'Nursing'],
  },
];

const abiStroke: ConditionContent[] = [
  {
    slug: 'acquired-brain-injury', name: 'Acquired Brain Injury', categoryGroup: 'ABI, Stroke & Neuro Rehab',
    summary: 'Acquired brain injury (ABI) is any injury to the brain that occurs after birth — from a traumatic cause (like an accident) or a non-traumatic one (such as stroke, lack of oxygen, infection or a brain tumour). Effects vary enormously depending on which part of the brain is affected and how severely, and can include changes to physical function, thinking and memory, communication, and personality or behaviour — sometimes the less visible cognitive and behavioural effects are the most life-changing, even when a person looks physically unaffected. Support is usually intensive early on (rehabilitation) and then shifts to longer-term, often lifelong support tailored to the specific effects a person is left with. Because ABI can significantly change how a person thinks, communicates or regulates emotion, support from people specifically experienced with brain injury — not just disability support broadly — tends to make a real difference, and is worth asking about directly.',
    relatedCategories: ['Therapy services', 'Behaviour support', 'Support coordination', 'Life skills'],
  },
  {
    slug: 'stroke-recovery', name: 'Stroke Recovery', categoryGroup: 'ABI, Stroke & Neuro Rehab',
    summary: 'A stroke happens when blood supply to part of the brain is interrupted (by a clot or a bleed), damaging brain tissue and potentially affecting movement, speech, swallowing, vision or cognition, depending on which part of the brain was affected. Recovery is often most rapid in the weeks and months after a stroke, which is why prompt, intensive rehabilitation (physiotherapy, occupational therapy, speech pathology, as relevant) matters, though meaningful gains can continue well beyond that early window for many people. Stroke mostly affects older adults and is commonly supported through My Aged Care, though it can affect younger people too, sometimes involving the NDIS. Support commonly includes therapy to rebuild function, home modifications and equipment, and — because mood changes after stroke are common and sometimes overlooked — attention to emotional wellbeing alongside the physical recovery. The Stroke Foundation (StrokeLine, 1800 787 653) is a good Australian, stroke-specific information resource.',
    relatedCategories: ['Therapy services', 'Personal care', 'Home modifications'],
  },
  {
    slug: 'traumatic-brain-injury', name: 'Traumatic Brain Injury', categoryGroup: 'ABI, Stroke & Neuro Rehab',
    summary: 'Traumatic brain injury (TBI) is brain injury caused by an external force — a fall, vehicle accident, sports injury or assault, for example — and is a specific type of acquired brain injury. Severity ranges from mild (including concussion, which usually resolves but should still be taken seriously, particularly with repeated impacts) to moderate or severe injuries with lasting effects on movement, thinking, communication and behaviour. TBI disproportionately affects younger people, particularly young men, often through vehicle accidents or sport, which shapes what recovery and support look like — frequently involving a return to work, study or an active life as an explicit goal, not just daily living support. As with ABI generally, the cognitive and behavioural effects of TBI can be significant even when physical recovery looks complete, and support from providers specifically experienced in brain injury rehabilitation is worth seeking out directly.',
    relatedCategories: ['Therapy services', 'Behaviour support', 'Employment & education support'],
  },
  {
    slug: 'huntington-s-disease', name: "Huntington's Disease", categoryGroup: 'ABI, Stroke & Neuro Rehab',
    summary: 'Huntington’s disease is an inherited, progressive neurological condition that affects movement (including involuntary movements), cognition and, for many people, mood and behaviour over time. It’s caused by a specific gene fault, which means it can also prompt genetic counselling conversations for other family members, since each child of a person with Huntington’s has a 50% chance of inheriting the gene. Symptoms typically first appear in mid-adulthood, though there’s a rare earlier-onset form too, and the condition progresses over many years, which makes forward planning for changing support needs — similar to MND — a genuinely important part of good care. Because Huntington’s affects movement, thinking and behaviour together, support benefits from a coordinated team across neurology, allied health and psychosocial support, rather than any single service working in isolation. Huntington’s Australia-affiliated state associations provide condition-specific information and support alongside NDIS services.',
    relatedCategories: ['Therapy services', 'Behaviour support', 'Nursing', 'Support coordination'],
  },
  {
    slug: 'neuro-physiotherapy', name: 'Neuro Physiotherapy', categoryGroup: 'ABI, Stroke & Neuro Rehab',
    summary: 'Neurological physiotherapy is physiotherapy specialised for conditions affecting the brain, spinal cord or nervous system — such as stroke, brain injury, spinal cord injury, MS, Parkinson’s or cerebral palsy — rather than general musculoskeletal physiotherapy. It focuses on movement, balance, coordination and function in the specific context of how a neurological condition affects them, often using targeted, condition-specific techniques and, for some conditions, working toward the brain and nervous system’s capacity to adapt over time (neuroplasticity). Because the right approach differs so much by underlying condition — what helps someone recovering from stroke is different from what helps someone with progressive MS — it’s genuinely worth confirming a physiotherapist’s specific neurological experience and, ideally, experience with the particular condition involved, rather than assuming general physiotherapy training covers it.',
    relatedCategories: ['Therapy services'],
  },
];

export const CONDITION_CATEGORY_GROUPS: ConditionCategoryGroup[] = [
  { title: 'Developmental', items: developmental },
  { title: 'Mobility & Physical', items: mobility },
  { title: 'Hearing, Vision & Sensory', items: sensory },
  {
    title: 'Psychosocial & Mental Health',
    note: 'If you or someone you know is in crisis, Lifeline (13 11 14) is available 24/7 in Australia.',
    items: psychosocial,
  },
  { title: 'Chronic & Complex Medical', items: chronicMedical },
  { title: 'ABI, Stroke & Neuro Rehab', items: abiStroke },
];

export const CONDITION_CONTENT: ConditionContent[] = CONDITION_CATEGORY_GROUPS.flatMap((g) => g.items);

// A hardcoded slug that silently drifts from slugify(name) means the mega
// menu link 404s instead of showing this content — surfaced loudly here
// (once, at module load) rather than discovered by a visitor.
for (const c of CONDITION_CONTENT) {
  if (c.slug !== slugify(c.name)) {
    // eslint-disable-next-line no-console
    console.error(`[conditionContent] slug mismatch for "${c.name}": stored "${c.slug}", expected "${slugify(c.name)}"`);
  }
}

export const conditionBySlug = (slug: string): ConditionContent | undefined =>
  CONDITION_CONTENT.find((c) => c.slug === slug.toLowerCase());
