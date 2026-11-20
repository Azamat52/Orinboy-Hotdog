import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ListPager({
  page,
  count,
  onChange,
}: {
  page: number;
  count: number;
  onChange: (page: number) => void;
}) {
  if (count < 2) return null;
  return (
    <nav aria-label="Sahifalar" className="mt-5 flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Oldingi sahifa"
      >
        <ChevronLeft className="size-4" />
        Oldingi
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        {page} / {count}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= count}
        onClick={() => onChange(page + 1)}
        aria-label="Keyingi sahifa"
      >
        Keyingi
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
