import Link from "next/link";

import { listInvoices } from "@/services/invoice-service";

export const dynamic = "force-dynamic";

export default async function InvoiceListPage() {
  const invoices = await listInvoices();
  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice List</h1>
        <Link href="/retail-billing/create-bill" className="rounded bg-slate-900 px-4 py-2 text-white">
          Create Invoice
        </Link>
      </div>
      <div className="rounded border bg-white p-4">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between border-b py-3 last:border-b-0">
            <div>
              <p className="font-medium">{invoice.invoice_number}</p>
              <p className="text-sm text-slate-500">{invoice.payment_status}</p>
            </div>
            <Link className="text-blue-600" href={`/retail-billing/invoice-details/${invoice.id}`}>
              View
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
