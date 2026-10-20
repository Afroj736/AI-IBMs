import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  const fieldLabels: Record<string, string> = {
    name: "Owner name",
    owner_name: "Owner name",
    business_name: "Business name",
    mobile: "Mobile number",
    email: "Email",
    password: "Password",
    gst_number: "GST number",
    address: "Business address"
  };

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const loc = "loc" in item && Array.isArray(item.loc) ? item.loc.filter(Boolean) : [];
          const fieldKey = loc[loc.length - 1];
          const label =
            typeof fieldKey === "string" && fieldLabels[fieldKey]
              ? fieldLabels[fieldKey]
              : typeof fieldKey === "string"
                ? fieldKey
                : "";
          const msg = String(item.msg);
          if (label) {
            return msg.toLowerCase().includes("required") ? `${label} is required` : `${label}: ${msg}`;
          }
          return msg;
        }
        return null;
      })
      .filter(Boolean)
      .join(", ");
  }

  if (error.code === "ERR_NETWORK") {
    return "Cannot reach the server. Start the backend on port 8000 and try again.";
  }

  if (error.response?.status === 401) {
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    return "Please sign in again";
  }

  if (error.response?.status === 403) {
    if (typeof detail === "string" && detail.trim()) {
      if (detail.toLowerCase().includes("insufficient permission")) {
        return "You do not have permission for this action";
      }
      return detail;
    }
    return "You do not have permission for this action";
  }

  if (error.response?.status === 409) {
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    return "This record already exists";
  }

  if (error.response?.status === 422) {
    return "Please check your form fields and try again.";
  }

  if (error.response?.status === 429) {
    if (typeof detail === "string" && detail.toLowerCase().includes("rate limit")) {
      return detail;
    }
    return "Too many requests. Please wait a minute and try again.";
  }

  return fallback;
}
