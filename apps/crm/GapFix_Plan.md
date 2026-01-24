# GAP FIX PLAN - QUANTRACT WEB PORTAL

**Audit Date:** 2026-01-21
**Auditor:** Claude Sonnet 4.5
**Priority Ranking:** Impact × Effort (High Impact + Low Effort = Top Priority)

---

## EXECUTIVE SUMMARY

**Total Gaps:** 18 work items to reach "all ✅"
**Estimated Effort:** ~3-4 days for Priority 1-2, ~2-3 weeks for all items
**Critical Gaps:** Audit events (3 items), CSV exports (5 items), Tests (6 items)

### Gap Categories:
1. **Audit Events Missing** (3 items) - HIGH security/compliance risk
2. **CSV Export Missing** (5 items) - MEDIUM business value
3. **Tests Missing** (6 items) - MEDIUM technical debt
4. **Feature Incomplete** (4 items) - LOW priority (nice-to-have)

---

## PRIORITY 1: CRITICAL SECURITY/COMPLIANCE (Must Fix)

### 1.1 Add Audit Events for Enquiries (Stage 1, B2)

**Priority:** P1 (High Impact, Low Effort)
**Estimated Effort:** 2-3 hours
**Impact:** Security compliance, audit trail completeness

**Current State:**
- ✅ RBAC enforced (requireRoles "admin")
- ✅ Tenant isolation (companyId in queries)
- ✅ Tests exist (11-admin-enquiries-crud.spec.ts)
- ❌ NO audit events for create/update/delete operations

**Files to Touch:**
```
app/api/admin/enquiries/route.ts (POST - line 46-54)
app/api/admin/enquiries/[id]/route.ts (PATCH - line 50-80, DELETE - line 100-130)
```

**Implementation:**
```typescript
// In POST /api/admin/enquiries (after createEnquiry)
await repo.recordAuditEvent({
  entityType: "enquiry",
  entityId: enquiry.id,
  action: "enquiry.created",
  actorRole: "admin",
  actor: user.email,
  meta: {
    stageId: body.stageId,
    ownerId: body.ownerId,
    valueEstimate: body.valueEstimate,
  },
  companyId: enquiry.companyId,
});

// In PATCH /api/admin/enquiries/[id] (after updateEnquiry)
await repo.recordAuditEvent({
  entityType: "enquiry",
  entityId: id,
  action: "enquiry.updated",
  actorRole: "admin",
  actor: user.email,
  meta: { changes: body },
  companyId: enquiry.companyId,
});

// In DELETE /api/admin/enquiries/[id] (after deleteEnquiry)
await repo.recordAuditEvent({
  entityType: "enquiry",
  entityId: id,
  action: "enquiry.deleted",
  actorRole: "admin",
  actor: user.email,
  companyId: enquiry.companyId,
});
```

**Acceptance Test:**
1. Create enquiry via API → Verify AuditEvent created with action="enquiry.created"
2. Update enquiry via API → Verify AuditEvent created with action="enquiry.updated"
3. Delete enquiry via API → Verify AuditEvent created with action="enquiry.deleted"
4. Verify all audit events have companyId, actorRole, actor fields

**Test File:** `tests/playwright/11-admin-enquiries-audit.spec.ts` (new)

---

### 1.2 Add Audit Events for Tasks (Stage 3, D1)

**Priority:** P1 (High Impact, Low Effort)
**Estimated Effort:** 2-3 hours
**Impact:** Security compliance, audit trail for collaboration

**Current State:**
- ✅ RBAC enforced (requireAuth)
- ✅ Tenant isolation (companyId in queries)
- ✅ Tests exist (13-task-visibility.spec.ts)
- ❌ NO audit events for task operations

**Files to Touch:**
```
app/api/tasks/route.ts (POST - line 97-169)
app/api/tasks/[taskId]/route.ts (PATCH - line 50-120, DELETE - line 122-154)
```

