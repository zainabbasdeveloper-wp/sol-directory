// Extracted verbatim from SolDirectory Workers.dc.html

export const SERVICES = ['Personal care', 'Domestic assistance', 'Community access', 'Transport', 'Nursing', 'Therapy assistant', 'Meal preparation', 'Overnight support', 'Behaviour support', 'Social support'];

export const SUBURBS = ['Bankstown', 'Parramatta', 'Liverpool', 'Blacktown', 'Auburn', 'Lidcombe', 'Canterbury', 'Marrickville'];

export const LANGUAGES = ['Arabic', 'Vietnamese', 'Mandarin', 'Cantonese', 'Greek', 'Auslan', 'Hindi', 'Spanish'];

export const CONDITIONS = ['Autism', 'Dementia', 'Cerebral palsy', 'Spinal cord injury', 'Psychosocial', 'Diabetes', 'Acquired brain injury', 'Motor neurone disease'];

export const CHECKS = ['NDIS Worker Check', 'Police check', 'First aid & CPR', 'Working with children', 'Medication training', 'Manual handling'];

export const AVAIL = ['Weekdays', 'Weekends', 'Evenings', 'Overnight', 'Short notice'];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SORTS = ['Best match', 'Highest rated', 'Lowest rate', 'Closest first'];

export const WORKERS = [
  { id: 1, first: 'Amira', last: 'H', role: 'Support worker', employer: 'Independent', years: '6 years experience', suburb: 'Bankstown', km: 10, gender: 'Female', rate: 62, rating: 4.9, reviews: 41, car: true,
    services: ['Personal care', 'Community access', 'Meal preparation', 'Social support'], languages: ['English', 'Arabic'], conditions: ['Autism', 'Diabetes'],
    checks: ['NDIS Worker Check', 'Police check', 'First aid & CPR', 'Medication training'], avail: ['Weekdays', 'Evenings', 'Short notice'], days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times: 'Mornings, evenings',
    bio: 'Six years supporting participants across the Canterbury-Bankstown area, mostly personal care and community access for young adults. Arabic-speaking, and used to working alongside a family in the home.',
    feedback: [{ text: 'Amira has been with my son for two years. She turns up, she is early, and she keeps notes we can actually read.', by: 'Family, Bankstown' }, { text: 'Reliable for short-notice cover and comfortable with a complex behaviour plan.', by: 'Support coordinator, Sydney south west' }] },
  { id: 2, first: 'Daniel', last: 'O', role: 'Enrolled nurse', employer: 'Northline Allied Health', years: '9 years experience', suburb: 'Lidcombe', km: 20, gender: 'Male', rate: 88, rating: 4.8, reviews: 27, car: true,
    services: ['Nursing', 'Personal care', 'Overnight support'], languages: ['English'], conditions: ['Spinal cord injury', 'Motor neurone disease'], 
    checks: ['NDIS Worker Check', 'Police check', 'First aid & CPR', 'Medication training', 'Manual handling'], avail: ['Weekdays', 'Weekends', 'Overnight'], days: ['Mon', 'Wed', 'Thu', 'Sat', 'Sun'], times: 'Day shifts, overnight',
    bio: 'Enrolled nurse working across western Sydney with high-intensity supports: PEG feeding, catheter care and complex wound management. Takes overnight rosters for clients on continuous monitoring.',
    feedback: [{ text: 'Handover notes are the best we receive from any worker on our panel.', by: 'Provider, Parramatta' }] },
  { id: 3, first: 'Thuy', last: 'N', role: 'Support worker', employer: 'Independent', years: '4 years experience', suburb: 'Bankstown', km: 15, gender: 'Female', rate: 55, rating: 4.7, reviews: 33, car: false,
    services: ['Domestic assistance', 'Meal preparation', 'Social support', 'Transport'], languages: ['English', 'Vietnamese'], conditions: ['Dementia', 'Autism'],
    checks: ['NDIS Worker Check', 'Police check', 'First aid & CPR'], avail: ['Weekdays', 'Weekends'], days: ['Tue', 'Wed', 'Thu', 'Sat'], times: 'Mornings, afternoons',
    bio: 'Vietnamese-speaking worker covering Bankstown and Canterbury. Domestic assistance and meal preparation for older participants, with an interest in dementia support.',
    feedback: [{ text: 'Speaks with my mother in her own language, which changed how she took to having help at home.', by: 'Family, Canterbury' }] },
  { id: 4, first: 'Marcus', last: 'B', role: 'Therapy assistant', employer: 'Derwent Therapy Collective', years: '5 years experience', suburb: 'Parramatta', km: 25, gender: 'Male', rate: 74, rating: 4.6, reviews: 18, car: true,
    services: ['Therapy assistant', 'Community access', 'Behaviour support'], languages: ['English', 'Spanish'], conditions: ['Autism', 'Acquired brain injury'],
    checks: ['NDIS Worker Check', 'Police check', 'Working with children', 'First aid & CPR'], avail: ['Weekdays', 'Evenings'], days: ['Mon', 'Tue', 'Wed', 'Thu'], times: 'Afternoons, evenings',
    bio: 'Delivers therapy programs set by occupational therapists and behaviour practitioners, mostly with school-age participants and young adults after a brain injury.',
    feedback: [{ text: 'Follows the plan exactly and reports back weekly. Easy to work with as the treating OT.', by: 'Occupational therapist, Parramatta' }] },
  { id: 5, first: 'Grace', last: 'M', role: 'Registered nurse', employer: 'Tanami Community Nursing', years: '12 years experience', suburb: 'Liverpool', km: 30, gender: 'Female', rate: 99, rating: 5.0, reviews: 22, car: true,
    services: ['Nursing', 'Overnight support', 'Personal care'], languages: ['English', 'Hindi'], conditions: ['Motor neurone disease', 'Diabetes', 'Spinal cord injury'],
    checks: ['NDIS Worker Check', 'Police check', 'First aid & CPR', 'Medication training', 'Manual handling'], avail: ['Weekdays', 'Weekends', 'Overnight', 'Short notice'], days: ['Mon', 'Tue', 'Fri', 'Sat', 'Sun'], times: 'Day shifts, overnight, on call',
    bio: 'Registered nurse with twelve years in community nursing across south west Sydney. Clinical assessments, care-plan authoring and supervision of enrolled nurses and support workers.',
    feedback: [{ text: 'Wrote the care plan our whole roster now runs on. Clear and unflappable.', by: 'Provider, Liverpool' }, { text: 'Took an urgent overnight placement with four hours notice.', by: 'Support coordinator, Fairfield' }] },
  { id: 6, first: 'Elias', last: 'K', role: 'Support worker', employer: 'Independent', years: '3 years experience', suburb: 'Auburn', km: 15, gender: 'Male', rate: 52, rating: 4.4, reviews: 12, car: true,
    services: ['Community access', 'Transport', 'Social support'], languages: ['English', 'Arabic', 'Greek'], conditions: ['Psychosocial', 'Autism'],
    checks: ['NDIS Worker Check', 'Police check'], avail: ['Weekends', 'Evenings', 'Short notice'], days: ['Fri', 'Sat', 'Sun'], times: 'Evenings, weekends',
    bio: 'Weekend and evening community access work: gym, appointments, sport and getting to social groups. Comfortable supporting participants with psychosocial disability.',
    feedback: [{ text: 'Good with a participant who does not take easily to new workers.', by: 'Support coordinator, Auburn' }] },
  { id: 7, first: 'Priya', last: 'S', role: 'Support worker', employer: 'Wattle Grove Support', years: '7 years experience', suburb: 'Blacktown', km: 25, gender: 'Female', rate: 66, rating: 4.8, reviews: 52, car: true,
    services: ['Personal care', 'Overnight support', 'Domestic assistance', 'Meal preparation'], languages: ['English', 'Hindi'], conditions: ['Dementia', 'Cerebral palsy'],
    checks: ['NDIS Worker Check', 'Police check', 'First aid & CPR', 'Manual handling', 'Medication training'], avail: ['Weekdays', 'Weekends', 'Overnight'], days: ['Mon', 'Tue', 'Wed', 'Sat', 'Sun'], times: 'Mornings, overnight',
    bio: 'Seven years of personal care and overnight support in western Sydney, including hoist transfers and continence care. Works to a set routine and documents every shift.',
    feedback: [{ text: 'Our most-requested worker for overnight shifts. Families ask for her by name.', by: 'Provider, Blacktown' }] },
  { id: 8, first: 'Jia', last: 'L', role: 'Support worker', employer: 'Independent', years: '2 years experience', suburb: 'Canterbury', km: 10, gender: 'Female', rate: 48, rating: 4.3, reviews: 9, car: false,
    services: ['Domestic assistance', 'Meal preparation', 'Social support'], languages: ['English', 'Mandarin', 'Cantonese'], conditions: ['Dementia', 'Diabetes'],
    checks: ['NDIS Worker Check', 'Police check', 'First aid & CPR'], avail: ['Weekdays'], days: ['Mon', 'Tue', 'Thu', 'Fri'], times: 'Mornings',
    bio: 'Mandarin and Cantonese speaking worker covering Canterbury and Bankstown on public transport. Cleaning, cooking and company for older participants living alone.',
    feedback: [{ text: 'Patient, and cooks food my father actually eats.', by: 'Family, Campsie' }] },
  { id: 9, first: 'Tomas', last: 'R', role: 'Support worker', employer: 'Independent', years: '8 years experience', suburb: 'Marrickville', km: 20, gender: 'Non-binary', rate: 70, rating: 4.9, reviews: 36, car: true,
    services: ['Behaviour support', 'Community access', 'Personal care'], languages: ['English', 'Auslan'], conditions: ['Autism', 'Psychosocial', 'Acquired brain injury'],
    checks: ['NDIS Worker Check', 'Police check', 'Working with children', 'First aid & CPR', 'Manual handling'], avail: ['Weekdays', 'Evenings', 'Short notice'], days: ['Mon', 'Wed', 'Thu', 'Fri'], times: 'Afternoons, evenings',
    bio: 'Works with participants who have a behaviour support plan, often after other placements have broken down. Auslan user, and takes referrals from coordinators across the inner west.',
    feedback: [{ text: 'Held a placement steady that had failed twice before. Detailed incident reporting.', by: 'Support coordinator, inner west' }] },
  { id: 10, first: 'Fatima', last: 'A', role: 'Enrolled nurse', employer: 'Independent', years: '5 years experience', suburb: 'Bankstown', km: 15, gender: 'Female', rate: 84, rating: 4.7, reviews: 20, car: true,
    services: ['Nursing', 'Personal care', 'Meal preparation'], languages: ['English', 'Arabic'], conditions: ['Diabetes', 'Dementia'],
    checks: ['NDIS Worker Check', 'Police check', 'First aid & CPR', 'Medication training'], avail: ['Weekdays', 'Weekends'], days: ['Tue', 'Wed', 'Fri', 'Sat'], times: 'Mornings, afternoons',
    bio: 'Enrolled nurse in Bankstown doing medication management, wound care and diabetes support, often for aged care clients on a Home Care Package.',
    feedback: [{ text: 'Explains the clinical side to the family in Arabic, which saved us an interpreter every visit.', by: 'Family, Bankstown' }] },
  { id: 11, first: 'Owen', last: 'T', role: 'Support worker', employer: 'Freemantle Access Transport', years: '4 years experience', suburb: 'Liverpool', km: 35, gender: 'Male', rate: 58, rating: 4.5, reviews: 15, car: true,
    services: ['Transport', 'Community access', 'Social support'], languages: ['English'], conditions: ['Cerebral palsy', 'Spinal cord injury'],
    checks: ['NDIS Worker Check', 'Police check', 'First aid & CPR', 'Manual handling'], avail: ['Weekdays', 'Weekends'], days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'], times: 'Mornings, afternoons',
    bio: 'Wheelchair-accessible vehicle, mostly appointment and work transport across south west Sydney with tie-down experience for powered chairs.',
    feedback: [{ text: 'On time for hospital appointments every week for a year.', by: 'Participant, Liverpool' }] },
  { id: 12, first: 'Hana', last: 'W', role: 'Therapy assistant', employer: 'Independent', years: '3 years experience', suburb: 'Parramatta', km: 20, gender: 'Female', rate: 68, rating: 4.6, reviews: 14, car: false,
    services: ['Therapy assistant', 'Community access', 'Social support'], languages: ['English', 'Mandarin'], conditions: ['Autism', 'Cerebral palsy'],
    checks: ['NDIS Worker Check', 'Police check', 'Working with children', 'First aid & CPR'], avail: ['Weekdays', 'Evenings'], days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times: 'Afternoons',
    bio: 'Runs speech and occupational therapy home programs for primary school children, working to the practitioner\u2019s plan and reporting fortnightly.',
    feedback: [{ text: 'Consistent with the home program, which is the hard part.', by: 'Speech pathologist, Parramatta' }] }
];
