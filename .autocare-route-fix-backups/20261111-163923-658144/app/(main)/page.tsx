import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/staffs/auth";
import { getFirstAccessibleRoute } from "@/lib/auth/get-first-access-route";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  /*
   * The root route must not be a Dashboard alias.
   *
   * Redirect to the first sidebar module the authenticated user is
   * actually allowed to access.
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

  // Authenticated user has no enabled application modules.
  redirect("/unauthorized");
}
