import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/tasks/[id] - Get a single task
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        assignedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    if (user.role === 'MEMBER' && 
        task.assignedToId !== user.id && 
        task.assignedById !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch task' },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id }
    });
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    const canEdit = user.role === 'ADMIN' || 
                    user.role === 'LEADER' || 
                    existingTask.assignedToId === user.id ||
                    existingTask.assignedById === user.id;
    
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { title, description, status, priority, assignedToId, dueDate } = body;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    
    const task = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        assignedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    // Create notification if task was reassigned
    if (assignedToId && 
        assignedToId !== existingTask.assignedToId && 
        assignedToId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'TASK_ASSIGNED',
          title: 'Task Reassigned',
          message: `${user.name} assigned you a task: ${task.title}`
        }
      });
    }
    
    // Create notification if status changed to DONE
    if (status === 'DONE' && 
        existingTask.status !== 'DONE' &&
        existingTask.assignedById && existingTask.assignedById !== user.id) {
      await prisma.notification.create({
        data: {
          userId: existingTask.assignedById,
          type: 'TASK_UPDATED',
          title: 'Task Completed',
          message: `${user.name} completed task: ${task.title}`
        }
      });
    }
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        resource: 'Task',
        resourceId: task.id,
        metadata: JSON.stringify(updateData)
      }
    });
    
    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    
    // Only ADMIN can delete tasks
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete tasks' },
        { status: 403 }
      );
    }
    
    const task = await prisma.task.findUnique({
      where: { id: params.id }
    });
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    await prisma.task.delete({
      where: { id: params.id }
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        resource: 'Task',
        resourceId: params.id,
        metadata: JSON.stringify({ title: task.title })
      }
    });
    
    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}
