
"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import {
  makeStore,
  persistStore,
  type AppPersistor,
  type AppStore,
} from "@/store/store";

import { AuthBootstrap } from "@/components/auth/auth-bootstrap";

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <p className="text-sm text-slate-600">
          Loading Anoosha Store...
        </p>
      </div>
    </div>
  );
}

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore | null>(null);
  const persistorRef = useRef<AppPersistor | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
    persistorRef.current = persistStore(storeRef.current);
  }

  return (
    <Provider store={storeRef.current}>
      <PersistGate
        persistor={persistorRef.current!}
        loading={<AppLoading />}
      >
        <AuthBootstrap />
        {children}
      </PersistGate>
    </Provider>
  );
}
