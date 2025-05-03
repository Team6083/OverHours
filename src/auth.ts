import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Keycloak from 'next-auth/providers/keycloak';
import { UserInfo } from './types';
import prisma from './db';

export const {
  handlers, signIn, signOut, auth,
} = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Keycloak,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        let user = null;

        if (process.env.NODE_ENV === 'development' && typeof credentials.email === 'string') {
          user = await prisma.user.upsert({
            create: {
              email: credentials.email,
              name: `dev-${credentials.email}`,
            },
            update: {},
            where: {
              email: credentials.email,
            },
          });
        }

        // return user object with their profile data
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      token, user, account, profile, trigger,
    }) {
      if (trigger === 'signIn') {
        // console.log('token', token);
        // console.log('user', user);
        // console.log('account', account);
        // console.log('profile', profile);

        if (account?.provider === 'keycloak' && user.email) {
          const userProps = {
            name: user.name ?? `kc-${account.providerAccountId}`,
          };

          const dbUser = await prisma.user.upsert({
            create: {
              email: user.email,
              ...userProps,
            },
            update: userProps,
            where: {
              email: user.email,
            },
          });

          // eslint-disable-next-line no-param-reassign
          token.id = dbUser.id;
        } else if (account?.provider === 'credentials') {
          // eslint-disable-next-line no-param-reassign
          token.id = account.providerAccountId;
        }
      }
      return token;
    },
    session({ session, token }) {
      // console.log('session_session', session);
      // console.log('session_token', token);

      if ('id' in token && typeof token.id === 'string') {
        // eslint-disable-next-line no-param-reassign
        session.user.id = token.id;
      }

      return session;
    },
  },
});

export async function authUser(): Promise<UserInfo | undefined> {
  const session = await auth();

  if (!session?.user) {
    return undefined;
  }

  const user = session.user.id ? await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  }) : undefined;

  const id = user?.id ?? session.user.id ?? session.user.email ?? undefined;

  if (id === undefined) {
    throw new Error('User ID is required');
  }

  const email = user?.email ?? session.user.email ?? undefined;

  return {
    id,
    name: user?.name ?? session.user.name ?? undefined,
    email,
    avatar: session.user.image ?? undefined,
  };
}
