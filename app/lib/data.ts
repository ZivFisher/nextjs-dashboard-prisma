import {
  InvoicesTable,
  Customer,
  Revenue,
  LatestInvoice,
  FormattedCustomersTable,
  Invoice
} from './definitions';
import { formatCurrency } from './utils';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function fetchRevenue(): Promise<Revenue[]> {
  try {

    const data = await prisma.revenue.findMany();
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices(): Promise<LatestInvoice[]> {
  try {

    const data = await prisma.invoice.findMany({
      include: { customer: true },
      orderBy: { date: 'desc' },
      take: 5,
    });

    const latestInvoices = data.map((invoice) => ({
      id: invoice.id,
      name: invoice.customer.name,
      image_url: invoice.customer.imageUrl,
      email: invoice.customer.email,
      amount: formatCurrency(invoice.amount),
    }));

    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    const [invoiceCount, customerCount, invoiceStatus] = await Promise.all([
      prisma.invoice.count(),
      prisma.customer.count(),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        _count: { amount: true },
        where: { status: { in: ['paid', 'pending'] } },
      }),
    ]);

    return {
      numberOfInvoices: invoiceCount,
      numberOfCustomers: customerCount,
      totalPaidInvoices: formatCurrency(invoiceStatus._sum.amount ?? 0),
      totalPendingInvoices: formatCurrency(invoiceStatus._count.amount),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(query: any, currentPage: number): Promise<InvoicesTable[]> {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Helper function to validate date
  function isValidDate(d: string): boolean {
    return !isNaN(Date.parse(d));
  }
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { customer: { name: { contains: query, mode: 'insensitive' } } },
          { customer: { email: { contains: query, mode: 'insensitive' } } },
          ...(Number.isFinite(Number(query)) ? [{ amount: { equals: Number(query) } }] : []),
          ...(isValidDate(query) ? [{ date: { equals: new Date(query) } }] : []),
          { status: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { customer: true },
      orderBy: { date: 'desc' },
      take: ITEMS_PER_PAGE,
      skip: offset,
    });

    // Transform Prisma result to match InvoicesTable type
    const formattedInvoices: InvoicesTable[] = invoices.map(invoice => ({
      id: invoice.id,
      customer_id: invoice.customerId, // Match field names
      name: invoice.customer.name,
      email: invoice.customer.email,
      image_url: invoice.customer.imageUrl, // Adjusted to image_url
      date: invoice.date.toISOString(), // Convert Date to string
      amount: invoice.amount / 100, // Convert amount if needed
      status: invoice.status as 'pending' | 'paid', // Type assertion for status
    }));
    console.log(`formattedInvoices:`, formattedInvoices);

    return formattedInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}



export async function fetchInvoicesPages(query: string): Promise<number> {
  try {
    // Helper function to validate date
    function isValidDate(d: string): boolean {
      return !isNaN(Date.parse(d));
    }

    const count = await prisma.invoice.count({
      where: {
        OR: [
          { customer: { name: { contains: query, mode: 'insensitive' } } },
          { customer: { email: { contains: query, mode: 'insensitive' } } },
          ...(Number.isFinite(Number(query)) ? [{ amount: { equals: Number(query) } }] : []),
          ...(isValidDate(query) ? [{ date: { equals: new Date(query) } }] : []),
          { status: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    return Math.ceil(count / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new Error(`Invoice with ID ${id} not found.`);
    }

    return {
      ...invoice,
      amount: invoice.amount / 100, // Convert from cents to dollars
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers(): Promise<Customer[]> {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string): Promise<FormattedCustomersTable[]> {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { invoices: true },
      orderBy: { name: 'asc' },
    });

    const formattedCustomers = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      image_url: customer.imageUrl,
      total_invoices: customer.invoices.length,
      total_pending: formatCurrency(
        customer.invoices.reduce((acc, invoice) => {
          return invoice.status === 'pending' ? acc + invoice.amount : acc;
        }, 0),
      ),
      total_paid: formatCurrency(
        customer.invoices.reduce((acc, invoice) => {
          return invoice.status === 'paid' ? acc + invoice.amount : acc;
        }, 0),
      ),
    }));

    return formattedCustomers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
