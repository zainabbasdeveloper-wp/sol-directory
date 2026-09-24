<?php
/**
 * Long-form guide content for service posts, batch 1.
 * Shape: 'Title' => [
 *   'cat'      => register category or '' (drives the live register tables),
 *   'short'    => the short answer (2-3 sentences),
 *   'overview' => paragraphs separated by a blank line,
 *   'choose'   => [ how-to-choose points ],
 *   'start'    => [ getting-started steps ],
 *   'faq'      => [ [question, answer] x3 ]  (added to the shorter FAQs in content-services-*.php),
 *   'src'      => optional extra source keys (see content-services.php).
 * Plain, general guidance only: no prices, no timeframes, no promises about who qualifies.
 */
if (!defined('ABSPATH')) exit;

return [
    'AT repairs, maintenance, rental and trial' => [
        'cat' => 'Assistive technology & equipment',
        'short' => 'This is about keeping assistive technology working and finding out whether a piece of equipment suits you before you commit to it. It covers repairs and servicing, renting equipment for a period, and trying it out first.',
        'overview' => "Assistive technology only helps if it works when you need it. Wheelchairs need their tyres and brakes checked, hoists need regular servicing, and electronic devices need updates and battery care. Repairs, maintenance and rental supports exist so that a breakdown does not leave you without something you rely on every day.\n\nRenting and trialling are different from buying. A trial lets you use equipment in your own home, workplace or community, over enough time to see how it really performs. Hire suits situations where the need is short, such as recovery after surgery, or where your needs are still changing and a permanent purchase might not be the right call.\n\nA supplier or an occupational therapist can advise on what to trial and for how long. It helps to write down what you want the equipment to do before you start, so that at the end of the trial you can judge it against something concrete rather than a general impression.",
        'choose' => [
            'Ask how quickly repairs are usually arranged and whether a loan item is available while yours is away.',
            'Check whether servicing is included in a rental, or whether it is a separate arrangement.',
            'Ask what happens if a trial shows the equipment is not suitable, including whether it can be returned.',
            'Find out who is responsible for damage, and whether there is any insurance or warranty involved.',
            'Ask whether the supplier can work with your therapist so the equipment is set up for your body and your home.',
        ],
        'start' => [
            'List the equipment you use and note anything that is worn, unreliable or no longer suits you.',
            'Speak to your therapist or supplier about what needs repair, servicing or a trial.',
            'Ask for a written quote or agreement that says what is included.',
            'Keep records of servicing and repairs so you can show what was done and when.',
        ],
        'faq' => [
            ['How often does assistive technology need servicing?', 'It depends on the item and how much it is used. Manufacturers and suppliers give guidance for each product, and equipment that carries your weight or moves you around usually needs checking more often.'],
            ['What should I do if my equipment breaks?', 'Contact your supplier or repairer as soon as you can, tell them what has happened and ask about a loan item. Stop using equipment that could be unsafe until it has been checked.'],
            ['Can I trial equipment from more than one supplier?', 'Often you can, which is a good way to compare. Ask each supplier about trial terms, because they differ, and let your therapist know what you are comparing.'],
        ],
    ],
    'Activity-based transport' => [
        'cat' => 'Transport',
        'short' => 'Activity-based transport helps you get to and from activities, such as classes, outings and social events, when travelling there is part of the support. A support worker or driver takes care of the trip so the activity is possible.',
        'overview' => "For many people the biggest barrier to taking part is not the activity but getting there. Activity-based transport removes that barrier. It might be a driver who takes you to a community program, or a support worker who travels with you on public transport and helps you feel confident doing it.\n\nThe transport is linked to the activity, so it is usually arranged around the timing of what you are doing. Providers plan pick-up and drop-off times, the route and any equipment you need, such as a wheelchair ramp, so the trip is smooth from start to finish.\n\nIt is worth understanding how transport is set up in your plan. Some people have a general transport allowance, while others have support that is tied to activities. Your support coordinator or planner can explain the difference and help you choose what suits how you like to get around.",
        'choose' => [
            'Ask whether vehicles can carry your mobility equipment and how it is secured.',
            'Check how bookings work and how much notice is needed for changes.',
            'Ask about the driver or support worker who will travel with you, including their training and any checks required.',
            'Find out what happens if a trip is running late or an activity is cancelled.',
            'Ask whether the provider can support you to build travel skills over time if that is a goal.',
        ],
        'start' => [
            'Write down the activities you want to get to and how often.',
            'Check how transport appears in your plan.',
            'Contact providers, describe your needs and ask for availability in your area.',
            'Agree how trips will be booked, changed and reviewed, and put it in a service agreement.',
        ],
        'faq' => [
            ['Can a support worker travel with me on public transport?', 'Yes, this is common. A worker can help you plan the route, travel with you and build your confidence, with the aim of doing more on your own if that is your goal.'],
            ['What if I use a wheelchair?', 'Ask providers about wheelchair-accessible vehicles and how they secure equipment. Confirm this before your first trip so there are no surprises.'],
            ['Does the driver need any special checks?', 'People who work with participants in certain roles may need to hold a valid worker screening check. Ask the provider how they handle this for their drivers and support workers.'],
        ],
    ],
    'Assistance animal training and assessment' => [
        'cat' => '',
        'short' => 'This support prepares an assistance animal to do specific tasks for its handler and checks that the animal and handler work well together. Training is usually delivered by a specialist organisation.',
        'overview' => "An assistance animal is not simply a well-behaved pet. It is trained to carry out defined tasks that help a person with disability, and to behave reliably in public places. Training and assessment are what turn a suitable animal into a working partner.\n\nAssessment looks at both sides of the partnership. It checks that the animal has the temperament and skills for the role, and that the handler is able to manage and care for the animal and to use the tasks it has learned. Some organisations train the animal and handler together, while others place an already-trained animal.\n\nBecause public access rights and rules around assistance animals can differ between states and settings, it is worth asking the training organisation what applies to you. A reputable organisation will explain its standards, what follow-up it provides and what happens if the match does not work out.",
        'choose' => [
            'Ask how the organisation trains and assesses animals and what standards it works to.',
            'Find out what follow-up support you receive after the animal is placed with you.',
            'Ask what happens if the match between you and the animal does not work.',
            'Check how the organisation talks about public access rights and any certification it provides.',
            'Ask for information about the animal\'s health and how it will be looked after during training.',
        ],
        'start' => [
            'Think about the tasks you want an assistance animal to help with.',
            'Talk to a health professional about whether an assistance animal suits you.',
            'Contact a small number of training organisations and compare how they work.',
            'Ask for a written outline of the process, timeframes and what is expected of you as handler.',
        ],
        'faq' => [
            ['Does the animal have to be trained by a specific organisation?', 'Requirements can vary depending on where you want to use the animal and the rules that apply. Ask organisations and the relevant authorities what is required for your situation.'],
            ['Can I train my own animal?', 'Some people do, though it needs specialist skills and time. Ask a training organisation what assessment would be required to show the animal is suitable.'],
            ['What happens as the animal gets older?', 'Working animals eventually retire. It helps to ask early about how retirement is handled and what planning is needed for a replacement.'],
        ],
    ],
    'Assistance animal upkeep' => [
        'cat' => '',
        'short' => 'Upkeep is the ongoing care an assistance animal needs to stay healthy and able to work, such as food, veterinary care and grooming. Good routines protect both the animal and the person who depends on it.',
        'overview' => "An assistance animal works every day, and its wellbeing affects how well it can do its job. Ongoing costs and care include food, regular veterinary checks, vaccinations, parasite control, grooming and replacing equipment such as harnesses and leads.\n\nKeeping records helps. Notes from veterinary visits, receipts and the animal's routine make it easier to plan, to show what has been needed and to spot changes in health early.\n\nIf you are unsure what is covered in your plan or by other arrangements, speak to your support coordinator, planner or the organisation that trained your animal. They can explain how upkeep is usually managed and what evidence may be needed.",
        'choose' => [
            'Choose a veterinarian who is comfortable working with assistance animals and understands their role.',
            'Ask whether there are veterinary clinics near you that offer services suited to working animals.',
            'Keep a simple record of veterinary visits, feeding and equipment so you can plan ahead.',
            'Ask the training organisation for guidance on diet, exercise and signs of stress.',
            'Plan what happens if the animal is unwell and cannot work for a period.',
        ],
        'start' => [
            'Ask your training organisation for an upkeep guide.',
            'Register with a local veterinary clinic.',
            'Check how upkeep costs are dealt with in your plan.',
            'Set up a regular routine for feeding, grooming and check-ups.',
        ],
        'faq' => [
            ['How often should an assistance animal see the vet?', 'Regular check-ups are recommended, and your veterinarian can suggest a schedule based on the animal\'s age, breed and health.'],
            ['What if my animal is sick and cannot work?', 'Have a plan in place for support while the animal recovers, such as help from a support worker or family. Speak to your training organisation for advice.'],
            ['Should I keep records of upkeep costs?', 'It is a good idea. Records help you plan, and they can be useful if you are asked to show how funds were used.'],
        ],
    ],
    'Assistance animals' => [
        'cat' => '',
        'short' => 'Assistance animals are trained to help a person with everyday tasks or to take part in the community. This page explains what they do and what to consider before deciding whether one is right for you.',
        'overview' => "Assistance animals help people with a range of disabilities. Guide dogs support people who are blind or have low vision, hearing dogs alert people who are deaf or hard of hearing, and other animals are trained for tasks such as opening doors, retrieving items or responding to medical events. What an animal does depends on the person and the tasks it has been trained for.\n\nHaving an assistance animal is a big commitment. The animal needs daily care, exercise, veterinary attention and a stable routine, and the handler is responsible for its behaviour. For the right person the benefits can be significant, but it is a long-term partnership rather than a piece of equipment.\n\nAn assessment by a suitably qualified professional and a conversation with a training organisation can help you decide. It is also worth talking to people who already work with assistance animals, and thinking about your home, family and lifestyle.",
        'choose' => [
            'Look for organisations that explain their training standards and how they match animals to people.',
            'Ask about waiting times and how they will keep in touch while you wait.',
            'Check what support you receive after placement.',
            'Ask how public access and identification are handled.',
            'Find out how the organisation supports you when the animal retires.',
        ],
        'start' => [
            'Think about the tasks you would like an animal to help with.',
            'Discuss it with your health professionals.',
            'Contact organisations and ask about their process.',
            'Consider how an animal would fit with your home, family and daily routine.',
        ],
        'faq' => [
            ['Do I need a diagnosis to get an assistance animal?', 'Organisations have their own criteria. Ask each one what they require and what evidence they need.'],
            ['Can I take an assistance animal everywhere?', 'Access rights are protected in many situations, but rules and exceptions exist. Ask the training organisation and check the rules that apply where you live and travel.'],
            ['Can assistance animals be any breed?', 'Different tasks suit different animals. Organisations choose animals for temperament and ability, and can explain why they select particular breeds.'],
        ],
    ],
    'Assistive technology assessment and training' => [
        'cat' => 'Assistive technology & equipment',
        'short' => 'An assistive technology assessment works out which equipment or technology suits you, and training helps you set it up and use it well. It is usually done by a qualified professional such as an occupational therapist.',
        'overview' => "Choosing assistive technology by guessing can waste time and money. An assessment starts with you: what you want to do, where you do it and what gets in the way. The assessor then looks at options, often arranges trials and recommends what fits your body, your home and your routines.\n\nTraining is a separate but equally important step. Even excellent equipment can be frustrating if it is not set up properly or if you have not had time to learn it. Training covers how to use the equipment safely, how to adjust it and what to do when something goes wrong, and can include family, carers and support workers.\n\nFor more complex or higher-cost equipment, a written assessment is often needed to show that the item suits you. It is worth asking early what a report should include, so that the assessment gives you what you need.",
        'choose' => [
            'Look for an assessor with experience in the type of equipment you are considering.',
            'Ask whether they can arrange trials from more than one supplier.',
            'Check that the assessment will consider your home, work or school environment.',
            'Ask what the written report will cover and how long it usually takes.',
            'Find out whether training for you and the people who support you is included.',
        ],
        'start' => [
            'Write down what you want to be able to do.',
            'Contact an assessor and describe your situation.',
            'Attend the assessment and try the options recommended.',
            'Arrange training once equipment is chosen and set up.',
        ],
        'faq' => [
            ['Who can do an assistive technology assessment?', 'Occupational therapists, physiotherapists, speech pathologists and specialist advisors can all assess, depending on the type of equipment. Ask about their experience with your needs.'],
            ['Can the assessment happen at my home?', 'Often yes. Seeing the equipment in the place you will use it gives a much better picture of what will work.'],
            ['What happens if a trial shows the equipment does not suit me?', 'That is a useful outcome, because it prevents a poor purchase. Your assessor can suggest alternatives and arrange another trial.'],
        ],
    ],
    'Behaviour support implementation' => [
        'cat' => 'Behaviour support',
        'short' => 'Behaviour support implementation means putting a behaviour support plan into practice day to day. Support workers use the strategies in the plan consistently so the person feels safe and can build skills.',
        'overview' => "A behaviour support plan is written by a practitioner, but it only helps if the people around the person follow it. Implementation is about doing that consistently, across different settings and different staff. Strategies might include ways of communicating, changes to the environment, teaching new skills and responding calmly when the person is distressed.\n\nSupport workers who implement a plan need to understand it, not just be given a copy. Good providers train their staff in the plan, check that they are following it and meet regularly with the practitioner to talk about what is working and what needs to change.\n\nThe focus of positive behaviour support is on meeting the person's needs and improving their quality of life. Where any restrictive practices are involved, specific rules and oversight apply. Ask providers how they manage this and how they keep everyone informed.",
        'choose' => [
            'Ask how staff are trained in the plan and how their understanding is checked.',
            'Find out how the provider communicates with the behaviour support practitioner.',
            'Ask how they record and report incidents and what happens afterwards.',
            'Check how consistent staffing is kept, since familiar people make a difference.',
            'Ask how the person and their family will be involved in reviewing the plan.',
        ],
        'start' => [
            'Make sure there is a current behaviour support plan.',
            'Share the plan with the provider and ask how they will implement it.',
            'Agree how progress and concerns will be communicated.',
            'Schedule regular reviews with the practitioner and the person\'s supporters.',
        ],
        'faq' => [
            ['What if the plan is not working?', 'Tell the practitioner and the provider. Plans are meant to change as the person\'s needs and circumstances change.'],
            ['Can family help put the plan into practice?', 'Yes. Family members often know the person best, and consistency between home and other settings usually helps.'],
            ['Who oversees behaviour support?', 'Behaviour support practitioners and providers are subject to rules set by the NDIS Commission. Ask the provider how they meet these requirements.'],
        ],
    ],
    'Communication and information equipment' => [
        'cat' => 'Assistive technology & equipment',
        'short' => 'This covers equipment and technology that helps someone communicate or access information, such as communication devices, adapted computers and phones, and software that makes information easier to use.',
        'overview' => "Communication and information equipment is very wide. It includes speech-generating devices and communication apps, eye-gaze systems, adapted keyboards and switches, screen readers, captioning tools and alerting devices. What is right depends on how the person communicates now, what they want to be able to do and what their hands, eyes, hearing and movement allow.\n\nA speech pathologist or occupational therapist usually leads the assessment. They look at the person's abilities and goals, arrange trials and recommend options. Trying a system in everyday life is important, because a device that works well in a clinic may not suit a busy home or classroom.\n\nSetting up is only the start. People need time to learn a system, and the people around them need to learn how to support it. Ongoing training, programming and updates are part of getting real value from the equipment.",
        'choose' => [
            'Choose an assessor with experience in communication and technology.',
            'Ask for trials in real situations, not just in the clinic.',
            'Check who will help with programming and updates after purchase.',
            'Ask what training is available for you, family and support workers.',
            'Find out what happens if the equipment breaks or stops suiting you.',
        ],
        'start' => [
            'Write down when and where you want to communicate or access information.',
            'Book an assessment with a suitably experienced professional.',
            'Trial the options recommended.',
            'Arrange training and a plan for ongoing support.',
        ],
        'faq' => [
            ['What if I cannot use my hands?', 'There are options that use eye movement, head movement, switches and other methods. An assessor can help you find one that suits how you move.'],
            ['Is a communication app enough?', 'For some people yes, and for others a dedicated device suits better. An assessment helps you decide based on your needs.'],
            ['Who teaches me to use the device?', 'Often the speech pathologist or an assistive technology specialist. Ask about training before you buy.'],
        ],
    ],
    'Community nursing care' => [
        'cat' => 'Nursing',
        'short' => 'Community nursing is clinical care delivered at home or in the community by a nurse. It can include wound care, medication management and support for complex health needs.',
        'overview' => "Community nurses bring clinical care to the place where a person lives, so they do not have to travel to a clinic or hospital. The work varies. It can be caring for wounds, managing medication, monitoring a health condition, supporting people with catheters or feeding tubes, or teaching a person and their family how to manage a health need.\n\nNurses in Australia are registered with the Nursing and Midwifery Board and the Australian Health Practitioner Regulation Agency. Registered nurses and enrolled nurses have different scopes of practice, so it helps to ask who will visit and what they are qualified to do.\n\nNursing care usually works alongside your doctor and other health professionals. A good provider communicates with your GP, records what happens on each visit and has a clear process for what to do if your health changes or in an emergency.",
        'choose' => [
            'Ask whether the nurses who visit are registered nurses or enrolled nurses.',
            'Find out how the provider communicates with your doctor.',
            'Ask what happens out of hours or in an emergency.',
            'Check how visits are scheduled and what happens if your regular nurse is away.',
            'Ask how they keep records and share information with you.',
        ],
        'start' => [
            'Talk to your doctor about the nursing care you need.',
            'Contact providers and describe your needs and location.',
            'Ask for a written care plan and a service agreement.',
            'Agree how often the plan will be reviewed.',
        ],
        'faq' => [
            ['Can a nurse give injections or manage medication at home?', 'It depends on the nurse\'s qualifications and your care plan. Ask the provider what they can do and what is arranged with your doctor.'],
            ['How do I know a nurse is registered?', 'Nurses are listed on a public register kept by the Australian Health Practitioner Regulation Agency, which you can search.'],
            ['Is community nursing the same as a support worker?', 'No. Nurses provide clinical care, while support workers help with everyday activities. Some people need both.'],
        ],
        'src' => ['ahpra'],
    ],
    'Complex home modifications' => [
        'cat' => 'Home modifications',
        'short' => 'Complex home modifications are larger changes that make a home work for a person\'s disability, such as structural work, rebuilding a bathroom or installing a lift. They usually involve an assessment, plans and quotes.',
        'overview' => "When a home does not suit a person's needs, small fixes are not always enough. Complex modifications deal with the structure of the home: widening doorways, removing steps, rebuilding a bathroom so it is accessible, or installing a lift or ceiling hoist track. These jobs are usually planned in stages and involve several people.\n\nAn occupational therapist commonly starts the process by assessing how you move and what you need. A builder or specialist modifier then prepares plans and quotes, and depending on the work there may be approvals from a certifier or council. If you rent, the owner needs to agree to changes, and it is best to raise this at the start.\n\nBecause the work can be disruptive and expensive, it pays to plan carefully. Ask about the timeline, where you will stay if the home is unusable during construction, what happens if something goes over budget and who is responsible for the finished work.",
        'choose' => [
            'Choose an occupational therapist who has experience with home modification projects.',
            'Ask builders whether they have done similar work and can provide references.',
            'Check licences, insurance and any accreditation required for the work.',
            'Get more than one quote and check that each one covers the same scope.',
            'Ask how the project will be managed and who to contact if problems come up.',
        ],
        'start' => [
            'Have an occupational therapist assess your needs and your home.',
            'Get plans and quotes from qualified builders or modifiers.',
            'Confirm approvals and, if you rent, agreement from the owner.',
            'Agree a timeline and payment schedule in writing before work begins.',
        ],
        'faq' => [
            ['Can I stay in my home during the work?', 'Sometimes, depending on the job. Ask the builder about the impact and plan for alternatives if parts of the home will be unusable.'],
            ['What if the quote goes up during the project?', 'Ask before starting how variations are handled and agreed. A clear written contract helps avoid disputes.'],
            ['Do I need permission to modify a rented home?', 'You generally need the owner\'s agreement. Raise it early because it can affect what is possible and how long it takes.'],
        ],
    ],
    'Continence products' => [
        'cat' => 'Nursing',
        'short' => 'Continence products help manage bladder and bowel control, and include pads, catheters and related supplies. The right products depend on the person, so professional advice matters.',
        'overview' => "Continence needs are personal, and what works for one person may not work for another. Products range from absorbent pads and pull-ups to catheters, drainage bags and skin care items. Choosing well involves fit, absorbency, comfort, skin health and how easy the product is to use.\n\nA continence nurse or another health professional can assess your needs and recommend products, and can also look for causes and treatments, not just products. Getting advice early can improve comfort and protect skin, and it can reduce waste from buying products that do not suit.\n\nMany suppliers deliver on a regular schedule, which saves trips and helps you avoid running out. It is worth checking how easy it is to change products or quantities if your needs change, and how to reach someone if something is not working.",
        'choose' => [
            'Ask whether the supplier can recommend products or works with a continence nurse.',
            'Check how deliveries work and whether you can change quantities.',
            'Ask about samples so you can try products before committing.',
            'Find out how discreet the packaging and delivery are.',
            'Ask how to contact them if a product is not suitable.',
        ],
        'start' => [
            'Speak to your doctor or a continence nurse about your needs.',
            'Try samples of recommended products.',
            'Choose a supplier and agree a delivery schedule.',
            'Review your products regularly and tell your health professional about changes.',
        ],
        'faq' => [
            ['Where can I get advice about continence?', 'Your doctor can refer you to a continence nurse or specialist. There are also national helplines and services that give information.'],
            ['Can continence problems be treated?', 'Often. Many causes can be improved or managed, so it is worth speaking to a health professional rather than relying only on products.'],
            ['What if a product causes skin irritation?', 'Stop using it and speak to your nurse or doctor. Skin problems can develop quickly and are worth addressing early.'],
        ],
    ],
];
