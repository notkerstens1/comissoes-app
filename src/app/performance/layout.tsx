"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { isAdmin } from "@/lib/roles";

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated" && !isAdmin(session?.user?.role)) router.push("/dashboard");
  }, [status, session, router]);

  if (status === "loading" || !session || !isAdmin(session?.user?.role)) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">{children}</main>
    </div>
  );
}
