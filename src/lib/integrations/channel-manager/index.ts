import "server-only";
import { env } from "@/lib/env";
import { ManualChannelManager } from "./manual.provider";
import { EzeeChannelManager } from "../ezee";
import type { ChannelManagerProvider } from "./types";

let instance: ChannelManagerProvider | undefined;

export function channelManager(): ChannelManagerProvider {
  if (!instance) instance = env().CHANNEL_MANAGER_PROVIDER === "ezee" ? new EzeeChannelManager() : new ManualChannelManager();
  return instance;
}
export * from "./types";
