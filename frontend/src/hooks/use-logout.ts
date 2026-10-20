"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { logoutSession } from "@/services/auth-service";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(() => {
    logoutSession();
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);
}
