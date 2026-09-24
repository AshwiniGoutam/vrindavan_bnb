import {
  Waves, ChefHat, ConciergeBell, Trees, Gamepad2, Wifi, Car, Flame, Tv, Snowflake,
  PawPrint, Utensils, ShieldCheck, PartyPopper, Bath, Mountain, type LucideIcon,
} from "lucide-react";

export const amenityCatalog: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "pool", label: "Private pool", Icon: Waves },
  { key: "chef", label: "In-house chef", Icon: ChefHat },
  { key: "caretaker", label: "Caretaker on site", Icon: ConciergeBell },
  { key: "lawn", label: "Garden and lawn", Icon: Trees },
  { key: "games", label: "Games room", Icon: Gamepad2 },
  { key: "wifi", label: "Fast wifi", Icon: Wifi },
  { key: "parking", label: "Free parking", Icon: Car },
  { key: "bonfire", label: "Bonfire and BBQ", Icon: Flame },
  { key: "tv", label: "Big screen TV", Icon: Tv },
  { key: "ac", label: "Air conditioning", Icon: Snowflake },
  { key: "pets", label: "Pet friendly", Icon: PawPrint },
  { key: "kitchen", label: "Kitchen access", Icon: Utensils },
  { key: "cctv", label: "CCTV at entry", Icon: ShieldCheck },
  { key: "party", label: "Celebrations allowed", Icon: PartyPopper },
  { key: "bathtub", label: "Bathtub", Icon: Bath },
  { key: "view", label: "Mountain or lake view", Icon: Mountain },
];

export const amenityByKey = Object.fromEntries(amenityCatalog.map((a) => [a.key, a]));
