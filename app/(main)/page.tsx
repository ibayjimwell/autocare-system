// app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/staffs/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import LogoutButton from "@/components/auth/logout-button";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get the JWT token to check expiration
  const token = await getToken({ req: { headers: headers() } as any, secret: process.env.NEXTAUTH_SECRET });
  const exp = token?.exp; // Unix timestamp (seconds)

  let timeRemaining = null;
  if (exp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = exp - now;
    if (diff > 0) {
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      timeRemaining = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      timeRemaining = "Expired";
    }
  }

  const user = session.user;
  const access = user.access;

  return (
    <div className="p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Welcome, {user.fullname}</CardTitle>
          <LogoutButton />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Role:</strong> {user.role || "Not assigned"}</p>
            <p><strong>Requires password change:</strong> {user.requiresPasswordChange ? "Yes" : "No"}</p>
            {timeRemaining && (
              <p><strong>Session expires in:</strong> {timeRemaining}</p>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">Your Access Permissions</h3>
            <ul className="list-disc pl-5 mt-2">
              <li>Dashboard: {access?.dashboard ? "✅" : "❌"}</li>
              <li>Customers: {access?.customers ? "✅" : "❌"}</li>
              <li>Appointments: {access?.appointments ? "✅" : "❌"}</li>
              <li>Services: {access?.services ? "✅" : "❌"}</li>
              <li>Staffs: {access?.staffs ? "✅" : "❌"}</li>
              <li>Service Tracking: {access?.serviceTracking ? "✅" : "❌"}</li>
              <li>Payments: {access?.payments ? "✅" : "❌"}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}