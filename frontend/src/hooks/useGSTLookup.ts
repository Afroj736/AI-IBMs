"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api-error";
import { fetchGSTDetails, mapGSTDetailsToPartyFields } from "@/services/gstService";
import type { GSTDetails, GSTPartyFieldMapping } from "@/types/gst";
import { isValidGSTIN, normalizeGSTIN } from "@/validators/gst";

const VALIDATION_ERROR = "Please enter a valid GST number.";
const FETCH_ERROR = "Unable to fetch GST details. Please enter details manually.";

interface UseGSTLookupOptions {
  onSuccess?: (details: GSTDetails, fields: GSTPartyFieldMapping) => void;
}

export function useGSTLookup(options?: UseGSTLookupOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsVerified(false);
    setFetchError(null);
    setValidationError(null);
  }, []);

  const fetchDetails = useCallback(
    async (gstin: string): Promise<GSTPartyFieldMapping | null> => {
      setValidationError(null);
      setFetchError(null);

      if (!isValidGSTIN(gstin)) {
        setValidationError(VALIDATION_ERROR);
        setIsVerified(false);
        return null;
      }

      const normalized = normalizeGSTIN(gstin);
      setIsLoading(true);
      setIsVerified(false);

      try {
        const details = await fetchGSTDetails(normalized);
        const fields = mapGSTDetailsToPartyFields(details);

        setIsVerified(true);
        options?.onSuccess?.(details, fields);
        toast.success("GST details fetched successfully.", { duration: 3000 });

        return fields;
      } catch (error) {
        const message = getApiErrorMessage(error, FETCH_ERROR);
        setFetchError(message);
        setIsVerified(false);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return {
    fetchDetails,
    isLoading,
    isVerified,
    fetchError,
    validationError,
    reset
  };
}
