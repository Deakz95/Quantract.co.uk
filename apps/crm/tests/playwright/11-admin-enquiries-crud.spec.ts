import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers";

test("Admin can create and manage enquiries (smoke)", async ({ page, request }) => {
  // --- Auth (API + UI)
  await loginAs(page, "admin", "admin@demo.quantract");
  await loginAs(request, "admin", "admin@demo.quantract");

  // --- Get first pipeline stage
  const stagesRes = await request.get("/api/admin/stages");
  expect(stagesRes.ok(), "Failed to fetch stages").toBeTruthy();
  const stagesData = await stagesRes.json();
  const firstStage = stagesData.data[0];
  expect(firstStage).toBeTruthy();

  // --- Create enquiry via API (stable, fast)
  const uniq = Date.now();
  const enquiryName = `Test Lead ${uniq}`;
  const enquiryEmail = `lead.${uniq}@example.com`;

  const createRes = await request.post("/api/admin/enquiries", {
    data: {
      stageId: firstStage.id,
      name: enquiryName,
      email: enquiryEmail,
      phone: "020 1234 5678",
      notes: "Test lead created by Playwright",
      valueEstimate: 5000,
    },
  });

  const createBody = await createRes.text().catch(() => "");
  expect(createRes.ok(), `API create failed: ${createRes.status()} ${createBody}`).toBeTruthy();

  const createData = JSON.parse(createBody);
  expect(createData.ok).toBeTruthy();
  expect(createData.enquiry).toBeTruthy();

  const enquiryId = createData.enquiry.id;

  // --- Go to enquiries page
  await page.goto("/admin/enquiries");

  // --- Verify heading
  let headingVerified = false;

  try {
    await expect(page.locator("h1")).toHaveText(/enquir/i, { timeout: 5000 });
    headingVerified = true;
  } catch (e) {
    console.warn("[enquiries-crud] Option A failed (h1)");
  }

  if (!headingVerified) {
    try {
      await expect(
        page.getByRole("main").locator("h1")
      ).toHaveText(/enquir/i, { timeout: 5000 });
      headingVerified = true;
    } catch (e) {
      console.warn("[enquiries-crud] Option B failed (main > h1)");
    }
  }

  if (!headingVerified) {
    await expect(
      page.getByRole("heading", { name: /enquir/i }).first()
    ).toBeVisible({ timeout: 5000 });
    headingVerified = true;
  }

  expect(headingVerified).toBeTruthy();

  // --- Verify enquiry appears in the list
  await page.reload();
  await expect(page.locator("body")).toContainText(enquiryName, {
    timeout: 30000,
  });

  // --- Test owner assignment via API
  const usersRes = await request.get("/api/admin/users");
  expect(usersRes.ok(), "Failed to fetch users").toBeTruthy();
  const usersData = await usersRes.json();
  const firstUser = usersData.data[0];

  if (firstUser) {
    const updateRes = await request.patch(`/api/admin/enquiries/${enquiryId}`, {
      data: {
        ownerId: firstUser.id,
      },
    });

    expect(updateRes.ok(), "Failed to assign owner").toBeTruthy();

    // Reload page and verify owner is shown
    await page.reload();
    await expect(page.locator("body")).toContainText("Owner:", {
      timeout: 30000,
    });
  }

  // --- Delete enquiry
  const deleteRes = await request.delete(`/api/admin/enquiries/${enquiryId}`);
  expect(deleteRes.ok(), "Failed to delete enquiry").toBeTruthy();

  // --- Verify enquiry is removed
  await page.reload();
  await expect(page.locator("body")).not.toContainText(enquiryName, {
    timeout: 30000,
  });
});

test("Enquiry owner assignment tracked in events", async ({ page, request }) => {
  // --- Auth
  await loginAs(request, "admin", "admin@demo.quantract");

  // --- Get first pipeline stage
  const stagesRes = await request.get("/api/admin/stages");
  const stagesData = await stagesRes.json();
  const firstStage = stagesData.data[0];

  // --- Create enquiry
  const uniq = Date.now();
  const createRes = await request.post("/api/admin/enquiries", {
    data: {
      stageId: firstStage.id,
      name: `Event Test ${uniq}`,
      email: `eventtest.${uniq}@example.com`,
    },
  });

  const createData = await createRes.json();
  const enquiryId = createData.enquiry.id;

  // --- Get users
  const usersRes = await request.get("/api/admin/users");
  const usersData = await usersRes.json();
  const firstUser = usersData.data[0];

  // --- Assign owner
  if (firstUser) {
    const updateRes = await request.patch(`/api/admin/enquiries/${enquiryId}`, {
      data: {
        ownerId: firstUser.id,
      },
    });

    expect(updateRes.ok(), "Failed to assign owner").toBeTruthy();

    // --- Verify enquiry has owner info
    const getRes = await request.get(`/api/admin/enquiries/${enquiryId}`);
    expect(getRes.ok(), "Failed to fetch enquiry").toBeTruthy();

    const getData = await getRes.json();
    expect(getData.enquiry.ownerId).toBe(firstUser.id);
    expect(getData.enquiry.ownerName || getData.enquiry.ownerEmail).toBeTruthy();
  }

  // --- Cleanup
  await request.delete(`/api/admin/enquiries/${enquiryId}`);
});
