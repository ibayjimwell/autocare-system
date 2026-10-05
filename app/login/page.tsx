import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/staffs/auth";
import { getFirstAccessibleRoute } from "@/lib/auth/get-first-access-route";
import LoginForm from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    // Keep users with temporary passwords on the login page so the
    // existing change-password modal can be opened immediately.
    if (
      session.user.requiresPasswordChange === true ||
      session.user.tempPassword === true
    ) {
      return (
        <LoginForm
          initialModalOpen={true}
          username={session.user.username}
        />
      );
    }

    /*
     * IMPORTANT:
     *
     * Never redirect an authenticated user to "/" here.
     * The root route historically rendered the Dashboard, which meant
     * a user without Dashboard permission could still land there after
     * a successful login.
     *
     * Instead, redirect directly to the first enabled sidebar module.
     */
    const firstRoute = getFirstAccessibleRoute(
      session.user.access as
        | Record<string, boolean>
        | null
        | undefined,
    );

    if (firstRoute) {
      redirect(firstRoute);
    }

    // Authenticated account with no enabled application module.
    // Never use Dashboard as a fallback.
    redirect("/unauthorized");
  }

  return <LoginForm initialModalOpen={false} />;
}