**Implementation:**
```typescript
// In POST /api/tasks (after createTask)
await db.auditEvent.create({
  data: {
    id: crypto.randomUUID(),
    companyId: task.companyId,
    userId: user.id,
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    metadata: {
      title: body.title,
      assigneeId: body.assigneeId,
      dueDate: body.dueDate,
      priority: body.priority,
    },
    createdAt: new Date(),
  },
});

// In PATCH /api/tasks/[taskId] (after updateTask)
// Track status changes specifically
const statusChanged = oldStatus !== body.status;
await db.auditEvent.create({
  data: {
    id: crypto.randomUUID(),
    companyId: task.companyId,
    userId: user.id,
    action: statusChanged ? "task.status_changed" : "task.updated",
    entityType: "task",
    entityId: taskId,
    metadata: {
      changes: body,
      oldStatus: oldStatus,
      newStatus: body.status,
    },
    createdAt: new Date(),
  },
});

// In DELETE /api/tasks/[taskId] (after deleteTask)
await db.auditEvent.create({
  data: {
    id: crypto.randomUUID(),
    companyId: task.companyId,
    userId: user.id,
    action: "task.deleted",
    entityType: "task",
    entityId: taskId,
    metadata: { title: task.title },
    createdAt: new Date(),
  },
});
```

**Acceptance Test:**
1. Create task via API → Verify AuditEvent with action="task.created"
2. Update task status via API → Verify AuditEvent with action="task.status_changed"
3. Update task other fields via API → Verify AuditEvent with action="task.updated"
4. Delete task via API → Verify AuditEvent with action="task.deleted"

**Test File:** `tests/playwright/14-task-audit.spec.ts` (new)

---

### 1.3 Add Audit Events for Task Comments (Stage 3, D3)

**Priority:** P1 (High Impact, Low Effort)
**Estimated Effort:** 1-2 hours
**Impact:** Security compliance, collaboration audit trail

**Current State:**
- ✅ RBAC enforced (requireAuth)
- ✅ Tenant isolation (companyId in queries)
- ❌ NO audit events for comments

**Files to Touch:**
```
app/api/tasks/[taskId]/comments/route.ts (POST - line 50-120, DELETE - line 122-149)
```

**Implementation:**
```typescript
// In POST /api/tasks/[taskId]/comments (after createComment)
await db.auditEvent.create({
  data: {
    id: crypto.randomUUID(),
    companyId: task.companyId,
    userId: user.id,
    action: "task.comment_added",
    entityType: "task",
    entityId: taskId,
    metadata: {
      commentId: comment.id,
      contentPreview: body.content.substring(0, 100),
      isInternal: body.isInternal || false,
    },
    createdAt: new Date(),
  },
});

// In DELETE /api/tasks/[taskId]/comments/[commentId] (after deleteComment)
await db.auditEvent.create({
  data: {
    id: crypto.randomUUID(),
    companyId: task.companyId,
    userId: user.id,
    action: "task.comment_deleted",
    entityType: "task",
    entityId: taskId,
    metadata: { commentId },
    createdAt: new Date(),
  },
});
```

**Acceptance Test:**
1. Add comment via API → Verify AuditEvent with action="task.comment_added"
2. Delete comment via API → Verify AuditEvent with action="task.comment_deleted"

**Test File:** Can add to `tests/playwright/14-task-audit.spec.ts`

---

## PRIORITY 2: HIGH BUSINESS VALUE (Should Fix)

### 2.1 Add CSV Export for Dashboard Report (Stage 4, E1)

**Priority:** P2 (High Impact, Medium Effort)
**Estimated Effort:** 3-4 hours
**Impact:** Business reporting, data export for management

**Current State:**
- ✅ RBAC enforced (admin-only)
- ✅ Tenant isolation (companyId in queries)
- ✅ csvExport utility exists (src/lib/server/csvExport.ts)
- ❌ NO CSV export endpoint
- ❌ NO UI download button

**Files to Touch:**
```
app/api/admin/reports/dashboard/export/route.ts (NEW)
app/admin/reports/dashboard/page.tsx (add download button)
src/lib/server/csvExport.ts (use existing utility)
```

