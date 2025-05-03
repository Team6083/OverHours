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
      token, user, account, profile, trigger,
    }) {
      /* eslint-disable no-param-reassign */

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

          token.id = dbUser.id;

          if (profile && Array.isArray(profile.roles) && profile.roles.includes('admin')) {
            token.role = 'admin';
          }
        } else if (account?.provider === 'credentials') {
          token.id = account.providerAccountId;
        }
      }

      /* eslint-enable no-param-reassign */
      return token;
    },
    session({ session, token }) {
      /* eslint-disable no-param-reassign */

      // console.log('session_session', session);
      // console.log('session_token', token);

      if ('id' in token && typeof token.id === 'string') {
        session.user.id = token.id;
        session.user.role = token.role ?? 'user';
      }

      /* eslint-enable no-param-reassign */
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
