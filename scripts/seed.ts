// Script to seed database with sample data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('Seeding database...\n');

    // Create a test user
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
      },
    });

    console.log(`Created/Found user: ${user.email} (ID: ${user.id})\n`);

    // Create some contacts
    const contacts = await Promise.all([
      prisma.contact.upsert({
        where: { id: 'contact-1' },
        update: {},
        create: {
          id: 'contact-1',
          userId: user.id,
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
        },
      }),
      prisma.contact.upsert({
        where: { id: 'contact-2' },
        update: {},
        create: {
          id: 'contact-2',
          userId: user.id,
          name: 'Jane Smith',
          phone: '+1987654321',
          email: 'jane@example.com',
        },
      }),
      prisma.contact.upsert({
        where: { id: 'contact-3' },
        update: {},
        create: {
          id: 'contact-3',
          userId: user.id,
          name: 'Bob Wilson',
          phone: '+1555123456',
        },
      }),
    ]);

    console.log(`Created ${contacts.length} contacts\n`);

    // Create sample messages (mix of old and new, different channels)
    const now = new Date();
    const messages = [
      // Recent messages
      {
        contactId: contacts[0].id,
        userId: user.id,
        senderId: user.id,
        channel: 'SMS' as const,
        direction: 'INBOUND' as const,
        content: 'Hey, are you available for a call later today?',
        status: 'DELIVERED' as const,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        contactId: contacts[0].id,
        userId: user.id,
        senderId: user.id,
        channel: 'SMS' as const,
        direction: 'OUTBOUND' as const,
        content: 'Yes, I can do 3 PM. Does that work?',
        status: 'SENT' as const,
        createdAt: new Date(now.getTime() - 90 * 60 * 1000), // 90 minutes ago
        sentAt: new Date(now.getTime() - 90 * 60 * 1000),
      },
      {
        contactId: contacts[1].id,
        userId: user.id,
        senderId: user.id,
        channel: 'WHATSAPP' as const,
        direction: 'INBOUND' as const,
        content: 'Thanks for the quick response! 🎉',
        status: 'DELIVERED' as const,
        createdAt: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        sentAt: new Date(now.getTime() - 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - 59 * 60 * 1000),
      },
      {
        contactId: contacts[1].id,
        userId: user.id,
        senderId: user.id,
        channel: 'WHATSAPP' as const,
        direction: 'OUTBOUND' as const,
        content: 'You\'re welcome! Happy to help.',
        status: 'SENT' as const,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        sentAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
      {
        contactId: contacts[2].id,
        userId: user.id,
        senderId: user.id,
        channel: 'EMAIL' as const,
        direction: 'INBOUND' as const,
        content: 'I wanted to follow up on our meeting from last week. Do you have time to discuss the project proposal?',
        status: 'READ' as const,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
        sentAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
        readAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      },
      // Older messages (a few days ago)
      {
        contactId: contacts[0].id,
        userId: user.id,
        senderId: user.id,
        channel: 'SMS' as const,
        direction: 'INBOUND' as const,
        content: 'Hello! Just checking in.',
        status: 'DELIVERED' as const,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        sentAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        contactId: contacts[1].id,
        userId: user.id,
        senderId: user.id,
        channel: 'EMAIL' as const,
        direction: 'OUTBOUND' as const,
        content: 'Here is the report you requested. Let me know if you have any questions.',
        status: 'DELIVERED' as const,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        sentAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 60 * 1000),
      },
      {
        contactId: contacts[2].id,
        userId: user.id,
        senderId: user.id,
        channel: 'WHATSAPP' as const,
        direction: 'INBOUND' as const,
        content: 'The meeting is confirmed for next Tuesday at 10 AM.',
        status: 'DELIVERED' as const,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        sentAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      // Even older messages (weeks ago)
      {
        contactId: contacts[0].id,
        userId: user.id,
        senderId: user.id,
        channel: 'EMAIL' as const,
        direction: 'OUTBOUND' as const,
        content: 'Thank you for your interest in our services. We\'d love to schedule a call.',
        status: 'SENT' as const,
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
        sentAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        contactId: contacts[1].id,
        userId: user.id,
        senderId: user.id,
        channel: 'SMS' as const,
        direction: 'INBOUND' as const,
        content: 'Great! Looking forward to it.',
        status: 'DELIVERED' as const,
        createdAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000), // 3 weeks ago
        sentAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const messageData of messages) {
      await prisma.message.create({
        data: messageData,
      });
    }

    console.log(`Created ${messages.length} sample messages`);
    console.log('\n✅ Database seeded successfully!');
    console.log('\nNow you can:');
    console.log('1. Visit http://localhost:3000/dashboard');
    console.log('2. You should see messages from different channels');
    console.log('3. Messages are ordered from newest to oldest');
    console.log(`\nUser ID to use: ${user.id}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();

