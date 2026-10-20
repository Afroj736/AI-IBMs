"use client";

import { useParams } from "next/navigation";

import { CreatePartyPage } from "@/components/parties/create-party-page";

export function EditPartyPage() {
  const { id } = useParams<{ id: string }>();
  return <CreatePartyPage partyId={id} />;
}
