import Link from "next/link";

export const metadata = {
  title: "Forgot Password | SmartBill AI",
  description: "Reset your SmartBill AI password"
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-md rounded-[24px] border border-[#c6c6cd]/30 bg-white p-10 text-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-bold text-[#0f172a]">Forgot Password</h1>
        <p className="mt-2 text-sm text-[#64748b]">Password reset is coming soon.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-bold text-[#2563EB] hover:underline">
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
