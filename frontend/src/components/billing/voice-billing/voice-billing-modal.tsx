"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Plus,
  Printer,
  Share2,
  Trash2,
  Wallet
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ItemStatusBadge } from "@/components/billing/voice-billing/item-status-badge";
import {
  type TemplateCardKey,
  resolveTemplateCards
} from "@/components/billing/voice-billing/template-picker-cards";
import { VoiceCapturePanel } from "@/components/billing/voice-billing/voice-capture-panel";
import { useVoiceRecorder } from "@/components/billing/voice-billing/use-voice-recorder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { hasPersistedSession } from "@/services/auth-service";
import { cn, formatCurrency } from "@/lib/utils";
import { listInventoryItems, validateAiBillLines } from "@/services/inventory-service";
import { createParty, getParty, listParties } from "@/services/party-service";
import { listTemplates } from "@/services/template-service";
import {
  cancelVoiceDraft,
  confirmVoiceDraft,
  createDraftFromRecording,
  getVoiceDraftReviewContext,
  updateVoiceDraftTyped,
  uploadVoiceAudio
} from "@/services/voice-service";
import { billingKeys } from "@/hooks/use-invoices";
import { useBillingStore } from "@/store/billing-store";
import type { InvoiceTemplate } from "@/types/invoice-template";
import type { Party } from "@/types/party";
import type {
  DraftLineValidation,
  InventoryItemSummary,
  VoiceBillingStep,
  VoiceDraftReviewContext
} from "@/types/voice-billing";
import { buildDraftUpdatePayload, resolveItemValidation } from "@/types/voice-billing";
import type { VoiceDraft, VoiceDraftItem } from "@/types/voice-entry";

const PROCESSING_STEPS = [
  "Audio Uploaded",
  "Speech Converted To Text",
  "Extracting Customer Information",
  "Extracting Products",
  "Validating Inventory",
  "Creating Draft Invoice"
] as const;

