import type { Metadata } from "next";
import { PluginHost } from "@/shared/components/PluginHost";
import { PLUGIN_IDS, PLUGIN_NAMES } from "@/core/registry/plugin-ids";

// Pre-render one static page per plugin (/p/<id>/) for the static export.
export function generateStaticParams() {
  return PLUGIN_IDS.map((pluginId) => ({ pluginId }));
}

// Only the ids above are valid (required by `output: export`).
export const dynamicParams = false;

// Per-tool browser tab title, baked into each static page.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ pluginId: string }>;
}): Promise<Metadata> {
  const { pluginId } = await params;
  const name = PLUGIN_NAMES[pluginId];
  return { title: name ? `${name} · Quy's Toolkit` : "Quy's Toolkit" };
}

export default async function PluginRoutePage({
  params,
}: {
  params: Promise<{ pluginId: string }>;
}) {
  const { pluginId } = await params;
  return <PluginHost pluginId={pluginId} />;
}
