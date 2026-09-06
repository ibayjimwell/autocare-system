import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";

import { Database } from "@/lib/drizzle";

import { StaffAccess } from "@/database/models/staffs/staff-access.model";

import { eq } from "drizzle-orm";

// Use absolute URL for server-side fetch.
const API_URL =
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

// ------------------------------------------------------------------
// Safely parse an API response.
// Prevents:
// "Unexpected end of JSON input"
// ------------------------------------------------------------------

async function safeParseJson(response: Response) {
  const rawText = await response.text();

  if (!rawText || rawText.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    console.error(
      "[NextAuth] Failed to parse login API response:",
      error
    );

    console.error(
      "[NextAuth] Raw response:",
      rawText
    );

    return null;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",

      credentials: {
        username: {
          label: "Username",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        // -----------------------------------------------------------
        // 1. Validate credentials
        // -----------------------------------------------------------
        if (
          !credentials?.username ||
          !credentials?.password
        ) {
          throw new Error(
            JSON.stringify({
              errorType: "fve",
              errorTitle: "Missing credentials",
              errorMessage:
                "Username and password are required.",
            })
          );
        }

        // -----------------------------------------------------------
        // 2. Call internal login API
        // -----------------------------------------------------------
        let res: Response;

        try {
          res = await fetch(
            `${API_URL}/api/staffs/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                username:
                  credentials.username,
                password:
                  credentials.password,
              }),
              cache: "no-store",
            }
          );
        } catch (error) {
          console.error(
            "[NextAuth] Failed to call staff login API:",
            error
          );

          throw new Error(
            JSON.stringify({
              errorType: "se",
              errorTitle: "Authentication service unavailable",
              errorMessage:
                "Unable to connect to the authentication service. Please try again.",
            })
          );
        }

        // -----------------------------------------------------------
        // 3. Safely parse API response
        // -----------------------------------------------------------
        const data = await safeParseJson(res);

        // -----------------------------------------------------------
        // 4. Handle empty / invalid API response
        // -----------------------------------------------------------
        if (!data) {
          console.error(
            "[NextAuth] Staff login API returned an empty or invalid response.",
            {
              status: res.status,
              statusText: res.statusText,
            }
          );

          throw new Error(
            JSON.stringify({
              errorType: "se",
              errorTitle: "Authentication error",
              errorMessage:
                "The authentication service returned an invalid response. Please try again.",
            })
          );
        }

        // -----------------------------------------------------------
        // 5. Handle API authentication errors
        // -----------------------------------------------------------
        if (!res.ok || data.error) {
          throw new Error(
            JSON.stringify({
              errorType:
                data.errorType || "auth",

              errorTitle:
                data.errorTitle ||
                "Authentication failed",

              errorMessage:
                data.errorMessage ||
                "Invalid username or password.",
            })
          );
        }

        // -----------------------------------------------------------
        // 6. Validate successful response structure
        // -----------------------------------------------------------
        if (!data.data || !data.data.id) {
          console.error(
            "[NextAuth] Login API returned an invalid success payload:",
            data
          );

          throw new Error(
            JSON.stringify({
              errorType: "se",
              errorTitle: "Invalid authentication response",
              errorMessage:
                "The authentication service returned incomplete staff information.",
            })
          );
        }

        // -----------------------------------------------------------
        // 7. Fetch staff access permissions
        // -----------------------------------------------------------
        let access = null;

        try {
          const [accessRecord] =
            await Database.select()
              .from(StaffAccess)
              .where(
                eq(
                  StaffAccess.staffId,
                  data.data.id
                )
              )
              .limit(1);

          access = accessRecord || null;
        } catch (err) {
          console.error(
            "[NextAuth] Failed to fetch staff access:",
            err
          );

          // Keep login working even if access lookup fails.
          access = null;
        }

        // -----------------------------------------------------------
        // 8. Return user object
        // -----------------------------------------------------------
        return {
          id: data.data.id,
          fullname: data.data.fullname,
          username: data.data.username,
          role: data.data.role,

          requiresPasswordChange:
            data.requiresPasswordChange || false,

          access,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    // -------------------------------------------------------------
    // JWT
    // -------------------------------------------------------------
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.fullname = user.fullname;
        token.username = user.username;
        token.role = user.role;

        token.requiresPasswordChange =
          user.requiresPasswordChange;

        token.access = user.access;
      }

      return token;
    },

    // -------------------------------------------------------------
    // Session
    // -------------------------------------------------------------
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id =
          token.id as string;

        session.user.fullname =
          token.fullname as string;

        session.user.username =
          token.username as string;

        session.user.role =
          token.role as string;

        session.user.requiresPasswordChange =
          token.requiresPasswordChange as boolean;

        // ---------------------------------------------------------
        // Fetch fresh access from database
        // ---------------------------------------------------------
        try {
          const staffId =
            token.id as string;

          const [accessRecord] =
            await Database.select()
              .from(StaffAccess)
              .where(
                eq(
                  StaffAccess.staffId,
                  staffId
                )
              )
              .limit(1);

          const access = accessRecord
            ? {
                dashboard:
                  accessRecord.dashboard ?? false,

                customers:
                  accessRecord.customers ?? false,

                appointments:
                  accessRecord.appointments ?? false,

                services:
                  accessRecord.services ?? false,

                staffs:
                  accessRecord.staffs ?? false,

                serviceTracking:
                  accessRecord.serviceTracking ??
                  false,

                payments:
                  accessRecord.payments ?? false,

                inventory:
                  accessRecord.inventory ?? false,
              }
            : {};

          session.user.access =
            access;
        } catch (err) {
          console.error(
            "[NextAuth] Failed to fetch fresh access for session:",
            err
          );

          // Fallback to token access.
          session.user.access =
            token.access as any;
        }
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret:
    process.env.NEXTAUTH_SECRET,
};