**Implementation:**
```typescript
// NEW FILE: app/api/admin/reports/dashboard/export/route.ts
import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { csvExport } from "@/lib/server/csvExport";

export async function GET() {
  await requireRoles("admin");
  const companyId = await requireCompanyId();

  const db = getPrisma();
  // Fetch same data as dashboard route
  const metrics = await getDashboardMetrics(db, companyId);

  // Format for CSV
  const rows = [
    { metric: "Pipeline Value", value: metrics.pipelineValue, count: metrics.pipelineCount },
    { metric: "Jobs Today", value: metrics.jobsToday, count: "" },
    { metric: "Overdue Invoices", value: metrics.overdueTotal, count: metrics.overdueInvoices },
    { metric: "Active Jobs", value: metrics.activeJobs, count: "" },
    { metric: "Pending Tasks", value: metrics.pendingTasks, count: "" },
    { metric: "Recent Enquiries", value: metrics.recentEnquiries, count: "" },
  ];

  const csv = csvExport(rows, ["metric", "value", "count"]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="dashboard-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
```

**UI Changes:**
```tsx
// In app/admin/reports/dashboard/page.tsx
<Button onClick={() => window.open('/api/admin/reports/dashboard/export', '_blank')}>
  <Download className="w-4 h-4 mr-2" />
  Export CSV
</Button>
```

**Acceptance Test:**
1. Navigate to dashboard as admin
2. Click "Export CSV" button
3. Verify CSV file downloads with correct filename
4. Verify CSV contains all metrics (pipeline value, jobs today, overdue invoices, etc.)
5. Verify CSV data matches dashboard UI

**Test File:** `tests/playwright/15-dashboard-export.spec.ts` (new)

---

### 2.2 Add CSV Export for A/R Aging Report (Stage 4, E2)

**Priority:** P2 (High Impact, Medium Effort)
**Estimated Effort:** 2-3 hours
**Impact:** Business reporting, CFO/finance team needs this

**Current State:**
- ✅ RBAC enforced (admin-only)
- ✅ Tenant isolation (companyId in queries)
- ❌ NO CSV export endpoint
- ❌ NO UI download button

**Files to Touch:**
```
app/api/admin/reports/ar-aging/export/route.ts (NEW)
app/admin/reports/ar-aging/page.tsx (add download button)
```

**Implementation:**
```typescript
// NEW FILE: app/api/admin/reports/ar-aging/export/route.ts
export async function GET() {
  await requireRoles("admin");
  const companyId = await requireCompanyId();

  const db = getPrisma();
  const invoices = await db.invoice.findMany({
    where: { companyId, status: { not: "paid" } },
    include: { client: true },
  });

  const rows = invoices.map(inv => ({
    invoiceNumber: inv.invoiceNumber,
    client: inv.client?.name || "",
    amount: inv.grandTotal,
    dueDate: inv.dueAt.toISOString().split('T')[0],
    daysOverdue: calculateDaysOverdue(inv.dueAt),
    agingBucket: getAgingBucket(inv.dueAt),
  }));

  const csv = csvExport(rows, ["invoiceNumber", "client", "amount", "dueDate", "daysOverdue", "agingBucket"]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="ar-aging-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
```

**Acceptance Test:**
1. Navigate to A/R Aging report as admin
2. Click "Export CSV" button
3. Verify CSV contains all overdue invoices with aging buckets
4. Verify CSV data matches report UI

**Test File:** `tests/playwright/16-ar-aging-export.spec.ts` (new)

---

### 2.3 Add CSV Export for Engineer Utilisation Report (Stage 4, E4)

**Priority:** P2 (High Impact, Medium Effort)
**Estimated Effort:** 2-3 hours
**Impact:** Operations reporting, resource planning

**Files to Touch:**
```
app/api/admin/reports/engineer-utilisation/export/route.ts (NEW)
app/admin/reports/engineer-utilisation/page.tsx (add download button)
```

**Implementation:** Similar pattern to 2.2, export engineer stats (hours worked, scheduled jobs, utilisation %)

