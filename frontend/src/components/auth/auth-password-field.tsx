"use client";

import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

import { cn } from "@/lib/utils";

interface AuthPasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export const AuthPasswordField = forwardRef<HTMLInputElement, AuthPasswordFieldProps>(
  ({ label, icon: Icon, error, className, id, required, name, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const fieldId = id ?? name ?? label;

    return (
      <div className="relative">
        <label
          htmlFor={fieldId}
          className="mb-2 block text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d]"
        >
          {label}
        </label>
        <div className="group relative">
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#76777d] transition-colors group-focus-within:text-[#2563EB]"
            aria-hidden="true"
          />
          <input
            ref={ref}
            id={fieldId}
            name={name}
            type={visible ? "text" : "password"}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={cn(
              "w-full rounded-lg border-none bg-[#f2f4f6] py-3 pl-10 pr-12 text-sm text-[#191c1e] outline-none transition-all duration-200 placeholder:text-[#76777d]/70 focus:ring-2 focus:ring-[#2563EB]",
              error && "ring-2 ring-[#ba1a1a]",
              className
            )}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#76777d] transition-colors hover:text-[#45464d]"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? (
              <EyeOff className="h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
          </button>
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

AuthPasswordField.displayName = "AuthPasswordField";
