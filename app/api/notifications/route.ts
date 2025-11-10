import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/notifications - Get user's notifications
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    const where: any = { userId: user.id };
    if (unreadOnly) {
      where.read = false;
    }
    
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false }
    });
    
    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/notifications/mark-read - Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { notificationIds } = body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds array is required' },
        { status: 400 }
      );
    }
    
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
    
    return NextResponse.json({ message: 'Notifications marked as read' });
  } catch (error: any) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
