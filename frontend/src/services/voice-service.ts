import { api } from "@/services/api";
import type { VoiceDraft } from "@/types/voice-entry";

export interface VoiceUploadResult {
  recording_id: string;
  transcript: string;
  status: string;
  transcript_source?: "speech" | "dev_fallback";
}

export async function uploadVoiceAudio(file: File, templateId?: string, onProgress?: (progress: number) => void) {
  const formData = new FormData();
  formData.append("audio_file", file);
  if (templateId) {
    formData.append("template_id", templateId);
  }
  const { data } = await api.post<VoiceUploadResult>("/voice/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
    onUploadProgress: (evt) => {
      if (!evt.total || !onProgress) return;
      onProgress(Math.round((evt.loaded / evt.total) * 100));
    }
  });
  return data;
}

export async function createDraftFromRecording(recordingId: string, templateId?: string) {
  const { data } = await api.post<VoiceDraft>(
    "/voice/drafts",
    { recording_id: recordingId, template_id: templateId },
    { timeout: 120000 }
  );
  return data;
}

export async function updateVoiceDraft(draftId: string, payload: Record<string, unknown>) {
  const { data } = await api.put<VoiceDraft>(`/voice/drafts/${draftId}`, payload);
  return data;
}

export async function confirmVoiceDraft(draftId: string) {
  const { data } = await api.post<{ draft_id: string; final_invoice_id: string; invoice_number: string }>(
    `/voice/drafts/${draftId}/confirm`
  );
  return data;
}

export async function cancelVoiceDraft(draftId: string) {
  const { data } = await api.post<VoiceDraft>(`/voice/drafts/${draftId}/cancel`);
  return data;
}

export async function getVoiceDraft(draftId: string) {
  const { data } = await api.get<VoiceDraft>(`/voice/drafts/${draftId}`);
  return data;
}

export async function getVoiceDraftReviewContext(draftId: string) {
  const { data } = await api.get<{
    draft_id: string;
    validated_response: Record<string, unknown>;
    warnings: string[];
    missing_required_fields: string[];
  }>(`/voice/drafts/${draftId}/review-context`);
  return data;
}

export interface VoiceDraftUpdatePayload {
  template_id?: string | null;
  invoice_date?: string;
  notes?: string | null;
  items?: {
    item_id: string;
    quantity: number;
    rate: number;
    discount: number;
  }[];
}

export async function updateVoiceDraftTyped(draftId: string, payload: VoiceDraftUpdatePayload) {
  return updateVoiceDraft(draftId, payload as Record<string, unknown>);
}
