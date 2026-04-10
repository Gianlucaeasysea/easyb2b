import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
}

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  className,
  containerClassName,
  fallbackIcon,
  ...props
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    setErrored(true);
    setLoaded(true);
  }, []);

  const showPlaceholder = !src || errored;

  if (showPlaceholder) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-secondary",
          containerClassName,
          className
        )}
        style={{ width, height }}
      >
        {fallbackIcon || <Package className="text-muted-foreground" size={40} />}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)} style={{ width, height }}>
      {/* Skeleton placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
