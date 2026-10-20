"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const BAR_COUNT = 40;

export function VoiceWaveform({ active }: { active: boolean }) {
  const [heights, setHeights] = useState<number[]>(() => Array(BAR_COUNT).fill(8));

  useEffect(() => {
    if (!active) {
      setHeights(Array(BAR_COUNT).fill(8));
      return;
    }

    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: BAR_COUNT }, () => Math.floor(Math.random() * 42) + 10)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <div
      className="flex h-16 w-full max-w-md items-center justify-center gap-1.5"
      aria-hidden
    >
      {heights.map((height, index) => (
        <span
          key={index}
          className={cn(
            "w-1 rounded-full transition-all duration-100",
            active ? "bg-[#712AE2]" : "bg-[#712AE2]/20"
          )}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}
