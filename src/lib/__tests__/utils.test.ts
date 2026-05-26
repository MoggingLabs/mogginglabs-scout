import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins conditional class names", () => {
    const isHidden = false;

    expect(cn("flex", isHidden && "hidden", ["items-center"])).toBe(
      "flex items-center"
    );
  });

  it("merges conflicting Tailwind classes with the last value winning", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
