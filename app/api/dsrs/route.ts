import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/dsrs - Get all DSRs
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    
    const where: any = {};
    
    // Role-based filtering
    if (user.role === 'MEMBER') {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }
    
    if (status) {
      where.status = status;
    }
    
    const dsrs = await prisma.dSR.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    return NextResponse.json({ dsrs });
  } catch (error: any) {
    console.error('GET /api/dsrs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch DSRs' },
      { status: error.status || 500 }
    );
  }
}
