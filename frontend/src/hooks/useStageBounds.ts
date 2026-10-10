import { useEffect, useRef, useState } from "react";
import type { Bounds } from "./windowState";
export function useStageBounds() {
  const ref = useRef<HTMLElement>(null);
  const [bounds, setBounds] = useState<Bounds>({
    width: window.innerWidth,
    height: Math.max(320, window.innerHeight - 140),
  });
  useEffect(() => {
    const measure = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect?.width && rect.height)
        setBounds((previous) =>
          previous.width === rect.width && previous.height === rect.height
            ? previous
            : { width: rect.width, height: rect.height },
        );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    if (ref.current) observer?.observe(ref.current);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return { ref, bounds };
}
