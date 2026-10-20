import { api } from "@/services/api";
import type { UserProfileResponse, UserProfileSettingsPayload } from "@/types/account-settings";

export async function getMyProfile(): Promise<UserProfileResponse> {
  const { data } = await api.get<UserProfileResponse>("/users/me/profile", { timeout: 30000 });
  return data;
}

export async function updateMyProfile(payload: {
  name?: string;
  email?: string;
  settings?: UserProfileSettingsPayload;
}): Promise<UserProfileResponse> {
  const { data } = await api.put<UserProfileResponse>("/users/me/profile", payload);
  return data;
}

export async function changeMyPassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>("/users/me/change-password", payload);
  return data;
}
