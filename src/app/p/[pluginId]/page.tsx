import { PluginHost } from "@/shared/components/PluginHost";
import { PLUGIN_IDS } from "@/core/registry/plugin-ids";

// Pre-render one static page per plugin (/p/<id>/) for the static export.
export function generateStaticParams() {
  return PLUGIN_IDS.map((pluginId) => ({ pluginId }));
}

// Only the ids above are valid (required by `output: export`).
export const dynamicParams = false;

export default async function PluginRoutePage({
  params,
}: {
  params: Promise<{ pluginId: string }>;
}) {
  const { pluginId } = await params;
  return <PluginHost pluginId={pluginId} />;
}
