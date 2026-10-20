"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { PASSWORD_RULES, type PasswordStrength } from "@/validators/register";

interface PasswordStrengthMeterProps {
  password: string;
}

const RULE_LABELS: Record<string, string> = {
  length: "8+ Characters",
  upper: "Uppercase (A-Z)",
  lower: "Lowercase (a-z)",
  number: "Number (0-9)",
  special: "Special Char (@#$!)"
};

function getStrength(password: string): PasswordStrength {
  const score = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (password.length === 0 || score < 3) return "weak";
  if (score < 5) return "medium";
  return "strong";
}

const STRENGTH_LABEL: Record<PasswordStrength, { text: string; className: string }> = {
  weak: { text: "WEAK", className: "text-[#ba1a1a]" },
  medium: { text: "MEDIUM", className: "text-yellow-600" },
  strong: { text: "STRONG", className: "text-green-600" }
};

const BAR_COLORS: Record<PasswordStrength, string[]> = {
  weak: ["bg-red-500", "bg-[#c6c6cd]", "bg-[#c6c6cd]"],
  medium: ["bg-yellow-500", "bg-yellow-500", "bg-[#c6c6cd]"],
  strong: ["bg-green-500", "bg-green-500", "bg-green-500"]
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getStrength(password);
  const label = STRENGTH_LABEL[strength];
  const bars = BAR_COLORS[strength];

  return (
    <div className="space-y-3 rounded-lg bg-[#eceef0] p-4" aria-live="polite">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d]">
          Password Strength
        </span>
        <span className={cn("text-xs font-bold uppercase tracking-[0.05em]", label.className)}>
          {password.length === 0 ? "WEAK" : label.text}
        </span>
      </div>

      <div className="flex h-1 gap-1 overflow-hidden rounded-full">
        {bars.map((color, i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-all duration-300", color)}
            role="presentation"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-[11px] transition-colors duration-200",
                passed ? "text-green-600" : "text-[#45464d]"
              )}
            >
              {passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
              )}
              {RULE_LABELS[rule.id] ?? rule.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
