"use client";

import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Mic,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShoppingCart,
  Store,
  User,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useLogout } from "@/hooks/use-logout";
import { cn } from "@/lib/utils";
import { useBillingStore } from "@/store/billing-store";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "ANALYTICS",
    items: [
      { label: "Home", href: "/", icon: LayoutDashboard },
      { label: "Reports", href: "/", icon: BarChart3 },
      { label: "Ledger", href: "/customers", icon: ScrollText }
    ]
  },
  {
    title: "INVENTORY",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package },
      { label: "Parties", href: "/customers", icon: Users }
    ]
  },
  {
    title: "BILLING",
    items: [
      { label: "Retail Billing", href: "/billing/create?type=retail", icon: Store },
      { label: "GST Billing", href: "/billing/create?type=gst", icon: Receipt },
      { label: "Purchase Invoice", href: "/purchase-invoices", icon: ShoppingCart },
      { label: "Invoice Templates", href: "/purchase-invoices", icon: FileText },
      { label: "Voice Drafts", href: "/voice-entry", icon: Mic }
    ]
  },
  {
    title: "SYSTEM",
    items: [
      { label: "My Profile", href: "/settings/profile", icon: User },
      { label: "Company Settings", href: "/settings/company", icon: Settings }
    ]
  }
];

function NavLink({
  item,
  isActive,
  onNavigate
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-11 items-center gap-3 border-l-4 px-5 text-sm transition-all duration-200 ease-in-out",
        isActive
          ? "border-[#2563EB] bg-[#EEF4FF] font-semibold text-[#2563EB]"
          : "border-transparent font-medium text-[#374151] hover:bg-[#F9FAFB]"
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-[#2563EB]" : "text-[#6B7280]")} />
      {item.label}
    </Link>
  );
}

export function HamburgerMenu() {
  const logout = useLogout();
  const isMenuOpen = useBillingStore((s) => s.isMenuOpen);
  const setMenuOpen = useBillingStore((s) => s.setMenuOpen);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const close = () => setMenuOpen(false);

  const isItemActive = (href: string) => {
    const [path, queryString] = href.split("?");
    const pathMatches =
      pathname === path ||
      (path !== "/" && path !== "/dashboard" && pathname.startsWith(`${path}/`));
    if (!pathMatches) return false;

    if (path === "/billing/create") {
      const expectedType = href.includes("type=gst") ? "gst" : "retail";
      return searchParams.get("type") === expectedType;
    }

    if (!queryString) {
      if (path === "/") {
        return pathname === "/" || pathname === "/dashboard";
      }
      if (path === "/billing") {
        return pathname === "/billing" && !pathname.startsWith("/billing/create");
      }
      return true;
    }

    const expected = new URLSearchParams(queryString);
    for (const [key, value] of expected.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };

  return (
    <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
      <SheetContent
        side="right"
        className="flex h-full max-h-[100dvh] w-[280px] flex-col gap-0 overflow-hidden border-l border-[#E5E7EB] p-0 shadow-[0_0_20px_rgba(0,0,0,0.08)] duration-300 sm:w-[300px] md:w-[320px] [&>button]:hidden"
      >
        {/* Drawer header — fixed */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#E5E7EB] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#111827]">SmartBill AI</span>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition-colors duration-200 ease-in-out hover:bg-[#F3F4F6] hover:text-[#111827]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-2">
              <p className="px-5 py-2 text-xs font-semibold tracking-wide text-[#9CA3AF]">
                {section.title}
              </p>
              <div className="flex flex-col">
                {section.items.map((item) => (
                  <NavLink
                    key={`${section.title}-${item.label}`}
                    item={item}
                    isActive={isItemActive(item.href)}
                    onNavigate={close}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout — always visible at bottom */}
        <div className="shrink-0 border-t border-[#E5E7EB] bg-white pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() => {
              close();
              logout();
            }}
            className="flex h-12 w-full items-center gap-3 border-l-4 border-transparent px-5 text-sm font-medium text-[#EF4444] transition-all duration-200 ease-in-out hover:bg-[#FEF2F2]"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
