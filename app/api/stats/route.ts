import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/stats - Get dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    let taskWhere: any = {};
    let conversationWhere: any = {};
    let dsrWhere: any = {};
    
    // Role-based filtering
    if (user.role === 'MEMBER') {
      taskWhere = {
        OR: [
          { assignedToId: user.id },
          { assignedById: user.id }
        ]
      };
      dsrWhere = { userId: user.id };
    } else if (user.role === 'LEADER') {
      // Leaders see their team's data
      const userWithTeam = await prisma.user.findUnique({
        where: { id: user.id },
        include: { ledTeams: true }
      });
      
      if (userWithTeam?.ledTeams && userWithTeam.ledTeams.length > 0) {
        const teamMembers = await prisma.user.findMany({
          where: { teamId: userWithTeam.ledTeams[0].id },
          select: { id: true }
        });
        const memberIds = teamMembers.map((m: { id: string }) => m.id);
        
        taskWhere = {
          OR: [
            { assignedToId: { in: memberIds } },
            { assignedById: { in: memberIds } }
          ]
        };
        dsrWhere = { userId: { in: memberIds } };
      }
    }
    // Admins see everything (no filter)
    
    // Count tasks by status
    const tasksTotal = await prisma.task.count({ where: taskWhere });
    const tasksOpen = await prisma.task.count({ 
      where: { ...taskWhere, status: 'OPEN' } 
    });
    const tasksInProgress = await prisma.task.count({ 
      where: { ...taskWhere, status: 'IN_PROGRESS' } 
    });
    const tasksDone = await prisma.task.count({ 
      where: { ...taskWhere, status: 'DONE' } 
    });
    
    // Count conversations
    const conversationsTotal = await prisma.whatsAppConversation.count({ 
      where: conversationWhere 
    });
    const conversationsActive = await prisma.whatsAppConversation.count({
      where: {
        ...conversationWhere,
        isArchived: false,
        lastMessageAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });
    
    // Count DSRs
    const dsrsTotal = await prisma.dSR.count({ where: dsrWhere });
    const dsrsPublished = await prisma.dSR.count({ 
      where: { ...dsrWhere, status: 'published' } 
    });
    const dsrsDraft = await prisma.dSR.count({ 
      where: { ...dsrWhere, status: 'draft' } 
    });
    
    // Count notifications (user-specific)
    const notificationsUnread = await prisma.notification.count({
      where: { userId: user.id, read: false }
    });
    
    // Count team members (if applicable)
    let teamMembersCount = 0;
    if (user.role === 'ADMIN') {
      teamMembersCount = await prisma.user.count();
    } else if (user.role === 'LEADER') {
      const userWithTeam = await prisma.user.findUnique({
        where: { id: user.id },
        include: { ledTeams: true }
      });
      
      if (userWithTeam?.ledTeams && userWithTeam.ledTeams.length > 0) {
        teamMembersCount = await prisma.user.count({
          where: { teamId: userWithTeam.ledTeams[0].id }
        });
      }
    }
    
    // Recent activity (last 5)
    const recentActivity = await prisma.auditLog.findMany({
      where: user.role === 'MEMBER' ? { userId: user.id } : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    return NextResponse.json({
      tasks: {
        total: tasksTotal,
        open: tasksOpen,
        inProgress: tasksInProgress,
        done: tasksDone
      },
      conversations: {
        total: conversationsTotal,
        active: conversationsActive
      },
      dsrs: {
        total: dsrsTotal,
        published: dsrsPublished,
        draft: dsrsDraft
      },
      notifications: {
        unread: notificationsUnread
      },
      team: {
        members: teamMembersCount
      },
      recentActivity
    });
  } catch (error: any) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch statistics' },
      { status: error.status || 500 }
    );
  }
}
