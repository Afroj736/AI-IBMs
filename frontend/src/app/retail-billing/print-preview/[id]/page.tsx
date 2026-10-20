import { getInvoice } from "@/services/invoice-service";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Invoice Print Preview</h1>
      <div className="mt-4 rounded border bg-white p-6">
        <p className="text-lg font-semibold">{invoice.invoice_number}</p>
        <p>Invoice Date: {invoice.invoice_date}</p>
        <hr className="my-3" />
        {invoice.items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-sm">
            <span>
              {item.item_name} x {item.quantity}
            </span>
            <span>{item.line_total}</span>
          </div>
        ))}
        <hr className="my-3" />
        <p className="text-right font-semibold">Grand Total: {invoice.grand_total}</p>
      </div>
    </main>
  );
}
