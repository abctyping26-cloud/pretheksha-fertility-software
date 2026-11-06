import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-900 text-white border border-neutral-900 shadow-xs hover:bg-neutral-800 active:bg-black dark:bg-white dark:text-neutral-900 dark:border-white dark:hover:bg-neutral-100",
        destructive:
          "bg-red-600 text-white shadow-xs hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-neutral-300 bg-white text-neutral-900 shadow-xs hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white",
        secondary:
          "bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200 hover:text-neutral-900 active:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700",
        ghost: "text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white",
        link: "text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100",
      },
      size: {
        default: "h-9 px-5 py-2 text-[13px] rounded-[6px]",
        sm: "h-8 px-3.5 text-[12px] rounded-[6px]",
        lg: "h-10 px-6 text-sm rounded-[6px]",
        icon: "h-9 w-9 rounded-[6px] shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
