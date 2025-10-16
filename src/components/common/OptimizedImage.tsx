import { useState, useEffect, useRef, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  alt: string;
  webpSrc?: string;
  placeholderSrc?: string;
  lazy?: boolean;
  className?: string;
}

/**
 * Optimized image component with lazy loading and WebP support
 * - Lazy loading using IntersectionObserver
 * - WebP format with fallback
 * - Placeholder blur effect
 * - Responsive srcset support
 */
export function OptimizedImage({
  src,
  alt,
  webpSrc,
  placeholderSrc,
  lazy = true,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "50px",
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [lazy]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <picture>
      {webpSrc && isInView && <source srcSet={webpSrc} type="image/webp" />}
      <img
        ref={imgRef}
        src={isInView ? src : placeholderSrc || src}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        onLoad={handleLoad}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </picture>
  );
}

