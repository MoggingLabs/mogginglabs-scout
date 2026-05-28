import { describe, expect, it } from "vitest";

import { badgeVariants } from "@/components/ui/badge";

describe("badgeVariants", () => {
  it("applies the default variant classes", () => {
    expect(badgeVariants()).toContain("bg-primary");
  });

  it("applies the requested variant", () => {
    const classes = badgeVariants({ variant: "outline" });

    expect(classes).toContain("text-foreground");
    expect(classes).not.toContain("bg-primary");
  });
});
