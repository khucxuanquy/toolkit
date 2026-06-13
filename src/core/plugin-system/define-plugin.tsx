"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PlatformPlugin, PluginManifest } from "@/shared/types/plugin";

/** Centered spinner shown while a plugin's code is being fetched. */
function PluginLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="border-border border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
    </div>
  );
}

/**
 * Build a {@link PlatformPlugin} from its manifest plus a lazy import of its
 * UI. The component is loaded with `next/dynamic` (client-only), so a plugin's
 * implementation is never part of the initial bundle.
 */
export function definePlugin(
  manifest: PluginManifest,
  loader: () => Promise<{ default: ComponentType }>,
): PlatformPlugin {
  return {
    ...manifest,
    component: dynamic(loader, { ssr: false, loading: PluginLoading }),
  };
}
