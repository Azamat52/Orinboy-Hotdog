import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/** Shareable admin filters. Query edits replace the current history entry for typing,
 * but discrete filter/page selections can be navigated with Back/Forward. */
export function useAdminUrlState() {
  const [params, setSearchParams] = useSearchParams();
  const get = useCallback((name: string, fallback = "") => params.get(name) ?? fallback, [params]);
  const patch = useCallback(
    (values: Record<string, string | number | null>, replace = false) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          Object.entries(values).forEach(([key, raw]) => {
            const value = raw == null ? "" : String(raw);
            if (
              !value ||
              (key === "page" && value === "1") ||
              (key === "category" && value === "all") ||
              (key === "status" && value === "all")
            )
              next.delete(key);
            else next.set(key, value);
          });
          return next;
        },
        { replace, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );
  return { get, patch };
}

export function useListPage(count: number, requestedPage: string, size = 12) {
  const pageCount = Math.max(1, Math.ceil(count / size));
  const n = Number(requestedPage);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, pageCount) : 1;
  return { page, pageCount, start: (page - 1) * size, size };
}
