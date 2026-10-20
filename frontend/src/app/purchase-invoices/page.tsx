import { InvoiceTemplatesPage } from "@/components/billing/invoice-templates-page";

export const metadata = {
  title: "Invoice Templates | SmartBill AI",
  description: "Create and manage invoice designs for GST, Retail, Purchase and Custom invoices"
};

export default function TemplateListPage() {
  return <InvoiceTemplatesPage />;
}
