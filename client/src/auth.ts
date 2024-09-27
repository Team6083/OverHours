import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Keycloak from 'next-auth/providers/keycloak';

export const {
  handlers, signIn, signOut, auth,
} = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Keycloak,
    Credentials({
      // You can specify which fields should be submitted,
      // by adding keys to the `credentials` object.
      // e.g. timelog, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        let user = null;

        if (credentials.email === 'test@example.com' && credentials.password === 'password') {
          user = { id: '1', name: 'Test User', email: 'test@example.com' };
        }

        // return user object with their profile data
        return user;
      },
    }),
  ],
  callbacks: {
    jwt({
      token, user, account, profile, trigger,
    }) {
      if (trigger === 'signIn') {
        console.log('trigger', trigger);
        console.log('token', token);
        console.log('user', user);
        console.log('account', account);
        console.log('profile', profile);
      }
      return token;
    },
    // session({ session, token, user }) {
    //     console.log('session_session', session);
    //     console.log('session_token', token);
    //     console.log('session_user', user);
    //     return session
    // },
  },
});
