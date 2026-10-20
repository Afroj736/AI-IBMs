"use client";

import { Building2 } from "lucide-react";

import type { InvoiceTemplateFormValues } from "@/validators/invoice-template";

type Props = {
  values: InvoiceTemplateFormValues;
  zoom?: number;
};

const SAMPLE_LINES = [
  { sr: "1", name: "Sample Product A", hsn: "8507", rate: "847.46", qty: "1", gst: "18%", total: "1000.00" },
  { sr: "2", name: "Sample Product B", hsn: "8548", rate: "423.73", qty: "2", gst: "18%", total: "1000.00" }
];

export function CreateTemplateLivePreview({ values, zoom = 0.85 }: Props) {
  const json = values.template_json ?? {};
  const prefix = typeof json.invoice_prefix === "string" ? json.invoice_prefix : "INV";
  const title = typeof json.title === "string" ? json.title : "TAX INVOICE";
  const copyLabel =
    typeof json.copy_label === "string" ? json.copy_label : "ORIGINAL RECIPIENT FOR TAX PAYMENT";
  const theme = (json.theme as Record<string, string>) ?? {};
  const primary = theme.primary_color ?? "#000000";
  const secondary = theme.secondary_color ?? "#712AE2";
  const sections = (json.sections as Record<string, boolean>) ?? {};
  const lineColumns = Array.isArray(json.line_columns)
    ? (json.line_columns as { id: string; label: string; enabled: boolean }[]).filter((c) => c.enabled)
    : [];

  const showHsn = sections.hsn_sac !== false;
  const cols =
    lineColumns.length > 0
      ? lineColumns
      : [
          { id: "sr", label: "Sr" },
          { id: "description", label: "Item" },
          { id: "hsn", label: "HSN" },
          { id: "rate", label: "Rate" },
          { id: "quantity", label: "Qty" },
          { id: "gst", label: "GST" },
          { id: "total", label: "Total" }
        ].filter((c) => (c.id === "hsn" ? showHsn : true));

  return (
    <div
      className="relative mx-auto w-full max-w-[640px] overflow-hidden rounded-sm border border-[#c6c6cd]/30 bg-white shadow-2xl"
      style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
    >
      <div className="pointer-events-none absolute inset-0 flex rotate-45 select-none items-center justify-center opacity-[0.03]">
        <span className="text-8xl font-bold">PREVIEW</span>
      </div>

      <div className="relative flex flex-col p-8 text-[#191c1e]">
        <div className="mb-6 border-b border-[#e0e3e5] pb-4 text-center">
          <p className="text-lg font-bold uppercase tracking-wide" style={{ color: primary }}>
            {title}
          </p>
          <p className="text-[10px] text-[#45464d]">{copyLabel}</p>
          <p className="mt-1 text-xs">
            Invoice No: <span className="font-bold">{prefix}48</span>
            <span className="mx-2 text-[#c6c6cd]">|</span>
            Date: {new Date().toLocaleDateString("en-IN")}
          </p>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            {sections.company_logo !== false && (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: primary }}
              >
                <Building2 className="h-6 w-6" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold">{values.company_name || "Your Business Name"}</h3>
              <p className="max-w-[220px] text-xs text-[#45464d]">
                {values.company_address || "Business Address"}
              </p>
              {values.gstin && <p className="text-xs">GSTIN: {values.gstin}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-[#45464d]">Grand Total</p>
            <p className="text-2xl font-extrabold" style={{ color: secondary }}>
              ₹ 2,000.00
            </p>
          </div>
        </div>

        {sections.client_address !== false && (
          <div className="mb-6 grid grid-cols-2 gap-4 border-y border-[#eceef0] py-4 text-xs">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#45464d]">Bill To</p>
              <p className="font-semibold">Sample Customer</p>
              <p className="text-[#45464d]">Billing Address, City, State</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#45464d]">Ship To</p>
              <p className="text-[#45464d]">Shipping Address, City, State</p>
            </div>
          </div>
        )}

        <table className="mb-6 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#f2f4f6] text-[10px] font-bold uppercase text-[#45464d]">
              {cols.map((col) => (
                <th key={col.id} className="px-2 py-2 text-left">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAMPLE_LINES.map((line) => (
              <tr key={line.sr} className="border-b border-[#eceef0]">
                {cols.map((col) => {
                  const val =
                    col.id === "sr"
                      ? line.sr
                      : col.id === "description"
                        ? line.name
                        : col.id === "hsn"
                          ? line.hsn
                          : col.id === "rate"
                            ? `₹ ${line.rate}`
                            : col.id === "quantity"
                              ? line.qty
                              : col.id === "gst"
                                ? line.gst
                                : col.id === "total"
                                  ? `₹ ${line.total}`
                                  : "—";
                  return (
                    <td key={col.id} className="px-2 py-2">
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between gap-6 text-xs">
          <div className="space-y-3">
            {values.show_qr && sections.show_qr_section !== false && (
              <div className="flex items-center gap-2">
                <div className="h-14 w-14 rounded border border-[#c6c6cd] bg-[#f2f4f6]" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#45464d]">Scan QR for payment</p>
                  <p className="text-[#45464d]">Ref: {prefix}48</p>
                </div>
              </div>
            )}
            {values.terms_conditions && (
              <div className="max-w-[240px]">
                <p className="text-[10px] font-bold uppercase text-[#45464d]">Terms & Conditions</p>
                <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-[#45464d]">
                  {values.terms_conditions}
                </p>
              </div>
            )}
          </div>

          <div className="min-w-[180px] space-y-1">
            {sections.subtotal !== false && (
              <div className="flex justify-between">
                <span className="text-[#45464d]">Sub Total</span>
                <span className="font-semibold">₹ 1,694.92</span>
              </div>
            )}
            {sections.gst_summary !== false && (
              <>
                <div className="flex justify-between">
                  <span className="text-[#45464d]">CGST</span>
                  <span className="font-semibold">₹ 152.54</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#45464d]">SGST</span>
                  <span className="font-semibold">₹ 152.54</span>
                </div>
              </>
            )}
            {sections.balance_due !== false && (
              <div className="flex justify-between border-t-2 pt-2" style={{ borderColor: primary }}>
                <span className="font-bold uppercase">Grand Total</span>
                <span className="text-lg font-extrabold">₹ 2,000.00</span>
              </div>
            )}
            {values.show_signature && (
              <p className="pt-4 text-right text-[10px] italic text-[#45464d]">
                Authorized Signatory
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
