import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/teams - Get all teams
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const teams = await prisma.team.findMany({
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json({ teams });
  } catch (error: any) {
    console.error('GET /api/teams error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch teams' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/teams - Create a new team (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create teams' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { name, leaderId } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }
    
    // Verify leader exists and is a LEADER role
    if (leaderId) {
      const leader = await prisma.user.findUnique({
        where: { id: leaderId }
      });
      
      if (!leader) {
        return NextResponse.json(
          { error: 'Leader not found' },
          { status: 404 }
        );
      }
      
      if (leader.role !== 'LEADER' && leader.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Selected user must have LEADER or ADMIN role' },
          { status: 400 }
        );
      }
    }
    
    const team = await prisma.team.create({
      data: {
        name,
        leaderId: leaderId || null
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        resource: 'Team',
        resourceId: team.id,
        metadata: JSON.stringify({ name, leaderId })
      }
    });
    
    return NextResponse.json({ team }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/teams error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create team' },
      { status: 500 }
    );
  }
}
