import test from "node:test";
import assert from "node:assert/strict";
import { baseURL, login, toCookieHeader } from "./helpers.mjs";

test("client money path shows invoices", async () => {
  const cookies = await login("client", "client@example.com");
  const cookieHeader = toCookieHeader(cookies);

  const res = await fetch(`${baseURL}/client/invoices`, {
    headers: { cookie: cookieHeader },
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /My Invoices/);
});
