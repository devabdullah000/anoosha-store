import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "user" | "admin";

/** Same client profile shape is used for email/password and Google sign-in. */
export type AuthProfile = {
  email: string;
  role: UserRole;
};

export type AuthStatus = "loading" | "cached" | "authenticated" | "unauthenticated";

export type AuthState = {
  profile: AuthProfile | null;
  /** "cached" is display-only; protected routes require server verification. */
  status: AuthStatus;
};

const initialState: AuthState = {
  profile: null,
  status: "loading",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthProfile(state, action: PayloadAction<AuthProfile>) {
      state.profile = action.payload;
      state.status = "authenticated";
    },
    clearAuthProfile(state) {
      state.profile = null;
      state.status = "unauthenticated";
    },
    setAuthLoading(state) {
      state.status = "loading";
    },
    // Leaving a protected section no longer confers a verified auth status.
    // Its profile stays available for purely cosmetic public navbar display.
    setAuthPreview(state) {
      state.status = state.profile ? "cached" : "unauthenticated";
    },
  },
});

export const { setAuthProfile, clearAuthProfile, setAuthLoading, setAuthPreview } = authSlice.actions;
export default authSlice.reducer;
