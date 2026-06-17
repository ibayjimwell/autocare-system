import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";
import { Database } from "@/lib/drizzle";
import { StaffAccess } from "@/database/models/staffs/staff-access.model";
import { eq } from "drizzle-orm";

// Use absolute URL for server-side fetch (better to use environment variable)
const API_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error(JSON.stringify({
            errorType: "fve",
            errorTitle: "Missing credentials",
            errorMessage: "Username and password are required.",
          }));
        }

        // 1. Call your internal login API
        const res = await fetch(`${API_URL}/api/staffs/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(JSON.stringify({
            errorType: data.errorType || "auth",
            errorTitle: data.errorTitle || "Authentication failed",
            errorMessage: data.errorMessage || "Invalid username or password",
          }));
        }

        // 2. Fetch access permissions for this staff
        let access = null;
        try {
          const [accessRecord] = await Database.select()
            .from(StaffAccess)
            .where(eq(StaffAccess.staffId, data.data.id))
            .limit(1);
          access = accessRecord || null;
        } catch (err) {
          console.error("Failed to fetch staff access:", err);
        }

        // 3. Return the user object – this will be stored in the JWT
        return {
          id: data.data.id,
          fullname: data.data.fullname,
          username: data.data.username,
          role: data.data.role,
          requiresPasswordChange: data.requiresPasswordChange || false,
          access,   // includes dashboard, customers, appointments, etc.
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.fullname = user.fullname;
        token.username = user.username;
        token.role = user.role;
        token.requiresPasswordChange = user.requiresPasswordChange;
        token.access = user.access;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.fullname = token.fullname as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.requiresPasswordChange = token.requiresPasswordChange as boolean;
        session.user.access = token.access as any;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};