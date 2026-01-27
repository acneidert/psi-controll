import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema
    }),
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(';') || [
        'http://localhost:3000'
    ],
    emailAndPassword: {
        enabled: true
    },
    plugins: [tanstackStartCookies()]
})
