import type { PartyAddress } from "@/types/billing";

interface AddressCardProps {
  title: string;
  address: PartyAddress;
}

function AddressCard({ title, address }: AddressCardProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-border p-5">
      <p className="mb-3 text-sm font-semibold text-primary">{title}</p>
      <p className="text-lg font-bold text-foreground">{address.name}</p>
      {address.gst_number && <p className="mt-1 text-sm text-foreground">GST: {address.gst_number}</p>}
      {address.phone && <p className="text-sm text-foreground">{address.phone}</p>}
      {address.email && <p className="text-sm text-foreground">{address.email}</p>}
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-secondary">{address.address}</p>
    </div>
  );
}

export function BillToCard({ address }: { address: PartyAddress }) {
  return <AddressCard title="BILL TO" address={address} />;
}
