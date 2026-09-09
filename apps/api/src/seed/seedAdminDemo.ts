import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Worker from '../models/Worker.js';
import Lead from '../models/Lead.js';
import Shortlist from '../models/Shortlist.js';
import ProviderView from '../models/ProviderView.js';
import AdminActivity, { logActivity } from '../models/AdminActivity.js';

// A dedicated, clearly-separate seed script for populating realistic
// development/demo data across every model this admin dashboard
// reads from. Distinct from the original seed.ts (public directory
// example data) — this one is specifically about giving the ADMIN
// DASHBOARD real numbers to aggregate, spread across every status
// value each model supports so charts and breakdowns actually look
// like a real, varied platform rather than a handful of identical
// records.
//
// Run with: npm run db:seed:admin (from apps/api)
// This is additive — it does NOT clear existing users, so re-running
// it will keep adding more. For a clean slate, drop the database or
// clear collections manually first.

const STATES: Record<string, string[]> = {
  NSW: ['Sydney', 'Newcastle', 'Wollongong', 'Parramatta', 'Bankstown'],
  VIC: ['Melbourne', 'Geelong', 'Ballarat', 'Dandenong'],
  QLD: ['Brisbane', 'Gold Coast', 'Townsville', 'Cairns'],
  WA: ['Perth', 'Fremantle', 'Rockingham'],
  SA: ['Adelaide', 'Mount Gambier'],
  TAS: ['Hobart', 'Launceston'],
  ACT: ['Canberra'],
  NT: ['Darwin', 'Alice Springs'],
};
const ALL_SUBURBS = Object.values(STATES).flat();

const SUPPORT_TYPES = ['Personal care', 'Domestic assistance', 'Community access', 'Transport', 'Nursing', 'Therapy assistant', 'Behaviour support', 'Meal preparation'];
const LANGUAGES = ['English', 'Arabic', 'Vietnamese', 'Mandarin', 'Cantonese', 'Greek', 'Hindi', 'Spanish'];
const CONDITIONS = ['Autism', 'Dementia', 'Cerebral palsy', 'Spinal cord injury', 'Psychosocial', 'Diabetes'];
const ONBOARDING_STEP_KEYS = ['org', 'insurance', 'areas', 'team', 'policy', 'billing'];
const FIRST_NAMES = ['Grace', 'Liam', 'Amira', 'Noah', 'Priya', 'Jack', 'Mei', 'Oliver', 'Fatima', 'Ethan', 'Sophie', 'Lucas', 'Ava', 'Mohammed', 'Chloe', 'Daniel', 'Zara', 'James', 'Isabella', 'Ryan'];
const LAST_NAMES = ['Williams', 'Nguyen', 'Smith', 'Patel', 'Brown', 'Taylor', 'Ahmed', 'Chen', 'Wilson', 'Kelly', 'Singh', 'Anderson', 'Martin', 'Thompson', 'White'];
const COMPANY_WORDS = ['Northline', 'Bellbird', 'Wattle Grove', 'Harbourview', 'Riverbend', 'Sunstate', 'Freemantle Access', 'Kerridge', 'Tanami', 'Redgum', 'Derwent', 'Capital Care', 'Glow Health', 'Pride Connect', 'Cedar & Co', 'Lidcombe Clinical'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randSubset<T>(arr: T[], count: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, count); }
function randDateWithinDays(days: number): Date { return new Date(Date.now() - randInt(0, days) * 86400000); }
function randState(): string { return rand(Object.keys(STATES)); }
function randSuburbInState(state: string): string { return rand(STATES[state]); }

