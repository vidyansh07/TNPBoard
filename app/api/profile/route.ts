import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET /api/profile - Get current user profile
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        optIn: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('GET /api/profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/profile - Update current user profile
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();
    const { name, phone, optIn, currentPassword, newPassword } = body;
    
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (optIn !== undefined) updateData.optIn = optIn;
    
    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        );
      }
      
      const user = await prisma.user.findUnique({
        where: { id: authUser.id }
      });
      
      if (!user?.passwordHash) {
        return NextResponse.json(
          { error: 'User has no password set' },
          { status: 400 }
        );
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.passwordHash = hashedPassword;
    }
    
    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        optIn: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'UPDATE',
        resource: 'UserProfile',
        resourceId: authUser.id,
        metadata: JSON.stringify({ 
          fieldsUpdated: Object.keys(updateData).filter(k => k !== 'passwordHash')
        })
      }
    });
    
    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('PATCH /api/profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