**Acceptance Test:**
1. Export CSV from engineer utilisation report
2. Verify CSV contains engineer name, hours worked, scheduled jobs, utilisation %
3. Verify CSV data matches report UI

---

### 2.4 Add CSV Export for Quote Win Rate Report (Stage 4, E3)

**Priority:** P2 (Medium Impact, Medium Effort)
**Estimated Effort:** 2-3 hours
**Impact:** Sales reporting, business intelligence

**Files to Touch:**
```
app/api/admin/reports/quote-win-rate/export/route.ts (NEW)
app/admin/reports/quote-win-rate/page.tsx (add download button)
```

**Implementation:** Export quote funnel (sent/accepted/paid) by period

**Acceptance Test:**
1. Export CSV from quote win rate report
2. Verify CSV contains period, quotes sent, accepted, paid, win rate %
3. Verify CSV data matches report UI

---

### 2.5 Add CSV Export for Profitability Report (Stage 4, E5)

**Priority:** P2 (Medium Impact, Medium Effort)
**Estimated Effort:** 2-3 hours
**Impact:** Financial reporting, job profitability analysis

**Files to Touch:**
```
app/api/admin/reports/profitability/export/route.ts (NEW)
app/admin/reports/profitability/page.tsx (add download button)
```

**Implementation:** Export job profitability (revenue, costs, margin %)

**Acceptance Test:**
1. Export CSV from profitability report
2. Verify CSV contains job title, revenue, costs, profit, margin %
3. Verify CSV data matches report UI

---

## PRIORITY 3: TECHNICAL DEBT (Should Fix)

### 3.1 Add Playwright Tests for Reports (Stage 4, E2-E6)

**Priority:** P3 (Medium Impact, Medium Effort)
**Estimated Effort:** 1 day (2-3 hours per report)
**Impact:** Test coverage, regression prevention

**Current State:**
- ✅ Dashboard report exists
- ❌ NO tests for A/R Aging
- ❌ NO tests for Quote Win Rate
- ❌ NO tests for Engineer Utilisation
- ❌ NO tests for Profitability

**Files to Create:**
```
tests/playwright/17-ar-aging-report.spec.ts (NEW)
tests/playwright/18-quote-win-rate-report.spec.ts (NEW)
tests/playwright/19-engineer-utilisation-report.spec.ts (NEW)
tests/playwright/20-profitability-report.spec.ts (NEW)
```

**Test Structure (Template):**
```typescript
import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers";

test("Admin can view {REPORT_NAME} report", async ({ page, request }) => {
  await loginAs(page, "admin", "admin@demo.quantract");
  await loginAs(request, "admin", "admin@demo.quantract");

  // Navigate to report
  await page.goto("/admin/reports/{report-slug}");

  // Verify heading
  await expect(page.locator("h1")).toHaveText(/{REPORT_NAME}/i);

  // Verify report data loads
  await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

  // Verify date range filter works
  await page.fill("[name=startDate]", "2024-01-01");
  await page.fill("[name=endDate]", "2024-12-31");
  await page.click("button:has-text('Apply')");

  await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
});

test("Non-admin cannot access {REPORT_NAME} report", async ({ page }) => {
  await loginAs(page, "client", "client@demo.quantract");

  await page.goto("/admin/reports/{report-slug}");

  // Should redirect to client login or show 403
  await expect(page).toHaveURL(/\/client\/login/);
});
```

**Acceptance Test:**
1. Run `npm run test:e2e` → All 4 new report tests pass
2. Verify each report loads with RBAC enforcement
3. Verify date range filtering works
4. Verify non-admin users redirected

---

### 3.2 Add Playwright Tests for Background Queue (Stage 5, F5)

**Priority:** P3 (Medium Impact, Medium Effort)
**Estimated Effort:** 4-6 hours
**Impact:** Queue reliability, regression prevention

**Current State:**
- ✅ Queue infrastructure works
- ✅ Failed jobs UI works
- ❌ NO tests for queue operations

**Files to Create:**
```
tests/playwright/21-queue-jobs.spec.ts (NEW)
```

