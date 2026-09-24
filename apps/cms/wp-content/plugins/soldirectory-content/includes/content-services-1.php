<?php
/**
 * Editorial content for service posts, part 1 (titles A-E).
 * Shape: 'Title' => [ group, 'who it may suit', [ [question, answer] x3 ] ].
 * group: core | cb (capacity building) | capital | at (assistive technology) | general.
 * See content-services.php for how it is used and what it deliberately leaves out.
 */
if (!defined('ABSPATH')) exit;

return [
    'AT repairs, maintenance, rental and trial' => ['at',
        'People who already use assistive technology and need it repaired or serviced, or who want to hire or trial equipment before deciding what suits them.',
        [
            ['Can I try assistive technology before I buy it?', 'Often, yes. Many suppliers offer short-term hire or trial periods. A trial helps you and your therapist check the equipment works for you in your own home and routine before a larger purchase is made.'],
            ['Who repairs and services assistive technology?', 'The supplier or manufacturer usually handles repairs and servicing, and some specialist repairers work across brands. Ask your supplier what maintenance the equipment needs and how quickly repairs are normally arranged.'],
            ['Is renting equipment cheaper than buying it?', 'It depends on how long you need it. Renting can suit short-term or changing needs, while buying can make sense for long-term use. A therapist or assistive technology advisor can help you compare the two.'],
        ]],
    'Activity-based transport' => ['core',
        'People who need help travelling to and from activities, such as classes, outings or social events, and who are not able to use public transport independently.',
        [
            ['What is activity-based transport?', 'It is transport connected to an activity, for example getting to and from a community program, class or outing. A support worker or driver helps the person travel safely and arrive on time.'],
            ['How is it different from other transport supports?', 'Activity-based transport is tied to particular activities, rather than being a general allowance. Ask your planner or support coordinator how transport is set up in your plan.'],
            ['What should I ask a transport provider?', 'Ask about the vehicles they use, whether they can support your mobility equipment, how bookings and changes work, and whether drivers have the checks and training the role requires.'],
        ]],
    'Assistance animal training and assessment' => ['general',
        'People who are considering an assistance animal, or who already have one and need it assessed or trained to work reliably with them.',
        [
            ['What does assistance animal training involve?', 'Training prepares an animal to carry out specific tasks for its handler and to behave reliably in public places. It usually includes an assessment of how well the animal and handler work together.'],
            ['Are assistance animals the same as pets?', 'No. An assistance animal is trained to help a person with a disability by carrying out specific tasks. Access rights and rules can differ from those for pets, so ask the training organisation what applies.'],
            ['How do I find a reputable trainer?', 'Look for an organisation with clear information about its training standards, its assessment process and the follow-up it offers. Ask what happens if the match between animal and handler does not work out.'],
        ]],
    'Assistance animal upkeep' => ['general',
        'People with an assistance animal who need help with the ongoing care of that animal, such as food, veterinary care and grooming.',
        [
            ['What does assistance animal upkeep cover?', 'It relates to the everyday care needed to keep an assistance animal healthy and able to work, such as feeding, veterinary care, grooming and equipment. Check your plan for what is included.'],
            ['Why does the health of an assistance animal matter?', 'An animal that is unwell or uncomfortable cannot do its job reliably. Regular veterinary care and good routines help protect both the animal and the person who depends on it.'],
            ['Who do I speak to about upkeep arrangements?', 'Start with your planner or support coordinator, and with the organisation that trained your animal. They can explain what is usually needed and how to keep records for your plan.'],
        ]],
    'Assistance animals' => ['general',
        'People who would benefit from a trained animal to help with daily tasks, safety or taking part in the community.',
        [
            ['What is an assistance animal?', 'An assistance animal is trained to do specific tasks that help a person with disability, or to support them to take part in daily life. Guide dogs and hearing dogs are well-known examples.'],
            ['How do I know if an assistance animal is right for me?', 'It is a big commitment for both the person and the animal. An assessment by a suitably qualified professional, and a conversation with a training organisation, can help you decide.'],
            ['How long does it take to get an assistance animal?', 'Timeframes vary widely between organisations, and there are often waiting lists. Ask each organisation about its process, how animals are matched, and what support you receive afterwards.'],
        ]],
    'Assistive technology assessment and training' => ['at',
        'People who are not sure which equipment or technology suits them, or who have new equipment and need help setting it up and learning to use it.',
        [
            ['What happens in an assistive technology assessment?', 'A qualified professional, often an occupational therapist, looks at what you want to do, where you do it and what gets in the way. They then recommend options and may arrange trials.'],
            ['Why is training important?', 'Even good equipment only helps if it is set up properly and you feel confident using it. Training covers safe use, adjustments and what to do if something stops working.'],
            ['Do I need an assessment before buying equipment?', 'For simpler items you may not. For more complex or higher-cost items, an assessment is commonly needed to show the equipment suits you. Check what applies to your situation with your planner.'],
        ]],
    'Behaviour support implementation' => ['cb',
        'People who have a behaviour support plan and need support workers to put its strategies into practice consistently in daily life.',
        [
            ['What does implementing a behaviour support plan mean?', 'It means carrying out the strategies in the plan day to day, in the same way, across the people and places in the person\'s life. Consistency is what makes a plan effective.'],
            ['Who writes the behaviour support plan?', 'A behaviour support practitioner develops the plan with the person and the people around them. Support workers and family then follow it. Implementation is separate from writing the plan.'],
            ['What should I look for in a provider?', 'Look for staff who understand the plan, receive training in it, and communicate regularly with the practitioner. Ask how they handle changes and how they report on progress.'],
        ]],
    'Communication and information equipment' => ['at',
        'People who have difficulty speaking, hearing, reading or using standard devices and who need equipment to communicate or access information.',
        [
            ['What kinds of equipment are included?', 'This can include communication devices and apps, adapted computers and phones, screen readers, alerting systems and software that makes information easier to access. The right choice depends on the person.'],
            ['How do I choose the right communication device?', 'A speech pathologist or occupational therapist can assess your needs, arrange trials and recommend options. Trying a device in your everyday life is the best way to see whether it works.'],
            ['Will I need training to use it?', 'Usually, yes. Learning to use a device well takes time, and support for you and the people around you can make a big difference to how much you get out of it.'],
        ]],
    'Community nursing care' => ['general',
        'People who need nursing care at home or in the community, for example for wound care, medication management or ongoing health conditions.',
        [
            ['What does a community nurse do?', 'A community nurse delivers clinical care outside a hospital, such as wound care, managing medication, monitoring health conditions and supporting people with complex health needs at home.'],
            ['Are community nurses qualified?', 'Nurses in Australia are registered with the Nursing and Midwifery Board and the Australian Health Practitioner Regulation Agency. You can ask a provider about the qualifications and experience of the nurses who will visit.'],
            ['How do I arrange nursing care?', 'Speak to your doctor or planner about what is needed, then contact providers for availability and a quote. A support coordinator can help you compare options and set up services.'],
        ]],
    'Complex home modifications' => ['capital',
        'People whose home does not work for their disability and who need larger changes, such as structural work, a rebuilt bathroom or a lift.',
        [
            ['What counts as a complex home modification?', 'Larger jobs that involve structural changes or specialised design, for example widening doorways, rebuilding a bathroom or installing a lift. They usually need an assessment, plans and quotes.'],
            ['Who is involved in a home modification project?', 'Typically an occupational therapist who assesses your needs, a builder or modifier who carries out the work, and sometimes a certifier or the property owner. Renters need the owner\'s agreement.'],
            ['How long do home modifications take?', 'Complex work can take months from assessment to completion, because of design, approvals and quotes. Ask your provider for a realistic timeline early and plan around it.'],
        ]],
    'Continence products' => ['general',
        'People who need products to manage continence, along with advice on which products suit them.',
        [
            ['What continence products are available?', 'Options include pads and pull-ups, catheters, bags and related supplies. The right choice depends on the person, so professional advice is important.'],
            ['Who can advise me on continence products?', 'A continence nurse or other health professional can assess your needs and recommend products. Your doctor can refer you, and some suppliers also offer advice.'],
            ['Can products be delivered?', 'Many suppliers deliver to your home on a regular schedule. Ask about delivery times, what happens if your needs change, and how to reorder.'],
        ]],
    'Counselling' => ['cb',
        'People who would like to talk with a trained professional about emotional difficulties, life changes or challenges and build ways of coping.',
        [
            ['What happens in a counselling session?', 'You talk with a trained counsellor in a private, respectful setting. They listen, help you understand what you are experiencing and work with you on strategies that suit your situation.'],
            ['How do I choose a counsellor?', 'Look at their qualifications, their experience with the kind of concerns you have, and whether you feel comfortable with them. It is fine to meet more than one before deciding.'],
            ['Is counselling confidential?', 'Counsellors keep what you tell them private, with limited exceptions, for example where there is a serious risk of harm. A good counsellor explains this at the start.'],
        ]],
    'Cultural, religious and civic participation' => ['core',
        'People who want support to take part in cultural, religious or civic life, such as attending a place of worship, a community event or a local meeting.',
        [
            ['What does this support look like?', 'A support worker helps you get to and take part in activities that matter to you, for example a religious service, cultural gathering or community meeting, in ways that respect your beliefs.'],
            ['Can I choose a worker who shares my culture or language?', 'You can ask providers about this. Some providers have workers from a range of backgrounds and languages, though availability varies.'],
            ['How do I get started?', 'Think about what you would like to take part in and how often, then talk to providers about availability and a service agreement that describes the support in your own words.'],
        ]],
    'Customised prosthetics and orthotics' => ['general',
        'People who need a prosthesis to replace a missing body part, or an orthosis to support or correct part of the body, made or adjusted for them.',
        [
            ['What is the difference between a prosthesis and an orthosis?', 'A prosthesis replaces a missing limb or body part. An orthosis, such as a brace or splint, supports or corrects a part of the body that is still there.'],
            ['Who makes them?', 'Prosthetists and orthotists are health professionals who assess, design, fit and adjust these devices. Look for practitioners with the appropriate qualifications and professional membership.'],
            ['Do custom devices need adjusting over time?', 'Yes. Bodies and needs change, and devices wear. Regular reviews help keep a device comfortable, safe and working well.'],
        ]],
    'Daily living and life skills development' => ['cb',
        'People who would like to build everyday skills, such as cooking, budgeting, using public transport or managing a household, and do more for themselves.',
        [
            ['What skills can this support help with?', 'Common examples include cooking, cleaning, budgeting, shopping, using public transport and managing appointments. The focus is on building your own skills rather than doing things for you.'],
            ['How long does skill-building take?', 'It depends on the skill and the person. Good providers set clear goals with you and review progress regularly so the support changes as you gain confidence.'],
            ['Who can provide daily living skills support?', 'Support workers, therapists and specialist skills coaches can all provide it. Ask providers how they set goals and measure progress.'],
        ]],
    'Dietitian' => ['cb',
        'People who need advice about food and nutrition, including for medical conditions, feeding or swallowing difficulties or particular dietary needs.',
        [
            ['What does a dietitian do?', 'A dietitian gives evidence-based advice about food and nutrition. They can help with managing health conditions, weight, feeding difficulties and special diets, and work with the rest of your care team.'],
            ['How is a dietitian different from a nutritionist?', 'Dietitians complete specific university training in nutrition and dietetics, and many are Accredited Practising Dietitians. The word "nutritionist" is used more loosely, so ask about qualifications when choosing.'],
            ['Can a dietitian help with tube feeding?', 'Yes. Dietitians commonly help people who use tube feeding to plan formula and routines, and they work with medical and speech pathology teams where needed.'],
        ]],
    'Early Childhood Intervention' => ['cb',
        'Families of young children with developmental delay or disability who want early support to build the child\'s skills and daily routines.',
        [
            ['What is early childhood intervention?', 'Early support for young children with developmental delay or disability. Therapists and educators often work with the child and family so learning carries into everyday life at home and in the community.'],
            ['Why is early support important?', 'The early years are a time of rapid development, and support during this time can help a child build skills and confidence. Families are central to how it works.'],
            ['How do I find an early childhood provider?', 'Ask your child\'s doctor, paediatrician or early childhood service for recommendations, then contact providers about availability, approach and how they involve families.'],
        ]],
    'Employment assessment and counselling' => ['cb',
        'People who are thinking about work and want help understanding what suits them, what support they need and how to get started.',
        [
            ['What is an employment assessment?', 'A structured conversation and, if needed, activities that explore your interests, strengths and support needs, so you can work out what kind of work might suit you.'],
            ['What happens after the assessment?', 'You get guidance on next steps, which might include training, work experience, job searching or on-the-job support. The aim is a plan that fits your goals.'],
            ['Can it help if I have never worked before?', 'Yes. Many people use this kind of support to explore work for the first time and to understand what is possible.'],
        ]],
    'Exercise physiology' => ['cb',
        'People who want a safe, tailored exercise program to improve strength, movement and long-term health, including people with chronic conditions or disability.',
        [
            ['What does an exercise physiologist do?', 'An exercise physiologist designs and supervises exercise programs to improve movement, strength, fitness and long-term health, often for people managing chronic conditions or recovering from injury.'],
            ['How is it different from physiotherapy?', 'The two overlap. Physiotherapists focus on assessing and treating movement problems and injury, while exercise physiologists focus on exercise as a tool for health. Many people see both.'],
            ['Do I need a referral to see an exercise physiologist?', 'Not always. A referral from your doctor or another health professional can be helpful. Ask the practice what they need when you enquire.'],
        ]],
];
