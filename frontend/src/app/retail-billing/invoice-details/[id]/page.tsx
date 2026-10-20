import Link from "next/link";

import { getInvoice } from "@/services/invoice-service";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice Details</h1>
        <Link className="rounded bg-slate-900 px-4 py-2 text-white" href={`/retail-billing/print-preview/${invoice.id}`}>
          Print Preview
        </Link>
      </div>
      <div className="rounded border bg-white p-4">
        <p>
          <strong>Invoice No:</strong> {invoice.invoice_number}
        </p>
        <p>
          <strong>Status:</strong> {invoice.payment_status}
        </p>
        <p>
          <strong>Total:</strong> {invoice.grand_total}
        </p>
      </div>
    </main>
  );
}