async function seedAdminDemo() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected. Seeding admin demo data...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const createdUsers: { user: any; role: string }[] = [];

  // --- Admin (1) ---
  const admin = await User.create({ name: 'Sol Admin', email: `admin.demo.${Date.now()}@example.com.au`, mobile: '0400000001', passwordHash, role: 'admin' });
  createdUsers.push({ user: admin, role: 'admin' });

  // --- Providers (18, spread across states, plans, onboarding stages, account status) ---
  console.log('Seeding 18 providers...');
  for (let i = 0; i < 18; i++) {
    const state = randState();
    const suburb = randSuburbInState(state);
    const company = `${rand(COMPANY_WORDS)} ${rand(['Care', 'Services', 'Support', 'Community Care', 'Home Care'])}`;
    const ownerName = `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;
    const createdAt = randDateWithinDays(180);

    const user = await User.create({
      name: ownerName,
      email: `provider${i}.demo.${Date.now()}@example.com.au`,
      mobile: `04${randInt(10000000, 99999999)}`,
      passwordHash,
      role: 'provider',
      createdAt,
    });

    // Onboarding progress spread across all 6 stages plus fully complete
    const stepsToComplete = randInt(0, ONBOARDING_STEP_KEYS.length);
    const onboarding = ONBOARDING_STEP_KEYS.slice(0, stepsToComplete).map((key) => ({ key, complete: true, data: {} }));

    const chosenPlan = rand(['starter', 'starter', 'growth', 'growth', 'pro', 'pro']);
    const planStatus = rand(['active', 'active', 'active', 'trial', 'expired', 'cancelled']);
    const planStartedAt = createdAt;
    const planExpiresAt = planStatus === 'active' || planStatus === 'trial' ? new Date(Date.now() + randInt(-10, 90) * 86400000) : undefined;

    const provider = await Provider.create({
      userId: user._id,
      legalEntityName: `${company} Pty Ltd`,
      tradingName: company,
      abn: String(randInt(10000000000, 99999999999)),
      registrationGroups: randSubset(SUPPORT_TYPES, randInt(1, 4)),
      intakeEmail: user.email,
      serviceSuburbs: randSubset(STATES[state], Math.min(3, STATES[state].length)),
      travelRadiusKm: rand([10, 20, 30, 50]),
      weeklyCapacityHours: rand([20, 40, 60, 80]),
      intakeStatus: rand(['Open to referrals', 'Open to referrals', 'Limited capacity', 'Waitlist only', 'Closed']),
      accountStatus: Math.random() < 0.08 ? 'suspended' : 'active',
      rosterSize: randInt(1, 25),
      afterHoursCover: rand(['On-call roster', 'Answering service', 'No after-hours cover']),
      onboarding,
      plan: chosenPlan,
      planStatus,
      planStartedAt,
      planExpiresAt,
      planHistory: [
        { plan: 'starter', planStatus: 'trial', changedAt: planStartedAt, changedBy: 'system' },
        ...(chosenPlan !== 'starter' || planStatus !== 'trial'
          ? [{ plan: chosenPlan, planStatus, changedAt: new Date(planStartedAt.getTime() + 86400000 * randInt(1, 20)), changedBy: 'admin' as const }]
          : []),
      ],
      createdAt,
    });
    user.providerId = provider._id as any;
    await user.save();
    createdUsers.push({ user, role: 'provider' });

    // Real view events for "most viewed providers"
    const viewCount = randInt(0, 40);
    for (let v = 0; v < viewCount; v++) {
      await ProviderView.create({ providerId: provider._id, createdAt: randDateWithinDays(90) });
    }
  }

  const allProviders = await Provider.find().select('_id').lean();

  // --- Workers (35, spread across verification/account status, support types, suburbs) ---
  console.log('Seeding 35 workers...');
  for (let i = 0; i < 35; i++) {
    const state = randState();
    const suburb = randSuburbInState(state);
    const firstName = rand(FIRST_NAMES);
    const lastName = rand(LAST_NAMES);
    const createdAt = randDateWithinDays(180);

    const user = await User.create({
      name: `${firstName} ${lastName}`,
      email: `worker${i}.demo.${Date.now()}@example.com.au`,
      mobile: `04${randInt(10000000, 99999999)}`,
      passwordHash,
      role: 'worker',
      createdAt,
    });

    const worker = await Worker.create({
      userId: user._id,
      firstName,
      lastName,
      role: rand(['Support worker', 'Registered nurse', 'Enrolled nurse', 'Allied health assistant', 'Support coordinator']),
      employer: rand(['Independent', 'Agency staff']),
      yearsExperience: `${randInt(1, 15)} years`,
      suburb,
      location: { type: 'Point', coordinates: [151 + Math.random(), -33 - Math.random()] },
      gender: rand(['Female', 'Male']),
      hasCar: Math.random() > 0.3,
      hourlyRate: randInt(35, 95),
      rating: Number((3 + Math.random() * 2).toFixed(1)),
      reviewCount: randInt(0, 60),
      services: randSubset(SUPPORT_TYPES, randInt(1, 3)),
      languages: randSubset(LANGUAGES, randInt(1, 2)),
      conditionExperience: randSubset(CONDITIONS, randInt(0, 3)),
      availability: randSubset(['Weekdays', 'Weekends', 'Evenings', 'Overnight'], randInt(1, 3)),
      availableDays: randSubset(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], randInt(2, 6)),
      email: user.email,
      phone: user.mobile,
      verificationStatus: rand(['awaiting_review', 'awaiting_review', 'approved', 'approved', 'approved', 'expiring_soon', 'rejected']),
      published: Math.random() > 0.15,
      accountStatus: Math.random() < 0.05 ? 'suspended' : 'active',
      createdAt,
    });
    user.workerId = worker._id as any;
    await user.save();
    createdUsers.push({ user, role: 'worker' });
  }

  // --- Coordinators (12) ---
  console.log('Seeding 12 support coordinators...');
  const coordinatorUsers: any[] = [];
  for (let i = 0; i < 12; i++) {
    const user = await User.create({
      name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
      email: `coordinator${i}.demo.${Date.now()}@example.com.au`,
      mobile: `04${randInt(10000000, 99999999)}`,
      passwordHash,
      role: 'coordinator',
      accountStatus: Math.random() < 0.05 ? 'suspended' : 'active',
      createdAt: randDateWithinDays(180),
    });
    coordinatorUsers.push(user);
    createdUsers.push({ user, role: 'coordinator' });
  }

  // --- Participants / families (17) ---
  console.log('Seeding 17 participants/families...');
  const participantUsers: any[] = [];
  for (let i = 0; i < 17; i++) {
    const user = await User.create({
      name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
      email: `participant${i}.demo.${Date.now()}@example.com.au`,
      mobile: `04${randInt(10000000, 99999999)}`,
      passwordHash,
      role: 'participant',
      accountStatus: Math.random() < 0.03 ? 'suspended' : 'active',
      createdAt: randDateWithinDays(180),
    });
    participantUsers.push(user);
    createdUsers.push({ user, role: 'participant' });
  }

  // --- Leads (40, spread across statuses) ---
  console.log('Seeding 40 leads...');
  for (let i = 0; i < 40; i++) {
    const state = randState();
    await Lead.create({
      need: rand(['Personal care', 'Domestic assistance', 'Community access', 'Nursing', 'Transport']),
      suburb: randSuburbInState(state),
      distanceKm: randInt(1, 25),
      hoursPerWeek: `${randInt(2, 20)} hrs/week`,
      funding: rand(['Plan-managed', 'Self-managed', 'NDIA-managed']),
      contactName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
      contactPhone: `04${randInt(10000000, 99999999)}`,
      budget: `$${randInt(30, 90)}/hr`,
      note: 'Seeded demo lead.',
      status: rand(['matched', 'matched', 'unlocked', 'unlocked', 'closed']),
      createdAt: randDateWithinDays(120),
    });
  }

  // --- Shortlists (real relationships between real coordinators/participants and real providers) ---
  console.log('Seeding shortlists...');
  const searchers = [...coordinatorUsers, ...participantUsers];
  let shortlistsCreated = 0;
  for (const searcher of searchers) {
    const pickCount = randInt(0, 4);
    const picks = randSubset(allProviders, Math.min(pickCount, allProviders.length));
    for (const p of picks) {
      try {
        await Shortlist.create({ userId: searcher._id, providerId: p._id, createdAt: randDateWithinDays(90) });
        shortlistsCreated++;
      } catch { /* duplicate pair, skip */ }
    }
  }

  // --- Historical activity, so the feed isn't empty on first load ---
  console.log('Seeding activity history...');
  const activityTemplates = [
    () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)} registered as a new provider`,
    () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)} submitted worker verification`,
    () => `${rand(COMPANY_WORDS)} Care completed provider onboarding`,
    () => `A participant created a new support request`,
    () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)} shortlisted a provider`,
  ];
  for (let i = 0; i < 25; i++) {
    await AdminActivity.create({ type: 'seed_demo', summary: rand(activityTemplates)(), createdAt: randDateWithinDays(60) });
  }

  console.log(`\nDone. Created: 1 admin, 18 providers, 35 workers, 12 coordinators, 17 participants, 40 leads, ${shortlistsCreated} shortlists, 25 activity entries.`);
  console.log('All seeded accounts use password: password123');
  process.exit(0);
}

seedAdminDemo().catch((err) => {
  console.error(err);
  process.exit(1);
});
