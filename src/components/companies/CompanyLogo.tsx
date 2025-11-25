import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getIndustryTheme } from "./industryTheme";
import { getIndustryColor } from "@/lib/chartUtils";
import { Company } from "@/lib/schemas/company";
import { useState, useEffect } from "react";

interface CompanyLogoProps {
  company: Company;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CompanyLogo({ company, size = "md", className }: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const theme = getIndustryTheme(company.industry);
  const Icon = theme.icon;
  const industryColor = getIndustryColor(company.industry);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  // Pre-check if image can be loaded (helps detect ad-blockers)
  useEffect(() => {
    if (!company.logoUrl) {
      setImageError(true);
      return;
    }

    // Try to preload image to detect if it's blocked
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      // Image failed to load (likely blocked by ad-blocker)
      setImageError(true);
      setImageLoaded(false);
    };
    
    // Set a timeout - if image doesn't load within 2 seconds, assume it's blocked
    const timeout = setTimeout(() => {
      if (!imageLoaded) {
        setImageError(true);
      }
    }, 2000);

    img.src = company.logoUrl;

    return () => {
      clearTimeout(timeout);
      img.onload = null;
      img.onerror = null;
    };
  }, [company.logoUrl, imageLoaded]);

  // If logo URL exists and hasn't errored, try to show it
  const shouldShowLogo = company.logoUrl && !imageError;

  return (
    <Avatar className={`${sizeClasses[size]} shrink-0 ${className || ""}`}>
      {shouldShowLogo ? (
        <AvatarImage
          src={company.logoUrl}
          alt={company.name}
          onLoadingStatusChange={(status) => {
            // Radix AvatarImage callback when loading status changes
            if (status === "error") {
              setImageError(true);
            }
          }}
        />
      ) : null}
      <AvatarFallback className="bg-muted">
        <Icon
          className={iconSizeClasses[size]}
          style={{ color: industryColor }}
          aria-hidden="true"
        />
      </AvatarFallback>
    </Avatar>
  );
}

