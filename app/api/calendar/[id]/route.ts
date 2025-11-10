import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/calendar/[id] - Get single event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Calendar event fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// PUT /api/calendar/[id] - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      status,
      reminder,
      reminderMinutes,
    } = body;

    const event = await prisma.calendarEvent.updateMany({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(allDay !== undefined && { allDay }),
        ...(location !== undefined && { location }),
        ...(color && { color }),
        ...(eventType && { eventType }),
        ...(status && { status }),
        ...(reminder !== undefined && { reminder }),
        ...(reminderMinutes !== undefined && { reminderMinutes }),
      },
    });

    if (event.count === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updatedEvent = await prisma.calendarEvent.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Calendar event update error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE /api/calendar/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.calendarEvent.deleteMany({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Calendar event delete error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
