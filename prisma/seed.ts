import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('Clearing existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.dSR.deleteMany();
    await prisma.whatsAppMessage.deleteMany();
    await prisma.whatsAppConversation.deleteMany();
    await prisma.whatsAppContact.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  }

  // Create teams
  console.log('Creating teams...');
  const techTeam = await prisma.team.create({
    data: {
      name: 'Technical Placements',
    },
  });

  const managementTeam = await prisma.team.create({
    data: {
      name: 'Management Placements',
    },
  });

  // Create users
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@college.edu',
      passwordHash,
      role: 'ADMIN',
      phone: '+919876543210',
      optIn: true,
    },
  });

  const leader1 = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'rajesh@college.edu',
      passwordHash,
      role: 'LEADER',
      teamId: techTeam.id,
      phone: '+919876543211',
      optIn: true,
    },
  });

  const leader2 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@college.edu',
      passwordHash,
      role: 'LEADER',
      teamId: managementTeam.id,
      phone: '+919876543212',
      optIn: true,
    },
  });

  // Create team members
  const members = [];
  const memberNames = [
    'Amit Patel',
    'Neha Singh',
    'Vikram Reddy',
    'Anjali Desai',
    'Rohan Mehta',
    'Kavya Iyer',
    'Arjun Nair',
  ];

  for (let i = 0; i < memberNames.length; i++) {
    const teamId = i % 2 === 0 ? techTeam.id : managementTeam.id;
    const member = await prisma.user.create({
      data: {
        name: memberNames[i],
        email: `${memberNames[i].toLowerCase().replace(' ', '.')}@college.edu`,
        passwordHash,
        role: 'MEMBER',
        teamId,
        phone: `+91987654${3213 + i}`,
        optIn: i < 5, // First 5 members opt in
      },
    });
    members.push(member);
  }

  // Update team leaders
  await prisma.team.update({
    where: { id: techTeam.id },
    data: { leaderId: leader1.id },
  });

  await prisma.team.update({
    where: { id: managementTeam.id },
    data: { leaderId: leader2.id },
  });

  console.log(`Created ${members.length + 3} users`);

  // Create tasks
  console.log('Creating tasks...');
  const tasks = [
    {
      title: 'Contact TCS Recruiter',
      description: 'Follow up on campus recruitment dates',
      assignedToId: members[0].id,
      assignedById: leader1.id,
      status: 'DONE',
      priority: 'HIGH',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Prepare Student Database',
      description: 'Update resumes for upcoming drive',
      assignedToId: members[1].id,
      assignedById: leader1.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Send Placement Brochure',
      description: 'Email placement brochure to 20 companies',
      assignedToId: members[2].id,
      assignedById: leader2.id,
      status: 'OPEN',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Schedule Mock Interviews',
      description: 'Organize mock interview sessions for final year students',
      assignedToId: members[3].id,
      assignedById: leader1.id,
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Update Placement Portal',
      description: 'Add new company profiles to the portal',
      assignedToId: members[4].id,
      assignedById: leader2.id,
      status: 'OPEN',
      priority: 'LOW',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task as any });
  }

  console.log(`Created ${tasks.length} tasks`);

  // Create WhatsApp contacts and conversations
  console.log('Creating WhatsApp contacts and messages...');
  
  const contacts = [
    { phoneNumber: '+919876000001', name: 'Infosys HR', userId: members[0].id, optIn: true },
    { phoneNumber: '+919876000002', name: 'Wipro Recruiter', userId: members[1].id, optIn: true },
    { phoneNumber: '+919876000003', name: 'Accenture Contact', userId: members[2].id, optIn: true },
    { phoneNumber: '+919876000004', name: 'Student - Rahul', userId: members[3].id, optIn: true },
    { phoneNumber: '+919876000005', name: 'Student - Meera', userId: members[4].id, optIn: true },
  ];

  for (const contactData of contacts) {
    const contact = await prisma.whatsAppContact.create({
      data: {
        ...contactData,
        optInDate: new Date(),
      },
    });

    // Create conversation
    const conversation = await prisma.whatsAppConversation.create({
      data: {
        contactId: contact.id,
        lastMessageAt: new Date(),
      },
    });

    // Create sample messages
    const messages = [
      {
        conversationId: conversation.id,
        fromNumber: contactData.phoneNumber,
        toNumber: contactData.userId ? members.find(m => m.id === contactData.userId)?.phone || '+919876543210' : '+919876543210',
        text: 'Hello, regarding the placement drive...',
        messageId: `msg_${conversation.id}_1`,
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        direction: 'IN',
        status: 'DELIVERED',
      },
      {
        conversationId: conversation.id,
        fromNumber: contactData.userId ? members.find(m => m.id === contactData.userId)?.phone || '+919876543210' : '+919876543210',
        toNumber: contactData.phoneNumber,
        text: 'Yes, we have scheduled it for next week.',
        messageId: `msg_${conversation.id}_2`,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        direction: 'OUT',
        status: 'DELIVERED',
      },
      {
        conversationId: conversation.id,
        fromNumber: contactData.phoneNumber,
        toNumber: contactData.userId ? members.find(m => m.id === contactData.userId)?.phone || '+919876543210' : '+919876543210',
        text: 'Great! Can you send the student list?',
        messageId: `msg_${conversation.id}_3`,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        direction: 'IN',
        status: 'DELIVERED',
      },
    ];

    for (const message of messages) {
      await prisma.whatsAppMessage.create({ data: message as any });
    }

    // Update conversation last message time
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: messages[messages.length - 1].timestamp },
    });
  }

  console.log(`Created ${contacts.length} contacts with conversations and messages`);

  // Create sample DSRs
  console.log('Creating sample DSRs...');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  for (const member of members.slice(0, 3)) {
    await prisma.dSR.create({
      data: {
        userId: member.id,
        date: yesterday,
        rawInputs: JSON.stringify({
          tasks: ['Contacted companies', 'Updated database'],
          conversations: ['Infosys HR', 'Student queries'],
        }),
        summary: `**Daily Status Report - ${yesterday.toISOString().split('T')[0]}**\n\n${
          member.name
        } completed 2 tasks and had 3 WhatsApp conversations regarding placement activities.`,
        llmModel: 'gemini-pro',
        status: 'published',
      },
    });
  }

  console.log('Created sample DSRs');

  // Create notifications
  console.log('Creating notifications...');
  for (const member of members.slice(0, 5)) {
    await prisma.notification.create({
      data: {
        userId: member.id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned a new task',
        payload: JSON.stringify({ taskId: tasks[0] }),
      },
    });
  }

  console.log('Seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('Admin: admin@college.edu / password123');
  console.log('Leader: rajesh@college.edu / password123');
  console.log('Member: amit.patel@college.edu / password123');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
