import { listInvoices } from "@/services/invoice-service";

export const dynamic = "force-dynamic";

export default async function InvoiceHistoryPage() {
  const invoices = await listInvoices();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Invoice History</h1>
      <ul className="mt-4 space-y-2">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="rounded border bg-white p-3">
            {invoice.invoice_number} - {invoice.grand_total}
          </li>
        ))}
      </ul>
    </main>
  );
}
