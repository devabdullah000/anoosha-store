"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), jwtClient()],
  sessionOptions: {
    // Revalidate in the background while the application is open.
    // Focus revalidation also runs when the user returns to the tab.
    refetchInterval: 60 * 60, // seconds (Better Auth API option)
    refetchOnWindowFocus: true,
    refetchWhenOffline: false,
  },
});
