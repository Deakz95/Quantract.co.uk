import * as React from "react";
import { cn } from "@/lib/cn";

export type CardVariant = "default" | "glass" | "gradient" | "elevated" | "interactive";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-[var(--card)] border border-[var(--border)] shadow-sm",
  glass: "glass",
  gradient: "bg-gradient-to-br from-[var(--card)] to-[var(--muted)] border border-[var(--border)] shadow-md",
  elevated: "bg-[var(--card)] border border-[var(--border)] shadow-xl",
  interactive: "bg-[var(--card)] border border-[var(--border)] shadow-sm hover:shadow-lg hover:border-[var(--primary)]/30 hover:-translate-y-1 cursor-pointer",
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-300",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-lg font-bold text-[var(--foreground)] tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1.5 text-sm text-[var(--muted-foreground)]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-5 pt-0 sm:p-6 sm:pt-0 flex items-center gap-3",
        className
      )}
      {...props}
    />
  );
}
