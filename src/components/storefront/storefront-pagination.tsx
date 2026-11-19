"use client";
import { useRouter } from "next/navigation";
import Pagination from "@/components/pagination";
import type { PageInfo } from "@/lib/storefront/types";
export default function StorefrontPagination({
  info,
  path,
}: {
  info: PageInfo;
  path: string;
}) {
  const router = useRouter();
  const go = (page: number, limit: number) => {
    router.push(`${path}?page=${page}&limit=${limit}`);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Pagination
        currentPage={info.page}
        totalPages={info.totalPages}
        totalItems={info.total}
        pageSize={info.limit}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={(page) => go(page, info.limit)}
        onPageSizeChange={(limit) => go(1, limit)}
      />
    </div>
  );
}
