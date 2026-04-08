import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

export const TablePagination = ({
  currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange,
}: TablePaginationProps) => {
  if (totalItems === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between pt-4 px-1 flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          Mostra {from}–{to} di {totalItems} risultati
        </p>
        {onPageSizeChange && (
          <Select value={String(pageSize)} onValueChange={v => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(s => (
                <SelectItem key={s} value={String(s)}>{s} / pag</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft size={14} className="mr-1" /> Precedente
          </Button>
          {pageNumbers.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                variant={p === currentPage ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            Successivo <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};
