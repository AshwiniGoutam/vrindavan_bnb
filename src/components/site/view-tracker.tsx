"use client";

import { useEffect } from "react";
import { trackViewItem } from "@/lib/analytics/client";

export function ViewTracker(props: { id: string; name: string; vertical: string; price?: number }) {
  const { id, name, vertical, price } = props;
  useEffect(() => {
    trackViewItem({ id, name, vertical, price });
  }, [id, name, vertical, price]);
  return null;
}
