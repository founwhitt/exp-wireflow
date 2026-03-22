

## Plan: Global eXp Watermark

The watermark currently exists only on `NewWire.tsx` and `OutstandingWires.tsx`. Move it to the shared layout in `App.tsx` so it appears on every page.

### Changes

**`src/App.tsx`** — Add the watermark inside `ProtectedRoutes`, wrapping the `<main>` element:
- Add `relative overflow-hidden` to the main wrapper
- Insert the watermark `div` (same markup: `pointer-events-none absolute inset-0 flex items-center justify-center`, `text-[18rem] font-black text-foreground/[0.05]`) inside `<main>` before `<Routes>`

**`src/pages/NewWire.tsx`** — Remove the duplicate watermark `div` (lines 185–188)

**`src/pages/OutstandingWires.tsx`** — Remove the duplicate watermark `div` from this page as well

