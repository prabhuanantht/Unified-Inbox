// Script to check database contents
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database...\n');

    // Check messages
    const messageCount = await prisma.message.count();
    console.log(`Total messages in database: ${messageCount}`);

    if (messageCount > 0) {
      const messages = await prisma.message.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      console.log('\nSample messages:');
      messages.forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.channel}] ${msg.direction} - ${msg.contact?.name || msg.contact?.phone || 'Unknown'}`);
        console.log(`   Content: ${msg.content.substring(0, 50)}...`);
        console.log(`   Date: ${msg.createdAt}`);
        console.log(`   UserId: ${msg.userId}\n`);
      });

      // Check unique userIds
      const userIds = await prisma.message.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });
      console.log(`Unique userIds in messages: ${userIds.map(u => u.userId).join(', ')}`);
    }

    // Check contacts
    const contactCount = await prisma.contact.count();
    console.log(`\nTotal contacts in database: ${contactCount}`);

    // Check users
    const userCount = await prisma.user.count();
    console.log(`Total users in database: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
      });
      console.log('\nUsers:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'No name'}) - ID: ${user.id}`);
      });
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

