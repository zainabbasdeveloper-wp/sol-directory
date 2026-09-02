// Extracted verbatim from SolDirectory Home (standalone).html.

export interface MegaCategory {
  key: string;
  title: string;
  desc: string;
}

export const MEGA_CATS: MegaCategory[] = [
  { key: 'service', title: 'Service', desc: 'NDIS, aged care, allied health, and more' },
  { key: 'condition', title: 'Condition', desc: 'Find support by diagnosis or need' },
  { key: 'funding', title: 'Funding', desc: 'NDIS plans, HCP, CHSP, DVA, and private' },
  { key: 'coordinator', title: 'Support coordinator referrals', desc: 'Referral pathways for support coordinators' },
  { key: 'language', title: 'Language', desc: 'Support in a language spoken at home' },
];

export interface MegaGroup {
  title: string;
  links: string[];
}

export type MegaColumn = MegaGroup[];

export const MEGA: Record<string, MegaColumn[]> = {
  service: [
    [
      { title: 'NDIS', links: ['Assistance Dogs', 'AT Assessment', 'Behaviour Support', 'Disability Employment', 'Disability Services', 'Early Childhood Intervention', 'Foundational Supports', 'Life Skills Development', 'Plan Management', 'Support Coordination', 'Supported Independent Living', 'Specialist Disability Accommodation'] },
      { title: 'Cognitive Decline', links: ['Dementia Support', 'Memory Clinics', 'Younger Onset Dementia', 'Carer Respite'] },
    ],
    [
      { title: 'Aged Care', links: ['Home Care Packages', 'Commonwealth Home Support', 'Residential Aged Care', 'Respite Care', 'Transition Care', 'Carer Gateway Support'] },
      { title: 'Community & Social', links: ['Community Access', 'Group Activities', 'Social Outings', 'Camps & Holidays', 'Sport & Recreation', 'Transport', 'Mentoring'] },
    ],
    [
      { title: 'Allied Health', links: ['Occupational Therapy', 'Physiotherapy', 'Speech Pathology', 'Psychology', 'Dietetics', 'Exercise Physiology', 'Podiatry', 'Continence Nursing', 'Music Therapy', 'Art Therapy', 'Rehabilitation Counselling'] },
    ],
    [
      { title: 'Home Support', links: ['Personal Care', 'Domestic Assistance', 'Meal Preparation', 'Gardening & Yard Care', 'Home Modifications', 'Home Maintenance', 'Shopping Assistance'] },
      { title: 'Clinical Care', links: ['Community Nursing', 'High Intensity Supports', 'Wound Care', 'PEG Feeding', 'Catheter Care', 'Palliative Support', 'Medication Management'] },
    ],
  ],
  condition: [
    [
      { title: 'Developmental', links: ['Autism', 'ADHD', 'Intellectual Disability', 'Global Developmental Delay', 'Down Syndrome', 'Fragile X Syndrome', 'Cerebral Palsy', 'Speech & Language Delay'] },
    ],
    [
      { title: 'Mobility & Physical', links: ['Spinal Cord Injury', 'Amputation & Limb Loss', 'Muscular Dystrophy', 'Multiple Sclerosis', 'Arthritis', 'Spina Bifida', 'Chronic Pain'] },
      { title: 'Hearing, Vision & Sensory', links: ['Deafness & Hearing Loss', 'Blindness & Low Vision', 'Deafblindness', 'Auslan Support', 'Sensory Processing'] },
    ],
    [
      { title: 'Psychosocial & Mental Health', links: ['Schizophrenia', 'Bipolar Disorder', 'PTSD', 'Anxiety Disorders', 'Depression', 'Eating Disorders', 'Borderline Personality Disorder', 'Dual Diagnosis'] },
    ],
    [
      { title: 'Chronic & Complex Medical', links: ['Epilepsy', 'Diabetes', 'Cystic Fibrosis', 'Renal Failure', 'Cancer Care', 'Motor Neurone Disease', "Parkinson's Disease"] },
      { title: 'ABI, Stroke & Neuro Rehab', links: ['Acquired Brain Injury', 'Stroke Recovery', 'Traumatic Brain Injury', "Huntington's Disease", 'Neuro Physiotherapy'] },
    ],
  ],
  funding: [
    [
      { title: 'NDIS Plans', links: ['Agency Managed', 'Plan Managed', 'Self Managed', 'Plan Reviews', 'Change of Circumstances', 'First Plan Support'] },
      { title: 'Aged Care', links: ['Home Care Packages', 'Commonwealth Home Support', 'Support at Home', 'Residential Fees'] },
    ],
    [{ title: 'Veterans', links: ['DVA Community Nursing', 'DVA Home Care', "Veterans' Home Care", 'Rehabilitation Appliances', 'Open Arms Referrals'] }],
    [{ title: 'Other Funding', links: ['Private Fee for Service', 'iCare & Workers Compensation', 'Private Health Insurance', 'Medicare Care Plans', 'State Funded Programs'] }],
    [{ title: 'Help With Funding', links: ['Plan Managers', 'Bookkeeping & Invoicing', 'Price Guide Explained', 'Funding Eligibility', 'Budget Categories'] }],
  ],
  coordinator: [
    [{ title: 'Make a Referral', links: ['Single Provider Referral', 'Bulk Referrals', 'Urgent Placement Requests', 'Referral Templates', 'Referral Tracking'] }],
    [{ title: 'Capacity & Availability', links: ['Live Vacancy Board', 'Confirmed Capacity Feed', 'Waitlist Status', 'Response Time Data', 'Service Area Coverage'] }],
    [{ title: 'Tools for Coordinators', links: ['Saved Provider Lists', 'Shortlist Sharing', 'Comparison Sheets', 'Bulk Export', 'Participant Notes'] }],
    [
      { title: 'Compliance', links: ['Registration Checks', 'Worker Screening', 'Insurance Certificates', 'Incident History'] },
      { title: 'Working With Us', links: ['Coordinator Accounts', 'Team Access', 'Training & Webinars', 'Contact the Directory Team'] },
    ],
  ],
  language: [
    [{ title: 'Most Requested', links: ['Arabic', 'Mandarin', 'Cantonese', 'Vietnamese', 'Greek', 'Italian', 'Hindi', 'Punjabi'] }],
    [
      { title: 'Middle East & Africa', links: ['Assyrian', 'Persian (Farsi)', 'Dari', 'Turkish', 'Somali', 'Swahili', 'Amharic'] },
      { title: 'First Nations', links: ['Aboriginal & Torres Strait Islander Services', 'Kriol', 'Yolngu Matha', 'Pitjantjatjara'] },
    ],
    [{ title: 'Europe', links: ['Spanish', 'Portuguese', 'Polish', 'Croatian', 'Serbian', 'Russian', 'Macedonian', 'German'] }],
    [
      { title: 'Asia Pacific', links: ['Tagalog', 'Indonesian', 'Korean', 'Japanese', 'Nepali', 'Tamil', 'Thai', 'Khmer'] },
      { title: 'Access & Interpreting', links: ['Auslan', 'Deafblind Interpreters', 'TIS National Bookings', 'Easy Read Materials', 'Translated Documents'] },
    ],
  ],
};

// Links that map onto an existing directory filter keep the current
// routing behaviour — clicking them pre-selects that service filter.
export const MEGA_FILTERS: Record<string, string> = {
  'Support Coordination': 'Support coordination',
  'Personal Care': 'Personal care',
  'Domestic Assistance': 'Domestic assistance',
  Transport: 'Transport',
  'Plan Management': 'Plan management',
  'Community Nursing': 'Nursing',
  'High Intensity Supports': 'Nursing',
  'Occupational Therapy': 'Therapy services',
  Physiotherapy: 'Therapy services',
  'Speech Pathology': 'Therapy services',
  'Supported Independent Living': 'Housing (SDA & SIL)',
  'Specialist Disability Accommodation': 'Housing (SDA & SIL)',
};
