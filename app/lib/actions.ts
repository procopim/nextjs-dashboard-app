'use server'; //marks all actions within as server actions

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

//type validation and coercion with zod
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer',
    }),
    amount: z.coerce
      .number()
      .gt(0, {message: 'Amount must be greater than $0'}),
    status: z.enum(['pending','paid'], {
      invalid_type_error: 'Please select a status',
    }),
    date: z.string(),
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
    
const CreateInvoice = FormSchema.omit({id: true, date: true});

export async function createInvoice(prevState: State, formData: FormData) {
  //validate form using zod schema
  const validatedFields = CreateInvoice.safeParse({ //safeParse() will return an object containing either a success or error field.
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
    const { amount, customerId, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0]; //YYYY-MM-DD
    try {
      await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    } catch(error) {
      console.error('Error creating invoice: ', error);
      return {
      message: 'Database Error: Failed to Create Invoice.',
      };
    }
    revalidatePath('/dashboard/invoices');
    /* clears the client-side router cache that stores the route segments
    in the user's browser for a time. Since updating the data displayed
    in the invoices route, we need to clear this cache and trigger
    a new request to the server. 
    Once the database has been updated, the /dashboard/invoices path 
    will be revalidated, and fresh data will be fetched from the server.
    */
    redirect('/dashboard/invoices');
    /*At this point, you also want to redirect the user back to the 
    /dashboard/invoices page. You can do this with the redirect 
    function from Next.js:*/

    // const rawFormData = {
    //     customerId : formData.get('customerId'),
    //     amount: formData.get('amount'),
    //     status: formData.get('status'),
    // };
    // console.log('Creating invoice with data:', rawFormData);
    // const entries = {};
    // for (const pair of formData.entries()) {
    //     entries[pair[0]] = pair[1];
    // };
    // console.log('Form Data Entries:', entries);
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
export async function updateInvoice(
  id: string, 
  prevState: State,
  formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    console.error('Error validating fields: ', validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try{
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch(error) {
    console.error('Error updating invoice: ', error);
    return {
      errors: error,
      message: 'Database Error: Failed to Update Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  //redirect works by throwing an error, which would be caught by the catch block. So it is outside it. 
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}