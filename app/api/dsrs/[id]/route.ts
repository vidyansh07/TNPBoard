import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/dsrs/[id] - Get a single DSR
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    
    const dsr = await prisma.dSR.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (!dsr) {
      return NextResponse.json(
        { error: 'DSR not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    if (user.role === 'MEMBER' && dsr.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ dsr });
  } catch (error: any) {
    console.error('GET /api/dsrs/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch DSR' },
      { status: error.status || 500 }
    );
  }
}
