import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Gaya dasar seluruh kontrol form. Diekspor agar panel filter dan halaman
 * katalog memakai kelas yang sama tanpa menduplikasi string panjang.
 */
export const fieldClasses =
  "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm text-foreground " +
  "transition-colors placeholder:text-muted-foreground " +
  "hover:border-muted-foreground/50 " +
  "focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export interface FieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function FieldLabel({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}
    >
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="mt-1.5 text-xs text-danger">{children}</p>;
}

export function FieldHint({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="w-full">
      {label ? (
        <FieldLabel htmlFor={inputId} required={props.required}>
          {label}
        </FieldLabel>
      ) : null}
      <input
        id={inputId}
        className={cn(fieldClasses, error && "border-danger", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      <FieldError>{error}</FieldError>
      <FieldHint>{hint}</FieldHint>
    </div>
  );
}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name;

  return (
    <div className="w-full">
      {label ? (
        <FieldLabel htmlFor={inputId} required={props.required}>
          {label}
        </FieldLabel>
      ) : null}
      <textarea
        id={inputId}
        className={cn(fieldClasses, "min-h-24", error && "border-danger", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      <FieldError>{error}</FieldError>
      <FieldHint>{hint}</FieldHint>
    </div>
  );
}

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({
  label,
  error,
  hint,
  id,
  className,
  children,
  ...props
}: SelectProps) {
  const inputId = id ?? props.name;

  return (
    <div className="w-full">
      {label ? (
        <FieldLabel htmlFor={inputId} required={props.required}>
          {label}
        </FieldLabel>
      ) : null}
      <select
        id={inputId}
        className={cn(fieldClasses, error && "border-danger", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
      <FieldError>{error}</FieldError>
      <FieldHint>{hint}</FieldHint>
    </div>
  );
}
