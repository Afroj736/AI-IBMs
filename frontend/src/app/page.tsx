import { Suspense } from "react";

import { HomePage } from "@/components/home/home-page";

export const metadata = {
  title: "Home | SmartBill AI",
  description: "SmartBill AI home — billing, inventory overview, and quick actions"
};

export default function RootHomePage() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
