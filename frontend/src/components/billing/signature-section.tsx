import { PenLine, Stamp } from "lucide-react";

interface SignatureSectionProps {
  signatureUrl?: string | null;
  sealUrl?: string | null;
}

export function SignatureSection({ signatureUrl, sealUrl }: SignatureSectionProps) {
  return (
    <div className="flex h-[120px] items-end justify-between gap-8 border-t border-border pt-6">
      <div className="flex flex-col items-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
          Authorized Signature
        </p>
        <div className="flex h-16 w-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
          ) : (
            <PenLine className="h-6 w-6 text-secondary/50" />
          )}
        </div>
      </div>

      <div className="flex flex-col items-end">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Company Seal</p>
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-muted/30">
          {sealUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sealUrl} alt="Company Seal" className="max-h-full max-w-full rounded-full object-contain" />
          ) : (
            <Stamp className="h-6 w-6 text-secondary/50" />
          )}
        </div>
      </div>
    </div>
  );
}
