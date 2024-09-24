import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, signIn, signOut, auth } = NextAuth({
    debug: true,
    pages: {
        signIn: "/login",
    },
    providers: [
        Keycloak,
        Credentials({
            // You can specify which fields should be submitted, by adding keys to the `credentials` object.
            // e.g. domain, username, password, 2FA token, etc.
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                let user = null;

                if (credentials.email === "test@example.com" && credentials.password === "password") {
                    user = { id: "1", name: "Test User", email: "test@example.com" };
                }

                // return user object with their profile data
                return user
            },
        }),
    ],
});