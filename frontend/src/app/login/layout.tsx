import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["400", "500", "600", "700"]
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${geist.className} ${geist.variable}`}>{children}</div>;
}
