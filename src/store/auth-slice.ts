import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "user" | "admin";

/** Same client profile shape is used for email/password and Google sign-in. */
export type AuthProfile = {
  email: string;
  role: UserRole;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthState = {
  profile: AuthProfile | null;
  /** Validation state is deliberately not persisted; the server cookie is authoritative. */
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
  },
});

export const { setAuthProfile, clearAuthProfile, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
