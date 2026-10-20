import { RegisterForm } from "@/components/auth/register-form";
import { RegisterHero } from "@/components/auth/register-hero";

export const metadata = {
  title: "Register | SmartBill AI",
  description: "Create your SmartBill AI business account — AI-powered inventory and GST billing"
};

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <aside className="auth-hero-panel" aria-label="Product overview">
        <RegisterHero />
      </aside>

      <section className="auth-form-panel">
        <RegisterForm />
      </section>
    </main>
  );
}
