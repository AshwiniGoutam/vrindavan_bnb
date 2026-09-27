import {
  AirVent, Bath, BedDouble, Bike, Car, Check, Coffee, CookingPot, Flame, Flower2, Heater, Home, Key, Leaf, Lock, MapPin, Mountain, Refrigerator,
  ShieldCheck, Shirt, Snowflake, Sparkles, Sun, Tv, Utensils, WashingMachine, Waves, Wifi, Zap, Baby, Armchair, Microwave, Droplets, Plane, Train, Bus, HeartHandshake,
  type LucideIcon,
} from "lucide-react";

/** Curated icon set for admin-editable icon names (keeps the bundle small). */
const ICONS: Record<string, LucideIcon> = {
  AirVent, Bath, BedDouble, Bike, Car, Check, Coffee, CookingPot, Flame, Flower2, Heater, Home, Key, Leaf, Lock, MapPin, Mountain, Refrigerator,
  ShieldCheck, Shirt, Snowflake, Sparkles, Sun, Tv, Utensils, WashingMachine, Waves, Wifi, Zap, Baby, Armchair, Microwave, Droplets, Plane, Train, Bus, HeartHandshake,
};

export function Icon({ name, className, strokeWidth = 1.4 }: { name?: string; className?: string; strokeWidth?: number }) {
  const C = (name && ICONS[name]) || Check;
  return <C className={className} strokeWidth={strokeWidth} aria-hidden />;
}
