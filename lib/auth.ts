import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

/**
 * Authentication middleware helper
 * Extract and verify JWT token from request
 */

export interface AuthUser {
  userId: string;
  id: string;  // Alias for userId
  email: string;
  name: string;
  role: string;
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

    const decoded = jwt.verify(token, secret) as AuthUser;
    return decoded;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Require authentication - returns user or throws
 */
export function requireAuth(request: NextRequest): AuthUser {
  const user = getAuthUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, roles: string[]): boolean {
  return roles.includes(user.role);
}
