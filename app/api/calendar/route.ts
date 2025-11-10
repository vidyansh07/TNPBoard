import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/calendar - Get calendar events for a user
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const where: any = {
      userId: user.id,
    };

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}

// POST /api/calendar - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      allDay,
      location,
      color,
      eventType,
      reminder,
      reminderMinutes,
    } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        allDay: allDay || false,
        location,
        color,
        eventType: eventType || 'OTHER',
        reminder: reminder !== undefined ? reminder : true,
        reminderMinutes: reminderMinutes || 15,
      },
    });

    // Create notification if reminder is enabled
    if (event.reminder && event.reminderMinutes) {
      const reminderTime = new Date(event.startTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - event.reminderMinutes);

      if (reminderTime > new Date()) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'event_reminder',
            title: `Event Reminder: ${event.title}`,
            message: `Your event "${event.title}" starts in ${event.reminderMinutes} minutes`,
            payload: JSON.stringify({ eventId: event.id }),
          },
        });
      }
    }

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Calendar create error:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}
