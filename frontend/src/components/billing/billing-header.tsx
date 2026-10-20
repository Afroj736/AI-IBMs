"use client";

import {
  ChevronDown,
  HelpCircle,
  Menu,
  Receipt,
  Search,
  User,
  Building2,
  Users,
  LogOut
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-logout";
import { formatUserRole, getInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useBillingStore } from "@/store/billing-store";

function GlobalSearch({
  value,
  onChange,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6B7280]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search invoice no, customer, item, phone..."
        className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-11 pr-4 text-sm text-[#111827] outline-none transition-all duration-200 ease-in-out placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
        aria-label="Global search"
      />
    </div>
  );
}

export function BillingHeader() {
  const router = useRouter();
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);
  const globalSearchQuery = useBillingStore((s) => s.globalSearchQuery);
  const setGlobalSearchQuery = useBillingStore((s) => s.setGlobalSearchQuery);
  const setMenuOpen = useBillingStore((s) => s.setMenuOpen);

  const displayName = user?.name ?? "User";
  const roleLabel = formatUserRole(user?.role);
  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-[100] w-full overflow-visible border-b border-[#E5E7EB] bg-white">
      <div className="relative flex h-[72px] items-center gap-3 overflow-visible px-4 md:gap-4 md:px-6">
        {/* Left — brand (home) */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-xl transition-colors duration-200 hover:opacity-90 active:scale-[0.98]"
          aria-label="Go to home"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563EB]">
            <Receipt className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          <div className="hidden sm:block">
            <p className="text-2xl font-bold leading-tight text-[#111827]">SmartBill AI</p>
            <p className="text-[13px] font-medium text-[#6B7280]">Inventory & Billing</p>
          </div>
        </Link>

        {/* Center — search (tablet/desktop) */}
        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <GlobalSearch
            value={globalSearchQuery}
            onChange={setGlobalSearchQuery}
            className="max-w-[560px]"
          />
        </div>

        {/* Right — actions */}
        <div className="relative z-[110] ml-auto flex items-center gap-1 overflow-visible sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-[#6B7280] transition-colors duration-200 ease-in-out hover:bg-[#F3F4F6] hover:text-[#111827]"
            title="Help Center"
            aria-label="Help Center"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 gap-2 rounded-xl px-2 transition-colors duration-200 ease-in-out hover:bg-[#F3F4F6]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-left lg:block">
                  <p className="text-sm font-semibold leading-tight text-[#111827]">{displayName}</p>
                  <p className="text-xs font-medium text-[#6B7280]">{roleLabel}</p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-[#6B7280] lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              collisionPadding={12}
              className="z-[200] w-56 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
            >
              <div className="border-b border-[#E5E7EB] px-3 py-2.5 lg:hidden">
                <p className="text-sm font-semibold text-[#111827]">{displayName}</p>
                <p className="text-xs text-[#6B7280]">{roleLabel}</p>
              </div>
              <DropdownMenuItem
                className="cursor-pointer rounded-lg"
                onSelect={() => router.push("/settings/profile")}
              >
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                <Link href="/settings/company" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users & Roles
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#E5E7EB]" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg text-[#EF4444] focus:bg-[#FEF2F2] focus:text-[#EF4444]"
                onSelect={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-[#6B7280] transition-colors duration-200 ease-in-out hover:bg-[#F3F4F6] hover:text-[#111827]"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile search */}
      <div className="border-t border-[#E5E7EB] px-4 py-3 md:hidden">
        <GlobalSearch value={globalSearchQuery} onChange={setGlobalSearchQuery} />
      </div>
    </header>
  );
}
