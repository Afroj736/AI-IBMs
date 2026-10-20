"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Badge,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Store,
  User
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthField } from "@/components/auth/auth-field";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { Checkbox } from "@/components/ui/checkbox";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  fetchCurrentUser,
  persistTokens,
  persistUserProfile,
  registerAccount
} from "@/services/auth-service";
import { useAuthStore } from "@/store/auth-store";
import {
  registerSchema,
  toRegisterPayload,
  type RegisterFormValues
} from "@/validators/register";

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      business_name: "",
      owner_name: "",
      mobile: "",
      email: "",
      gst_number: "",
      address: "",
      password: "",
      confirm_password: "",
      accept_terms: false
    },
    mode: "onBlur"
  });

  const password = watch("password");

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const tokens = await registerAccount(toRegisterPayload(values));
      persistTokens(tokens);
      const user = await fetchCurrentUser();
      persistUserProfile(user);
      setAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user
      });
      toast.success("Account created successfully!", {
        description: `Welcome, ${user.name}!`
      });
      router.replace("/");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Registration failed. Please try again."));
    }
  };

  return (
    <div className="auth-card">
      <div className="mb-10">
        <h2 className="mb-2 text-[32px] font-semibold leading-10 tracking-tight text-[#191c1e]">
          Create Your Account
        </h2>
        <p className="text-base text-[#45464d]">Start managing your business with SmartBill AI</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate id="registrationForm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AuthField
            label="Business Name"
            icon={Store}
            required
            placeholder="e.g. Acme Corp"
            autoComplete="organization"
            error={errors.business_name?.message}
            {...register("business_name")}
          />
          <AuthField
            label="Owner Name"
            icon={User}
            required
            placeholder="e.g. John Doe"
            autoComplete="name"
            error={errors.owner_name?.message}
            {...register("owner_name")}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AuthField
            label="Mobile Number"
            icon={Phone}
            required
            type="tel"
            placeholder="+91 00000 00000"
            autoComplete="tel"
            maxLength={10}
            error={errors.mobile?.message}
            {...register("mobile")}
          />
          <AuthField
            label="Email Address"
            icon={Mail}
            required
            type="email"
            placeholder="john@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AuthField
            label="GST Number"
            icon={Badge}
            optional
            placeholder="22AAAAA0000A1Z5"
            autoComplete="off"
            error={errors.gst_number?.message}
            {...register("gst_number")}
          />
          <AuthField
            label="Business Address"
            icon={MapPin}
            placeholder="Street, City, State"
            autoComplete="street-address"
            error={errors.address?.message}
            {...register("address")}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AuthPasswordField
            label="Password"
            icon={Lock}
            required
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <AuthPasswordField
            label="Confirm Password"
            icon={LockKeyhole}
            required
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
          />
        </div>

        <PasswordStrengthMeter password={password ?? ""} />

        <div className="space-y-1">
          <div className="flex items-start gap-3">
            <Controller
              name="accept_terms"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="accept_terms"
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-describedby={errors.accept_terms ? "terms-error" : undefined}
                  className="mt-1 rounded border-[#c6c6cd] data-[state=checked]:border-[#2563EB] data-[state=checked]:bg-[#2563EB]"
                />
              )}
            />
            <label htmlFor="accept_terms" className="cursor-pointer text-sm leading-relaxed text-[#45464d]">
              I agree to the{" "}
              <Link href="/terms" className="font-bold text-[#2563EB] hover:underline">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-bold text-[#2563EB] hover:underline">
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          {errors.accept_terms && (
            <p id="terms-error" className="text-xs text-[#ba1a1a]" role="alert">
              {errors.accept_terms.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-base font-semibold text-white shadow-lg shadow-[#2563EB]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Processing...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="text-center text-sm text-[#45464d]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#2563EB] hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
