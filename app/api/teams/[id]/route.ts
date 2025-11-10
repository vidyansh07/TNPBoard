import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// PATCH /api/teams/[id] - Update a team
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update teams' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { name, leaderId } = body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (leaderId !== undefined) updateData.leaderId = leaderId;
    
    const team = await prisma.team.update({
      where: { id: params.id },
      data: updateData,
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
      }
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        resource: 'Team',
        resourceId: team.id,
        metadata: JSON.stringify(updateData)
      }
    });
    
    return NextResponse.json({ team });
  } catch (error: any) {
    console.error('PATCH /api/teams/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete a team
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete teams' },
        { status: 403 }
      );
    }
    
    const team = await prisma.team.findUnique({
      where: { id: params.id }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Unassign team members before deleting
    await prisma.user.updateMany({
      where: { teamId: params.id },
      data: { teamId: null }
    });
    
    await prisma.team.delete({
      where: { id: params.id }
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        resource: 'Team',
        resourceId: params.id,
        metadata: JSON.stringify({ name: team.name })
      }
    });
    
    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/teams/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete team' },
      { status: 500 }
    );
  }
}
