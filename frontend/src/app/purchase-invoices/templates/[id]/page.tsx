import Link from "next/link";

import { TemplatePreviewThumbnail } from "@/components/billing/template-preview-thumbnail";
import { api } from "@/services/api";
import type { InvoiceTemplate } from "@/types/invoice-template";

export const dynamic = "force-dynamic";

export default async function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: template } = await api.get<InvoiceTemplate>(`/invoice-templates/${id}`);
  const prefix =
    typeof template.template_json?.invoice_prefix === "string"
      ? template.template_json.invoice_prefix
      : "INV";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/purchase-invoices" className="text-sm text-[#712ae2] hover:underline">
        ← Back to templates
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{template.template_name}</h1>
      <p className="mt-1 text-sm text-[#45464d]">
        Invoice prefix: <strong>{prefix}</strong> (e.g. {prefix}48)
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-[#c6c6cd] bg-[#eceef0] p-4">
        <div className="mx-auto aspect-[16/10] max-w-xl overflow-hidden rounded-lg border border-[#e0e3e5] bg-white shadow-sm">
          <TemplatePreviewThumbnail template={template} />
        </div>
      </div>

      <div className="mt-6 space-y-2 rounded-lg border bg-white p-4 text-sm">
        <p>
          <strong>Company:</strong> {template.company_name}
        </p>
        <p>
          <strong>Address:</strong> {template.company_address || "—"}
        </p>
        <p>
          <strong>GSTIN:</strong> {template.gstin || "—"}
        </p>
        <p>
          <strong>Terms:</strong>
        </p>
        <pre className="whitespace-pre-wrap text-xs text-[#45464d]">
          {template.terms_conditions || "—"}
        </pre>
      </div>
    </main>
  );
}
