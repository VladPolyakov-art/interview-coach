import type { RefObject } from "react";
import { useEffect } from "react";

/** Makes descendant data-review-id values unique on the page: `<prefix>/<id>`. Leaves the root itself alone. */
export function usePrefixIds(ref: RefObject<HTMLElement | null>, prefix: string) {
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>("[data-review-id]").forEach((el) => {
      const id = el.dataset.reviewId!;
      if (!id.startsWith(`${prefix}/`)) el.dataset.reviewId = `${prefix}/${id}`;
    });
  });
}
