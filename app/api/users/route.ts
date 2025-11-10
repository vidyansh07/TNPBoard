import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/users - Get all users (for task assignment)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        teamId: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: error.status || 500 }
    );
  }
}
