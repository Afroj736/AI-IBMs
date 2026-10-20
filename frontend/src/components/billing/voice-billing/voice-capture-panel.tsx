"use client";

import { Loader2, Mic, Pause, Sparkles, Square, X } from "lucide-react";
import Link from "next/link";

import {
  type TemplateCardKey,
  TemplatePickerCards,
  resolveTemplateCards
} from "@/components/billing/voice-billing/template-picker-cards";
import { VoiceWaveform } from "@/components/billing/voice-billing/voice-waveform";
import { formatVoiceTimer } from "@/components/billing/voice-billing/use-voice-recorder";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvoiceTemplate } from "@/types/invoice-template";

interface Recorder {
  isRecording: boolean;
  isPaused: boolean;
  elapsed: number;
  audioFile: File | null;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
}

interface VoiceCapturePanelProps {
  templates: InvoiceTemplate[];
  templateCardKey: TemplateCardKey;
  onTemplateSelect: (key: TemplateCardKey, templateId: string) => void;
  recorder: Recorder;
  isRecordingStep: boolean;
  isBusy: boolean;
  needsLogin: boolean;
  transcript: string;
  onClose: () => void;
  onMicClick: () => void;
  onPause: () => void;
  onStop: () => void;
  onSubmit: () => void;
}

export function VoiceCapturePanel({
  templates,
  templateCardKey,
  onTemplateSelect,
  recorder,
  isRecordingStep,
  isBusy,
  needsLogin,
  transcript,
  onClose,
  onMicClick,
  onPause,
  onStop,
  onSubmit
}: VoiceCapturePanelProps) {
  const cards = resolveTemplateCards(templates);
  const isListening = isRecordingStep && recorder.isRecording && !recorder.isPaused;
  const isPaused = isRecordingStep && recorder.isPaused;
  const hasRecording = Boolean(recorder.audioFile);

  const statusText = !isRecordingStep
    ? "Tap to Start Recording"
    : isListening
      ? "AI is Listening..."
      : isPaused
        ? "Recording Paused"
        : hasRecording
          ? "Recording Completed"
          : "Tap to Start Recording";

  const canSubmit =
    !needsLogin &&
    !isBusy &&
    isRecordingStep &&
    hasRecording &&
    !recorder.isRecording;

  return (
    <div className="flex flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-[#E0E3E5] bg-white px-6 py-5 sm:px-10">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#191c1e] sm:text-[32px] sm:leading-10">
            Voice Billing Assistant
          </h2>
          <p className="mt-1 text-sm text-[#45464d]">
            Speak naturally to generate your next invoice instantly.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-[#45464d] transition-colors hover:bg-[#ECEEF0]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6 sm:px-10 sm:py-8">
        {needsLogin && (
          <div className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            <p className="font-semibold">Sign in required</p>
            <p className="mt-1">
              Voice billing needs an active session. Please sign in to use the microphone and AI
              features.
            </p>
            <Button asChild className="mt-3 bg-[#712AE2] hover:bg-[#5a00c6]">
              <Link href="/login">Go to Sign In</Link>
            </Button>
          </div>
        )}

        <TemplatePickerCards
          cards={cards}
          selectedKey={templateCardKey}
          onSelect={onTemplateSelect}
          disabled={needsLogin || isBusy || isRecordingStep}
        />

        <section className="relative overflow-hidden rounded-xl border border-[#E0E3E5] bg-white p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#712AE2]/5 blur-[100px]" />

          <div className="relative z-10 flex flex-col items-center space-y-6">
            <div className="relative">
              <div
                className={cn(
                  "absolute inset-0 rounded-full bg-[#712AE2] transition-opacity duration-300",
                  isListening ? "animate-ping opacity-30" : "opacity-0"
                )}
              />
              <button
                type="button"
                onClick={onMicClick}
                disabled={needsLogin || isBusy}
                className={cn(
                  "relative flex h-24 w-24 items-center justify-center rounded-full bg-[#712AE2] text-white shadow-lg transition-all duration-300",
                  "hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                )}
                aria-label={isRecordingStep ? "Recording controls" : "Start recording"}
              >
                <Mic className={cn("h-10 w-10", isListening && "scale-110")} />
              </button>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-[#191c1e]">{statusText}</h3>
              {isRecordingStep && (
                <p className="mt-1 font-mono text-sm tabular-nums text-[#712AE2]">
                  {formatVoiceTimer(recorder.elapsed)}
                </p>
              )}
              <p className="mt-2 text-sm italic text-[#45464d]">
                &ldquo;Generate an invoice for Raj Electronics, 2 Samsung Galaxy S25 Ultra and 1
                Apple AirPods Pro...&rdquo;
              </p>
            </div>

            <VoiceWaveform active={isListening} />

            {isRecordingStep && (
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                {recorder.isRecording && !recorder.isPaused && (
                  <button
                    type="button"
                    onClick={onPause}
                    className="flex items-center gap-2 rounded-full border border-[#E0E3E5] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#45464d] transition-colors hover:bg-[#ECEEF0]"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                )}
                {recorder.isPaused && (
                  <button
                    type="button"
                    onClick={onMicClick}
                    className="flex items-center gap-2 rounded-full border border-[#712AE2] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#712AE2] transition-colors hover:bg-[#712AE2]/5"
                  >
                    Resume
                  </button>
                )}
                {recorder.isRecording && (
                  <button
                    type="button"
                    onClick={onStop}
                    className="flex items-center gap-2 rounded-full border border-[#BA1A1A] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#BA1A1A] transition-colors hover:bg-[#BA1A1A]/5"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                )}
              </div>
            )}

            {transcript && (
              <p className="max-w-lg text-center text-sm text-[#45464d]">
                <span className="font-medium text-[#191c1e]">Transcript: </span>
                {transcript}
              </p>
            )}

            {isBusy && (
              <p className="flex items-center gap-2 text-sm text-[#45464d]">
                <Loader2 className="h-4 w-4 animate-spin text-[#712AE2]" />
                Uploading and analyzing your voice note...
              </p>
            )}
          </div>
        </section>

        <footer className="flex flex-col gap-4 pb-2">
          <button
            type="button"
            disabled={needsLogin || isBusy || (!canSubmit && !isRecordingStep)}
            onClick={onSubmit}
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-xl bg-[#191c1e] py-5 text-base font-semibold text-white shadow-xl shadow-black/10 transition-all",
              "hover:bg-[#2d3133] disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {isBusy
              ? "Processing..."
              : canSubmit
                ? "Submit & Generate Invoice"
                : isRecordingStep
                  ? "Stop & Process Recording"
                  : "Start Voice Invoice"}
          </button>
          <p className="text-center text-sm text-[#76777d]">
            AI will automatically extract client details, items, and quantities from your voice
            note.
          </p>
        </footer>
      </div>
    </div>
  );
}
