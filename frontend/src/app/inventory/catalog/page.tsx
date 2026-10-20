import { Suspense } from "react";

import { CatalogManagementPage } from "@/components/inventory/catalog-management-page";

export const metadata = {
  title: "Catalog Management | SmartBill AI",
  description: "Manage brands and categories for your inventory catalog"
};

function CatalogFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#712ae2] border-t-transparent" />
    </div>
  );
}

export default function CatalogRoutePage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogManagementPage />
    </Suspense>
  );
}
