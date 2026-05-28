import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeBase =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

const badgeVariantClasses = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "text-foreground",
  destructive: "border-transparent bg-destructive text-destructive-foreground"
} as const;

export type BadgeVariant = keyof typeof badgeVariantClasses;

export function badgeVariants({
  variant = "default",
  className
}: {
  variant?: BadgeVariant;
  className?: string;
} = {}) {
  return cn(badgeBase, badgeVariantClasses[variant], className);
}

export type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={badgeVariants({ variant, className })}
      {...props}
    />
  );
}
