import { withAdmin, ok } from "@/server/auth/with-admin";
import { retryNotification } from "@/server/services/notification.service";

export const POST = withAdmin<{ id: string }>("notifications.view", async (_req, { params }) => ok(await retryNotification(params.id)));
