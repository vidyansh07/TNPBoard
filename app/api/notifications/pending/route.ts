import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/notifications/pending - Check for pending work and create notifications
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check for overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        assignedToId: user.id,
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
        dueDate: {
          lt: today,
        },
      },
    });

    // Check for tasks due today
    const todayTasks = await prisma.task.findMany({
      where: {
        assignedToId: user.id,
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Check for upcoming events today
    const todayEvents = await prisma.calendarEvent.findMany({
      where: {
        userId: user.id,
        status: 'SCHEDULED',
        startTime: {
          gte: now,
          lt: tomorrow,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Create notifications for pending work
    const notifications = [];

    if (overdueTasks.length > 0) {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'overdue_tasks',
          title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
          message: `You have ${overdueTasks.length} overdue task(s): ${overdueTasks.map(t => t.title).join(', ')}`,
          payload: JSON.stringify({ taskIds: overdueTasks.map(t => t.id) }),
        },
      });
      notifications.push(notification);
    }

    if (todayTasks.length > 0) {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'today_tasks',
          title: `${todayTasks.length} Task${todayTasks.length > 1 ? 's' : ''} Due Today`,
          message: `Tasks due today: ${todayTasks.map(t => t.title).join(', ')}`,
          payload: JSON.stringify({ taskIds: todayTasks.map(t => t.id) }),
        },
      });
      notifications.push(notification);
    }

    if (todayEvents.length > 0) {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'today_events',
          title: `${todayEvents.length} Event${todayEvents.length > 1 ? 's' : ''} Today`,
          message: `Upcoming events: ${todayEvents.map(e => e.title).join(', ')}`,
          payload: JSON.stringify({ eventIds: todayEvents.map(e => e.id) }),
        },
      });
      notifications.push(notification);
    }

    return NextResponse.json({
      summary: {
        overdueTasks: overdueTasks.length,
        todayTasks: todayTasks.length,
        todayEvents: todayEvents.length,
      },
      notifications,
      tasks: {
        overdue: overdueTasks,
        today: todayTasks,
      },
      events: todayEvents,
    });
  } catch (error) {
    console.error('Pending work check error:', error);
    return NextResponse.json({ error: 'Failed to check pending work' }, { status: 500 });
  }
}
