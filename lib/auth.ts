import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  adminId: string;
  email: string;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Get current admin from cookies
export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) return null;

  return verifyToken(token);
}

// Middleware to protect admin routes
export async function requireAdmin(req: NextRequest) {
  const admin = await getCurrentAdmin();
  
  if (!admin) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return admin;
}