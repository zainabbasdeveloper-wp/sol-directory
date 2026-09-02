import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { ensureDefaultPlans } from '../models/PlanConfig.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import Provider from '../models/Provider.js';
import Lead from '../models/Lead.js';
import AuditEntry from '../models/AuditEntry.js';

// @ts-expect-error — plain JS reference data, no types needed for a seed script
import { WORKERS } from './workers.reference.js';
// @ts-expect-error
import { LEADS, VERIFY_QUEUE } from './fixtures.reference.js';

// Real approximate coordinates for the Sydney suburbs used in the
// design fixtures — needed so Worker.location actually supports a
// meaningful $geoWithin/$centerSphere radius search, not just [0,0]
// placeholders.
const SUBURB_COORDS: Record<string, [number, number]> = {
  // [lng, lat]
  Bankstown: [151.0339, -33.9174],
  Parramatta: [151.0011, -33.8151],
  Liverpool: [150.9235, -33.9202],
  Blacktown: [150.9057, -33.7668],
  Auburn: [151.0327, -33.8497],
  Lidcombe: [151.0447, -33.8677],
  Canterbury: [151.1156, -33.9137],
  Marrickville: [151.1552, -33.9111],
};

function coordsFor(suburb: string): [number, number] {
  return SUBURB_COORDS[suburb] ?? [151.2093, -33.8688]; // fallback: Sydney CBD
}

async function seed() {
  await connectDB();
  await ensureDefaultPlans();

  console.log('Clearing existing demo data...');
  mongoose.connection.collection('auditentries').deleteMany({})

  const demoPasswordHash = await bcrypt.hash('password123', 10);

  console.log(`Seeding ${WORKERS.length} workers with real suburb coordinates...`);
  for (const w of WORKERS as any[]) {
    const user = await User.create({
      name: `${w.first} ${w.last}`,
      email: `${w.first.toLowerCase()}.${w.last.toLowerCase()}@example.com.au`,
      mobile: '0400000000',
      passwordHash: demoPasswordHash,
      role: 'worker',
    });

    const worker = await Worker.create({
      userId: user._id,
      firstName: w.first,
      lastName: w.last.length === 1 ? `${w.last}urname` : w.last,
      role: w.role,
      employer: w.employer,
      yearsExperience: w.years,
      suburb: w.suburb,
      location: { type: 'Point', coordinates: coordsFor(w.suburb) },
      gender: w.gender,
      hasCar: w.car,
      hourlyRate: w.rate,
      rating: w.rating,
      reviewCount: w.reviews,
      services: w.services,
      languages: w.languages,
      conditionExperience: w.conditions,
      clearances: (w.checks || []).map((name: string) => ({ name, status: 'verified' })),
      availability: w.avail,
      availableDays: w.days,
      availabilityNote: w.times,
      bio: w.bio,
      feedback: w.feedback,
      email: user.email,
      phone: '0400 000 000',
      verificationStatus: 'approved',
      published: true,
    });

    user.workerId = worker._id as any;
    await user.save();
  }

  console.log(`Seeding ${LEADS.length} leads...`);
  for (const l of LEADS as any[]) {
    await Lead.create({
      need: l.need,
      suburb: l.where.split(',')[0],
      distanceKm: Number(l.where.match(/\d+/)?.[0] ?? 0),
      hoursPerWeek: l.hours,
      funding: l.funding,
      contactName: l.name,
      contactPhone: l.phone,
      budget: l.budget,
      note: l.note,
    });
  }

  console.log(`Seeding ${VERIFY_QUEUE.length} workers awaiting verification...`);
  for (const v of VERIFY_QUEUE as any[]) {
    const user = await User.create({
      name: v.name,
      email: `${v.name.toLowerCase().replace(/\s+/g, '.')}@example.com.au`,
      mobile: '0400000000',
      passwordHash: demoPasswordHash,
      role: 'worker',
    });

    const [first, ...rest] = v.name.split(' ');
    const worker = await Worker.create({
      userId: user._id,
      firstName: first,
      lastName: rest.join(' '),
      role: v.role,
      suburb: v.suburb,
      location: { type: 'Point', coordinates: coordsFor(v.suburb) },
      clearances: v.docs.map((d: any) => ({
        name: d.name,
        issuingBody: d.body,
        referenceNumber: d.number,
        expiry: d.expiry === 'Not supplied' ? null : new Date(d.expiry),
        status: 'unmarked',
      })),
      verificationStatus: 'awaiting_review',
      published: false,
    });

    for (const entry of v.trail) {
      await AuditEntry.create({ workerId: worker._id, what: entry.what, who: entry.who, at: new Date() });
    }
  }

  const providerUser = await User.create({
    name: 'Solstice Care Admin',
    email: 'provider@example.com.au',
    mobile: '0400000000',
    passwordHash: demoPasswordHash,
    role: 'provider',
  });
  const provider = await Provider.create({
    userId: providerUser._id,
    legalEntityName: 'Solstice Community Care Pty Ltd',
    abn: '81442003912',
    tradingName: 'Solstice Care',
    plan: 'growth',
  });
  providerUser.providerId = provider._id as any;
  await providerUser.save();

  const adminUser = await User.create({
    name: 'Sol Admin',
    email: 'admin@example.com.au',
    mobile: '0400000000',
    passwordHash: demoPasswordHash,
    role: 'admin',
  });

  console.log('\nSeed complete. Demo accounts (password: password123):');
  console.log('  Provider: provider@example.com.au');
  console.log('  Admin:    admin@example.com.au');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
