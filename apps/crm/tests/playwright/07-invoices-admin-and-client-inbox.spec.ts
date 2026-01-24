import { test, expect } from '@playwright/test';
import { loginAs, createQuoteViaApi, acceptQuote, generateInvoiceForQuote } from './_helpers';

test('Invoice visible to admin and client', async ({ request }) => {
  await loginAs(request, 'admin');
  
  // FIX: Create quote for the existing demo client (not a random email)
  const quote = await createQuoteViaApi(request, {
    clientName: 'Demo Client',
    clientEmail: 'client@demo.quantract'
  });
  
  await acceptQuote(request, quote.token);
  const invoice = await generateInvoiceForQuote(request, quote.id);

  // Check admin can see it
  const adminInv = await request.get('/api/admin/invoices');
  const adminList = (await adminInv.json()) as Array<{ id: string }>;
  expect(adminList.some((i: { id: string }) => i.id === invoice.id)).toBeTruthy();

  // FIX: Log in as the existing client user (not the random email from quote)
  await loginAs(request, 'client', 'client@demo.quantract');
  
  // Check client can see it in their inbox
  const clientInv = await request.get('/api/client/inbox/invoices');
  const clientList = await clientInv.json();
  expect(clientList.some((i: any) => i.id === invoice.id)).toBeTruthy();
});
