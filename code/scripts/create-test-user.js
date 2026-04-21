#!/usr/bin/env node

/**
 * Script to create a test admin user in the database
 * Run: node scripts/create-test-user.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'admin' },
    });

    if (existingUser) {
      console.log('✓ User "admin" already exists');
      return;
    }

    // Create the admin user
    const user = await prisma.user.create({
      data: {
        id: 'admin',
        email: 'admin@naberza.local',
        name: 'Admin',
      },
    });

    console.log('✓ Created user:', user);
  } catch (error) {
    console.error('✗ Error creating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
