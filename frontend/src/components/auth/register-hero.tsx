"use client";

import { CheckCircle2 } from "lucide-react";
import Image from "next/image";

const FEATURES = [
  "AI Voice Billing Integration",
  "One-Click GST Invoice Creation",
  "Smart Inventory Tracking",
  "Advanced Customer Management",
  "Automated Business Reports"
];

const TRUSTED_BRANDS = [
  {
    name: "ASUS",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCxoBpQ47i9sXXWZpp2G50QN7neUNi1VCKi6tp2LeVVwF7waSbNsJjFAugqekFpf2lmmY4bCt4rugsnHK7yJ-bL0VWuVHRU0CuHVHP_qjRmJVmrU6NU_QLbHIkELl5pzWwSc7ZiIwEoA-6FgkGfBpPK1kBEQTZTgZnTDZnDm3x9kZtyZoTvkqEZfv5hEYAYX-knIa5ebbDmVzBPmbSqnkpVjDvoSAKe7iZ_glqXKwz83u1qMJXj8kW5r7cDxOL80jI-H8514MZf7a8"
  },
  {
    name: "boAt",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCDFkZB5c97XsAHl9hDptu3Ya1zCmuM-tku9aU_WS0oOJLwoVrxxoXpo3BPXQVNHPuCFJRoBhSejJctiwVNxX_6ycSiSCsmDksN0m_fMjJAodpdhvh2lXR1HaZhPtTAnoYRdQMlqaMw3gZl8nSfbhYxwHUVSwA5LRDm0apm2hdgDB4kI5etBtKKHTuk7tR0c3WawX4HqSg0LAhm2fNlOfi5i-BK5zKRT7zrVSj3_yKmid_7uKEbsdhKx0knu0NLm-OiLnqcX5QQLRo"
  },
  {
    name: "Zebronics",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhqQjKBQb8zLreYH3r4e_cJFCD5cCGYZ5LAFexoIHofAk6cSb34DLZR9LLEqK-D6QiOo3ssYYiZY96ElHXgUBUDVM27s9mwOdImBabKyBuNz7GJ9M1NlxOhWru0S52l4M7WKxL01H1HIaLK95hULWia2DwoYZOBZK8UQEoLy4T1BIXURAjLXJb5qMUAy9wTj-pPXEx712pN7Umt8_TwjKV67SBOLTCmUtymlSXwfOZchAwdJRjMQaaUoLaZiT_sn99MCHilwY42dw"
  },
  {
    name: "Realme",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHM4l9EihuE6Zj6S0cthxzuiYzhhCH2Nt9zf-oPXFldFRKq47y2CoQJ57ByejyChIVpPvt_zIbeh-zjFaIDopUezI7Tk1sWM1mqB1JAHtAl4Pq-DjQnfMi4wK3Zrql-jSgIJki7ZcCHc5gqhKYOlASII8XZtxJJPjhwCiJtTsqDvD_aqAsiNwZz6FEZBZPvG3sLGftDzkyYcAeSWKpwgv4tMTdV0gdlsduXlCv1cG5vvNFxcBbHQMQxfBJcIr-1epTPFTR3zl1M9g"
  }
];

export function RegisterHero() {
  return (
    <div className="auth-hero-inner">
      <div className="auth-hero-blur-top" aria-hidden="true" />
      <div className="auth-hero-blur-bottom" aria-hidden="true" />

      <div>
        <h1 className="auth-hero-title">SmartBill AI</h1>
        <p className="auth-hero-tagline">AI Powered Inventory & Billing</p>

        <h2 className="auth-hero-headline" style={{ marginTop: "40px" }}>
          Start Your Journey with SmartBill AI
        </h2>
        <p className="auth-hero-desc">
          Experience the future of business management with India&apos;s most advanced AI-powered ERP.
          Generate GST compliant invoices with just your voice and track inventory in real-time.
        </p>

        <ul className="auth-hero-features">
          {FEATURES.map((feature) => (
            <li key={feature}>
              <CheckCircle2 className="auth-hero-check" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="auth-hero-trusted-label">Trusted By Industry Leaders</p>
        <div className="auth-hero-logos">
          {TRUSTED_BRANDS.map((brand) => (
            <Image
              key={brand.name}
              src={brand.src}
              alt={brand.name}
              width={80}
              height={24}
              unoptimized
            />
          ))}
        </div>
      </div>
    </div>
  );
}
