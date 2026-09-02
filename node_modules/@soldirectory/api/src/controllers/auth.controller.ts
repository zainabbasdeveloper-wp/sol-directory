import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { type UserDoc } from '../models/User.js';

function signToken(user: UserDoc): string {
  return jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
}

export async function signup(req: Request, res: Response) {
  const { name, email, mobile, password, role } = req.body;

  if (!name || !/.+@.+\..+/.test(email || '') || !mobile || !password || password.length < 8) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, mobile, passwordHash, role });

  res.status(201).json({ token: signToken(user), user: { id: user._id, name: user.name, role: user.role } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({ token: signToken(user), user: { id: user._id, name: user.name, role: user.role } });
}
