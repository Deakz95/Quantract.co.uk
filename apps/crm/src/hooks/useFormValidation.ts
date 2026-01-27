"use client";

import { useCallback, useState } from "react";

// Validation rule types
export type ValidationRule<T = string> = {
  validate: (value: T, formValues?: Record<string, unknown>) => boolean;
  message: string;
};

export type FieldValidationRules<T = string> = {
  required?: boolean | string;
  email?: boolean | string;
  minLength?: { value: number; message?: string };
  maxLength?: { value: number; message?: string };
  pattern?: { value: RegExp; message: string };
  custom?: ValidationRule<T> | ValidationRule<T>[];
};

export type ValidationSchema = {
  [field: string]: FieldValidationRules;
};

export type ValidationErrors = {
  [field: string]: string;
};

export type TouchedFields = {
  [field: string]: boolean;
};

export type UseFormValidationReturn<T extends Record<string, unknown>> = {
  errors: ValidationErrors;
  touched: TouchedFields;
  isValid: boolean;
  validateField: (field: keyof T, value: unknown) => string;
  validateAll: (values: T) => boolean;
  setFieldTouched: (field: keyof T) => void;
  clearErrors: () => void;
  clearFieldError: (field: keyof T) => void;
  setError: (field: keyof T, message: string) => void;
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateFieldValue(
  value: unknown,
  rules: FieldValidationRules,
  formValues?: Record<string, unknown>
): string {
  const stringValue = value == null ? "" : String(value);
  const trimmedValue = stringValue.trim();

  // Required validation
  if (rules.required) {
    const isEmpty = trimmedValue === "";
    if (isEmpty) {
      return typeof rules.required === "string" ? rules.required : "This field is required";
    }
  }

  // Skip other validations if value is empty and not required
  if (trimmedValue === "" && !rules.required) {
    return "";
  }

  // Email validation
  if (rules.email && trimmedValue) {
    if (!EMAIL_REGEX.test(trimmedValue)) {
      return typeof rules.email === "string" ? rules.email : "Please enter a valid email address";
    }
  }

  // Min length validation
  if (rules.minLength && trimmedValue.length < rules.minLength.value) {
    return rules.minLength.message || `Minimum ${rules.minLength.value} characters required`;
  }

  // Max length validation
  if (rules.maxLength && trimmedValue.length > rules.maxLength.value) {
    return rules.maxLength.message || `Maximum ${rules.maxLength.value} characters allowed`;
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.value.test(trimmedValue)) {
    return rules.pattern.message;
  }

  // Custom validation(s)
  if (rules.custom) {
    const customRules = Array.isArray(rules.custom) ? rules.custom : [rules.custom];
    for (const rule of customRules) {
      if (!rule.validate(trimmedValue as any, formValues)) {
        return rule.message;
      }
    }
  }

  return "";
}

export function useFormValidation<T extends Record<string, unknown>>(
  schema: ValidationSchema
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  const validateField = useCallback(
    (field: keyof T, value: unknown, formValues?: Record<string, unknown>): string => {
      const rules = schema[field as string];
      if (!rules) return "";

      const error = validateFieldValue(value, rules, formValues);
      setErrors((prev) => {
        if (prev[field as string] === error) return prev;
        return { ...prev, [field as string]: error };
      });
      return error;
    },
    [schema]
  );

  const validateAll = useCallback(
    (values: T): boolean => {
      const newErrors: ValidationErrors = {};
      let hasError = false;

      for (const field of Object.keys(schema)) {
        const error = validateFieldValue(values[field], schema[field], values as Record<string, unknown>);
        if (error) {
          newErrors[field] = error;
          hasError = true;
        }
      }

      setErrors(newErrors);

      // Mark all fields as touched
      const allTouched: TouchedFields = {};
      for (const field of Object.keys(schema)) {
        allTouched[field] = true;
      }
      setTouched(allTouched);

      return !hasError;
    },
    [schema]
  );

  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched((prev) => {
      if (prev[field as string]) return prev;
      return { ...prev, [field as string]: true };
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  const setError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field as string]: message }));
    setTouched((prev) => ({ ...prev, [field as string]: true }));
  }, []);

  // Calculate isValid based on current errors
  const isValid = Object.values(errors).every((error) => !error);

  return {
    errors,
    touched,
    isValid,
    validateField,
    validateAll,
    setFieldTouched,
    clearErrors,
    clearFieldError,
    setError,
  };
}

// Helper to create common validation schemas
export const validationRules = {
  required: (message?: string): FieldValidationRules => ({
    required: message || true,
  }),
  email: (required = false): FieldValidationRules => ({
    required,
    email: true,
  }),
  requiredEmail: (requiredMessage?: string, emailMessage?: string): FieldValidationRules => ({
    required: requiredMessage || true,
    email: emailMessage || true,
  }),
  optionalEmail: (): FieldValidationRules => ({
    email: true,
  }),
  minLength: (min: number, message?: string): FieldValidationRules => ({
    minLength: { value: min, message },
  }),
  maxLength: (max: number, message?: string): FieldValidationRules => ({
    maxLength: { value: max, message },
  }),
};
