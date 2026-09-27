import { z } from "zod";
import { withAdmin, ok } from "@/server/auth/with-admin";
import { MEDIA_FOLDERS, signUpload } from "@/lib/integrations/cloudinary/server";

const schema = z.object({ folder: z.enum(MEDIA_FOLDERS).default("general") });

/** Short-lived signature so the browser uploads straight to Cloudinary. */
export const POST = withAdmin("media.manage", async (req) => {
  const { folder } = schema.parse(await req.json().catch(() => ({})));
  return ok(signUpload(folder));
});
