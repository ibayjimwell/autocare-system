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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import ErrorHandler from "@/components/shared/error-handler";
import ChangePasswordModal from "./change-password-modal";

interface LoginFormProps {
  initialModalOpen?: boolean;
  username?: string;
}

export default function LoginForm({ initialModalOpen = false, username: initialUsername = "" }: LoginFormProps) {
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
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(initialModalOpen);
  const [changePasswordUsername, setChangePasswordUsername] = useState(initialUsername);
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
        message: err.message || "Something went wrong. Please try again.",
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
      message: "Your password has been updated. Please log in with your new password.",
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* ===== Left branding (unchanged) ===== */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-3/5 bg-primary overflow-hidden items-center justify-center p-12">
        <div className="relative z-10 max-w-lg text-primary-foreground space-y-6">
          <div className="inline-flex p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Wrench className="w-12 h-12" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            AutoCare <br />
            <span className="text-white/80">AutoProTech.</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            The management system designed specifically for modern auto repair shops and service centers.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-primary bg-primary-foreground/20"
                />
              ))}
            </div>
            <p className="text-sm self-center font-medium">Trusted by AutoProTech</p>
          </div>
        </div>
      </div>

      {/* ===== Right: Login Form ===== */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50/50">
        <Card className="w-full max-w-[450px] shadow-xl border-none md:border md:bg-white animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="space-y-1 pb-8">
            <div className="md:hidden flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-primary">
                <Wrench className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-center md:text-left">
              Login Form
            </CardTitle>
            <CardDescription className="text-center md:text-left text-base">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold">
                  Username
                </Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200">
                    <User
                      className={`w-4 h-4 ${
                        focusField === "user" ? "text-primary" : "text-slate-400"
                      }`}
                    />
                  </div>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    className="pl-10 h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    onFocus={() => setFocusField("user")}
                    onBlur={() => setFocusField(null)}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    disabled={showChangePasswordModal}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200">
                    <Lock
                      className={`w-4 h-4 ${
                        focusField === "pass" ? "text-primary" : "text-slate-400"
                      }`}
                    />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    onFocus={() => setFocusField("pass")}
                    onBlur={() => setFocusField(null)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={showChangePasswordModal}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorProps && (
                <ErrorHandler
                  type={errorProps.type}
                  title={errorProps.title}
                  message={errorProps.message}
                />
              )}

              {changePasswordSuccess && (
                <div className="text-green-600 text-sm text-center">
                  Password changed successfully! Please log in with your new password.
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                size="lg"
                disabled={isLoading || showChangePasswordModal}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={showChangePasswordModal}
        onOpenChange={setShowChangePasswordModal}
        username={changePasswordUsername}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  );
}