**Test Structure:**
```typescript
test("Email job is enqueued and processed", async ({ request }) => {
  // Login as admin
  await loginAs(request, "admin", "admin@demo.quantract");

  // Trigger email via API (e.g., send invoice)
  const res = await request.post("/api/admin/invoices/[id]/send", {
    data: { invoiceId: "test-invoice" },
  });

  expect(res.ok()).toBeTruthy();

  // Wait for job to process (poll failed jobs endpoint)
  await waitForJobProcessing(request, 5000);

  // Verify no failed jobs
  const failedRes = await request.get("/api/admin/jobs/failed");
  const failedData = await failedRes.json();

  expect(failedData.failedJobs).toHaveLength(0);
});

test("Failed job can be retried from UI", async ({ page, request }) => {
  // Create a job that will fail (e.g., invalid email)
  // ... trigger failing job ...

  // Navigate to failed jobs UI
  await page.goto("/admin/system/failed-jobs");

  // Verify failed job appears
  await expect(page.locator("text=/Failed Background Jobs/i")).toBeVisible();
  await expect(page.locator("text=/test-job/i")).toBeVisible();

  // Click retry button
  await page.click("button:has-text('Retry')");

  // Verify toast notification
  await expect(page.locator("text=/Job queued for retry/i")).toBeVisible();
});

test("Failed job can be removed from UI", async ({ page, request }) => {
  // Create a failed job
  // ... trigger failing job ...

  await page.goto("/admin/system/failed-jobs");

  // Click remove button
  await page.click("button:has-text('Remove')");

  // Confirm dialog
  await page.click("button:has-text('Confirm')");

  // Verify job removed
  await expect(page.locator("text=/No failed jobs/i")).toBeVisible();
});
```

**Acceptance Test:**
1. Run `npm run test:e2e` → Queue tests pass
2. Verify email jobs enqueued and processed
3. Verify failed jobs can be retried
4. Verify failed jobs can be removed

---

## PRIORITY 4: NICE-TO-HAVE FEATURES (Optional)

### 4.1 Implement @Mentions Parsing (Stage 3, D3)

**Priority:** P4 (Low Impact, Medium Effort)
**Estimated Effort:** 1 day
**Impact:** Collaboration UX improvement

**Current State:**
- ✅ Comments work
- ❌ NO @mention parsing
- ❌ NO @mention notifications

**Files to Touch:**
```
app/api/tasks/[taskId]/comments/route.ts (POST handler - line 50-120)
src/lib/parseMentions.ts (NEW - utility function)
src/lib/server/notifications.ts (NEW - notification handler)
```

**Implementation:**
```typescript
// NEW FILE: src/lib/parseMentions.ts
export function parseMentions(content: string): string[] {
  const regex = /@(\w+(?:\.\w+)?@[\w.-]+\.\w+)/g;
  const matches = content.match(regex);
  return matches ? matches.map(m => m.substring(1)) : [];
}

// In app/api/tasks/[taskId]/comments/route.ts (POST)
const mentionedEmails = parseMentions(body.content);

// Notify mentioned users
for (const email of mentionedEmails) {
  const user = await db.user.findFirst({ where: { email, companyId } });
  if (user) {
    await sendNotification({
      userId: user.id,
      type: "task_mention",
      title: `${currentUser.name} mentioned you in a comment`,
      body: `Task: ${task.title}`,
      linkUrl: `/tasks/${taskId}`,
    });
  }
}
```

**Acceptance Test:**
1. Add comment with @user@example.com
2. Verify mentioned user receives notification
3. Verify notification links to task

**Test File:** `tests/playwright/22-task-mentions.spec.ts` (new)

---

### 4.2 Enforce MFA in Login Flow (Stage 0, A1)

**Priority:** P4 (Low Impact, High Effort)
**Estimated Effort:** 2-3 days
**Impact:** Security improvement (optional for most customers)

