import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageNumbers } from "@/lib/shop-rules";
export default function Pagination({ page, pageCount, onChange, label }) {
  if (pageCount <= 1) return null;
  const current = Math.max(1, Math.min(page, pageCount));
  const controls = [
    [ChevronsLeft, "Birinchi sahifa", 1, current === 1],
    [ChevronLeft, "Oldingi sahifa", current - 1, current === 1],
    [ChevronRight, "Keyingi sahifa", current + 1, current === pageCount],
    [ChevronsRight, "Oxirgi sahifa", pageCount, current === pageCount],
  ];
  const control = ([Icon, title, target, disabled]) => (
    <Button
      key={title}
      type="button"
      variant="ghost"
      size="icon"
      className="page-button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={() => onChange(target)}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
  return (
    <nav className="pagination-panel" aria-label={`${label} sahifalari`}>
      <span className="pagination-info">
        {current} / {pageCount}
      </span>
      <div className="pagination-controls">
        <div className="pagination-direction">{controls.slice(0, 2).map(control)}</div>
        <div className="pagination-numbers">
          {pageNumbers(current, pageCount).map((number) => (
            <Button
              key={number}
              type="button"
              variant="ghost"
              size="icon"
              className={`page-button${number === current ? " current" : ""}`}
              aria-label={`${number}-sahifa`}
              aria-current={number === current ? "page" : undefined}
              onClick={() => onChange(number)}
            >
              {number}
            </Button>
          ))}
        </div>
        <div className="pagination-direction">{controls.slice(2).map(control)}</div>
      </div>
    </nav>
  );
}
