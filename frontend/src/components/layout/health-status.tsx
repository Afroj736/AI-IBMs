"use client";

import { useEffect, useState } from "react";

import { resolveApiRootUrl } from "@/utils/api-base";

type HealthResponse = {
  application_status: string;
  database_status: string;
  version: string;
  timestamp: string;
};

export function HealthStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(`${resolveApiRootUrl()}/health`);
        if (!response.ok) {
          throw new Error("Health API unavailable");
        }
        const data = (await response.json()) as HealthResponse;
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };
    void run();
  }, []);

  if (error) {
    return (
      <p className="mt-4 text-sm text-rose-600">
        Backend status: {error}. Start the API with{" "}
        <code className="rounded bg-slate-100 px-1">uvicorn app.main:app --reload --host 0.0.0.0 --port 8000</code>{" "}
        in <code className="rounded bg-slate-100 px-1">backend/</code>, then use{" "}
        <a className="underline" href="http://localhost:3000">
          http://localhost:3000
        </a>
        .
      </p>
    );
  }
  if (!health) {
    return <p className="mt-4 text-sm text-slate-500">Checking backend status...</p>;
  }
  return (
    <p className="mt-4 text-sm text-slate-600">
      Backend: {health.application_status} | DB: {health.database_status} | Version: {health.version}
    </p>
  );
}
