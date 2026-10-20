import { amountToWords } from "@/lib/number-to-words";
import type { BillingInvoice, BillingLineItem, InvoiceListParams, InvoiceStatus, InvoiceType } from "@/types/billing";
import type { Invoice, PaymentStatus } from "@/types/invoice";
import type { Party } from "@/types/party";

function addDays(date: string, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function inferInvoiceType(invoiceNumber: string): InvoiceType {
  return invoiceNumber.trim().toUpperCase().startsWith("GST") ? "gst" : "retail";
}

function mapPaymentStatus(status: PaymentStatus): InvoiceStatus {
  switch (status) {
    case "paid":
      return "paid";
    case "partial":
      return "sent";
    case "cancelled":
      return "draft";
    case "pending":
    default:
      return "draft";
  }
}

export function mapInvoiceToBilling(invoice: Invoice, party?: Party | null): BillingInvoice {
  const lineItems: BillingLineItem[] = invoice.items.map((item) => ({
    id: item.id,
    item_name: item.item_name,
    hsn_sac: "—",
    quantity: item.quantity,
    unit_price: Number(item.rate),
    gst_percent: Number(item.gst_percent),
    amount: Number(item.line_total)
  }));

  const subtotal = Number(invoice.subtotal);
  const grandTotal = Number(invoice.grand_total);
  const receivedAmount = Number(invoice.received_amount ?? 0);

  const address =
    [party?.billing_address, party?.city, party?.state, party?.pincode].filter(Boolean).join(", ") ||
    "Address not available";

  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    invoice_type: inferInvoiceType(invoice.invoice_number),
    is_sample: false,
    status: mapPaymentStatus(invoice.payment_status),
    customer_name: party?.name ?? "Customer",
    customer_id: invoice.party_id,
    invoice_date: invoice.invoice_date,
    due_date: addDays(invoice.invoice_date, 15),
    place_of_supply: party?.state ?? "—",
    amount: grandTotal,
    bill_to: {
      name: party?.name ?? "Customer",
      gst_number: party?.gstin ?? null,
      phone: party?.mobile ?? null,
      email: party?.email ?? null,
      address
    },
    ship_to: {
      name: party?.name ?? "Customer",
      gst_number: party?.gstin ?? null,
      phone: party?.mobile ?? null,
      address: party?.shipping_address || address
    },
    line_items: lineItems,
    totals: {
      subtotal,
      cgst: Number(invoice.cgst_amount),
      sgst: Number(invoice.sgst_amount),
      igst: Number(invoice.igst_amount),
      discount: Number(invoice.discount_amount),
      round_off: Number(invoice.round_off),
      grand_total: grandTotal,
      received_amount: receivedAmount,
      balance_amount: Math.max(0, grandTotal - receivedAmount),
      amount_in_words: amountToWords(grandTotal)
    },
    notes: invoice.notes ?? null,
    created_at: invoice.created_at,
    updated_at: invoice.created_at
  };
}

export function filterBillingInvoices(
  list: BillingInvoice[],
  params?: InvoiceListParams
): BillingInvoice[] {
  let result = [...list];

  if (params?.status && params.status !== "all") {
    result = result.filter((inv) => inv.status === params.status);
  }

  if (params?.search?.trim()) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        inv.line_items.some((item) => item.item_name.toLowerCase().includes(q))
    );
  }

  return result.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
