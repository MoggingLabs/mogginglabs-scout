import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it("applies default variant and size classes", () => {
    const classes = buttonVariants();

    expect(classes).toContain("bg-primary");
    expect(classes).toContain("h-10");
  });

  it("applies the requested variant and size", () => {
    const classes = buttonVariants({ variant: "outline", size: "lg" });

    expect(classes).toContain("border-input");
    expect(classes).toContain("h-11");
    expect(classes).not.toContain("bg-primary");
  });

  it("lets caller class names win conflicting Tailwind utilities", () => {
    const classes = buttonVariants({ className: "h-20" });

    expect(classes).toContain("h-20");
    expect(classes).not.toContain("h-10");
  });
});