**Current State:**
- ✅ MFA schema ready (mfaEnabled, mfaSecret, mfaBackupCodes fields)
- ✅ MFA helpers exist (generateMfaSecret, createMfaChallenge, verifyMfaChallenge)
- ❌ MFA NOT enforced in login flow (shouldRequireMfa always false)
- ❌ NO MFA enrollment UI
- ❌ NO MFA verification UI

**Files to Touch:**
```
app/api/auth/password/login/route.ts (modify to check shouldRequireMfa)
app/api/auth/magic-link/verify/route.ts (modify to check shouldRequireMfa)
app/auth/mfa-enroll/page.tsx (NEW - enrollment UI)
app/auth/mfa-verify/page.tsx (NEW - verification UI)
app/api/auth/mfa/enroll/route.ts (NEW - enrollment endpoint)
app/api/auth/mfa/verify/route.ts (NEW - verification endpoint)
```

**Implementation:**
```typescript
// In app/api/auth/password/login/route.ts (after password verification)
const requiresMfa = await shouldRequireMfa(user.id);
if (requiresMfa) {
  const { challengeToken } = await createMfaChallenge({
    userId: user.id,
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({
    ok: true,
    requiresMfa: true,
    challengeToken,
  });
}

// Otherwise, create session as normal
await setSession(user.role, { sessionId: session.id });
```

**Acceptance Test:**
1. User enrolls in MFA → Verify QR code shown, backup codes saved
2. User logs in → Verify MFA challenge shown
3. User enters TOTP code → Verify session created
4. User enters wrong code → Verify error shown
5. User uses backup code → Verify session created, code consumed

**Test File:** `tests/playwright/23-mfa-flow.spec.ts` (new)

---

### 4.3 Add Checklist Photo Upload (Stage 2, C4)

**Priority:** P4 (Low Impact, Medium Effort)
**Estimated Effort:** 1 day
**Impact:** Compliance improvement (photo evidence for inspections)

**Current State:**
- ✅ ChecklistItemPhoto model exists in schema
- ❌ NO API route for photo upload
- ❌ NO UI for photo upload

**Files to Touch:**
```
app/api/jobs/[jobId]/checklists/[checklistId]/items/[itemId]/photos/route.ts (NEW)
src/lib/server/storage.ts (use existing writeUploadBytes)
app/components/ChecklistItemCard.tsx (add photo upload UI)
```

**Implementation:**
```typescript
// NEW FILE: app/api/jobs/[jobId]/checklists/[checklistId]/items/[itemId]/photos/route.ts
export async function POST(req: Request, { params }: { params: { jobId: string, checklistId: string, itemId: string } }) {
  const { user } = await requireAuth();
  const companyId = await requireCompanyId();

  const formData = await req.formData();
  const file = formData.get("photo") as File;

  // Validate file type (image only)
  if (!file.type.startsWith("image/")) {
    return jsonErr("Only image files allowed", 400);
  }

  // Upload to storage
  const bytes = await file.arrayBuffer();
  const key = `checklists/${checklistId}/items/${itemId}/${crypto.randomUUID()}.jpg`;
  await writeUploadBytes(key, Buffer.from(bytes));

  // Create photo record
  const db = getPrisma();
  const photo = await db.checklistItemPhoto.create({
    data: {
      id: crypto.randomUUID(),
      companyId,
      checklistItemId: params.itemId,
      s3Key: key,
      uploadedById: user.id,
      uploadedAt: new Date(),
    },
  });

  return jsonOk({ photo });
}
```

**Acceptance Test:**
1. Upload photo to checklist item
2. Verify photo appears in item detail
3. Verify photo stored with correct companyId
4. Verify non-auth users cannot upload

**Test File:** `tests/playwright/24-checklist-photos.spec.ts` (new)

---

### 4.4 Add Compliance Checklist Report (Stage 2, C5)

**Priority:** P4 (Low Impact, Medium Effort)
**Estimated Effort:** 1 day
**Impact:** Compliance reporting (completion rates by template)

**Current State:**
- ✅ Checklist data exists
- ❌ NO compliance report route
- ❌ NO compliance report UI

**Files to Touch:**
```
app/api/admin/reports/compliance-checklists/route.ts (NEW)
app/admin/reports/compliance-checklists/page.tsx (NEW)
```

