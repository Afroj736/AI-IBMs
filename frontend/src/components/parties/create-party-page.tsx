"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle,
  ChevronRight,
  HelpCircle,
  Loader2,
  Mic,
  PlusCircle,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { BillingHeader } from "@/components/billing/billing-header";
import { HamburgerMenu } from "@/components/billing/hamburger-menu";
import { VoiceFab } from "@/components/billing/voice-fab";
import { VoiceModal } from "@/components/billing/voice-modal";
import { GSTLookup } from "@/components/party/GSTLookup";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useBillingStore } from "@/store/billing-store";
import { createParty, getParty, updateParty } from "@/services/party-service";
import type { GSTPartyFieldMapping } from "@/types/gst";
import { type PartyFormValues, partySchema } from "@/validators/party";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

type FormTab = "general" | "address" | "financial" | "contact";

const TABS: { id: FormTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "address", label: "Address" },
  { id: "financial", label: "Financial" },
  { id: "contact", label: "Contact" }
];

const inputClass =
  "h-12 w-full rounded-lg border-transparent bg-[#f2f4f6] px-4 text-base text-[#191c1e] outline-none transition placeholder:text-[#76777d] focus:border-[#712ae2] focus:ring-2 focus:ring-[#712ae2]/10";

const selectClass = cn(inputClass, "appearance-none");
const labelClass = "text-xs font-semibold uppercase tracking-wider text-[#45464d]";

function CapsLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <label className={labelClass}>
      {children}
      {required && <span className="text-[#ba1a1a]"> *</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-[#ba1a1a]">{message}</p>;
}

function parsePartyNotes(notes?: string | null) {
  const result = {
    businessType: "",
    contactPerson: "",
    website: "",
    paymentTerms: "",
    freeNotes: ""
  };
  if (!notes?.trim()) return result;

  const remaining: string[] = [];
  for (const part of notes.split(" · ")) {
    if (part.startsWith("Business Type: ")) result.businessType = part.slice(15);
    else if (part.startsWith("Contact: ")) result.contactPerson = part.slice(9);
    else if (part.startsWith("Website: ")) result.website = part.slice(9);
    else if (part.startsWith("Payment Terms: ")) result.paymentTerms = part.slice(16);
    else remaining.push(part);
  }
  result.freeNotes = remaining.join(" · ");
  return result;
}

function buildPartyNotes(
  businessType: string,
  contactPerson: string,
  website: string,
  paymentTerms: string,
  freeNotes?: string
) {
  const notesParts: string[] = [];
  if (businessType.trim()) notesParts.push(`Business Type: ${businessType.trim()}`);
  if (contactPerson.trim()) notesParts.push(`Contact: ${contactPerson.trim()}`);
  if (website.trim()) notesParts.push(`Website: ${website.trim()}`);
  if (paymentTerms.trim()) notesParts.push(`Payment Terms: ${paymentTerms.trim()}`);
  if (freeNotes?.trim()) notesParts.push(freeNotes.trim());
  return notesParts.length > 0 ? notesParts.join(" · ") : undefined;
}

interface CreatePartyPageProps {
  partyId?: string;
}

export function CreatePartyPage({ partyId }: CreatePartyPageProps) {
  const isEditMode = Boolean(partyId);
  const router = useRouter();
  const setVoiceModalOpen = useBillingStore((s) => s.setVoiceModalOpen);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>("general");
  const [gstVerified, setGstVerified] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [website, setWebsite] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      party_type: "customer",
      name: "",
      business_name: "",
      mobile: "",
      country: "India",
      credit_limit: 0,
      opening_balance: 0,
      status: "active",
      gstin: "",
      pan_number: "",
      billing_address: "",
      shipping_address: "",
      city: "",
      state: "Maharashtra",
      pincode: "",
      notes: ""
    }
  });

  const partyName = form.watch("name");
  const tradeName = form.watch("business_name");

  useEffect(() => {
    if (!partyId) return;

    const loadParty = async () => {
      setLoading(true);
      try {
        const data = await getParty(partyId);
        const parsedNotes = parsePartyNotes(data.notes);
        form.reset({
          party_type: data.party_type,
          name: data.name,
          business_name: data.business_name ?? "",
          mobile: data.mobile,
          country: data.country ?? "India",
          credit_limit: Number(data.credit_limit),
          opening_balance: Number(data.opening_balance),
          status: data.status,
          gstin: data.gstin ?? "",
          pan_number: data.pan_number ?? "",
          billing_address: data.billing_address ?? "",
          shipping_address: data.shipping_address ?? "",
          city: data.city ?? "",
          state: data.state ?? "Maharashtra",
          pincode: data.pincode ?? "",
          alternate_mobile: data.alternate_mobile ?? "",
          email: data.email ?? "",
          notes: parsedNotes.freeNotes
        });
        setBusinessType(parsedNotes.businessType);
        setContactPerson(parsedNotes.contactPerson);
        setWebsite(parsedNotes.website);
        setPaymentTerms(parsedNotes.paymentTerms);
        setGstVerified(Boolean(data.gstin?.trim()));
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load party"));
        router.push("/customers");
      } finally {
        setLoading(false);
      }
    };

    void loadParty();
  }, [partyId, form, router]);

  const handleGSTFetched = useCallback(
    (fields: GSTPartyFieldMapping) => {
      form.setValue("name", fields.name, { shouldValidate: true });
      form.setValue("business_name", fields.business_name, { shouldValidate: true });
      form.setValue("gstin", fields.gstin, { shouldValidate: true });
      form.setValue("pan_number", fields.pan_number, { shouldValidate: true });
      form.setValue("billing_address", fields.billing_address, { shouldValidate: true });
      if (fields.city) form.setValue("city", fields.city, { shouldValidate: true });
      form.setValue("state", fields.state, { shouldValidate: true });
      form.setValue("pincode", fields.pincode, { shouldValidate: true });
      setBusinessType(fields.business_type);
      setGstVerified(true);
    },
    [form]
  );

  const applySuggestion = () => {
    if (partyName) {
      toast.success("Suggestion applied to form fields");
    }
  };

  const onSubmit = async (values: PartyFormValues) => {
    setSaving(true);
    try {
      const payload = {
        party_type: values.party_type,
        name: values.name,
        business_name: values.business_name?.trim() || undefined,
        gstin: values.gstin?.trim() || undefined,
        pan_number: values.pan_number?.trim() || undefined,
        mobile: values.mobile,
        alternate_mobile: values.alternate_mobile || undefined,
        email: values.email || undefined,
        billing_address: values.billing_address || undefined,
        shipping_address: values.shipping_address || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        country: values.country || "India",
        pincode: values.pincode || undefined,
        credit_limit: values.credit_limit,
        opening_balance: values.opening_balance,
        notes: buildPartyNotes(businessType, contactPerson, website, paymentTerms, values.notes),
        status: values.status
      };

      if (isEditMode && partyId) {
        await updateParty(partyId, payload);
        toast.success("Party updated successfully");
      } else {
        await createParty(payload);
        toast.success("Party created successfully");
      }
      router.push("/customers");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, isEditMode ? "Failed to update party" : "Failed to create party")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f7f9fb] selection:bg-[#712ae2]/30">
      <BillingHeader />
      <HamburgerMenu />
      <VoiceModal />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-10">
        {/* Breadcrumbs & Header */}
        <div className="mb-8">
          <nav className="mb-4 flex items-center gap-2">
            <Link
              href="/customers"
              className="text-xs font-semibold uppercase tracking-wider text-[#45464d] transition-colors hover:text-[#712ae2]"
            >
              Parties
            </Link>
            <ChevronRight className="h-4 w-4 text-[#76777d]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#000000]">
              {isEditMode ? "Edit Party" : "Add Party"}
            </span>
          </nav>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[#191c1e] md:text-[32px] md:leading-10">
            {isEditMode ? "Edit Party" : "Add New Party"}
          </h1>
          <p className="text-sm text-[#45464d]">
            {isEditMode
              ? "Update customer or supplier details. Use GST number to refresh verified information."
              : "Onboard a new customer or supplier. Use GST number to fetch verified details instantly."}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200/40 bg-white/80">
            <Loader2 className="h-10 w-10 animate-spin text-[#712ae2]" />
          </div>
        ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-6">
          {/* Main Form */}
          <div className="lg:col-span-8">
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mb-8 overflow-hidden rounded-xl border border-slate-200/40 bg-white/80 shadow-[0_10px_15px_-3px_rgba(113,42,226,0.05)] backdrop-blur-md"
            >
              {/* Tabs */}
              <div className="flex border-b border-[#c6c6cd]/60 bg-[#f2f4f6]/50">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 px-4 py-4 text-xs font-semibold uppercase tracking-wider transition-colors md:px-6",
                      activeTab === tab.id
                        ? "border-b-2 border-[#712ae2] bg-white text-[#712ae2]"
                        : "border-b-2 border-transparent text-[#45464d] hover:bg-[#eceef0]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-6 p-6 md:p-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <CapsLabel>Party Type</CapsLabel>
                      <select className={selectClass} {...form.register("party_type")}>
                        <option value="customer">Customer</option>
                        <option value="supplier">Supplier</option>
                        <option value="both">Both</option>
                      </select>
                    </div>

                    <GSTLookup
                      variant="embedded"
                      value={form.watch("gstin") ?? ""}
                      onChange={(v) => {
                        form.setValue("gstin", v, { shouldDirty: true });
                        if (v.length < 15) setGstVerified(false);
                      }}
                      onFetched={handleGSTFetched}
                      disabled={saving}
                      className="space-y-2"
                    />

                    <div className="space-y-2 md:col-span-2">
                      <CapsLabel>Party Name</CapsLabel>
                      <input
                        className={inputClass}
                        placeholder="e.g. ABC Traders Pvt Ltd"
                        {...form.register("name")}
                      />
                      <FieldError message={form.formState.errors.name?.message} />
                    </div>

                    <div className="space-y-2">
                      <CapsLabel>Trade Name</CapsLabel>
                      <input
                        className={inputClass}
                        placeholder="e.g. ABC Traders"
                        {...form.register("business_name")}
                      />
                    </div>

                    <div className="space-y-2">
                      <CapsLabel>PAN Number</CapsLabel>
                      <input
                        className={cn(inputClass, "uppercase tracking-wider")}
                        placeholder="ABCDE1234F"
                        {...form.register("pan_number")}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <CapsLabel>Business Type</CapsLabel>
                      <input
                        className={inputClass}
                        placeholder="e.g. Regular, Composition"
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Address Tab */}
              {activeTab === "address" && (
                <div className="space-y-6 p-6 md:p-8">
                  <div className="space-y-2">
                    <CapsLabel>Billing Address</CapsLabel>
                    <textarea
                      className={cn(inputClass, "min-h-24 resize-none py-3")}
                      placeholder="Street, building, area..."
                      {...form.register("billing_address")}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <CapsLabel>City</CapsLabel>
                      <input className={inputClass} placeholder="Mumbai" {...form.register("city")} />
                    </div>
                    <div className="space-y-2">
                      <CapsLabel>State</CapsLabel>
                      <select className={selectClass} {...form.register("state")}>
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <CapsLabel>Pincode</CapsLabel>
                      <input className={inputClass} placeholder="400001" {...form.register("pincode")} />
                    </div>
                    <div className="space-y-2">
                      <CapsLabel>Country</CapsLabel>
                      <input className={inputClass} {...form.register("country")} />
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Tab */}
              {activeTab === "financial" && (
                <div className="space-y-6 p-6 md:p-8">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <CapsLabel>Opening Balance</CapsLabel>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#45464d]">
                          ₹
                        </span>
                        <input
                          className={cn(inputClass, "pl-8")}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...form.register("opening_balance", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <CapsLabel>Credit Limit</CapsLabel>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#45464d]">
                          ₹
                        </span>
                        <input
                          className={cn(inputClass, "pl-8")}
                          type="number"
                          min={0}
                          step="0.01"
                          {...form.register("credit_limit", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <CapsLabel>Payment Terms</CapsLabel>
                      <input
                        className={inputClass}
                        placeholder="e.g. Net 30 days"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <CapsLabel>Notes</CapsLabel>
                      <textarea
                        className={cn(inputClass, "min-h-24 resize-none py-3")}
                        placeholder="Additional notes about this party"
                        {...form.register("notes")}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === "contact" && (
                <div className="space-y-6 p-6 md:p-8">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <CapsLabel>Contact Person</CapsLabel>
                      <input
                        className={inputClass}
                        placeholder="Mr. John Doe"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <CapsLabel required>Mobile Number</CapsLabel>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#45464d]">
                          +91
                        </span>
                        <input
                          className={cn(inputClass, "pl-12")}
                          placeholder="9876543210"
                          type="tel"
                          {...form.register("mobile")}
                        />
                      </div>
                      <FieldError message={form.formState.errors.mobile?.message} />
                    </div>
                    <div className="space-y-2">
                      <CapsLabel>Email Address</CapsLabel>
                      <input
                        className={inputClass}
                        type="email"
                        placeholder="billing@company.com"
                        {...form.register("email")}
                      />
                      <FieldError message={form.formState.errors.email?.message} />
                    </div>
                    <div className="space-y-2">
                      <CapsLabel>Website</CapsLabel>
                      <input
                        className={inputClass}
                        type="url"
                        placeholder="https://example.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#c6c6cd]/60 bg-white/50 p-6 md:p-8">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-base font-semibold text-[#45464d] transition-all hover:bg-[#eceef0]"
                  onClick={() => router.push("/customers")}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#712ae2] px-10 py-3 text-base font-semibold text-white shadow-lg shadow-[#712ae2]/20 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5 fill-current" />
                  )}
                  {isEditMode ? "Update Party" : "Save Party"}
                </button>
              </div>
            </form>
          </div>

          {/* AI Smart Suggest Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-[#712ae2]/20 bg-white p-6 shadow-[0_0_20px_rgba(124,58,237,0.1)]">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a4cfc]/20">
                  <Sparkles className="h-5 w-5 text-[#712ae2]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#000000]">AI Smart Suggest</h3>
                  <p className="text-sm text-[#45464d]">
                    {gstVerified ? "Auto-filled via GST verification" : "Fetch GST to auto-fill details"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {partyName ? (
                  <button
                    type="button"
                    onClick={applySuggestion}
                    className="group w-full rounded-lg border border-[#712ae2]/10 bg-[#712ae2]/5 p-4 text-left transition-colors hover:border-[#712ae2]/40"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#712ae2]">
                        Suggested Entity
                      </span>
                      <PlusCircle className="h-4 w-4 text-[#712ae2] opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="text-base font-bold text-[#191c1e]">{partyName}</p>
                    {tradeName && tradeName !== partyName && (
                      <p className="mt-1 text-sm text-[#45464d]">Trade: {tradeName}</p>
                    )}
                    <p className="mt-1 text-sm text-[#45464d]">
                      Confidence Score: {gstVerified ? "98%" : "—"}
                    </p>
                  </button>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#c6c6cd] p-4 text-center text-sm text-[#45464d]">
                    Enter a GST number and fetch details to see AI suggestions here.
                  </div>
                )}

                <div className="rounded-lg border border-[#c6c6cd]/30 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                    AI Voice Recorder
                  </h4>
                  <div className="flex items-center justify-center py-4">
                    <div className="relative">
                      <div className="absolute -inset-4 animate-pulse rounded-full bg-[#712ae2]/10" />
                      <button
                        type="button"
                        onClick={() => setVoiceModalOpen(true)}
                        className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#712ae2] text-white shadow-lg transition-transform hover:scale-110 active:scale-90"
                        aria-label="Open voice input"
                      >
                        <Mic className="h-8 w-8" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 px-4 text-center text-sm text-[#45464d]">
                    Tap to dictate party details. AI will parse and fill fields.
                  </p>
                </div>

                <div className="relative h-48 overflow-hidden rounded-xl border border-[#c6c6cd]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#712ae2]/20 via-[#f2f4f6] to-[#acedff]/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white">
                      {gstVerified ? "Verified Business Profile" : "Smart Party Onboarding"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-lg bg-[#eceef0] p-4">
              <HelpCircle className="h-5 w-5 shrink-0 text-[#76777d]" />
              <div>
                <p className="text-sm font-semibold text-[#191c1e]">Need assistance?</p>
                <p className="text-sm text-[#45464d]">
                  Use GST fetch for verified details, or voice input to dictate party information.
                </p>
              </div>
            </div>
          </aside>
        </div>
        )}
      </main>

      <VoiceFab />
    </div>
  );
}
