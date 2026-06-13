"use client";

import { use } from "react";
// Ensure plugins are registered even on a direct/deep-link load.
import "@/core/registry/register-plugins";
import { PluginHost } from "@/shared/components/PluginHost";

export default function PluginRoutePage({ params }: { params: Promise<{ pluginId: string }> }) {
  const { pluginId } = use(params);
  return <PluginHost pluginId={pluginId} />;
}
