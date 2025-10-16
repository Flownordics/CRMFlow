import { useEffect, useRef, useState } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollY = window.scrollY || window.pageYOffset;
      if (scrollY === 0 && !isRefreshing) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return;

      const scrollY = window.scrollY || window.pageYOffset;
      if (scrollY === 0 && touchStartY.current > 0) {
        const touchY = e.touches[0].clientY;
        const distance = touchY - touchStartY.current;

        if (distance > 0) {
          e.preventDefault();
          setIsPulling(true);
          setPullDistance(Math.min(distance / resistance, threshold * 1.5));
        }
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling && pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setIsPulling(false);
      setPullDistance(0);
      touchStartY.current = 0;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, isPulling, pullDistance, threshold, resistance, isRefreshing, onRefresh]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    containerRef,
  };
}

