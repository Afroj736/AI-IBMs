export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "U";
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  manager: "Manager",
  accountant: "Accountant",
  sales_staff: "Sales Staff",
  store_operator: "Store Operator"
};

export function formatUserRole(role: string | undefined): string {
  if (!role) return "User";
  return ROLE_LABELS[role] ?? role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
