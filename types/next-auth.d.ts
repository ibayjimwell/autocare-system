import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    fullname: string;
    username: string;
    role: string | null;
    requiresPasswordChange: boolean;
    access: any; 
  }
  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    fullname: string;
    username: string;
    role: string | null;
    requiresPasswordChange: boolean;
    access: any;
  }
}