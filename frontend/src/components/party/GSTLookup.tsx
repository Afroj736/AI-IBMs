"use client";

import { Check, Loader2 } from "lucide-react";
import { useCallback, useRef } from "react";

import { useGSTLookup } from "@/hooks/useGSTLookup";
import { cn } from "@/lib/utils";
import type { GSTPartyFieldMapping } from "@/types/gst";
import { GSTIN_LENGTH, isValidGSTIN, normalizeGSTIN } from "@/validators/gst";

interface GSTLookupProps {
  value: string;
  onChange: (value: string) => void;
  onFetched: (fields: GSTPartyFieldMapping) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "embedded";
  inputClassName?: string;
  labelClassName?: string;
}

const defaultInputClass =
  "h-12 w-full rounded-lg border-transparent bg-[#f2f4f6] px-4 text-base text-[#191c1e] uppercase tracking-wider outline-none transition placeholder:text-[#76777d] focus:border-[#712ae2] focus:ring-2 focus:ring-[#712ae2]/10";

export function GSTLookup({
  value,
  onChange,
  onFetched,
  disabled,
  className,
  variant = "default",
  inputClassName,
  labelClassName
}: GSTLookupProps) {
  const lastFetchedRef = useRef<string>("");
  const inputClass = inputClassName ?? defaultInputClass;
  const labelClass =
    labelClassName ?? "text-xs font-semibold uppercase tracking-wider text-[#45464d]";

  const { fetchDetails, isLoading, isVerified, fetchError, validationError, reset } = useGSTLookup({
    onSuccess: (_details, fields) => {
      lastFetchedRef.current = fields.gstin;
      onFetched(fields);
    }
  });

  const normalized = normalizeGSTIN(value);
  const isComplete = normalized.length === GSTIN_LENGTH;
  const isFormatValid = isValidGSTIN(value);
  const showSuggestion = isComplete && isFormatValid && !isVerified && !isLoading;

  const handleFetch = useCallback(() => {
    void fetchDetails(value);
  }, [fetchDetails, value]);

  const handleChange = (next: string) => {
    const upper = next.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, GSTIN_LENGTH);
    onChange(upper);
    if (upper !== lastFetchedRef.current) {
      reset();
    }
  };

  const fetchButton = (
    <button
      type="button"
      onClick={handleFetch}
      disabled={disabled || isLoading || !isComplete}
      className={cn(
        variant === "embedded"
          ? "absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-md bg-[#8a4cfc] px-4 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          : "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#712ae2] px-5 text-sm font-semibold text-white hover:bg-[#5a1fb8] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        showSuggestion && !isLoading && variant !== "embedded" && "ring-2 ring-[#712ae2]/30"
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {variant === "embedded" ? "..." : "Fetching..."}
        </>
      ) : variant === "embedded" ? (
        "Fetch"
      ) : (
        "Fetch Details"
      )}
    </button>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <label className={labelClass}>
          GST Number <span className="text-[#ba1a1a]">*</span>
        </label>
        {isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#027A48]">
            <Check className="h-3 w-3" aria-hidden />
            GST Verified
          </span>
        )}
      </div>

      {variant === "embedded" ? (
        <div className="relative flex items-center">
          <input
            type="text"
            className={cn(inputClass, "pr-24")}
            placeholder="e.g. 27ABCDE1234F1Z5"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled || isLoading}
            maxLength={GSTIN_LENGTH}
            aria-invalid={!!validationError}
            aria-describedby="gst-lookup-hints"
          />
          {fetchButton}
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              className={inputClass}
              placeholder="27ABCDE1234F1Z5"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled || isLoading}
              maxLength={GSTIN_LENGTH}
              aria-invalid={!!validationError}
              aria-describedby="gst-lookup-hints"
            />
          </div>
          {fetchButton}
        </div>
      )}

      <div id="gst-lookup-hints" className="flex flex-col gap-1">
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-[#712ae2]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Fetching GST details...
          </p>
        )}
        {validationError && (
          <p className="text-sm text-[#ba1a1a]" role="alert">
            {validationError}
          </p>
        )}
        {fetchError && (
          <p className="text-sm text-[#b45309]" role="alert">
            {fetchError}
          </p>
        )}
        {showSuggestion && !isLoading && !fetchError && (
          <p className="text-sm text-[#712ae2]">
            GST number looks valid — click <strong>Fetch</strong> to auto-fill.
          </p>
        )}
      </div>
    </div>
  );
}
