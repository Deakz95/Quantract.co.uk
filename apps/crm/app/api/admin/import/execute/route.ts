import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { readUploadBytes } from "@/lib/server/storage";
import { parseCSV } from "@/lib/server/csvParser";
import {
  rowToEntity,
  validateImportData,
  type ColumnMapping,
  type EntityType,
} from "@/lib/server/importValidation";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/admin/import/execute
 * Execute the import and create records
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  const authCtx = await requireCompanyContext();
  const effectiveRole = getEffectiveRole(authCtx);
  if (effectiveRole !== "admin" && effectiveRole !== "office") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const companyId = authCtx.companyId;
  const auth = authCtx;

  const prisma = getPrisma();

  try {
    const body = await req.json();
    const { fileKey, mapping, entityType, fileName } = body as {
      fileKey: string;
      mapping: ColumnMapping;
      entityType: EntityType;
      fileName: string;
    };

    if (!fileKey || !mapping || !entityType) {
      return NextResponse.json(
        { ok: false, error: "fileKey, mapping, and entityType are required" },
        { status: 400 }
      );
    }

    // Read the stored file
    const fileBuffer = readUploadBytes(fileKey);
    if (!fileBuffer) {
      return NextResponse.json(
        { ok: false, error: "File not found. It may have expired. Please upload again." },
        { status: 404 }
      );
    }

    // Parse the file
    const content = fileBuffer.toString("utf-8");
    const parsed = parseCSV(content);

    // Validate first
    const validation = validateImportData(
      parsed.headers,
      parsed.rows,
      mapping,
      entityType
    );

    // Create ImportJob record
    const importId = randomUUID();
    const importJob = await prisma.importJob.create({
      data: {
        id: importId,
        companyId,
        userId: auth.userId,
        entityType,
        fileName: fileName || "import.csv",
        fileKey,
        status: "processing",
        totalRows: parsed.rows.length,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        mapping: mapping as any,
        errors: [],
      },
    });

    // Process rows
    let successCount = 0;
    let errorCount = 0;
    const errors: { row: number; errors: string[] }[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const rowNum = i + 2; // +2 for header row and 0-index

      try {
        // Check if this row has validation errors
        const rowErrors = validation.errorRows.find((e) => e.row === rowNum);
        if (rowErrors) {
          errorCount++;
          errors.push(rowErrors);
          continue;
        }

        // Convert row to entity
        const entityData = rowToEntity(
          parsed.headers,
          row,
          mapping,
          entityType
        );

        // Create entity based on type
        switch (entityType) {
          case "contact":
            await prisma.contact.create({
              data: {
                id: randomUUID(),
                companyId,
                firstName: entityData.firstName || "",
                lastName: entityData.lastName || "",
                email: entityData.email || null,
                phone: entityData.phone || null,
                mobile: entityData.mobile || null,
                jobTitle: entityData.jobTitle || null,
                notes: entityData.notes || null,
                preferredChannel: entityData.preferredChannel || "email",
                updatedAt: new Date(),
              },
            });
            break;

          case "client":
            await prisma.client.create({
              data: {
                id: randomUUID(),
                companyId,
                name: entityData.name || "",
                email: entityData.email || "",
                phone: entityData.phone || null,
                address1: entityData.address1 || null,
                address2: entityData.address2 || null,
                city: entityData.city || null,
                county: entityData.county || null,
                postcode: entityData.postcode || null,
                country: entityData.country || null,
                notes: entityData.notes || null,
                updatedAt: new Date(),
              },
            });
            break;

          case "deal":
            // Get first deal stage for the company
            let dealStage = await prisma.dealStage.findFirst({
              where: { companyId },
              orderBy: { sortOrder: "asc" },
            });

            // Create default stage if none exists
            if (!dealStage) {
              dealStage = await prisma.dealStage.create({
                data: {
                  id: randomUUID(),
                  companyId,
                  name: "New",
                  sortOrder: 0,
                  updatedAt: new Date(),
                },
              });
            }

            await prisma.deal.create({
              data: {
                id: randomUUID(),
                companyId,
                stageId: dealStage.id,
                title: entityData.title || "",
                value: entityData.value || 0,
                probability: entityData.probability || null,
                expectedCloseDate: entityData.expectedCloseDate || null,
                notes: entityData.notes || null,
                source: entityData.source || "import",
                updatedAt: new Date(),
              },
            });
            break;
        }

        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push({
          row: rowNum,
          errors: [err.message || "Failed to create record"],
        });
      }

      // Update progress periodically
      if ((i + 1) % 10 === 0 || i === parsed.rows.length - 1) {
        await prisma.importJob.update({
          where: { id: importId },
          data: {
            processedRows: i + 1,
            successCount,
            errorCount,
          },
        });
      }
    }

    // Mark as completed
    await prisma.importJob.update({
      where: { id: importId },
      data: {
        status: errorCount === parsed.rows.length ? "failed" : "completed",
        processedRows: parsed.rows.length,
        successCount,
        errorCount,
        errors: errors as any,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      importId,
    });
  } catch (error: any) {
    console.error("[import/execute] Error:", error);
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json(
      { ok: false, error: "Failed to execute import" },
      { status: 500 }
    );
  }
});
