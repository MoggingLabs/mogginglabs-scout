# Design System Foundation

The M1 design-system foundation provides the typography, color tokens, and base
UI primitives the rest of the product builds on. It uses the existing
dependencies only (`clsx`, `tailwind-merge`, Tailwind CSS, and `next/font`); no
component or styling libraries are added.

## Typography (Geist)

Geist Sans and Geist Mono are loaded through `next/font/google` in
`src/app/layout.tsx` and exposed as CSS variables (`--font-geist-sans`,
`--font-geist-mono`). Tailwind maps them to the `font-sans` and `font-mono`
families in `tailwind.config.ts`, so `font-sans` is the default body font.

## Theme tokens

Colors are HSL CSS variables defined in `src/app/globals.css` and surfaced to
Tailwind as semantic color utilities (`bg-background`, `text-foreground`,
`bg-primary`, `border-border`, and so on) in `tailwind.config.ts`. There are two
explicit themes:

- **Light landing theme** — declared on `:root, .theme-landing`. This is the
  default surface for public pages (the landing page and login).
- **Dark application theme** — declared on `.theme-app`. The authenticated app
  shell in `src/app/(app)/layout.tsx` wraps its content in `theme-app`.

Both themes define the same token names, so any component built on the semantic
utilities renders correctly under either theme without changes. To place a
surface in a specific theme, add the `theme-landing` or `theme-app` class to a
wrapping element.

## Base components

Hand-authored primitives live in `src/components/ui/`. Each merges class names
with `cn()` from `src/lib/utils.ts` and accepts the standard HTML props for its
element (including `ref`, via React 19 prop forwarding).

| Component                                                                              | File         | Notes                                                                                              |
| -------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `Button` / `buttonVariants`                                                            | `button.tsx` | Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`. Sizes: `sm`, `default`, `lg`. |
| `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter` | `card.tsx`   | Composable container sections.                                                                     |
| `Input`                                                                                | `input.tsx`  | Themed text input.                                                                                 |
| `Label`                                                                                | `label.tsx`  | Form label.                                                                                        |
| `Badge` / `badgeVariants`                                                              | `badge.tsx`  | Variants: `default`, `secondary`, `outline`, `destructive`.                                        |

`buttonVariants` and `badgeVariants` are exported as pure class-name helpers so a
non-button element (such as a `next/link` `Link`) can adopt the same styling, and
so the variant logic is unit-testable without rendering.

### Usage example

```tsx
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";

// As a button element
<Button variant="outline" size="lg">
  Save
</Button>;

// As a styled link
<Link href="/login" className={buttonVariants({ size: "lg" })}>
  Sign in
</Link>;
```

## Where the foundation is used

- `src/app/page.tsx` — landing page (`Badge`, `buttonVariants`, `theme-landing`).
- `src/app/(auth)/login/page.tsx` — login shell (`Card`, `Input`, `Label`,
  `Button`, `theme-landing`).
- `src/app/(app)/dashboard/page.tsx` — dashboard shell (`Card`, `Badge`,
  `theme-app`).
- `src/app/(app)/no-access/page.tsx` — no-access shell (`Card`, `theme-app`).

## Local validation

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format
pnpm build
node scripts/check-no-route-planning.mjs
```
