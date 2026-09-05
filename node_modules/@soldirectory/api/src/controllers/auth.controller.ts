import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { type UserDoc } from '../models/User.js';
import Provider from '../models/Provider.js';
import Worker from '../models/Worker.js';

function signToken(user: UserDoc): string {
  return jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
}

// Admin accounts are never created through public signup — the
// frontend's role cards already only offer these four, but the
// backend has to be the one that actually enforces it, since a
// request payload can be edited by hand regardless of what the UI
// shows.
const PUBLIC_SIGNUP_ROLES = ['worker', 'provider', 'coordinator', 'participant'];

export async function signup(req: Request, res: Response) {
  const { name, email, mobile, password, role } = req.body;

  if (!name || !/.+@.+\..+/.test(email || '') || !mobile || !password || password.length < 8) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }
  if (!PUBLIC_SIGNUP_ROLES.includes(role)) {
    return res.status(400).json({ error: 'That account type is not available for public registration.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, mobile, passwordHash, role });

  // Provider onboarding (/onboarding) requires a Provider document
  // to already exist for this user — without creating one here,
  // onboarding 403s immediately for every provider signup.
  if (role === 'provider') {
    const provider = await Provider.create({ userId: user._id, intakeEmail: email });
    user.providerId = provider._id as any;
    await user.save();
  }
  // Same gap existed for workers: without a Worker shell created
  // here, a newly-signed-up worker has no profile record at all —
  // nothing to be found by, and no account for the suspension check
  // above to ever look up (user.workerId would stay unset forever).
  if (role === 'worker') {
    const [firstName, ...rest] = name.trim().split(/\s+/);
    const worker = await Worker.create({
      userId: user._id,
      firstName,
      lastName: rest.join(' ') || firstName,
      email,
      phone: mobile,
    });
    user.workerId = worker._id as any;
    await user.save();
  }

  res.status(201).json({ token: signToken(user), user: { id: user._id, name: user.name, role: user.role } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  if (user.role === 'provider' && user.providerId) {
    const provider = await Provider.findById(user.providerId).select('accountStatus').lean();
    if (provider?.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }
  }
  if (user.role === 'worker' && user.workerId) {
    const worker = await Worker.findById(user.workerId).select('accountStatus').lean();
    if (worker?.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }
  }
  if ((user.role === 'coordinator' || user.role === 'participant') && user.accountStatus === 'suspended') {
    return res.status(403).json({ error: 'Your account has been suspended.' });
  }

  res.json({ token: signToken(user), user: { id: user._id, name: user.name, role: user.role } });
}

// Validates a stored JWT and returns the current user — the missing
// piece that made persistent auth impossible before. Uses the same
// signing secret/pattern as signToken() above; no new dependencies.
export async function me(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    res.json({ user: { id: user._id, name: user.name, role: user.role } });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
