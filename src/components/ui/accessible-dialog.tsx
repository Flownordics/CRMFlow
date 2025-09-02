import * as React from "react";
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogContent> & {
  /** Yderligere klasser */
  className?: string;
};

export function AccessibleDialogContent({
  className,
  children,
  ...rest
}: ContentProps) {
  return (
    <DialogContent
      className={cn(className)}
      {...rest}
    >
      {children}
    </DialogContent>
  );
}

type TitleProps = React.ComponentPropsWithoutRef<typeof DialogTitle> & {
  /** Yderligere klasser */
  className?: string;
};

export function AccessibleDialogTitle({
  className,
  children,
  ...rest
}: TitleProps) {
  return (
    <DialogTitle
      className={cn(className)}
      {...rest}
    >
      {children}
    </DialogTitle>
  );
}

type DescriptionProps = React.ComponentPropsWithoutRef<typeof DialogDescription> & {
  /** Yderligere klasser */
  className?: string;
};

export function AccessibleDialogDescription({
  className,
  children,
  ...rest
}: DescriptionProps) {
  return (
    <DialogDescription
      className={cn(className)}
      {...rest}
    >
      {children}
    </DialogDescription>
  );
}
