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
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";

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
    score: 0 | 1 | 2 | 3 | 4 | 5;
    message: string;
  }>({ score: 0, message: "Very Weak" });

  const evaluateStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    // 0–5
    const levels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
    return { score: score as 0 | 1 | 2 | 3 | 4 | 5, message: levels[score] };
  };

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(evaluateStrength(newPassword));
    } else {
      setPasswordStrength({ score: 0, message: "Very Weak" });
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

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.errorMessage || "Failed to change password.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor = (score: number) => {
    if (score <= 1) return "bg-red-500";
    if (score === 2) return "bg-orange-500";
    if (score === 3) return "bg-yellow-500";
    if (score >= 4) return "bg-green-500";
    return "bg-gray-200";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Change Password</DialogTitle>
          <DialogDescription>
            You are using a temporary password. Please set a new password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {newPassword && (
              <div className="mt-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Strength: {passwordStrength.message}</span>
                  <span>
                    {passwordStrength.score >= 4 ? (
                      <CheckCircle className="w-4 h-4 text-green-500 inline" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 inline" />
                    )}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${strengthColor(
                      passwordStrength.score
                    )}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  At least 8 characters, include uppercase, lowercase, number, and special character.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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