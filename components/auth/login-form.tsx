'use client';

import React, { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Wrench,
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CarFront,
  ShieldCheck,
  Settings,
  CheckCircle2,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import ErrorHandler from "@/components/shared/error-handler";
import ChangePasswordModal from "./change-password-modal";

interface LoginFormProps {
  initialModalOpen?: boolean;
  username?: string;
}

export default function LoginForm({
  initialModalOpen = false,
  username: initialUsername = "",
}: LoginFormProps) {
  const router = useRouter();

  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusField, setFocusField] = useState<"user" | "pass" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [errorProps, setErrorProps] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  const [showChangePasswordModal, setShowChangePasswordModal] =
    useState(initialModalOpen);

  const [changePasswordUsername, setChangePasswordUsername] =
    useState(initialUsername);

  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (showChangePasswordModal) return;

    setIsLoading(true);
    setErrorProps(null);
    setChangePasswordSuccess(false);

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    try {
      const result = await signIn("credentials", {
        username: trimmedUsername,
        password: trimmedPassword,
        redirect: false,
      });

      if (result?.error) {
        let parsedError;

        try {
          parsedError = JSON.parse(result.error);
        } catch {
          parsedError = {
            errorType: "fve",
            errorTitle: "Login failed",
            errorMessage: result.error,
          };
        }

        setErrorProps({
          type: parsedError.errorType,
          title: parsedError.errorTitle,
          message: parsedError.errorMessage,
        });

        return;
      }

      // Successful login – check if password change is required
      const session = await getSession();

      if (session?.user?.requiresPasswordChange) {
        setChangePasswordUsername(session.user.username);
        setShowChangePasswordModal(true);

        // Do not redirect yet – force password change
        return;
      }

      // Normal login – redirect to home
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorProps({
        type: "se",
        title: "Unexpected error",
        message:
          err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setShowChangePasswordModal(false);
    setChangePasswordSuccess(true);

    // Clear password field so user can log in with new password
    setPassword("");
    setShowPassword(false);

    // Show success message on the login form
    setErrorProps({
      type: "success",
      title: "Password changed",
      message:
        "Your password has been updated. Please log in with your new password.",
    });
  };

  return (
    <main className="min-h-svh w-full overflow-x-hidden bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-[1920px] flex-col lg:h-svh lg:min-h-0 lg:flex-row">
        {/* ============================================================
            LOGIN / AUTHENTICATION SIDE
        ============================================================ */}
        <section className="flex w-full shrink-0 items-center justify-center px-5 py-7 sm:px-8 md:px-10 lg:h-svh lg:w-[43%] lg:px-8 lg:py-5 xl:w-[40%] 2xl:w-[38%]">
          <div className="w-full max-w-[410px]">
            {/* Brand */}
            <div className="mb-4 flex items-center justify-center lg:mb-4 lg:justify-start">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Wrench className="h-5 w-5" />
                </div>

                <div className="leading-none">
                  <div className="text-lg font-bold tracking-tight text-foreground">
                    AutoCare
                  </div>

                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    AutoProTech
                  </div>
                </div>
              </div>
            </div>

            {/* Login Card */}
            <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
              <CardHeader className="space-y-2 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
                <CardTitle className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">
                  Welcome back!
                </CardTitle>

                <CardDescription className="text-sm leading-5 text-muted-foreground">
                  Sign in to continue to your AutoCare account.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="username"
                      className="text-sm font-medium text-foreground"
                    >
                      Username
                    </Label>

                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                        <User
                          className={`h-4 w-4 transition-colors ${
                            focusField === "user"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>

                      <Input
                        id="username"
                        placeholder="Enter your username"
                        className="h-11 rounded-md border-input bg-card pl-10 pr-3 text-base text-foreground shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:text-sm"
                        onFocus={() => setFocusField("user")}
                        onBlur={() => setFocusField(null)}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        disabled={showChangePasswordModal}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </Label>

                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                        <Lock
                          className={`h-4 w-4 transition-colors ${
                            focusField === "pass"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>

                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 rounded-md border-input bg-card pl-10 pr-11 text-base text-foreground shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:text-sm"
                        onFocus={() => setFocusField("pass")}
                        onBlur={() => setFocusField(null)}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={showChangePasswordModal}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((prev) => !prev)
                        }
                        disabled={showChangePasswordModal}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 md:h-8 md:w-8"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {errorProps && (
                    <ErrorHandler
                      type={errorProps.type}
                      title={errorProps.title}
                      message={errorProps.message}
                    />
                  )}

                  {/* Success */}
                  {changePasswordSuccess && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-center text-sm text-green-700">
                      Password changed successfully! Please log in with
                      your new password.
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10"
                    disabled={isLoading || showChangePasswordModal}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground lg:justify-start">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure staff access
            </div>
          </div>
        </section>

        {/* ============================================================
            AUTOMOTIVE SERVICE CENTER SIDE
        ============================================================ */}
        <section className="relative flex w-full flex-1 items-center overflow-hidden bg-primary px-5 py-8 sm:px-8 md:px-10 lg:h-svh lg:min-h-0 lg:px-8 lg:py-5 xl:px-12">
          {/* ========================================================
              BACKGROUND DECORATION
          ======================================================== */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full border border-white/10 lg:h-[380px] lg:w-[380px]" />

            <div className="absolute -right-4 -top-4 h-[190px] w-[190px] rounded-full border border-white/10 lg:h-[230px] lg:w-[230px]" />

            <div className="absolute -bottom-36 -left-32 h-[420px] w-[420px] rounded-full border border-white/10 lg:h-[480px] lg:w-[480px]" />

            <div className="absolute left-[35%] top-0 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
          </div>

          {/* ========================================================
              CONTENT CONTAINER

              Important:
              This container is constrained by the viewport on
              desktop so the right-side marketing composition can
              never make the page taller than the screen.
          ======================================================== */}
          <div className="relative z-10 mx-auto flex w-full max-w-[820px] flex-col justify-center lg:max-h-[calc(100svh-2.5rem)]">
            {/* ======================================================
                MARKETING COPY
            ====================================================== */}
            <div className="w-full max-w-2xl text-center lg:text-left">
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-medium text-white/90 backdrop-blur-md sm:text-[11px]">
                <Wrench className="h-3.5 w-3.5" />
                AutoProTech Automotive Service Center
              </div>

              <h1 className="text-[30px] font-bold leading-[1.05] tracking-tight text-white sm:text-4xl md:text-[42px] lg:text-[40px] xl:text-[44px]">
                Keeping vehicles
                <br />
                <span className="text-white/75">
                  running at their best.
                </span>
              </h1>

              <p className="mt-2.5 max-w-xl text-sm leading-5 text-white/70 sm:text-base sm:leading-6 lg:max-w-[540px]">
                A modern workspace for managing automotive service,
                appointments, inspections, repairs, estimates, and
                payments.
              </p>
            </div>

            {/* ======================================================
                AUTOMOTIVE WORKSHOP ILLUSTRATION
            ====================================================== */}
            <div className="relative mt-5 w-full sm:mt-6 lg:mt-5">
              <div
                className="
                  relative
                  h-[clamp(250px,42vh,370px)]
                  w-full
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/15
                  bg-black/10
                  shadow-2xl
                "
              >
                {/* Workshop ceiling */}
                <div className="absolute inset-x-0 top-0 h-14 border-b border-white/10 bg-black/10 sm:h-16">
                  <div className="absolute left-[8%] top-4 h-1.5 w-[25%] rounded-full bg-white/20" />
                  <div className="absolute right-[10%] top-4 h-1.5 w-[24%] rounded-full bg-white/20" />

                  <div className="absolute left-[8%] top-11 h-px w-[84%] bg-white/10" />
                </div>

                {/* Workshop pillars */}
                <div className="absolute bottom-0 left-[7%] top-14 w-4 bg-black/15 sm:w-5" />
                <div className="absolute bottom-0 right-[7%] top-14 w-4 bg-black/15 sm:w-5" />

                {/* Wall panels */}
                <div className="absolute inset-x-[9%] top-[18%] h-[25%] border-y border-white/10">
                  <div className="grid h-full grid-cols-4">
                    <div className="border-r border-white/10" />
                    <div className="border-r border-white/10" />
                    <div className="border-r border-white/10" />
                    <div />
                  </div>
                </div>

                {/* Floor */}
                <div className="absolute inset-x-0 bottom-0 h-[34%] bg-black/15">
                  <div className="absolute bottom-[30%] left-0 right-0 h-px bg-white/10" />

                  <div className="absolute bottom-0 left-1/2 h-full w-px -translate-x-1/2 bg-white/5" />
                </div>

                {/* Service lift */}
                <div className="absolute bottom-[28%] left-[11%] h-[88px] w-2.5 rounded-full bg-white/15 sm:h-[110px] sm:w-3" />

                <div className="absolute bottom-[28%] right-[20%] h-[88px] w-2.5 rounded-full bg-white/15 sm:h-[110px] sm:w-3" />

                <div className="absolute bottom-[27%] left-[7%] h-2.5 w-[57%] rounded-full bg-white/15 sm:h-3" />

                {/* ==================================================
                    CAR
                ================================================== */}
                <div className="absolute bottom-[24%] left-[15%] w-[60%] sm:bottom-[23%] sm:left-[18%] sm:w-[53%]">
                  {/* Car shadow */}
                  <div className="absolute -bottom-3 left-[7%] right-[3%] h-4 rounded-full bg-black/30 blur-md" />

                  {/* Car body */}
                  <div className="relative h-[65px] rounded-[24px_28px_14px_14px] border border-white/20 bg-white/95 shadow-xl sm:h-[82px] sm:rounded-[28px_32px_16px_16px]">
                    {/* Hood */}
                    <div className="absolute right-[-1px] top-[18px] h-[30px] w-[19%] rounded-r-[25px] bg-white/95 sm:top-[22px] sm:h-[34px]" />

                    {/* Roof */}
                    <div className="absolute left-[20%] top-[-25px] h-[47px] w-[48%] rounded-[48px_60px_8px_8px] border border-white/20 bg-white/95 sm:top-[-30px] sm:h-[55px] sm:rounded-[55px_70px_8px_8px]">
                      {/* Windows */}
                      <div className="absolute left-[9%] top-[6px] h-[27px] w-[35%] rounded-[24px_4px_4px_4px] bg-slate-700/80 sm:top-[7px] sm:h-[31px]" />

                      <div className="absolute right-[7%] top-[6px] h-[27px] w-[40%] rounded-[4px_24px_4px_4px] bg-slate-700/80 sm:top-[7px] sm:h-[31px]" />
                    </div>

                    {/* Door seams */}
                    <div className="absolute bottom-0 left-[39%] top-[24px] w-px bg-slate-300" />
                    <div className="absolute bottom-0 left-[64%] top-[24px] w-px bg-slate-300" />

                    {/* Handles */}
                    <div className="absolute left-[46%] top-[31px] h-1 w-3.5 rounded-full bg-slate-400 sm:top-[36px] sm:w-4" />

                    <div className="absolute left-[69%] top-[31px] h-1 w-3.5 rounded-full bg-slate-400 sm:top-[36px] sm:w-4" />

                    {/* Headlight */}
                    <div className="absolute right-2 top-[25px] h-3 w-4 rounded-full bg-primary/80 sm:top-[30px] sm:w-5" />

                    {/* Rear light */}
                    <div className="absolute left-1 top-[25px] h-3 w-3.5 rounded-full bg-red-500/80 sm:top-[30px] sm:w-4" />

                    {/* Wheels */}
                    <div className="absolute -bottom-6 left-[13%] flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950 shadow-lg sm:-bottom-7 sm:h-16 sm:w-16">
                      <div className="h-4 w-4 rounded-full bg-slate-400/80 sm:h-5 sm:w-5" />
                    </div>

                    <div className="absolute -bottom-6 right-[12%] flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950 shadow-lg sm:-bottom-7 sm:h-16 sm:w-16">
                      <div className="h-4 w-4 rounded-full bg-slate-400/80 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    MECHANIC
                ================================================== */}
                <div className="absolute bottom-[25%] right-[7%] h-[125px] w-[90px] sm:h-[165px] sm:w-[115px]">
                  {/* Head */}
                  <div className="absolute left-[31%] top-0 h-8 w-8 rounded-full bg-[#dca67a] sm:h-11 sm:w-11">
                    <div className="absolute -top-1 left-[-2px] h-3.5 w-[calc(100%+4px)] rounded-full bg-slate-900 sm:h-4" />
                  </div>

                  {/* Body / uniform */}
                  <div className="absolute left-[22%] top-9 h-[60px] w-[58%] rounded-[16px_16px_8px_8px] bg-slate-900 sm:top-12 sm:h-[78px] sm:rounded-[18px_18px_9px_9px]">
                    <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />

                    <div className="absolute left-2.5 top-6 h-1.5 w-1.5 rounded-full bg-white/50 sm:left-3 sm:top-7 sm:h-2 sm:w-2" />

                    <div className="absolute left-2.5 top-10 h-1.5 w-1.5 rounded-full bg-white/50 sm:left-3 sm:top-12 sm:h-2 sm:w-2" />

                    <div className="absolute right-2 top-6 rounded bg-primary px-1 py-0.5 text-[4px] font-bold uppercase tracking-wide text-white sm:top-7 sm:px-1.5 sm:text-[5px]">
                      ATP
                    </div>
                  </div>

                  {/* Left arm */}
                  <div className="absolute left-[6%] top-[48px] h-10 w-4 rotate-[25deg] rounded-full bg-slate-900 sm:top-[62px] sm:h-14 sm:w-6" />

                  {/* Right arm */}
                  <div className="absolute right-[1%] top-[47px] h-10 w-4 -rotate-[30deg] rounded-full bg-slate-900 sm:top-[62px] sm:h-14 sm:w-6" />

                  {/* Wrench */}
                  <div className="absolute right-[-4%] top-[27px] rotate-[40deg] text-white/90 sm:top-[33px]">
                    <Wrench className="h-8 w-8 stroke-[1.7] sm:h-11 sm:w-11" />
                  </div>

                  {/* Legs */}
                  <div className="absolute bottom-0 left-[28%] h-12 w-5 rounded-b-xl bg-slate-800 sm:h-20 sm:w-7" />

                  <div className="absolute bottom-0 right-[22%] h-12 w-5 rounded-b-xl bg-slate-800 sm:h-20 sm:w-7" />
                </div>

                {/* ==================================================
                    TOOLBOX
                ================================================== */}
                <div className="absolute bottom-[15%] right-[7%] hidden h-[52px] w-[78px] rounded-lg border border-white/15 bg-white/10 sm:block">
                  <div className="absolute left-1/2 top-[-7px] h-4 w-8 -translate-x-1/2 rounded-t-md border border-white/20 bg-white/10" />

                  <div className="absolute inset-x-2 top-3 h-1 bg-white/10" />
                  <div className="absolute inset-x-2 top-6 h-1 bg-white/10" />
                  <div className="absolute inset-x-2 top-9 h-1 bg-white/10" />
                </div>

                {/* ==================================================
                    SERVICE BADGE
                ================================================== */}
                <div className="absolute left-3 top-3 rounded-xl border border-white/15 bg-black/20 p-2 backdrop-blur-md sm:left-5 sm:top-5 sm:p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-primary sm:h-8 sm:w-8">
                      <CarFront className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>

                    <div>
                      <p className="text-[7px] font-semibold uppercase tracking-wider text-white/50 sm:text-[8px]">
                        Service Center
                      </p>

                      <p className="text-[10px] font-semibold text-white sm:text-xs">
                        Professional Care
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================
                SERVICE HIGHLIGHTS

                Hidden on shorter desktop viewports so this content
                can never force the page below the viewport.
            ====================================================== */}
            <div
              className="
                mt-4
                grid
                w-full
                max-w-[780px]
                grid-cols-3
                gap-2.5
                sm:mt-5
                sm:gap-3
                [@media(max-height:700px)]:hidden
              "
            >
              <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                <div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Settings className="h-3 w-3" />
                </div>

                <p className="text-[9px] font-semibold text-white sm:text-xs">
                  Expert Service
                </p>

                <p className="mt-0.5 text-[8px] leading-3.5 text-white/50 sm:text-[9px]">
                  Professional repair workflow
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                <div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white">
                  <CarFront className="h-3 w-3" />
                </div>

                <p className="text-[9px] font-semibold text-white sm:text-xs">
                  Vehicle Care
                </p>

                <p className="mt-0.5 text-[8px] leading-3.5 text-white/50 sm:text-[9px]">
                  From inspection to completion
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                <div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white">
                  <CheckCircle2 className="h-3 w-3" />
                </div>

                <p className="text-[9px] font-semibold text-white sm:text-xs">
                  Trusted Work
                </p>

                <p className="mt-0.5 text-[8px] leading-3.5 text-white/50 sm:text-[9px]">
                  Organized service management
                </p>
              </div>
            </div>

            {/* ======================================================
                INDICATORS
            ====================================================== */}
            <div
              className="
                mt-4
                flex
                items-center
                justify-center
                gap-1.5
                lg:justify-start
                [@media(max-height:650px)]:hidden
              "
            >
              <span className="h-1.5 w-7 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
            </div>
          </div>
        </section>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={showChangePasswordModal}
        onOpenChange={setShowChangePasswordModal}
        username={changePasswordUsername}
        onSuccess={handlePasswordChangeSuccess}
      />
    </main>
  );
}