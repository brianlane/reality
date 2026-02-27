"use client";

import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  pages: number;
  total?: number;
  onPageChange: (page: number) => void;
};

export default function PaginationControls({
  page,
  pages,
  total,
  onPageChange,
}: PaginationControlsProps) {
  if (pages <= 1 && !total) return null;

  const pageNumbers = buildPageNumbers(page, pages);

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-navy-soft">
      <span>
        {total !== undefined ? `${total} total · ` : ""}
        Page {page} of {pages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </Button>
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <Button
              key={p}
              type="button"
              variant={p === page ? "primary" : "outline"}
              className={`h-8 w-8 p-0 text-xs ${p === page ? "bg-navy text-white" : ""}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={() => onPageChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
