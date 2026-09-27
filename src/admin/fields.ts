/** Client-safe field & resource definitions for the configuration-driven admin. */
export type FieldType =
  | "text" | "slug" | "textarea" | "number" | "money" | "percent" | "boolean" | "select" | "multiselect"
  | "ref" | "refs" | "tags" | "lines" | "date" | "time" | "image" | "gallery" | "list" | "password" | "readonly";

export interface Option {
  value: string;
  label: string;
}

export interface Field {
  name: string; // dotted path, e.g. "pricing.baseRate"
  label: string;
  type: FieldType;
  section?: string;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: Option[];
  ref?: string; // resource key for ref/refs
  fields?: Field[]; // for list
  folder?: string; // media folder for image/gallery
  width?: "full" | "half" | "third";
  default?: unknown;
  numeric?: boolean; // multiselect values stored as numbers
  groupsFrom?: string; // gallery: tag photos with room names taken from this list field
}

export interface Column {
  name: string;
  label: string;
  type?: "text" | "money" | "badge" | "boolean" | "date" | "image" | "datetime";
}

export interface ResourceConfig {
  key: string;
  label: string;
  singular: string;
  group: "Catalogue" | "Pricing & offers" | "Content" | "Operations" | "Admin";
  permission: import("@/server/auth/permissions").Permission;
  model: string;
  titleField: string;
  columns: Column[];
  fields: Field[];
  searchFields?: string[];
  defaultSort?: Record<string, 1 | -1>;
  canCreate?: boolean;
  canDelete?: boolean;
  publicPath?: string; // e.g. "/stays/{slug}"
  description?: string;
}

export const opts = (...values: (string | [string, string])[]): Option[] =>
  values.map((v) => (Array.isArray(v) ? { value: v[0], label: v[1] } : { value: v, label: v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) }));

export const PUBLISHING: Field = {
  name: "publishing.status",
  label: "Visibility",
  type: "select",
  section: "SEO & visibility",
  options: opts(["draft", "Draft"], ["published", "Published"], ["unpublished", "Unpublished"]),
  default: "draft",
};
export const SEO: Field[] = [
  { name: "seo.metaTitle", label: "SEO title", type: "text", section: "SEO & visibility", help: "≈ 55 characters. Defaults to the name." },
  { name: "seo.metaDescription", label: "SEO description", type: "textarea", section: "SEO & visibility", help: "≈ 155 characters." },
  { name: "seo.ogImage", label: "Social share image", type: "image", section: "SEO & visibility", folder: "general" },
];
export const FAQS: Field = {
  name: "faqs",
  label: "FAQs",
  type: "list",
  section: "FAQs",
  width: "full",
  fields: [
    { name: "question", label: "Question", type: "text" },
    { name: "answer", label: "Answer", type: "textarea" },
  ],
};
export const DAYS: Field[] = [
  { name: "day", label: "Day", type: "number" },
  { name: "title", label: "Title", type: "text" },
  { name: "summary", label: "Summary", type: "textarea" },
  { name: "items", label: "Moments (one per line)", type: "lines" },
  { name: "image", label: "Image", type: "image", folder: "tours" },
];
export const WEEKDAYS = opts(["0", "Sun"], ["1", "Mon"], ["2", "Tue"], ["3", "Wed"], ["4", "Thu"], ["5", "Fri"], ["6", "Sat"]);
export const VERTICALS = opts(["stay", "Stay"], ["stay_food", "Stay + Food"], ["darshan", "Darshan"]);
