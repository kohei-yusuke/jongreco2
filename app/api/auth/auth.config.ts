import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '../../../lib/prisma';
import { compare } from 'bcrypt';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('メールアドレスとパスワードを入力してください');
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              iconPath: true,
              password: true,
              salt: true,
              createdAt: true,
            },
          });

          if (!user || !user.salt) {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
          }

          const isPasswordValid = await compare(credentials.password, user.password);
          if (!isPasswordValid) {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            iconPath: user.iconPath,
            createdAt: user.createdAt.toISOString()
          };
        } catch (error) {
          console.error('認証エラー:', error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.iconPath = user.iconPath;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.iconPath = token.iconPath as string;
      }
      return session;
    },
  },
};
