"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), jwtClient()],
  sessionOptions: {
    // Public routes must not trigger background identity requests.
    // Protected pages independently validate cookies on their server render.
    refetchInterval: 0,
    refetchOnWindowFocus: false,
    refetchWhenOffline: false,
  },
});
