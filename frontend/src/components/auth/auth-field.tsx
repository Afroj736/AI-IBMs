"use client";

import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
  optional?: boolean;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon: Icon, error, optional, className, id, required, ...props }, ref) => {
    const fieldId = id ?? props.name;
    const labelText = optional ? `${label} (OPTIONAL)` : label;

    return (
      <div className="relative">
        <label
          htmlFor={fieldId}
          className="mb-2 block text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d]"
        >
          {labelText}
        </label>
        <div className="group relative">
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#76777d] transition-colors group-focus-within:text-[#2563EB]"
            aria-hidden="true"
          />
          <input
            ref={ref}
            id={fieldId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={cn(
              "w-full rounded-lg border-none bg-[#f2f4f6] py-3 pl-10 pr-4 text-sm text-[#191c1e] outline-none transition-all duration-200 placeholder:text-[#76777d]/70 focus:ring-2 focus:ring-[#2563EB]",
              error && "ring-2 ring-[#ba1a1a]",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-[#ba1a1a]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthField.displayName = "AuthField";
