"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getApiErrorMessage } from "@/lib/api-error";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import {
  fetchCurrentUser,
  loginAccount,
  persistTokens,
  persistUserProfile
} from "@/services/auth-service";
import { useAuthStore } from "@/store/auth-store";
import { loginSchema, type LoginFormValues } from "@/validators/login";
import { cn } from "@/lib/utils";

const REMEMBER_EMAIL_KEY = "smartbill_remember_email";

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember_me: false
    }
  });

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setValue("email", saved);
      setValue("remember_me", true);
    }
  }, [setValue]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const tokens = await loginAccount({
        email: values.email,
        password: values.password
      });

      persistTokens(tokens);

      if (values.remember_me) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      const user = await fetchCurrentUser();
      persistUserProfile(user);
      setAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user
      });

      toast.success("Welcome back!", {
        description: `Signed in as ${user.name}`
      });
      router.replace("/");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Sign in failed. Please try again."));
    }
  };

  return (
    <div className="auth-card auth-card-login">
      <header className="mb-10">
        <h2 className="mb-3 text-[42px] font-bold leading-tight text-[#0f172a]">Welcome Back!</h2>
        <p className="text-lg text-[#64748b]">Sign in to continue managing your business</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d]"
          >
            Email Address
          </label>
          <div className="group relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#76777d] transition-colors group-focus-within:text-[#2563EB]"
              aria-hidden="true"
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              aria-invalid={!!errors.email}
              className={cn(
                "h-14 w-full rounded-xl bg-slate-50 pl-12 pr-4 text-base text-[#191c1e] outline-none ring-1 ring-inset ring-slate-200 transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#2563EB]",
                errors.email && "ring-red-500 focus:ring-red-500"
              )}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-[#ba1a1a]" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d]"
          >
            Password
          </label>
          <div className="group relative">
            <Lock
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#76777d] transition-colors group-focus-within:text-[#2563EB]"
              aria-hidden="true"
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              className={cn(
                "h-14 w-full rounded-xl bg-slate-50 pl-12 pr-12 text-base text-[#191c1e] outline-none ring-1 ring-inset ring-slate-200 transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#2563EB]",
                errors.password && "ring-red-500 focus:ring-red-500"
              )}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-[#ba1a1a]" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between py-2">
          <Controller
            name="remember_me"
            control={control}
            render={({ field }) => (
              <label className="group flex cursor-pointer items-center gap-2">
                <Checkbox
                  id="remember_me"
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  className="h-5 w-5 rounded border-slate-300 data-[state=checked]:border-[#2563EB] data-[state=checked]:bg-[#2563EB]"
                />
                <span className="text-sm text-slate-600 transition-colors group-hover:text-slate-900">
                  Remember Me
                </span>
              </label>
            )}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-[#2563EB] transition-colors hover:text-[#1E40AF]"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-base font-bold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] hover:bg-[#1E40AF] disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <footer className="mt-10 border-t border-slate-100 pt-8 text-center">
        <p className="text-sm text-[#64748b]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="ml-1 font-bold text-[#2563EB] hover:underline">
            Create Account
          </Link>
        </p>
      </footer>
    </div>
  );
}
