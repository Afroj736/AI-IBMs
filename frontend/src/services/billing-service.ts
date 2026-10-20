import { MOCK_BUSINESS, SAMPLE_INVOICES } from "@/data/mock-invoices";
import { filterBillingInvoices, mapInvoiceToBilling } from "@/lib/map-invoice-to-billing";
import { api } from "@/services/api";
import { getInvoice, listInvoices } from "@/services/invoice-service";
import { listParties } from "@/services/party-service";
import type { AuthCompany } from "@/store/auth-store";
import type {
  BillingInvoice,
  BusinessInfo,
  CreateInvoicePayload,
  InvoiceListParams,
  VoiceDraftExtraction
} from "@/types/billing";
import type { Party } from "@/types/party";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_BILLING === "true";

/** User-created invoices in mock mode (empty until first voice/create). */
let mockUserInvoices: BillingInvoice[] = [];

function allMockInvoices(): BillingInvoice[] {
  if (mockUserInvoices.length > 0) {
    return [...mockUserInvoices];
  }
  return [...SAMPLE_INVOICES];
}

function findMockInvoice(id: string): BillingInvoice | null {
  return (
    mockUserInvoices.find((inv) => inv.id === id) ??
    SAMPLE_INVOICES.find((inv) => inv.id === id) ??
    null
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildPartyMap(): Promise<Map<string, Party>> {
  const parties = await listParties();
  return new Map(parties.map((party) => [party.id, party]));
}

async function fetchRealInvoices(params?: InvoiceListParams): Promise<BillingInvoice[]> {
  const [invoices, partyMap] = await Promise.all([listInvoices(params?.search), buildPartyMap()]);
  const mapped = invoices.map((invoice) =>
    mapInvoiceToBilling(invoice, partyMap.get(invoice.party_id))
  );
  return filterBillingInvoices(mapped, params);
}

export function isShowingSampleInvoices(): boolean {
  return USE_MOCK && mockUserInvoices.length === 0;
}

export async function fetchInvoices(params?: InvoiceListParams): Promise<BillingInvoice[]> {
  if (USE_MOCK) {
    await delay(400);
    return filterBillingInvoices(allMockInvoices(), params);
  }

  const realInvoices = await fetchRealInvoices(params);
  if (realInvoices.length > 0) {
    return realInvoices;
  }

  return filterBillingInvoices(SAMPLE_INVOICES, params);
}

export async function fetchInvoiceById(id: string): Promise<BillingInvoice | null> {
  if (USE_MOCK) {
    await delay(300);
    return findMockInvoice(id);
  }

  if (id.startsWith("sample-")) {
    return SAMPLE_INVOICES.find((inv) => inv.id === id) ?? null;
  }

  try {
    const invoice = await getInvoice(id);
    const parties = await listParties();
    const party = parties.find((entry) => entry.id === invoice.party_id) ?? null;
    return mapInvoiceToBilling(invoice, party);
  } catch {
    return null;
  }
}

function companyToBusinessInfo(company: AuthCompany): BusinessInfo {
  return {
    id: company.id,
    name: company.business_name,
    gst_number: company.gst_number ?? "",
    phone: company.mobile ?? "",
    email: company.email,
    address: company.address ?? ""
  };
}

export async function fetchBusinessInfo(): Promise<BusinessInfo> {
  if (USE_MOCK) {
    await delay(200);
    const { loadPersistedUserProfile } = await import("@/services/auth-service");
    const user = loadPersistedUserProfile();
    if (user?.company) {
      return companyToBusinessInfo(user.company);
    }
    return MOCK_BUSINESS;
  }
  const { data } = await api.get<BusinessInfo>("/billing/business");
  return data;
}

export async function createInvoiceFromPayload(payload: CreateInvoicePayload): Promise<BillingInvoice> {
  if (USE_MOCK) {
    await delay(800);
    const newInvoice: BillingInvoice = {
      id: `inv-${Date.now()}`,
      invoice_number: `INV-2026-${String(mockUserInvoices.length + 1).padStart(4, "0")}`,
      invoice_type: "gst",
      is_sample: false,
      status: payload.status ?? "draft",
      customer_name: payload.customer_name,
      customer_id: payload.customer_id ?? `cust-${Date.now()}`,
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      place_of_supply: "Karnataka",
      amount: payload.line_items.reduce((sum, item) => sum + item.amount, 0),
      bill_to: {
        name: payload.customer_name,
        address: "Address pending"
      },
      ship_to: {
        name: payload.customer_name,
        address: "Address pending"
      },
      line_items: payload.line_items.map((item, idx) => ({
        ...item,
        id: `li-${Date.now()}-${idx}`
      })),
      totals: {
        subtotal: payload.line_items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
        cgst: 0,
        sgst: 0,
        igst: 0,
        discount: 0,
        round_off: 0,
        grand_total: payload.line_items.reduce((sum, item) => sum + item.amount, 0),
        received_amount: 0,
        balance_amount: payload.line_items.reduce((sum, item) => sum + item.amount, 0),
        amount_in_words: "Amount in words pending"
      },
      notes: payload.notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockUserInvoices = [newInvoice, ...mockUserInvoices];
    return newInvoice;
  }
  const { data } = await api.post<BillingInvoice>("/billing/invoices", payload);
  return data;
}

export async function processVoiceAudio(_audioBlob: Blob): Promise<VoiceDraftExtraction> {
  if (USE_MOCK) {
    await delay(2500);
    return {
      customer: "New Voice Customer",
      items: [
        {
          name: "Samsung Galaxy A55 5G",
          serial_numbers: ["SN-VA-001", "SN-VA-002"],
          quantity: 2,
          rate: 32999
        },
        {
          name: "Samsung 25W Charger",
          quantity: 2,
          rate: 1299
        }
      ],
      transcript:
        "Create invoice for New Voice Customer. Two Samsung Galaxy A55 5G phones at thirty two thousand nine hundred ninety nine each. Also two Samsung 25W chargers at twelve ninety nine each."
    };
  }
  const formData = new FormData();
  formData.append("audio", _audioBlob);
  const { data } = await api.post<VoiceDraftExtraction>("/billing/voice/process", formData);
  return data;
}

export function resetMockInvoices() {
  mockUserInvoices = [];
}
