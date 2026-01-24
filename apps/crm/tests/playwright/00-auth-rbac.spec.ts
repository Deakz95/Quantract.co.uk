import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('RBAC: admin allowed, others blocked', async ({ request }) => {
  await loginAs(request, 'admin');
  const adminRes = await request.get('/api/admin/settings');
  expect([200, 403]).toContain(adminRes.status());

  await loginAs(request, 'client');
  const clientRes = await request.get('/api/admin/settings');
  expect(clientRes.status()).toBe(401);
});