/**
 * Ensures the 40 conditions/needs shown in the mega menu's "Condition"
 * tab (apps/web's data/conditionContent.ts) exist as real, active rows
 * in the Condition catalogue — the same catalogue Provider onboarding's
 * conditionExperience picker and providersPublic.controller.ts's
 * conditionRows() read from. Without this, a provider could never
 * actually tag one of these 40 conditions (the onboarding picker only
 * offers catalogue entries), so /directory/for/:slug would stay
 * permanently empty even once real providers exist.
 *
 * Idempotent: upserts by exact name, never duplicates, never
 * deactivates an existing entry. Safe to re-run.
 *
 * Usage: npx tsx src/scripts/seedConditionCatalogue.ts
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import Condition from '../models/Condition.js';

const CONDITIONS: { name: string; category: string }[] = [
  // Developmental
  ...['Autism', 'ADHD', 'Intellectual Disability', 'Global Developmental Delay', 'Down Syndrome', 'Fragile X Syndrome', 'Cerebral Palsy', 'Speech & Language Delay']
    .map((name) => ({ name, category: 'Developmental' })),
  // Mobility & Physical
  ...['Spinal Cord Injury', 'Amputation & Limb Loss', 'Muscular Dystrophy', 'Multiple Sclerosis', 'Arthritis', 'Spina Bifida', 'Chronic Pain']
    .map((name) => ({ name, category: 'Mobility & Physical' })),
  // Hearing, Vision & Sensory
  ...['Deafness & Hearing Loss', 'Blindness & Low Vision', 'Deafblindness', 'Auslan Support', 'Sensory Processing']
    .map((name) => ({ name, category: 'Hearing, Vision & Sensory' })),
  // Psychosocial & Mental Health
  ...['Schizophrenia', 'Bipolar Disorder', 'PTSD', 'Anxiety Disorders', 'Depression', 'Eating Disorders', 'Borderline Personality Disorder', 'Dual Diagnosis']
    .map((name) => ({ name, category: 'Psychosocial & Mental Health' })),
  // Chronic & Complex Medical
  ...['Epilepsy', 'Diabetes', 'Cystic Fibrosis', 'Renal Failure', 'Cancer Care', 'Motor Neurone Disease', "Parkinson's Disease"]
    .map((name) => ({ name, category: 'Chronic & Complex Medical' })),
  // ABI, Stroke & Neuro Rehab
  ...['Acquired Brain Injury', 'Stroke Recovery', 'Traumatic Brain Injury', "Huntington's Disease", 'Neuro Physiotherapy']
    .map((name) => ({ name, category: 'ABI, Stroke & Neuro Rehab' })),
];

async function main() {
  await connectDB();

  let created = 0;
  let already = 0;
  for (const c of CONDITIONS) {
    const res = await Condition.updateOne(
      { name: c.name },
      { $setOnInsert: { name: c.name, category: c.category, active: true } },
      { upsert: true }
    );
    if (res.upsertedCount) created++; else already++;
  }

  console.log(`[seed-conditions] ${created} condition(s) created, ${already} already existed. ${CONDITIONS.length} total in the catalogue.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-conditions] Fatal error:', err);
  process.exit(1);
});