**Implementation:**
```typescript
// NEW FILE: app/api/admin/reports/compliance-checklists/route.ts
export async function GET() {
  await requireRoles("admin");
  const companyId = await requireCompanyId();

  const db = getPrisma();

  // Get all checklist templates
  const templates = await db.checklistTemplate.findMany({
    where: { companyId },
  });

  // For each template, calculate completion rate
  const stats = await Promise.all(templates.map(async (template) => {
    const checklists = await db.jobChecklist.findMany({
      where: { companyId, templateId: template.id },
      include: { items: true },
    });

    const totalItems = checklists.reduce((sum, cl) => sum + cl.items.length, 0);
    const completedItems = checklists.reduce(
      (sum, cl) => sum + cl.items.filter(i => i.status === "completed").length,
      0
    );

    return {
      templateName: template.title,
      jobsWithChecklist: checklists.length,
      completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      totalItems,
      completedItems,
    };
  }));

  return jsonOk({ stats });
}
```

**Acceptance Test:**
1. Navigate to compliance checklist report
2. Verify completion rates shown for each template
3. Verify data filtered by date range
4. Verify CSV export works

**Test File:** `tests/playwright/25-compliance-report.spec.ts` (new)

---

### 4.5 Add Queue Metrics Dashboard (Stage 5, F5)

**Priority:** P4 (Low Impact, Medium Effort)
**Estimated Effort:** 1 day
**Impact:** Operations monitoring (queue health visibility)

**Current State:**
- ✅ Failed jobs UI exists
- ❌ NO queue metrics (waiting/active/completed/failed counts)
- ❌ NO job latency tracking

**Files to Touch:**
```
app/api/admin/system/queue-metrics/route.ts (NEW)
app/admin/system/queue-metrics/page.tsx (NEW)
```

**Implementation:**
```typescript
// NEW FILE: app/api/admin/system/queue-metrics/route.ts
export async function GET() {
  await requireRoles("admin");

  const emailQueue = getEmailQueue();
  const pdfQueue = getPDFQueue();
  const reminderQueue = getReminderQueue();

  const [emailCounts, pdfCounts, reminderCounts] = await Promise.all([
    emailQueue.getJobCounts(),
    pdfQueue.getJobCounts(),
    reminderQueue.getJobCounts(),
  ]);

  return jsonOk({
    queues: [
      { name: "email", ...emailCounts },
      { name: "pdf", ...pdfCounts },
      { name: "reminder", ...reminderCounts },
    ],
  });
}
```

**Acceptance Test:**
1. Navigate to queue metrics page
2. Verify all 3 queues shown (email, pdf, reminder)
3. Verify counts shown (waiting, active, completed, failed)
4. Verify metrics refresh on page reload

**Test File:** Can add to `tests/playwright/21-queue-jobs.spec.ts`

---

## IMPLEMENTATION ROADMAP

### Week 1: Priority 1 (Audit Events)
- **Day 1:** Enquiry audit events (1.1) + tests
- **Day 2:** Task audit events (1.2) + tests
- **Day 3:** Comment audit events (1.3) + tests

**Deliverables:** All sensitive operations have audit trail

---

### Week 2: Priority 2 (CSV Exports)
- **Day 1:** Dashboard + A/R Aging CSV exports (2.1, 2.2)
- **Day 2:** Engineer Utilisation + Quote Win Rate CSV exports (2.3, 2.4)
- **Day 3:** Profitability CSV export (2.5) + manual testing

**Deliverables:** All reports exportable to CSV

---

### Week 3: Priority 3 (Tests)
- **Day 1:** Report tests (3.1) - 2 reports
- **Day 2:** Report tests (3.1) - 2 more reports
- **Day 3:** Queue tests (3.2)

**Deliverables:** Full E2E test coverage for reports + queue

---

### Week 4+ (Optional): Priority 4 (Nice-to-Have)
- **As needed:** @Mentions (4.1), MFA enforcement (4.2), Photo uploads (4.3), Compliance report (4.4), Queue metrics (4.5)

