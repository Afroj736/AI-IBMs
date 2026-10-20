"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  width?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className,
  width = "w-full"
}: SearchBarProps) {
  return (
    <div className={cn("relative", width, className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 pl-9"
      />
    </div>
  );
}
