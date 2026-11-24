"use client";

import { useEffect } from "react";
import { setAuthProfile, type AuthProfile } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

/**
 * Mount ONLY from a server page that already checked getCurrentUser() or
 * requireAdmin(). No client session lookup is needed after the server renders.
 *
 * This syncs the navbar's Redux profile; it is NOT a security boundary.
 */
export function VerifiedAuthProfile({ email, role }: AuthProfile) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setAuthProfile({ email, role }));
  }, [dispatch, email, role]);

  return null;
}
