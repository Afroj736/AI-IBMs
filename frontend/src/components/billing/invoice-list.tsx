"use client";

import { FileText, Filter, Mic, PenLine, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useInvoices } from "@/hooks/use-invoices";
import { useBillingStore } from "@/store/billing-store";
import type { InvoiceFilterTab } from "@/types/billing";
import { cn } from "@/lib/utils";
import { InvoiceCard, InvoiceCardSkeleton } from "./invoice-card";
import { SearchBar } from "./search-bar";

const FILTER_TABS: { value: InvoiceFilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" }
];

export function InvoiceList() {
  const router = useRouter();
  const {
    activeFilter,
    searchQuery,
    selectedInvoiceId,
    setActiveFilter,
    setSearchQuery,
    setSelectedInvoiceId,
    setVoiceModalOpen
  } = useBillingStore();

  const { data: invoices, isLoading, isError } = useInvoices();

  const handleManualBill = () => {
    router.push("/billing/create?type=retail");
  };

  const handleVoiceBill = () => {
    setSelectedInvoiceId(null);
    setVoiceModalOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 w-[380px] shrink-0 flex-col border-r border-border bg-white">
      <div className="flex items-center justify-between gap-3 p-6 pb-4">
        <h1 className="min-w-0 text-2xl font-bold leading-tight text-foreground">All Invoices</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-10 shrink-0 gap-1.5 rounded-[10px] bg-primary px-3 text-white hover:bg-primary-hover active:bg-primary-active">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl border border-[#E5E7EB] p-1 shadow-lg">
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg px-3 py-2.5"
              onSelect={handleVoiceBill}
            >
              <Mic className="h-4 w-4 text-primary" />
              Voice Bill
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg px-3 py-2.5"
              onSelect={handleManualBill}
            >
              <PenLine className="h-4 w-4 text-primary" />
              Manual Bill
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 px-6 pb-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search invoices..."
          className="flex-1"
        />
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-6 pb-4 scrollbar-thin">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveFilter(tab.value)}
            className={cn(
              "h-8 shrink-0 rounded-md px-3 text-sm font-medium transition-all duration-200",
              activeFilter === tab.value
                ? "bg-primary text-white"
                : "bg-transparent text-secondary hover:bg-primary/10 hover:text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <InvoiceCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-danger">Failed to load invoices</p>
            <p className="mt-1 text-xs text-secondary">Please try again later</p>
          </div>
        )}

        {!isLoading && !isError && invoices?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-secondary" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {searchQuery ? "No search results" : "No invoices yet"}
            </p>
            <p className="mt-1 text-xs text-secondary">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Click New Invoice to create your first bill"}
            </p>
          </div>
        )}

        {!isLoading && !isError && invoices && invoices.length > 0 && (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                isSelected={selectedInvoiceId === invoice.id}
                onSelect={(id) => setSelectedInvoiceId(selectedInvoiceId === id ? null : id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
