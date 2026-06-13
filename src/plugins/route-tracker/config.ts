/**
 * Mapbox public token. Set `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local` (local)
 * and as a GitHub Actions variable (deploy). It's a *publishable* token — safe
 * in client code — but scope it by URL in your Mapbox account.
 */
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
