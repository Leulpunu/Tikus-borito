"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import HomeDashboard from "@/components/HomeDashboard";
import { useUserRole } from "@/components/UserRoleProvider";

type HomeEntryProps = {
  productCount: number;
  stockCount: number;
  orderCount: number;
  revenue: number;
  lowStockCount: number;
};

export default function HomeEntry({ productCount, stockCount, orderCount, revenue, lowStockCount }: HomeEntryProps) {
  const { currentUser, isReady, t } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !currentUser) router.replace("/login");
  }, [currentUser, isReady, router]);

  if (!isReady || !currentUser) {
    return (
      <main className="mx-auto max-w-6xl p-6 md:p-8">
        <div className="rounded-3xl border border-amber-950/10 bg-white p-8 text-slate-600 shadow-sm">{t("loading")}</div>
      </main>
    );
  }

  return (
    <HomeDashboard
      productCount={productCount}
      stockCount={stockCount}
      orderCount={orderCount}
      revenue={revenue}
      lowStockCount={lowStockCount}
    />
  );
}
