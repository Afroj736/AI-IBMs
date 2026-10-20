"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BillingHeader } from "@/components/billing/billing-header";
import { HamburgerMenu } from "@/components/billing/hamburger-menu";
import { VoiceFab } from "@/components/billing/voice-fab";
import { VoiceModal } from "@/components/billing/voice-modal";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn, formatCurrency } from "@/lib/utils";
import { PartyDetailDialog } from "@/components/parties/party-detail-dialog";
import { deleteParty, listParties } from "@/services/party-service";
import type { Party, PartyStatus, PartyType } from "@/types/party";

const PAGE_SIZE = 10;

type BalanceFilter = "all" | "outstanding" | "no_dues" | "over_limit";

function partyInitial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function locationLabel(party: Party): string {
  const parts = [party.city, party.state].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function typeBadgeClass(type: PartyType): string {
  if (type === "customer") return "bg-cyan-100/80 text-cyan-800";
  if (type === "supplier") return "bg-[#e6e8ea] text-[#45464d]";
  return "bg-[#712ae2]/10 text-[#712ae2]";
}

function avatarClass(index: number): string {
  const classes = [
    "bg-cyan-100 text-cyan-800",
    "bg-[#eaddff] text-[#5a00c6]",
    "bg-[#e6e8ea] text-[#45464d]"
  ];
  return classes[index % classes.length];
}

function outstandingMeta(party: Party): { amount: number; label: string; tone: "neutral" | "primary" | "danger" } {
  const amount = Number(party.opening_balance) || 0;
  const limit = Number(party.credit_limit) || 0;
  if (amount > limit && limit > 0) {
    return { amount, label: "Credit limit exceeded", tone: "danger" };
  }
  if (amount <= 0) {
    return { amount: 0, label: "No dues", tone: "neutral" };
  }
  return { amount, label: "Outstanding", tone: "primary" };
}

export function PartiesPage() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [partyType, setPartyType] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [openCreateOnLoad, setOpenCreateOnLoad] = useState(false);

  const openPartyDetail = (partyId: string, createInvoice = false) => {
    setSelectedPartyId(partyId);
    setOpenCreateOnLoad(createInvoice);
    setDetailOpen(true);
  };

  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listParties({
        search: search.trim() || undefined,
        party_type: partyType || undefined
      });
      setParties(data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to load parties"));
    } finally {
      setLoading(false);
    }
  }, [router, search, partyType]);

  useEffect(() => {
    const timer = setTimeout(() => void loadParties(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadParties, search]);

  const states = useMemo(() => {
    const set = new Set<string>();
    parties.forEach((p) => {
      if (p.state?.trim()) set.add(p.state.trim());
    });
    return Array.from(set).sort();
  }, [parties]);

  const filtered = useMemo(() => {
    return parties.filter((p) => {
      if (stateFilter && (p.state ?? "") !== stateFilter) return false;
      const { amount } = outstandingMeta(p);
      if (balanceFilter === "no_dues" && amount > 0) return false;
      if (balanceFilter === "outstanding" && amount <= 0) return false;
      if (balanceFilter === "over_limit") {
        const limit = Number(p.credit_limit) || 0;
        if (amount <= limit || limit <= 0) return false;
      }
      return true;
    });
  }, [parties, stateFilter, balanceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const customers = parties.filter((p) => p.party_type === "customer" || p.party_type === "both").length;
    const suppliers = parties.filter(
      (p) => p.status === "active" && (p.party_type === "supplier" || p.party_type === "both")
    ).length;
    const totalOutstanding = parties.reduce((sum, p) => sum + Math.max(0, Number(p.opening_balance) || 0), 0);
    return { customers, suppliers, totalOutstanding };
  }, [parties]);

  const clearFilters = () => {
    setPartyType("");
    setStateFilter("");
    setBalanceFilter("all");
    setSearch("");
    setPage(1);
  };

  const handleDelete = async (party: Party) => {
    if (!window.confirm(`Delete ${party.name}?`)) return;
    try {
      await deleteParty(party.id);
      toast.success("Party deleted");
      void loadParties();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete party"));
    }
  };

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC]">
      <BillingHeader />
      <HamburgerMenu />
      <VoiceModal />

      <main className="mx-auto max-w-[1440px] space-y-6 p-4 md:p-6 md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#000000] md:text-[32px]">Parties</h1>
            <p className="mt-1 text-sm text-[#45464d] md:text-base">
              Manage contacts with AI-driven insights.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl border-[#e0e3e5] bg-[#e6e8ea] font-semibold uppercase tracking-wide hover:bg-[#e0e3e5]"
              onClick={() => toast.info("Import coming soon.")}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl border-[#e0e3e5] bg-[#e6e8ea] font-semibold uppercase tracking-wide hover:bg-[#e0e3e5]"
              onClick={() => toast.info("Export coming soon.")}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              asChild
              className="h-10 gap-2 rounded-xl bg-[#712ae2] px-5 font-bold uppercase tracking-wide shadow-lg shadow-[#712ae2]/20 hover:bg-[#712ae2]/90"
            >
              <Link href="/customers/create-customer">
                <Plus className="h-4 w-4" />
                Add Party
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#76777d]" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, GST or city..."
              className="w-full rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#712ae2] focus:ring-2 focus:ring-[#712ae2]/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={partyType}
              onChange={(e) => {
                setPartyType(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] px-4 py-2.5 text-sm font-medium outline-none focus:border-[#712ae2]"
            >
              <option value="">Party Type</option>
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="both">Both</option>
            </select>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] px-4 py-2.5 text-sm font-medium outline-none focus:border-[#712ae2]"
            >
              <option value="">State</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={balanceFilter}
              onChange={(e) => {
                setBalanceFilter(e.target.value as BalanceFilter);
                setPage(1);
              }}
              className="cursor-pointer rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] px-4 py-2.5 text-sm font-medium outline-none focus:border-[#712ae2]"
            >
              <option value="all">Balance</option>
              <option value="outstanding">Outstanding</option>
              <option value="no_dues">No Dues</option>
              <option value="over_limit">Over Limit</option>
            </select>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#712ae2] transition hover:bg-[#712ae2]/10"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e2e8f0]/80 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                  {["Party Name", "Type", "Contact", "GST Number", "Outstanding", "Status", "Actions"].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={cn(
                          "px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#45464d]",
                          i >= 4 && i <= 5 && "text-center",
                          i === 4 && "text-right",
                          i === 6 && "text-right"
                        )}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e5]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#712ae2]" />
                    </td>
                  </tr>
                ) : filtered.length === 0 && parties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <p className="text-base font-semibold text-[#191c1e]">No parties created yet</p>
                      <p className="mt-2 text-sm text-[#45464d]">
                        Add a customer or supplier manually, or create one from voice billing.
                      </p>
                      <Link
                        href="/customers/create-customer"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#712ae2] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#712ae2]/20 hover:bg-[#712ae2]/90"
                      >
                        <Plus className="h-4 w-4" />
                        Add Party
                      </Link>
                    </td>
                  </tr>
                ) : pageSlice.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-[#45464d]">
                      No parties match your search or filters.{" "}
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="font-semibold text-[#712ae2] hover:underline"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((party, index) => {
                    const outstanding = outstandingMeta(party);
                    return (
                      <tr
                        key={party.id}
                        className="group cursor-pointer transition-colors hover:bg-[#fafbfc]"
                        onClick={() => openPartyDetail(party.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold",
                                avatarClass(index)
                              )}
                            >
                              {partyInitial(party.name)}
                            </div>
                            <div>
                              <div className="font-semibold text-[#191c1e]">{party.name}</div>
                              <div className="text-sm text-[#45464d]">{locationLabel(party)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                              typeBadgeClass(party.party_type)
                            )}
                          >
                            {party.party_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-[#191c1e]">{party.mobile}</div>
                          <div className="text-xs text-[#45464d]">{party.email ?? "—"}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-[#45464d]">
                          {party.gstin ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div
                            className={cn(
                              "font-bold",
                              outstanding.tone === "danger" && "text-[#ba1a1a]",
                              outstanding.tone === "primary" && "text-[#712ae2]",
                              outstanding.tone === "neutral" && "text-[#191c1e]"
                            )}
                          >
                            {formatCurrency(outstanding.amount)}
                          </div>
                          <div
                            className={cn(
                              "text-[10px] font-bold uppercase",
                              outstanding.tone === "danger" ? "text-[#ba1a1a]" : "text-[#45464d]"
                            )}
                          >
                            {outstanding.label}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <StatusBadge status={party.status} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openPartyDetail(party.id, true)}
                              className="rounded-lg p-2 text-[#712ae2] transition hover:bg-[#712ae2]/10"
                              title="Create invoice"
                            >
                              <Receipt className="h-5 w-5" />
                            </button>
                            <Link
                              href={`/customers/edit/${party.id}`}
                              className="rounded-lg p-2 text-[#45464d] transition hover:bg-[#e6e8ea]"
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDelete(party)}
                              className="rounded-lg p-2 text-[#ba1a1a] transition hover:bg-[#ffdad6]/50"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e0e3e5] bg-[#f2f4f6] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[#45464d]">
              Showing <span className="font-bold text-[#191c1e]">{rangeStart}-{rangeEnd}</span> of{" "}
              <span className="font-bold text-[#191c1e]">{filtered.length}</span> parties
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg p-2 text-[#45464d] transition hover:bg-[#e0e3e5]/50 disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition",
                    n === currentPage
                      ? "bg-[#712ae2] text-white"
                      : "text-[#191c1e] hover:bg-[#e0e3e5]/50"
                  )}
                >
                  {n}
                </button>
              ))}
              {totalPages > 5 && <span className="px-1 text-[#45464d]">...</span>}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg p-2 text-[#45464d] transition hover:bg-[#e0e3e5]/50 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-[#e2e8f0]/80 bg-white/80 p-6 shadow-sm backdrop-blur-md lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#45464d]">Quick Stats</span>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Customers</span>
                <span className="font-bold">{stats.customers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Suppliers</span>
                <span className="font-bold">{stats.suppliers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Outstanding</span>
                <span className="font-bold text-[#ba1a1a]">{formatCurrency(stats.totalOutstanding)}</span>
              </div>
            </div>
            <p className="mt-6 border-t border-[#e0e3e5] pt-4 text-[11px] text-[#45464d]">
              {parties.length > 0
                ? `${parties.length} ${parties.length === 1 ? "party" : "parties"} in your workspace`
                : "No parties created yet"}
            </p>
          </div>
        </div>
      </main>

      <PartyDetailDialog
        partyId={selectedPartyId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        openCreateOnLoad={openCreateOnLoad}
        onCreateOnLoadHandled={() => setOpenCreateOnLoad(false)}
      />

      <VoiceFab />
    </div>
  );
}

function StatusBadge({ status }: { status: PartyStatus }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
        active ? "bg-cyan-100 text-cyan-800" : "bg-[#e6e8ea] text-[#45464d]"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-cyan-500" : "bg-[#76777d]")} />
      {status}
    </span>
  );
}
