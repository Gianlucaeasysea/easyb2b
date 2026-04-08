import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
}

const getPageNumbers = (current: number, total: number): (number | "...")[] => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, "...", total);
  } else if (current >= total - 2) {
    pages.push(1, "...", total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }
  return pages;
};

export const PaginationControls = ({
  page, totalPages, from, to, totalCount, onPrev, onNext, onGoTo,
}: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between pt-4 px-1">
      <p className="text-xs text-muted-foreground">
        Mostra {from}–{to} di {totalCount} risultati
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={onPrev} disabled={page === 1}>
          <ChevronLeft size={14} className="mr-1" /> Precedente
        </Button>
        {pageNumbers.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0 text-xs"
              onClick={() => onGoTo(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={onNext} disabled={page === totalPages}>
          Successivo <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
};
