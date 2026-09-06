'use client';

import React, { useState, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  onSuccess: () => void;
}

export default function ChangePasswordModal({
  open,
  onOpenChange,
  username,
  onSuccess,
}: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    message: string;
    isValid: boolean;
    errors: string[];
  }>({
    score: 0,
    message: "Very Weak",
    isValid: false,
    errors: [],
  });

  const evaluateStrength = (password: string) => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Number");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Special character (!@#$%^&* etc.)");
    }

    const metCriteria = 5 - errors.length;
    const isValid = errors.length === 0;

    // Score 0–5 (number of satisfied criteria)
    let message = "";
    if (metCriteria === 0) message = "Very Weak";
    else if (metCriteria <= 1) message = "Weak";
    else if (metCriteria <= 2) message = "Fair";
    else if (metCriteria <= 3) message = "Good";
    else if (metCriteria <= 4) message = "Strong";
    else message = "Very Strong";

    return {
      score: metCriteria,
      message,
      isValid,
      errors,
    };
  };

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(evaluateStrength(newPassword));
    } else {
      setPasswordStrength({
        score: 0,
        message: "Very Weak",
        isValid: false,
        errors: [],
      });
    }
  }, [newPassword]);

  // Reset error when modal opens
  useEffect(() => {
    if (open) {
      setError(null);
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setIsLoading(true);

    // Validate password strength before sending
    const strength = evaluateStrength(newPassword);
    if (!strength.isValid) {
      setError(
        "Password must meet all requirements: " +
          strength.errors.join(", ")
      );
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/staffs/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(
          data.errorMessage || "Failed to change password."
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor = (score: number, isValid: boolean) => {
    if (!isValid) return "bg-red-500";
    if (score >= 4) return "bg-green-500";
    if (score >= 3) return "bg-yellow-500";
    if (score >= 2) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:p-6">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Change Password
          </DialogTitle>

          <DialogDescription className="text-sm leading-5 text-muted-foreground">
            You are using a temporary password. Please set a new
            password before continuing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* New Password */}
          <div className="space-y-2">
            <Label
              htmlFor="new-password"
              className="text-sm font-medium text-foreground"
            >
              New Password
            </Label>

            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 rounded-md border-input bg-card pr-11 text-base shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:text-sm"
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:w-8"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {newPassword && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Strength:{" "}
                    <span className="font-medium text-foreground">
                      {passwordStrength.message}
                    </span>
                  </span>

                  <span>
                    {passwordStrength.isValid ? (
                      <CheckCircle className="inline h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="inline h-4 w-4 text-red-500" />
                    )}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthColor(
                      passwordStrength.score,
                      passwordStrength.isValid
                    )}`}
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                    }}
                  />
                </div>

                {/* Missing criteria list */}
                {!passwordStrength.isValid && passwordStrength.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs leading-5 text-red-500">
                    {passwordStrength.errors.map((err, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Missing: {err}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {passwordStrength.isValid && (
                  <p className="text-xs leading-5 text-green-600">
                    ✓ All requirements met
                  </p>
                )}

                <p className="text-xs leading-5 text-muted-foreground">
                  At least 8 characters, include uppercase, lowercase, number, and special character.
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label
              htmlFor="confirm-password"
              className="text-sm font-medium text-foreground"
            >
              Confirm New Password
            </Label>

            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 rounded-md border-input bg-card text-base shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm leading-5 text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}