**Deliverables:** Feature completeness for advanced use cases

---

## ACCEPTANCE CRITERIA SUMMARY

### All ✅ Criteria Met When:
1. **Audit Events:** ALL create/update/delete operations on Enquiries, Tasks, Comments create AuditEvent records
2. **CSV Exports:** ALL 5 reports have /export endpoints + UI download buttons + tests
3. **Tests:** ALL reports have Playwright smoke tests verifying RBAC + data loading + CSV export
4. **Queue Tests:** Background jobs have E2E tests for enqueue, process, retry, remove
5. **(Optional) Nice-to-Have:** @mentions, MFA enforcement, photo uploads, compliance report, queue metrics implemented

### Definition of Done Checklist (Per Work Item):
- [ ] Code implemented in specified files
- [ ] RBAC enforced (requireRoles/requireAuth)
- [ ] Tenant isolation verified (companyId in queries)
- [ ] Audit events created (if sensitive operation)
- [ ] Tests written and passing
- [ ] Manual smoke test performed
- [ ] PR reviewed and merged

---

## APPENDIX A: RBAC VERIFICATION TEMPLATE

For each new endpoint, verify RBAC enforcement:

```typescript
// ✅ GOOD: RBAC enforced
export async function POST(req: Request) {
  await requireRoles("admin"); // Or requireAuth() for multi-role
  const companyId = await requireCompanyId(); // Tenant isolation

  // ... implementation ...
}

// ❌ BAD: NO RBAC enforcement
export async function POST(req: Request) {
  const db = getPrisma();
  // ... implementation WITHOUT requireRoles ...
}
```

---

## APPENDIX B: AUDIT EVENT TEMPLATE

For each sensitive operation (create/update/delete), create audit event:

```typescript
// After creating/updating/deleting entity
await db.auditEvent.create({
  data: {
    id: crypto.randomUUID(),
    companyId: entity.companyId,
    userId: user.id, // Or use actorRole/actor for system actions
    action: "entity.action_name", // e.g., "enquiry.created", "task.status_changed"
    entityType: "entity_type", // e.g., "enquiry", "task", "comment"
    entityId: entity.id,
    metadata: {
      // Relevant details (what changed, who initiated, etc.)
    },
    createdAt: new Date(),
  },
});
```

---

## APPENDIX C: CSV EXPORT TEMPLATE

For each report, add CSV export:

```typescript
// NEW FILE: app/api/admin/reports/{report}/export/route.ts
import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { csvExport } from "@/lib/server/csvExport";

export async function GET(req: Request) {
  await requireRoles("admin");
  const companyId = await requireCompanyId();

  // Fetch report data (same query as main report route)
  const data = await fetchReportData(companyId);

  // Format for CSV
  const rows = data.map(item => ({
    // Map fields to CSV columns
  }));

  const csv = csvExport(rows, ["column1", "column2", "column3"]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="{report}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
```

---

## APPENDIX D: TEST TEMPLATE

For each new feature, add Playwright test:

```typescript
import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers";

test("{Feature} works as expected", async ({ page, request }) => {
  // 1. Auth
  await loginAs(page, "admin", "admin@demo.quantract");
  await loginAs(request, "admin", "admin@demo.quantract");

  // 2. Navigate
  await page.goto("/path/to/feature");

  // 3. Verify heading/UI
  await expect(page.locator("h1")).toHaveText(/Feature Name/i);

  // 4. Test primary action
  await page.click("button:has-text('Action')");
  await expect(page.locator("text=/Success/i")).toBeVisible();

  // 5. Verify API result
  const res = await request.get("/api/endpoint");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.ok).toBeTruthy();
});

test("{Feature} enforces RBAC", async ({ page }) => {
  // Test non-admin access
  await loginAs(page, "client", "client@demo.quantract");
  await page.goto("/path/to/feature");

  // Should redirect or show 403
  await expect(page).toHaveURL(/\/client\/login/);
});
```

---

END OF GAP FIX PLAN
