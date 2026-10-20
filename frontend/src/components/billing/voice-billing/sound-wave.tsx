"use client";

import { cn } from "@/lib/utils";

export function SoundWave({ active, recording }: { active: boolean; recording?: boolean }) {
  const bars = 14;
  return (
    <div className="flex items-center justify-center gap-1 py-2" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-full bg-primary/40 transition-all duration-200",
            active && "animate-pulse bg-danger/70",
            recording ? "h-6" : "h-3"
          )}
          style={{
            animationDelay: active ? `${i * 80}ms` : undefined,
            height: active ? `${12 + ((i * 7) % 20)}px` : "8px"
          }}
        />
      ))}
    </div>
  );
}
