import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/activity - Get activity logs
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const where: any = {};
    
    // Role-based filtering
    if (user.role === 'MEMBER') {
      where.userId = user.id;
    }
    
    if (action) where.action = action;
    if (resource) where.resource = resource;
    
    const logs = await prisma.auditLog.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('GET /api/activity error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity logs' },
      { status: error.status || 500 }
    );
  }
}
