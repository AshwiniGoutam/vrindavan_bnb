export const site = {
  name: "Vrindavan Holiday Inn",
  tagline: "Private villas and homestays, booked direct",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919999999999",
  phoneDisplay: "+91 99999 99999",
  email: "bookings@example.com",
};

export const waLink = (text: string, number: string = site.whatsapp) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

export const collectionList = [
  { slug: "private-pool", title: "Private pool", blurb: "Your own water, no sharing.", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=70" },
  { slug: "heritage", title: "Heritage havelis", blurb: "Courtyards, jharokhas, old stone.", image: "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?auto=format&fit=crop&w=800&q=70" },
  { slug: "pet-friendly", title: "Pet friendly", blurb: "Bring the whole family, fur included.", image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=70" },
  { slug: "celebrations", title: "Celebrations", blurb: "Birthdays, anniversaries, small weddings.", image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=70" },
  { slug: "workation", title: "Workation", blurb: "Fast wifi and a real desk.", image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=70" },
  { slug: "scenic-views", title: "Scenic views", blurb: "Hills, lakes and open sky.", image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=70" },
];

export const destinations = ["Vrindavan"];

export const stayTypes = ["Villa", "Homestay", "Haveli", "Cottage", "Farmhouse", "Resort"];

export const legal = {
  companyName: "Your Registered Legal Name", // TODO: your registered legal name
  address: "Your registered address, City, State, PIN", // TODO
  grievanceOfficer: "Your Name", // TODO: named contact required under Indian IT rules
  grievanceEmail: "grievance@example.com", // TODO
  lastUpdated: "1 October 2026",
};

/** Guest self-cancellation refunds, as % of the amount paid. Edit to match your policy. */
export const cancellationPolicy = [
  { daysBefore: 7, refundPercent: 100 },
  { daysBefore: 3, refundPercent: 50 },
  { daysBefore: 0, refundPercent: 0 },
];
