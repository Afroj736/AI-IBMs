import { Suspense } from "react";

import { CreateTemplatePage } from "@/components/billing/create-template-page";

export const metadata = {
  title: "Create New Invoice Template | SmartBill AI",
  description: "Design and publish GST or Retail invoice templates with live preview"
};

function CreateTemplateFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#712ae2] border-t-transparent" />
    </div>
  );
}

export default function CreateTemplateRoutePage() {
  return (
    <Suspense fallback={<CreateTemplateFallback />}>
      <CreateTemplatePage />
    </Suspense>
  );
}
