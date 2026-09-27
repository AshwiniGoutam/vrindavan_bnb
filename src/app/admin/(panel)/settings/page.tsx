import { requireAdmin } from "@/server/auth/session";
import { connectDB } from "@/server/db/connect";
import { Settings } from "@/server/models";
import { SETTINGS_RESOURCE } from "@/admin/resources";
import { serialize } from "@/server/types";
import { PageHeader } from "@/components/admin/shell";
import { ResourceForm } from "@/components/admin/resource-form";
import { IntegrationStatus } from "@/components/admin/integration-status";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin("settings.manage");
  await connectDB();
  const doc = serialize<Record<string, unknown>>((await Settings.findById("site").lean()) ?? {});
  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings" description="Business details, homepage copy, GST, booking rules and notification recipients. Changes are live immediately." />
      <IntegrationStatus />
      <ResourceForm config={SETTINGS_RESOURCE} initial={doc} singleton />
    </>
  );
}
