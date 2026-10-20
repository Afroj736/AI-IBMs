import type { InvoiceTemplate } from "@/types/invoice-template";

function getInvoicePrefix(template: InvoiceTemplate): string {
  const prefix = template.template_json?.invoice_prefix;
  return typeof prefix === "string" && prefix.trim() ? prefix.trim() : "INV";
}

export function TemplatePreviewThumbnail({ template }: { template: InvoiceTemplate }) {
  const title =
    typeof template.template_json?.title === "string"
      ? template.template_json.title
      : "TAX INVOICE";
  const copyLabel =
    typeof template.template_json?.copy_label === "string"
      ? template.template_json.copy_label
      : "ORIGINAL RECIPIENT FOR TAX PAYMENT";
  const prefix = getInvoicePrefix(template);

  return (
    <div className="flex h-full w-full flex-col bg-white p-2 text-[6px] leading-tight text-[#191c1e]">
      <div className="border-b border-[#c6c6cd] pb-1 text-center">
        <p className="text-[7px] font-bold uppercase tracking-wide">{title}</p>
        <p className="text-[5px] text-[#45464d]">{copyLabel}</p>
        <p className="mt-0.5 text-[5px]">
          Invoice No: <span className="font-semibold">{prefix}48</span>
        </p>
      </div>

      <div className="mt-1 space-y-0.5">
        <p className="truncate text-[6px] font-bold">{template.company_name}</p>
        <p className="line-clamp-2 text-[5px] text-[#45464d]">
          {template.company_address || "Business Address"}
        </p>
        {template.gstin ? (
          <p className="text-[5px]">GSTIN: {template.gstin}</p>
        ) : (
          <p className="text-[5px] text-[#76777d]">GSTIN: —</p>
        )}
      </div>

      <div className="mt-1 rounded border border-[#e0e3e5]">
        <div className="grid grid-cols-8 gap-px bg-[#e0e3e5] text-[4px] font-semibold uppercase">
          {["Sr", "Item", "HSN", "Rate", "Qty", "Tax", "GST", "Total"].map((col) => (
            <div key={col} className="bg-[#f2f4f6] px-0.5 py-0.5 text-center">
              {col}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-px bg-[#e0e3e5] text-[4px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white px-0.5 py-1 text-center text-[#76777d]">
              —
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-0.5 pt-1 text-[5px]">
        <div className="flex justify-between">
          <span>Grand Total</span>
          <span className="font-semibold">₹ 0.00</span>
        </div>
        {template.show_qr && (
          <div className="mt-0.5 flex items-center justify-end gap-1">
            <div className="h-4 w-4 rounded border border-[#c6c6cd] bg-[#f2f4f6]" />
            <span className="text-[4px] text-[#45464d]">Scan QR</span>
          </div>
        )}
      </div>
    </div>
  );
}
