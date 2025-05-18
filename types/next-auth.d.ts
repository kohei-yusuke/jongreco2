import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string | null;
    iconPath: string | null;
    createdAt: string;
  }

  interface Session {
    user: User & {
      id: string;
      email: string;
      name: string | null;
      iconPath: string | null;
      createdAt: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    iconPath: string | null;
    createdAt: string;
  }
} 