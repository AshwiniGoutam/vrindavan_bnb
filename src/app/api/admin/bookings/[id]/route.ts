import { z } from "zod";
import { withAdmin, ok } from "@/server/auth/with-admin";
import { can } from "@/server/auth/permissions";
import { AppError } from "@/server/errors";
import { connectDB } from "@/server/db/connect";
import { Booking, Notification } from "@/server/models";
import { adminAddNote, adminCancel, adminSetStatus, previewCancellation } from "@/server/services/booking.service";
import { dispatchOutbox, enqueueBookingNotifications } from "@/server/services/notification.service";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), to: z.enum(["checked_in", "checked_out"]) }),
  z.object({ action: z.literal("note"), text: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("cancel-preview") }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3).max(500), refundAmount: z.number().int().min(0), notifyGuest: z.boolean().default(true) }),
  z.object({ action: z.literal("resend") }),
]);

export const POST = withAdmin<{ id: string }>("bookings.manage", async (req, { params, admin }) => {
  const body = schema.parse(await req.json());
  switch (body.action) {
    case "status":
      await adminSetStatus(admin, params.id, body.to);
      return ok({ done: true });
    case "note":
      await adminAddNote(admin, params.id, body.text);
      return ok({ done: true });
    case "cancel-preview": {
      const { calc, reason } = await previewCancellation(params.id);
      return ok({ calc, reason });
    }
    case "cancel":
      if (body.refundAmount > 0 && !can(admin.role, "bookings.refund")) throw new AppError("FORBIDDEN", "Only owners and managers can issue refunds.", 403);
      await adminCancel(admin, params.id, body);
      return ok({ done: true });
    case "resend": {
      await connectDB();
      const b = await Booking.findById(params.id).lean<Record<string, unknown>>();
      if (!b || b.status !== "confirmed") throw new AppError("INVALID", "Only confirmed bookings can be re-sent.");
      await Notification.deleteMany({ bookingId: params.id, status: "queued" });
      await enqueueBookingNotifications({ ...b, notificationsQueued: false });
      await dispatchOutbox(10);
      return ok({ done: true });
    }
    default:
      throw new AppError("INVALID", "Unknown action.");
  }
});
