import { LoginForm } from "@/components/auth/login-form";
import { LoginHero } from "@/components/auth/login-hero";

export const metadata = {
  title: "Login | SmartBill AI",
  description: "Sign in to SmartBill AI — AI-powered inventory and billing"
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <aside className="auth-hero-panel" aria-label="Product overview">
        <LoginHero />
      </aside>

      <section className="auth-form-panel">
        <LoginForm />
      </section>
    </main>
  );
}
