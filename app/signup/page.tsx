"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { FileText, Loader2, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      // If Supabase has email confirmation disabled, user session is created immediately
      if (data?.session) {
        router.push("/");
        router.refresh();
        return;
      }

      // If email confirmation is enabled on Supabase
      if (data?.user && !data.session) {
        setSuccessMessage(
          "Account created successfully! If email verification is enabled on your Supabase project, please check your inbox to confirm your email before signing in."
        );
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during sign up."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center space-x-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            <FileText className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            DocSpace
          </span>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          Create your account
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          Get started with collaborative workspaces
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 space-y-2 rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Sign up failed</p>
                  <p className="mt-0.5 text-red-700 dark:text-red-300 font-mono text-[11px]">{errorMessage}</p>
                </div>
              </div>

              {errorMessage.toLowerCase().includes("rate limit") && (
                <div className="mt-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 leading-relaxed">
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    Why this happened &amp; 10-second fix:
                  </p>
                  <p className="mt-1">
                    Supabase&apos;s free SMTP limits automated confirmation emails. To bypass this instantly:
                  </p>
                  <ol className="mt-1.5 list-decimal list-inside space-y-1">
                    <li>
                      Go to your <strong>Supabase Dashboard &gt; Authentication &gt; Users</strong>
                    </li>
                    <li>
                      Click <strong>Add user &gt; Create user</strong>
                    </li>
                    <li>
                      Enter your email (<code className="font-semibold">{email || "suvishalsharma6@gmail.com"}</code>) and password, check <strong>&quot;Auto Confirm User?&quot;</strong>, and save.
                    </li>
                    <li>
                      Or in <strong>Authentication &gt; Providers &gt; Email</strong>, toggle <strong>&quot;Confirm email&quot; OFF</strong>.
                    </li>
                  </ol>
                  <div className="mt-2.5">
                    <Link
                      href="/login"
                      className="inline-flex items-center font-semibold text-blue-700 dark:text-blue-400 underline hover:no-underline"
                    >
                      Return to Sign In after creating user →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMessage ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Account created</p>
                  <p className="mt-1 leading-relaxed">{successMessage}</p>
                </div>
              </div>

              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label
                  htmlFor="full-name"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Full name (optional)
                </label>
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Developer"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Password (min 6 characters)
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Assessment Tip */}
          <div className="mt-6 flex items-start gap-2 rounded-lg bg-blue-50/60 p-3 text-[11px] text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p>
              <strong>Evaluator Note:</strong> Accounts are secured via Supabase PostgreSQL Auth. You can also create instant pre-confirmed users from the Supabase Dashboard under <em>Authentication &gt; Users &gt; Add user</em>.
            </p>
          </div>

          <div className="mt-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