export function VoiceBillingModal() {
  const queryClient = useQueryClient();
  const isOpen = useBillingStore((s) => s.isVoiceModalOpen);
  const setOpen = useBillingStore((s) => s.setVoiceModalOpen);
  const setSelectedInvoiceId = useBillingStore((s) => s.setSelectedInvoiceId);
  const resetVoiceState = useBillingStore((s) => s.resetVoiceState);

  const [step, setStep] = useState<VoiceBillingStep>("setup");
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateCardKey, setTemplateCardKey] = useState<TemplateCardKey>("retail");
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [reviewContext, setReviewContext] = useState<VoiceDraftReviewContext | null>(null);
  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryItemSummary>>({});
  const [lineValidations, setLineValidations] = useState<DraftLineValidation[]>([]);
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [successInvoice, setSuccessInvoice] = useState<{ number: string; id: string } | null>(null);
  const [partySearch, setPartySearch] = useState("");
  const [partyOptions, setPartyOptions] = useState<Party[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPartyPicker, setShowPartyPicker] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<"speech" | "dev_fallback">("speech");
  const transcriptRef = useRef<HTMLTextAreaElement>(null);

  const recorder = useVoiceRecorder(() => void recorder.stopRecording());

  const balanceAmount = useMemo(() => {
    if (!draft) return 0;
    return Math.max(Number(draft.grand_total) - receivedAmount, 0);
  }, [draft, receivedAmount]);

  const loadTemplates = useCallback(async () => {
    if (!hasPersistedSession()) {
      setNeedsLogin(true);
      return;
    }
    setNeedsLogin(false);
    try {
      const data = await listTemplates();
      setTemplates(data);
      const cards = resolveTemplateCards(data);
      const active = data.find((t) => t.status === "active") ?? data[0];
      if (active) {
        setTemplateId(active.id);
        const retailMatch = cards.find((c) => c.key === "retail")?.template?.id === active.id;
        setTemplateCardKey(retailMatch ? "retail" : "gst");
      }
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to load invoice templates");
      if (message.toLowerCase().includes("token") || message.toLowerCase().includes("sign in")) {
        setNeedsLogin(true);
      }
      toast.error(message);
    }
  }, []);

  const loadInventoryValidations = useCallback(async (items: VoiceDraftItem[]) => {
    try {
      const inventory = await listInventoryItems();
      const map = Object.fromEntries(inventory.map((i) => [i.id, i]));
      setInventoryMap(map);
      setLineValidations(items.map((item) => resolveItemValidation(item, map[item.item_id])));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load inventory"));
    }
  }, []);

  const loadParty = useCallback(async (partyId: string) => {
    try {
      const p = await getParty(partyId);
      setParty(p);
    } catch {
      setParty(null);
    }
  }, []);

  const resetAll = useCallback(() => {
    autoProcessRef.current = false;
    recorder.reset();
    setStep("setup");
    setTranscript("");
    setDraft(null);
    setParty(null);
    setReviewContext(null);
    setLineValidations([]);
    setProcessingStepIndex(0);
    setReceivedAmount(0);
    setSuccessInvoice(null);
    setShowCancelConfirm(false);
    setShowPartyPicker(false);
    setPartySearch("");
    setPartyOptions([]);
    setTranscriptSource("speech");
  }, [recorder]);

  const handleClose = () => {
    resetAll();
    resetVoiceState();
    setOpen(false);
  };

  useEffect(() => {
    if (isOpen) void loadTemplates();
  }, [isOpen, loadTemplates]);

  const autoProcessRef = useRef(false);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, step]);

  const runProcessingAnimation = async (fn: () => Promise<void>) => {
    setStep("processing");
    setProcessingStepIndex(0);
    const interval = setInterval(() => {
      setProcessingStepIndex((i) => Math.min(i + 1, PROCESSING_STEPS.length - 1));
    }, 450);
    try {
      await fn();
      setProcessingStepIndex(PROCESSING_STEPS.length - 1);
    } finally {
      clearInterval(interval);
    }
  };

  const processAudio = useCallback(async () => {
    if (!recorder.audioFile) return;
    setIsBusy(true);
    try {
      await runProcessingAnimation(async () => {
        const upload = await uploadVoiceAudio(recorder.audioFile!, templateId || undefined);
        setTranscript(upload.transcript);
        setTranscriptSource(upload.transcript_source === "dev_fallback" ? "dev_fallback" : "speech");
        if (upload.transcript_source === "dev_fallback") {
          toast.warning(
            "Speech APIs unavailable — sample transcript was used, not your recording. Edit the transcript or fix OpenAI/ElevenLabs keys.",
            { duration: 8000 }
          );
        }
        const created = await createDraftFromRecording(upload.recording_id, templateId || undefined);
        setDraft(created);
        const ctx = await getVoiceDraftReviewContext(created.id);
        setReviewContext(ctx);
        await loadParty(created.party_id);
        await loadInventoryValidations(created.items);
      });
      setStep("draft");
      toast.success("Draft invoice ready for review");
    } catch (error) {
      setStep("setup");
      toast.error(getApiErrorMessage(error, "Voice upload failed"));
    } finally {
      setIsBusy(false);
    }
  }, [recorder.audioFile, templateId, loadParty, loadInventoryValidations]);

  useEffect(() => {
    if (
      step === "recording" &&
      recorder.audioFile &&
      !recorder.isRecording &&
      !isBusy &&
      !autoProcessRef.current
    ) {
      autoProcessRef.current = true;
      void processAudio().finally(() => {
        autoProcessRef.current = false;
      });
    }
  }, [step, recorder.audioFile, recorder.isRecording, isBusy, processAudio]);

  const refreshDraft = async (updated: VoiceDraft) => {
    setDraft(updated);
    await loadInventoryValidations(updated.items);
    const ctx = await getVoiceDraftReviewContext(updated.id);
    setReviewContext(ctx);
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    setIsBusy(true);
    try {
      const payload = buildDraftUpdatePayload(draft, templateId || null, draft.items);
      const updated = await updateVoiceDraftTyped(draft.id, payload);
      await refreshDraft(updated);
      toast.success("Draft saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save draft"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancelDraft = async () => {
    if (!draft) return;
    setIsBusy(true);
    try {
      await cancelVoiceDraft(draft.id);
      toast.success("Draft cancelled");
      handleClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to cancel draft"));
    } finally {
      setIsBusy(false);
      setShowCancelConfirm(false);
    }
  };

  const validateBeforeConfirm = async (): Promise<boolean> => {
    if (!draft) return false;
    const invalidLines = lineValidations.filter((v) => v.status !== "valid");
    if (invalidLines.length > 0) {
      const names = draft.items
        .filter((item) => invalidLines.some((v) => v.draftItemId === item.id))
        .map((item) => `${item.item_name}: ${invalidLines.find((v) => v.draftItemId === item.id)?.message}`)
        .join("; ");
      toast.error(
        names
          ? `Inventory validation failed — ${names}`
          : "Inventory validation failed. Fix items before generating invoice."
      );
      return false;
    }
    if (!templateId) {
      toast.error("Select an invoice template");
      return false;
    }
    if (!party && !draft.party_id) {
      toast.error("Customer not found. Create or select a customer.");
      return false;
    }
    try {
      const lines = draft.items
        .map((item) => {
          const inv = inventoryMap[item.item_id];
          if (!inv || inv.status === "pending_review") return null;
          return { item_code: inv.item_code, quantity: Number(item.quantity) };
        })
        .filter(Boolean) as { item_code: string; quantity: number }[];
      if (lines.length) {
        const result = await validateAiBillLines(lines, false);
        if (result.rejected.length > 0) {
          toast.error(
            result.rejected.map((r) => `${r.item_code}: ${r.reason}`).join("; ") ||
              "Stock not available"
          );
          return false;
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Inventory validation failed"));
      return false;
    }
    return true;
  };

  const handleGenerateInvoice = async () => {
    if (!draft) return;
    const ok = await validateBeforeConfirm();
    if (!ok) return;
    setIsBusy(true);
    try {
      const payload = buildDraftUpdatePayload(draft, templateId || null, draft.items);
      await updateVoiceDraftTyped(draft.id, payload);
      const result = await confirmVoiceDraft(draft.id);
      await queryClient.invalidateQueries({ queryKey: billingKeys.all });
      setSelectedInvoiceId(result.final_invoice_id);
      setSuccessInvoice({ number: result.invoice_number, id: result.final_invoice_id });
      setStep("success");
      toast.success("Invoice generated successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Invoice creation failed"));
    } finally {
      setIsBusy(false);
    }
  };

  const updateDraftItem = (itemId: string, patch: Partial<VoiceDraftItem>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((row) => (row.id === itemId ? { ...row, ...patch } : row));
      const next = { ...prev, items };
      setLineValidations(
        items.map((item) => resolveItemValidation(item, inventoryMap[item.item_id]))
      );
      return next;
    });
  };

  const removeDraftItem = (itemId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter((row) => row.id !== itemId);
      setLineValidations(
        items.map((item) => resolveItemValidation(item, inventoryMap[item.item_id]))
      );
      return { ...prev, items };
    });
  };

  const searchParties = async (q: string) => {
    setPartySearch(q);
    try {
      const results = await listParties({ search: q || undefined, party_type: "customer" });
      setPartyOptions(results);
    } catch {
      setPartyOptions([]);
    }
  };

  const assignParty = async (selected: Party) => {
    setParty(selected);
    setShowPartyPicker(false);
    toast.success(`Customer set to ${selected.name}`);
  };

  const handleCreateParty = async () => {
    if (!party?.name && !draft) return;
    const name =
      party?.name ||
      String(
        (reviewContext?.validated_response as { party?: { name?: { value?: string } } })?.party
          ?.name?.value ?? "Walk-in Customer"
      );
    setIsBusy(true);
    try {
      const created = await createParty({
        name,
        party_type: "customer",
        mobile: party?.mobile || "9999999999",
        gstin: party?.gstin || null,
        billing_address: party?.billing_address || null,
        status: "active"
      });
      setParty(created);
      toast.success("Customer created");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Customer not found — could not create party"));
    } finally {
      setIsBusy(false);
    }
  };

  const beginRecording = () => {
    setStep("recording");
    void recorder.startRecording().catch(() => {
      toast.error("Microphone access denied");
      setStep("setup");
    });
  };

  const handleTemplateSelect = (key: TemplateCardKey, id: string) => {
    setTemplateCardKey(key);
    setTemplateId(id);
  };

  const handleMicClick = () => {
    if (needsLogin || isBusy) return;
    if (step === "setup") {
      beginRecording();
      return;
    }
    if (recorder.isPaused) {
      recorder.resumeRecording();
    }
  };

  const handleSubmitVoice = () => {
    if (needsLogin || isBusy) return;
    if (step === "setup") {
      beginRecording();
      return;
    }
    if (recorder.isRecording) {
      recorder.stopRecording();
      return;
    }
    if (recorder.audioFile && step === "recording") {
      void processAudio();
    }
  };

  const isCaptureStep = step === "setup" || step === "recording";
  const customerFound = party && !draft?.is_new_party_created;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className={cn(
            "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden border-[#E0E3E5] bg-[#f7f9fb] p-0 shadow-2xl",
            "[&>button]:hidden",
            "!top-4 !translate-y-0 sm:!top-[50%] sm:!-translate-y-1/2",
            "w-[calc(100vw-2rem)] max-w-4xl rounded-xl sm:max-h-[min(90vh,calc(100dvh-3rem))]"
          )}
          onPointerDownOutside={(e) => (step === "processing" || isCaptureStep) && e.preventDefault()}
        >
          {isCaptureStep ? (
            <VoiceCapturePanel
              templates={templates}
              templateCardKey={templateCardKey}
              onTemplateSelect={handleTemplateSelect}
              recorder={recorder}
              isRecordingStep={step === "recording"}
              isBusy={isBusy}
              needsLogin={needsLogin}
              transcript={transcript}
              onClose={handleClose}
              onMicClick={handleMicClick}
              onPause={recorder.pauseRecording}
              onStop={() => recorder.stopRecording()}
              onSubmit={handleSubmitVoice}
            />
          ) : (
            <>
          <div className="shrink-0 border-b border-[#E0E3E5] bg-white px-6 py-5 sm:px-10">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold text-[#191c1e]">
                Voice Billing Assistant
              </DialogTitle>
              <DialogDescription className="text-sm text-[#45464d]">
                Review your AI-generated invoice before confirming.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-10">
            {step === "processing" && (
              <div className="flex flex-col items-center py-10">
                <Loader2 className="mb-6 h-12 w-12 animate-spin text-[#712AE2]" />
                <h3 className="text-lg font-bold text-[#111827]">Analyzing Voice Recording</h3>
                <p className="mt-1 text-sm text-[#6B7280]">Estimated time: 2–5 seconds</p>
                <ul className="mt-8 w-full max-w-sm space-y-3">
                  {PROCESSING_STEPS.map((label, idx) => {
                    const done = idx < processingStepIndex;
                    const current = idx === processingStepIndex;
                    return (
                      <li key={label} className="flex items-center gap-3 text-sm">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                            done
                              ? "bg-[#10B981] text-white"
                              : current
                                ? "bg-[#712AE2] text-white"
                                : "bg-[#E5E7EB] text-[#6B7280]"
                          )}
                        >
                          {done ? "✓" : current ? "⏳" : ""}
                        </span>
                        <span className={cn(done || current ? "text-[#111827]" : "text-[#6B7280]")}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {step === "draft" && draft && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  {transcriptSource === "dev_fallback" && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <p className="font-semibold">Sample transcript used</p>
                      <p className="mt-1 text-amber-800">
                        Your audio was not transcribed (OpenAI quota / ElevenLabs). The draft below is
                        from <code className="text-xs">VOICE_FALLBACK_TRANSCRIPT</code> in backend
                        .env — not from your recording. Clear that variable or add API credits, then
                        record again.
                      </p>
                    </div>
                  )}
                  <Label className="text-sm font-medium">Transcript</Label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="mt-2 min-h-[320px] w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#111827]">Draft Invoice</h3>
                    <span className="rounded-full bg-[#F59E0B]/15 px-3 py-1 text-xs font-semibold text-[#F59E0B]">
                      Draft
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Customer
                    </p>
                    <p className="mt-1 font-medium text-[#111827]">{party?.name ?? "—"}</p>
                    <p className="text-sm text-[#6B7280]">{party?.mobile}</p>
                    <p className="text-sm text-[#6B7280]">{party?.billing_address}</p>
                    <p className="text-sm text-[#6B7280]">{party?.gstin}</p>

                    {customerFound ? (
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#10B981]">
                        <CheckCircle2 className="h-4 w-4" />
                        Existing Customer Found
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-[#F59E0B]">
                          <AlertTriangle className="h-4 w-4" />
                          Customer Not Found
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => void handleCreateParty()}>
                            Create Party
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowPartyPicker(true)}>
                            Select Existing Customer
                          </Button>
                        </div>
                      </div>
                    )}

                    {showPartyPicker && (
                      <div className="mt-3 space-y-2 rounded-lg border border-[#E5E7EB] p-3">
                        <Input
                          placeholder="Search customer..."
                          value={partySearch}
                          onChange={(e) => void searchParties(e.target.value)}
                        />
                        <div className="max-h-32 overflow-y-auto">
                          {partyOptions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[#F9FAFB]"
                              onClick={() => void assignParty(p)}
                            >
                              {p.name} — {p.mobile}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                        <tr>
                          <th className="p-3">Item</th>
                          <th className="p-3">Qty</th>
                          <th className="p-3">Rate</th>
                          <th className="p-3">GST %</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {draft.items.map((item) => {
                          const validation =
                            lineValidations.find((v) => v.draftItemId === item.id) ??
                            resolveItemValidation(item, inventoryMap[item.item_id]);
                          return (
                            <tr key={item.id} className="border-t border-[#E5E7EB]">
                              <td className="p-3 align-top">
                                <p className="font-medium">{item.item_name}</p>
                                <ItemStatusBadge validation={validation} />
                                <p className="mt-1 text-xs text-[#6B7280]">
                                  Available Stock: {validation.availableStock} · Requested:{" "}
                                  {validation.requestedQty}
                                </p>
                              </td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min={1}
                                  className="h-9 w-16"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateDraftItem(item.id, { quantity: Number(e.target.value) })
                                  }
                                />
                              </td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9 w-24"
                                  value={item.rate}
                                  onChange={(e) =>
                                    updateDraftItem(item.id, { rate: Number(e.target.value) })
                                  }
                                />
                              </td>
                              <td className="p-3">{item.gst_percent}%</td>
                              <td className="p-3">{formatCurrency(Number(item.line_total))}</td>
                              <td className="p-3">
                                <button
                                  type="button"
                                  className="text-[#EF4444]"
                                  onClick={() => removeDraftItem(item.id)}
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">Subtotal</span>
                      <span>{formatCurrency(Number(draft.subtotal))}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">Discount</span>
                      <span>{formatCurrency(Number(draft.discount_amount))}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">CGST</span>
                      <span>{formatCurrency(Number(draft.cgst_amount))}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">SGST</span>
                      <span>{formatCurrency(Number(draft.sgst_amount))}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#E5E7EB] py-2 font-bold">
                      <span>Grand Total</span>
                      <span>{formatCurrency(Number(draft.grand_total))}</span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Received Amount</Label>
                        <Input
                          type="number"
                          min={0}
                          value={receivedAmount}
                          onChange={(e) => setReceivedAmount(Number(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Balance Amount</Label>
                        <Input readOnly value={formatCurrency(balanceAmount)} className="mt-1 bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "success" && successInvoice && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#10B981]/15">
                  <CheckCircle2 className="h-10 w-10 text-[#10B981]" />
                </div>
                <h3 className="text-xl font-bold text-[#111827]">Invoice Generated Successfully</h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Invoice Number:{" "}
                  <span className="font-semibold text-[#111827]">{successInvoice.number}</span>
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Print Invoice
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share WhatsApp
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Send Email
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Record Payment
                  </Button>
                  <Button
                    className="gap-2 bg-[#2563EB] hover:bg-[#1D4ED8]"
                    onClick={() => {
                      resetAll();
                      setStep("setup");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Create New Invoice
                  </Button>
                </div>
              </div>
            )}
          </div>

          {step === "draft" && draft && (
            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#E5E7EB] bg-white px-6 py-4">
              <Button
                variant="outline"
                className="border-[#E5E7EB]"
                onClick={() => setShowCancelConfirm(true)}
                disabled={isBusy}
              >
                Cancel Draft
              </Button>
              <Button
                className="bg-[#F59E0B] text-white hover:bg-[#D97706]"
                onClick={() => void handleSaveDraft()}
                disabled={isBusy}
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draft"}
              </Button>
              <Button
                className="bg-[#191c1e] text-white hover:bg-[#2d3133]"
                onClick={() => void handleGenerateInvoice()}
                disabled={isBusy}
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Invoice"}
              </Button>
            </div>
          )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel draft?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this draft?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              Keep Draft
            </Button>
            <Button variant="destructive" onClick={() => void handleCancelDraft()}>
              Cancel Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
