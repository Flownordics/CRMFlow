import { useEffect } from "react";

export function useHotkeys(
  bindings: Array<{ combo: string; handler: () => void }>,
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const combo = `${e.ctrlKey || e.metaKey ? "mod+" : ""}${e.shiftKey ? "shift+" : ""}${e.key.toLowerCase()}`;
      for (const b of bindings)
        if (b.combo === combo) {
          e.preventDefault();
          b.handler();
          break;
        }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindings]);
}
