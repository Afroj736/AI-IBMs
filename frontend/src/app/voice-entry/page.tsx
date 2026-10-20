"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { listTemplates } from "@/services/template-service";
import {
  cancelVoiceDraft,
  confirmVoiceDraft,
  createDraftFromRecording,
  getVoiceDraftReviewContext,
  updateVoiceDraft,
  uploadVoiceAudio
} from "@/services/voice-service";
import type { InvoiceTemplate } from "@/types/invoice-template";
import type { VoiceDraft } from "@/types/voice-entry";

const MAX_SECONDS = 5 * 60;

export default function VoiceEntryPage() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("Idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [reviewContext, setReviewContext] = useState<{ warnings: string[]; missing_required_fields: string[]; validated_response: Record<string, unknown> } | null>(null);
  const [finalInvoiceNumber, setFinalInvoiceNumber] = useState<string>("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const loadTemplates = async () => {
      const data = await listTemplates();
      setTemplates(data);
      if (data.length > 0) setTemplateId(data[0].id);
    };
    void loadTemplates();
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev + 1 >= MAX_SECONDS) {
          void stopRecording();
          return MAX_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const timeDisplay = useMemo(() => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [seconds]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice-entry-${Date.now()}.webm`, { type: "audio/webm" });
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((track) => track.stop());
      setRecordingStatus("Recorded");
    };
    recorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setSeconds(0);
    setRecording(true);
    setRecordingStatus("Recording...");
  };

  const stopRecording = async () => {
    recorderRef.current?.stop();
    setRecording(false);
    setRecordingStatus("Stopped");
  };

  const processRecording = async () => {
    if (!audioFile) return;
    setRecordingStatus("Uploading...");
    const uploadRes = await uploadVoiceAudio(audioFile, templateId || undefined, setUploadProgress);
    setTranscript(uploadRes.transcript);
    setRecordingStatus("Extracting bill data...");
    const createdDraft = await createDraftFromRecording(uploadRes.recording_id, templateId || undefined);
    setDraft(createdDraft);
    const context = await getVoiceDraftReviewContext(createdDraft.id);
    setReviewContext(context);
    setRecordingStatus("Draft ready for review");
  };

  const updateDraftAndRecalculate = async () => {
    if (!draft) return;
    const payload = {
      template_id: templateId || null,
      items: draft.items.map((item) => ({
        item_id: item.item_id,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        discount: Number(item.discount ?? 0)
      }))
    };
    const updated = await updateVoiceDraft(draft.id, payload);
    setDraft(updated);
    const context = await getVoiceDraftReviewContext(updated.id);
    setReviewContext(context);
  };

  const confirmDraft = async () => {
    if (!draft) return;
    const result = await confirmVoiceDraft(draft.id);
    setFinalInvoiceNumber(result.invoice_number);
  };

  const cancelDraft = async () => {
    if (!draft) return;
    const cancelled = await cancelVoiceDraft(draft.id);
    setDraft(cancelled);
    setRecordingStatus("Draft cancelled");
  };

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Voice Entry</h1>
      <p className="mt-2 text-slate-600">Record up to 5 minutes, extract bill data, review draft, then generate final invoice.</p>

      <section className="mt-6 rounded border bg-white p-4">
        <label className="block text-sm font-medium">Invoice Template</label>
        <select className="mt-2 w-full rounded border p-2" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.template_name}
            </option>
          ))}
        </select>

        <div className="mt-4 flex items-center gap-3">
          <button className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-40" disabled={recording} onClick={startRecording}>
            Start Recording
          </button>
          <button className="rounded bg-rose-600 px-4 py-2 text-white disabled:opacity-40" disabled={!recording} onClick={() => void stopRecording()}>
            Stop Recording
          </button>
          <button className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-40" disabled={!audioFile} onClick={() => void processRecording()}>
            Confirm Draft
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Status: {recordingStatus} | Timer: {timeDisplay} | Upload: {uploadProgress}%
        </p>
      </section>

      {audioUrl && (
        <section className="mt-6 rounded border bg-white p-4">
          <h2 className="font-semibold">Audio Playback</h2>
          <audio className="mt-3 w-full" controls src={audioUrl} />
        </section>
      )}

      {transcript && (
        <section className="mt-6 rounded border bg-white p-4">
          <h2 className="font-semibold">Transcript Preview</h2>
          <textarea className="mt-3 h-32 w-full rounded border p-2" value={transcript} readOnly />
        </section>
      )}

      {draft && (
        <section className="mt-6 rounded border bg-white p-4">
          <h2 className="font-semibold">AI Extracted Data Preview</h2>
          <p className="mt-2 text-sm">Draft ID: {draft.id}</p>
          {draft.is_new_party_created && <p className="mt-1 text-sm font-medium text-amber-700">New Party Created (pending review)</p>}
          <p className="mt-1 text-sm">Detected Party ID: {draft.party_id}</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Rate</th>
                  <th className="p-2">GST</th>
                  <th className="p-2">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">
                      {item.item_name}
                      {item.is_new_item_created && <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">New Item</span>}
                    </td>
                    <td className="p-2">
                      <input
                        className="w-20 rounded border p-1"
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  items: prev.items.map((x) =>
                                    x.id === item.id ? { ...x, quantity: Number(e.target.value) } : x
                                  )
                                }
                              : prev
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="w-24 rounded border p-1"
                        type="number"
                        value={item.rate}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  items: prev.items.map((x) => (x.id === item.id ? { ...x, rate: Number(e.target.value) } : x))
                                }
                              : prev
                          )
                        }
                      />
                    </td>
                    <td className="p-2">{item.gst_percent}%</td>
                    <td className="p-2">{item.line_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <p>Subtotal: {draft.subtotal}</p>
            <p>CGST: {draft.cgst_amount}</p>
            <p>SGST: {draft.sgst_amount}</p>
            <p>IGST: {draft.igst_amount}</p>
            <p className="font-semibold">Grand Total: {draft.grand_total}</p>
          </div>

          {reviewContext && (
            <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="font-semibold">AI Review</p>
              <p className="mt-1">Warnings: {reviewContext.warnings.length ? reviewContext.warnings.join(", ") : "None"}</p>
              <p className="mt-1">
                Missing Required Fields:{" "}
                {reviewContext.missing_required_fields.length ? reviewContext.missing_required_fields.join(", ") : "None"}
              </p>
              <pre className="mt-2 overflow-auto rounded bg-white p-2 text-xs">{JSON.stringify(reviewContext.validated_response, null, 2)}</pre>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button className="rounded bg-slate-900 px-4 py-2 text-white" onClick={() => void updateDraftAndRecalculate()}>
              Edit Before Save
            </button>
            <button className="rounded bg-indigo-700 px-4 py-2 text-white" onClick={() => void confirmDraft()}>
              Generate Invoice
            </button>
            <button className="rounded bg-slate-300 px-4 py-2" onClick={() => void cancelDraft()}>
              Cancel
            </button>
          </div>
          {finalInvoiceNumber && <p className="mt-3 text-sm font-medium text-emerald-700">Final invoice created: {finalInvoiceNumber}</p>}
        </section>
      )}
    </main>
  );
}
