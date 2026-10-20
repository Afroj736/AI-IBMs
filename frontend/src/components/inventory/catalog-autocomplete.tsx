"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CatalogAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  loading?: boolean;
  label: string;
  createHref?: string;
};

export function CatalogAutocomplete({
  value,
  onChange,
  options,
  placeholder,
  loading = false,
  label,
  createHref = "/inventory/catalog"
}: CatalogAutocompleteProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const sorted = [...options].sort((a, b) => a.localeCompare(b));
    if (!query) return sorted;
    return sorted.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        className="w-full rounded-lg border-none bg-[#f2f4f6] p-3 text-base text-[#191c1e] outline-none transition focus:ring-2 focus:ring-[#712ae2]/20"
        placeholder={placeholder}
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
          } else if (e.key === "Enter" && activeIndex >= 0 && filteredOptions[activeIndex]) {
            e.preventDefault();
            selectOption(filteredOptions[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
      />

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[#e0e3e5] bg-white py-1 shadow-lg"
        >
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-[#45464d]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading {label.toLowerCase()}...
            </div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={value === option}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm text-[#191c1e] transition hover:bg-[#f2f4f6]",
                  activeIndex === index && "bg-[#eaddff]/40",
                  value === option && "font-semibold text-[#712ae2]"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-[#45464d]">
              No {label.toLowerCase()} found.{" "}
              <Link href={createHref} className="font-semibold text-[#712ae2] hover:underline">
                Create one
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
