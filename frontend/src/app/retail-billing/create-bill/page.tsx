"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createInvoice } from "@/services/invoice-service";
import { type InvoiceFormValues, invoiceSchema } from "@/validators/invoice";

export default function CreateInvoicePage() {
  const router = useRouter();
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { invoice_date: new Date().toISOString().slice(0, 10), discount_amount: 0, round_off: 0, items: [] }
  });

  const onSubmit = async (values: InvoiceFormValues) => {
    await createInvoice(values);
    router.push("/retail-billing");
  };

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Create Invoice</h1>
      <p className="mt-2 text-slate-600">Add party, template, and invoice items. Stock and GST are validated in backend.</p>
      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <input className="w-full rounded border p-2" placeholder="Party UUID" {...form.register("party_id")} />
        <input className="w-full rounded border p-2" placeholder="Template UUID (optional)" {...form.register("template_id")} />
        <input className="w-full rounded border p-2" type="date" {...form.register("invoice_date")} />
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">
          Submit Invoice
        </button>
      </form>
    </main>
  );
}
