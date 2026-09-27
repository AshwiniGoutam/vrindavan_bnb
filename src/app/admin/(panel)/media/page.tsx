import { requireAdmin } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/shell";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata = { title: "Media Library" };

export default async function MediaPage() {
  await requireAdmin("media.manage");
  return (
    <>
      <PageHeader eyebrow="Content" title="Media Library" description="All images, videos and PDFs live in Cloudinary. Upload here or from any image field; add alt text for accessibility and SEO." />
      <MediaLibrary />
    </>
  );
}
