import { test, expect } from '@playwright/test';
import { createQuoteViaApi, acceptQuote } from './_helpers';

test('PDF endpoints return valid PDF', async ({ request }) => {
  const quote = await createQuoteViaApi(request);
  const pdf = await request.get(`/api/client/quotes/${quote.token}/pdf`);
  const pdfBody = await pdf.body();
  expect(pdfBody.toString().startsWith('%PDF')).toBeTruthy();

  await acceptQuote(request, quote.token);
  const agreementPdf = await request.get(`/api/client/agreements/${quote.token}/pdf`);
  const agBody = await agreementPdf.body();
  expect(agBody.toString().startsWith('%PDF')).toBeTruthy();
});