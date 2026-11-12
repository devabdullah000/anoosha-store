import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  createTransform,
  persistReducer,
  persistStore,
  type PersistConfig,
  type Persistor,
} from "redux-persist";

import authReducer, {
  type AuthProfile,
  type AuthState,
} from "@/store/auth-slice";

// SSR-safe storage adapter.
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<string> => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error("Unable to persist Redux state:", error);
    }

    return value;
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error("Unable to remove persisted Redux state:", error);
    }
  },
};

// Combine application reducers.
const rootReducer = combineReducers({
  auth: authReducer,
});

// Root Redux state before Redux Persist adds its metadata.
export type RootState = ReturnType<typeof rootReducer>;

// Persist only the auth profile.
// Authentication status is revalidated by AuthBootstrap.
const authTransform = createTransform<
  AuthState,
  Partial<AuthState>,
  RootState
>(
  (inboundState) => ({
    profile: inboundState.profile,
  }),

  (outboundState) => ({
    profile: outboundState?.profile ?? null,
    status: "loading",
  }),

  {
    whitelist: ["auth"],
  },
);

// Explicitly type the persistence configuration.
const persistConfig: PersistConfig<RootState> = {
  key: "anoosha-store",
  storage,
  whitelist: ["auth"],
  transforms: [authTransform],
};

// Create the persisted reducer.
const persistedReducer = persistReducer<RootState>(
  persistConfig,
  rootReducer,
);

export function makeStore() {
  return configureStore({
    reducer: persistedReducer,

    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            "persist/PERSIST",
            "persist/REHYDRATE",
            "persist/REGISTER",
            "persist/FLUSH",
            "persist/PAUSE",
            "persist/PURGE",
          ],
        },
      }),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppPersistor = Persistor;

export { persistStore };
