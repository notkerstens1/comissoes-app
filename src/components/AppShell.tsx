"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/Sidebar";

interface AppShellProps {
  guard?: (role?: string) => boolean;
  deniedRedirect?: string;
  children: React.ReactNode;
}

export function AppShell({ guard, deniedRedirect = "/dashboard", children }: AppShellProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const denied = !!guard && status === "authenticated" && !guard(role);

  React.useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    else if (denied) router.push(deniedRedirect);
  }, [status, denied, deniedRedirect, router]);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-liv-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-liv-line border-t-liv-sage" />
      </div>
    );
  }

  if (!session || denied) return null;

  return (
    <div className="min-h-screen bg-liv-bg">
      <Sidebar />
      <main className="p-6 lg:ml-64 lg:p-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
