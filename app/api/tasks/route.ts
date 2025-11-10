import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/tasks - Get all tasks (with filters)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    
    const where: any = {};
    
    // Role-based filtering
    if (user.role === 'MEMBER') {
      where.OR = [
        { assignedToId: user.id },
        { assignedById: user.id }
      ];
    } else if (user.role === 'LEADER') {
      // Leaders see their team's tasks
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
        
        where.OR = [
          { assignedToId: { in: memberIds } },
          { assignedById: { in: memberIds } }
        ];
      }
    }
    // Admins see all tasks (no filter)
    
    // Apply query filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedToId = assignedTo;
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        assignedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    });
    
    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    // Only ADMIN and LEADER can create tasks
    if (user.role === 'MEMBER') {
      return NextResponse.json(
        { error: 'Only admins and leaders can create tasks' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { title, description, status, priority, assignedToId, dueDate } = body;
    
    // Validation
    if (!title || !status || !priority) {
      return NextResponse.json(
        { error: 'Title, status, and priority are required' },
        { status: 400 }
      );
    }
    
    // Validate assignedTo exists
    if (assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId }
      });
      
      if (!assignee) {
        return NextResponse.json(
          { error: 'Assigned user not found' },
          { status: 404 }
        );
      }
    }
    
    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        assignedToId,
        assignedById: user.id,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        assignedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    // Create notification for assignee
    if (assignedToId && assignedToId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'TASK_ASSIGNED',
          title: 'New Task Assigned',
          message: `${user.name} assigned you a task: ${title}`
        }
      });
    }
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        resource: 'Task',
        resourceId: task.id,
        metadata: JSON.stringify({ title, priority, status })
      }
    });
    
    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}
