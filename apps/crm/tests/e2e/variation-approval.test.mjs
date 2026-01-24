import test from "node:test";
import assert from "node:assert/strict";
import { baseURL, login, toCookieHeader } from "./helpers.mjs";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

test("approved variations stamp timestamps and update job budget", async () => {
  const cookies = await login("admin", "admin@demo.com");
  const cookieHeader = toCookieHeader([...cookies, "qt_onboarded=1"]);
  const adminHeaders = { cookie: cookieHeader, "content-type": "application/json" };

  const quotesResp = await fetchJson(`${baseURL}/api/admin/quotes`, { headers: { cookie: cookieHeader } });
  assert.equal(quotesResp.res.status, 200);
  let quote = quotesResp.data?.quotes?.find((q) => q.clientEmail === "variation-test@example.com");
  if (!quote) {
    const createQuote = await fetchJson(`${baseURL}/api/admin/quotes`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        clientName: "Variation Test",
        clientEmail: "variation-test@example.com",
        items: [{ description: "Base work", qty: 1, unitPrice: 100 }],
      }),
    });
    assert.equal(createQuote.res.status, 200);
    quote = createQuote.data?.quote;
  }
  assert.ok(quote?.id);

  const jobResp = await fetchJson(`${baseURL}/api/admin/jobs`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ quoteId: quote.id }),
  });
  assert.equal(jobResp.res.status, 200);
  const job = jobResp.data?.job;
  assert.ok(job?.id);

  const variationsResp = await fetchJson(`${baseURL}/api/admin/jobs/${job.id}/variations`, { headers: { cookie: cookieHeader } });
  assert.equal(variationsResp.res.status, 200);
  let variation = variationsResp.data?.variations?.find((v) => v.title === "Variation approval test");
  if (!variation) {
    const createVariation = await fetchJson(`${baseURL}/api/admin/jobs/${job.id}/variations`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        title: "Variation approval test",
        reason: "Test approval flow",
        items: [{ description: "Extra work", qty: 1, unitPrice: 50 }],
      }),
    });
    assert.equal(createVariation.res.status, 200);
    variation = createVariation.data?.variation;
  }
  assert.ok(variation?.id);

  if (variation.status === "draft") {
    const sendResp = await fetchJson(`${baseURL}/api/admin/variations/${variation.id}/send`, {
      method: "POST",
      headers: { cookie: cookieHeader },
    });
    assert.equal(sendResp.res.status, 200);
    variation = sendResp.data?.variation ?? variation;
  }

  const jobBeforeResp = await fetchJson(`${baseURL}/api/admin/jobs/${job.id}`, { headers: { cookie: cookieHeader } });
  assert.equal(jobBeforeResp.res.status, 200);
  const jobBefore = jobBeforeResp.data?.job;

  const approvalResp = await fetchJson(`${baseURL}/api/client/variations/${variation.token}/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "approved" }),
  });
  assert.equal(approvalResp.res.status, 200);
  const approved = approvalResp.data?.variation;
  assert.equal(approved?.status, "approved");
  assert.ok(approved?.approvedAtISO);
  assert.ok(approved?.approvedBy);
  assert.equal(approved?.rejectedAtISO, undefined);

  if (variation.status !== "approved") {
    const jobAfterResp = await fetchJson(`${baseURL}/api/admin/jobs/${job.id}`, { headers: { cookie: cookieHeader } });
    assert.equal(jobAfterResp.res.status, 200);
    const jobAfter = jobAfterResp.data?.job;
    const expected = Number(jobBefore?.budgetSubtotal ?? 0) + Number(variation.subtotal ?? 0);
    assert.ok(Math.abs(Number(jobAfter?.budgetSubtotal ?? 0) - expected) < 0.01);
  }

  const secondApproval = await fetchJson(`${baseURL}/api/client/variations/${variation.token}/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "approved" }),
  });
  assert.equal(secondApproval.res.status, 200);
  assert.equal(secondApproval.data?.variation?.approvedAtISO, approved.approvedAtISO);
});
