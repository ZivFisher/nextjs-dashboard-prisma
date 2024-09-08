import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { invoices, customers, revenue, users } from '../lib/utils/consts/placeholder-data';

const prisma = new PrismaClient();

async function seedUsers() {
    await Promise.all(users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await prisma.user.upsert({
            where: { id: user.id },
            update: {},
            create: {
                id: user.id,
                name: user.name,
                email: user.email,
                password: hashedPassword,
            },
        });
    }));
}

async function seedCustomers() {
    await Promise.all(customers.map(async (customer) => {
        await prisma.customer.upsert({
            where: { id: customer.id },
            update: {},
            create: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                imageUrl: customer.image_url,
            },
        });
    }));
}

async function seedInvoices() {
    await Promise.all(invoices.map(async (invoice) => {
        await prisma.invoice.create({
            data: {
                customerId: invoice.customer_id,
                amount: invoice.amount,
                status: invoice.status,
                date: new Date(invoice.date),
            },
        });
    }));
}

async function seedRevenue() {
    await Promise.all(revenue.map(async (rev) => {
        await prisma.revenue.upsert({
            where: { month: rev.month },
            update: {},
            create: {
                month: rev.month,
                revenue: rev.revenue,
            },
        });
    }));
}

async function main() {
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
}

main()
    .then(() => {
        console.log('Database seeded successfully');
    })
    .catch((e) => {
        console.error('Failed to seed database:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
