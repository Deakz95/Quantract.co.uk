"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  touched?: boolean;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}

/**
 * FormField wrapper component that combines:
 * - Label with optional asterisk for required fields
 * - Input element (passed as children)
 * - Error message display below input
 * - Red border styling when invalid (error + touched)
 */
export function FormField({
  label,
  required = false,
  error,
  touched = true,
  htmlFor,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  const showError = Boolean(error && touched);

  return (
    <div className={cn("grid gap-1", className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          "text-xs font-semibold text-[var(--muted-foreground)]",
          labelClassName
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {/* Clone children to add error styling if needed */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childProps = child.props as Record<string, unknown>;
          const existingClassName = (childProps.className as string) || "";

          // Add error border class if there's an error
          const errorClassName = showError
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "";

          return React.cloneElement(child as React.ReactElement<any>, {
            className: cn(existingClassName, errorClassName),
            "aria-invalid": showError ? true : undefined,
            "aria-describedby": showError && htmlFor ? `${htmlFor}-error` : undefined,
          });
        }
        return child;
      })}
      {showError && (
        <span
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="text-xs text-red-500 mt-0.5"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}

// Input wrapper with consistent styling for form validation
export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "rounded-2xl border bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm transition-colors",
          hasError
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-[var(--border)] focus:border-[var(--primary)]",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          className
        )}
        {...props}
      />
    );
  }
);
FormInput.displayName = "FormInput";

// Select wrapper with consistent styling for form validation
export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, hasError, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "rounded-2xl border bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm transition-colors",
          hasError
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-[var(--border)] focus:border-[var(--primary)]",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
FormSelect.displayName = "FormSelect";

// Textarea wrapper with consistent styling for form validation
export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[80px] rounded-2xl border bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm transition-colors",
          hasError
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-[var(--border)] focus:border-[var(--primary)]",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          className
        )}
        {...props}
      />
    );
  }
);
FormTextarea.displayName = "FormTextarea";

// Loading spinner component for submit buttons
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin h-4 w-4", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
