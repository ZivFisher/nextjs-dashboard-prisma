'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const prisma = new PrismaClient();

export async function createInvoice(formData: FormData) {
    // const rawFormData = Object.fromEntries(formData.entries())

    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    const amountInCents = amount * 100;
    const date = new Date();

    await prisma.invoice.create({
        data: {
            customerId,
            amount: amountInCents,
            status,
            date
        }
    })

    revalidatePath("/dashboard/invoices")
    redirect("/dashboard/invoices")


    // Create a Date object from the UTC string
    // const utcDate = new Date(rawDate);

    // Convert to the user's local time
    // const localDate = utcDate.toLocaleString();
    // const date = localDate.split(",")[0];
    // console.log(`date:`, date);

    // console.log(localDate);
    // console.log(`rawDate:`, rawDate);

}