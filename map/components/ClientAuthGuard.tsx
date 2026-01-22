"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ClientAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = pathname === "/login";

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicPath) {
      router.push("/login");
    }
  }, [status, isPublicPath, router]);

  // Show nothing while checking auth (prevents flash)
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // If unauthenticated and not on public path, show nothing (will redirect)
  if (status === "unauthenticated" && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
