import test from "node:test";
import assert from "node:assert/strict";
import { baseURL, login, toCookieHeader } from "./helpers.mjs";

test("admin money path shows invoices", async () => {
  const cookies = await login("admin", "admin@demo.com");
  const cookieHeader = toCookieHeader([...cookies, "qt_onboarded=1"]);

  const res = await fetch(`${baseURL}/admin/invoices`, {
    headers: { cookie: cookieHeader },
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Invoices/);
});
