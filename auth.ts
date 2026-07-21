import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  createHousehold,
  findOrCreateUser,
  getHouseholdByPassword,
  seedHouseholdCatalog,
} from "@/lib/store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        name: {},
        password: {},
      },
      /**
       * No separate signup step: entering a password no household has ever used creates a
       * new one (seeded with the starter catalog); entering an existing one joins it. The
       * name is just an identity within that household, reused if it already exists there.
       */
      async authorize(credentials) {
        const name = credentials?.name;
        const password = credentials?.password;
        if (typeof name !== "string" || !name.trim() || typeof password !== "string" || !password) {
          return null;
        }

        let household = await getHouseholdByPassword(password);
        if (!household) {
          household = await createHousehold(password);
          await seedHouseholdCatalog(household.id);
        }

        const user = await findOrCreateUser(household.id, name.trim());
        return { id: user.id, name: user.name, householdId: household.id };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.householdId = (user as { householdId: string }).householdId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.householdId = token.householdId as string;
      }
      return session;
    },
  },
});
