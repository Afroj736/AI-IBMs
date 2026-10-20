import { api } from "@/services/api";
import type { CompanySettingsPayload, CompanySettingsResponse } from "@/types/company-settings";

export async function getCompanySettings(): Promise<CompanySettingsResponse> {
  const { data } = await api.get<CompanySettingsResponse>("/companies/settings", {
    timeout: 30000
  });
  return data;
}

export async function updateCompanySettings(payload: {
  business_name?: string;
  owner_name?: string;
  mobile?: string | null;
  email?: string;
  gst_number?: string | null;
  address?: string | null;
  settings?: CompanySettingsPayload;
}): Promise<CompanySettingsResponse> {
  const { data } = await api.put<CompanySettingsResponse>("/companies/settings", payload);
  return data;
}
