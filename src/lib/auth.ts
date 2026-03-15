import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db";
import * as schema from "../db/schema/auth";
import type { User } from "../db/schema";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [process.env.FRONTEND_URL!],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: "empleado",
                input: false, // Allow role to be set during registration
            },
            active: {
                type: "boolean",
                required: true,
                defaultValue: true,
                input: false,
            },
        },
    },
    callbacks: {
        async signIn({ user }: { user: User }) {
            if (!user.active) {
                return { error: "User account is disabled" };
            }
        },
    },
});