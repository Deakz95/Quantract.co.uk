/**
 * Import Validation Utility
 *
 * Validates imported data against expected schemas for different entity types.
 */

export type EntityType = "contact" | "client" | "deal";

export type ColumnMapping = {
  [csvColumn: string]: string; // Maps CSV column name to entity field name
};

export type TargetField = {
  name: string;
  label: string;
  required: boolean;
  type: "string" | "email" | "number" | "date" | "boolean";
};

export type ValidationError = {
  row: number;
  column?: string;
  field?: string;
  message: string;
};

export type ValidationResult = {
  validRows: number;
  totalRows: number;
  errorRows: { row: number; errors: string[] }[];
};

// Target fields for each entity type
export const TARGET_FIELDS: Record<EntityType, TargetField[]> = {
  contact: [
    { name: "firstName", label: "First Name", required: true, type: "string" },
    { name: "lastName", label: "Last Name", required: true, type: "string" },
    { name: "email", label: "Email", required: false, type: "email" },
    { name: "phone", label: "Phone", required: false, type: "string" },
    { name: "mobile", label: "Mobile", required: false, type: "string" },
    { name: "jobTitle", label: "Job Title", required: false, type: "string" },
    { name: "notes", label: "Notes", required: false, type: "string" },
    { name: "preferredChannel", label: "Preferred Channel", required: false, type: "string" },
  ],
  client: [
    { name: "name", label: "Company Name", required: true, type: "string" },
    { name: "email", label: "Email", required: true, type: "email" },
    { name: "phone", label: "Phone", required: false, type: "string" },
    { name: "address1", label: "Address Line 1", required: false, type: "string" },
    { name: "address2", label: "Address Line 2", required: false, type: "string" },
    { name: "city", label: "City", required: false, type: "string" },
    { name: "county", label: "County/State", required: false, type: "string" },
    { name: "postcode", label: "Postcode/ZIP", required: false, type: "string" },
    { name: "country", label: "Country", required: false, type: "string" },
    { name: "notes", label: "Notes", required: false, type: "string" },
  ],
  deal: [
    { name: "title", label: "Deal Title", required: true, type: "string" },
    { name: "value", label: "Value", required: false, type: "number" },
    { name: "probability", label: "Probability (%)", required: false, type: "number" },
    { name: "expectedCloseDate", label: "Expected Close Date", required: false, type: "date" },
    { name: "notes", label: "Notes", required: false, type: "string" },
    { name: "source", label: "Source", required: false, type: "string" },
  ],
};

/**
 * Validate a single field value
 */
function validateField(
  value: string | undefined,
  field: TargetField
): string | null {
  const trimmedValue = value?.trim() || "";

  // Check required
  if (field.required && !trimmedValue) {
    return `${field.label} is required`;
  }

  // Skip validation for empty optional fields
  if (!trimmedValue) {
    return null;
  }

  // Type validation
  switch (field.type) {
    case "email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedValue)) {
        return `${field.label} must be a valid email address`;
      }
      break;

    case "number":
      const num = parseFloat(trimmedValue.replace(/[,$]/g, ""));
      if (isNaN(num)) {
        return `${field.label} must be a valid number`;
      }
      break;

    case "date":
      const date = new Date(trimmedValue);
      if (isNaN(date.getTime())) {
        return `${field.label} must be a valid date`;
      }
      break;

    case "boolean":
      const lower = trimmedValue.toLowerCase();
      if (!["true", "false", "yes", "no", "1", "0", "y", "n"].includes(lower)) {
        return `${field.label} must be true/false, yes/no, or 1/0`;
      }
      break;
  }

  return null;
}

/**
 * Validate all rows against the mapping
 */
export function validateImportData(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  entityType: EntityType
): ValidationResult {
  const targetFields = TARGET_FIELDS[entityType];
  const errorRows: { row: number; errors: string[] }[] = [];
  let validRows = 0;

  // Create a map from CSV column index to target field
  const columnIndexToField: Map<number, TargetField> = new Map();
  for (const [csvColumn, fieldName] of Object.entries(mapping)) {
    const columnIndex = headers.indexOf(csvColumn);
    if (columnIndex !== -1) {
      const field = targetFields.find((f) => f.name === fieldName);
      if (field) {
        columnIndexToField.set(columnIndex, field);
      }
    }
  }

  // Validate each row
  rows.forEach((row, rowIndex) => {
    const errors: string[] = [];

    // Check required fields are mapped and have values
    for (const field of targetFields) {
      if (field.required) {
        // Find if this field is mapped
        let isMapped = false;
        let value: string | undefined;

        for (const [csvColumn, fieldName] of Object.entries(mapping)) {
          if (fieldName === field.name) {
            isMapped = true;
            const columnIndex = headers.indexOf(csvColumn);
            if (columnIndex !== -1 && columnIndex < row.length) {
              value = row[columnIndex];
            }
            break;
          }
        }

        if (!isMapped) {
          errors.push(`Required field "${field.label}" is not mapped`);
        } else {
          const error = validateField(value, field);
          if (error) {
            errors.push(error);
          }
        }
      }
    }

    // Validate mapped fields
    for (const [columnIndex, field] of columnIndexToField) {
      if (!field.required && columnIndex < row.length) {
        const value = row[columnIndex];
        const error = validateField(value, field);
        if (error) {
          errors.push(error);
        }
      }
    }

    if (errors.length > 0) {
      errorRows.push({ row: rowIndex + 2, errors }); // +2 because row 1 is header, and we're 0-indexed
    } else {
      validRows++;
    }
  });

  return {
    validRows,
    totalRows: rows.length,
    errorRows,
  };
}

/**
 * Convert a row to an entity object based on mapping
 */
export function rowToEntity(
  headers: string[],
  row: string[],
  mapping: ColumnMapping,
  entityType: EntityType
): Record<string, any> {
  const targetFields = TARGET_FIELDS[entityType];
  const entity: Record<string, any> = {};

  for (const [csvColumn, fieldName] of Object.entries(mapping)) {
    const columnIndex = headers.indexOf(csvColumn);
    if (columnIndex === -1 || columnIndex >= row.length) continue;

    const value = row[columnIndex]?.trim() || "";
    if (!value) continue;

    const field = targetFields.find((f) => f.name === fieldName);
    if (!field) continue;

    // Convert value based on type
    switch (field.type) {
      case "number":
        entity[fieldName] = parseFloat(value.replace(/[,$]/g, "")) || 0;
        break;
      case "date":
        entity[fieldName] = new Date(value);
        break;
      case "boolean":
        const lower = value.toLowerCase();
        entity[fieldName] = ["true", "yes", "1", "y"].includes(lower);
        break;
      default:
        entity[fieldName] = value;
    }
  }

  return entity;
}
