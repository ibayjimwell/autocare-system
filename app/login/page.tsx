import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/staffs/auth";
import LoginForm from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    // If the user's password is temporary, keep them on the login page
    // and open the change‑password modal immediately.
    if (session.user.tempPassword === true) {
      return <LoginForm initialModalOpen={true} username={session.user.username} />;
    }
    // Otherwise, they are fully authenticated – redirect to home.
    redirect("/");
  }

  // No session – show the login form normally.
  return <LoginForm initialModalOpen={false} />;
}