"use client";

import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/auth/auth-modal";

export default function LoginPage() {
  const router = useRouter();
  return <AuthModal open onClose={() => router.replace("/")} />;
}
