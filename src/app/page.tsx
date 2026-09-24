import Link from "next/link";
import { ArrowRight, BadgeCheck, BedDouble, CalendarDays, ChefHat, Heart, Instagram, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { db } from "@/lib/db";
import Photo from "@/components/site/Photo";
import SearchBar from "@/components/home/SearchBar";
import StayCard from "@/components/home/StayCard";
import HeroSlider from "@/components/home/HeroSlider";
import InstagramReelSlider from "@/components/home/InstagramReelSlider";
import { getCollections, getDestinations } from "@/lib/content";
import { slugify } from "@/lib/utils";
import HomeStayCard from "@/components/home/HomeStayCard";
import TestimonialsSlider from "@/components/home/TestimonialsSlider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [stays, collections, destinations, cms, faqs, testimonials] = await Promise.all([
    db.stay.findMany({ where: { published: true }, orderBy: [{ featured: "desc" }, { rating: "desc" }, { createdAt: "desc" }], take: 6 }),
    getCollections(),
    getDestinations(),
    db.siteContent.findMany({ where: { active: true }, orderBy: [{ section: "asc" }, { sortOrder: "asc" }] }),
    db.faq.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.testimonial.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 8 }),
  ]);

  const bySection = (section: string) =>
    cms.filter(
      (x: any) =>
        String(x.section ?? "").trim().toLowerCase() === section.toLowerCase()
    );
  const hero = bySection("hero")[0];
  const banners = bySection("banner");
  const intro = bySection("intro")[0];
  const standard = bySection("standard-item");
  const offers = bySection("offer");
  const stories = bySection("story");
  const instagram = bySection("instagram");
  const host = bySection("host")[0];
  const city = destinations[0] ?? "Vrindavan";
  const cityStays = stays.filter((s: any) => s.city === city);



  return (
    <div className="vhi-home">
      <HeroSlider
        banners={banners as any}
        fallback={{
          id: hero?.id ?? "fallback-hero",
          image: hero?.image ?? stays[0]?.images?.[0],
          label: hero?.label ?? "VHI VRINDAVAN",
          title: hero?.title ?? "Your private home in Vrindavan.",
          subtitle: hero?.subtitle ?? "Six thoughtfully chosen homes, warm local hospitality and space to slow down.",
          link: hero?.link ?? "/stays",
          buttonText: hero?.buttonText ?? "Explore homes",
        }}
      />

      <div className="home-search-wrap"><SearchBar cities={destinations} /></div>

      {/* <section className="home-section home-shell py-10 sm:py-14">
        <div className="compact-intro">
          <div><span className="home-eyebrow">{intro?.label ?? "THE VHI EDIT"}</span><h2>{intro?.title ?? "Vrindavan, at your own pace."}</h2></div>
          <p>{intro?.body ?? "Not a hotel. Not a crowded resort. A home that is yours, with a local team looking after the details."}</p>
        </div>
      </section> */}
        {/* <section className="mt-20"><div className="stats-compact"><div><b>{stays.length}</b><span>homes in Vrindavan</span></div><div><b>24/7</b><span>local support</span></div><div><b>4.8+</b><span>guest ratings</span></div><div><b>1</b><span>thoughtful destination</span></div></div></section> */}


      <section className="home-section home-shell pb-12">
        <div className="home-section-head"><div><span className="home-eyebrow"><MapPin size={13} /> DESTINATION</span><h2>Stay in {city}</h2><p>{cityStays.length} private homes, all in one thoughtful collection.</p></div><Link href={`/destinations/${slugify(city)}`} className="home-link">Explore {city} <ArrowRight size={15} /></Link></div>
        <div className="destination-feature mt-7">
          <Link href={`/destinations/${slugify(city)}`} className="destination-feature-image"><Photo src={'https://a0.muscache.com/im/pictures/hosting/Hosting-1616621273266314537/original/fb519aad-5568-429b-b373-62aed4b33fee.jpeg?im_w=1200'} alt={city} className="h-full w-full" /></Link>
          <div className="destination-feature-copy"><span className="home-eyebrow">ONE CITY · SIX HOMES</span><h3>Close to the places that bring you here. Far enough from the rush.</h3><p>Choose a private home in Vrindavan with room for family, quiet mornings and the freedom to make the day your own.</p><Link href="/stays" className="btn btn-primary mt-5">See all homes <ArrowRight size={15} /></Link></div>
        </div>
      </section>

      <section className="home-section home-shell pb-12">
        <div className="home-section-head"><div><span className="home-eyebrow"><Star size={13} /> GUEST FAVOURITES</span><h2>Homes worth staying for</h2><p>Compact, comfortable and made for actual living.</p></div><Link href="/stays" className="home-link">View all <ArrowRight size={15} /></Link></div>
        <div className="stay-grid compact-stay-grid mt-7">
  {stays.map((s: any) => (
    <HomeStayCard key={s.id} stay={s} />
  ))}
</div>
      </section>

      {offers.length > 0 && <section className="home-section home-shell pb-12"><div className="home-section-head"><div><span className="home-eyebrow">VHI OFFERS</span><h2>Something extra for your next stay</h2></div></div><div className="cms-card-grid mt-7">{offers.map((x: any) => <Link href={x.link || "/stays"} key={x.id} className="cms-card"><div className="cms-card-image"><Photo src={x.image ?? stays[0]?.images?.[0]} alt={x.title} className="h-full w-full" /></div><div className="cms-card-body"><span className="home-eyebrow">{x.label}</span><h3>{x.title}</h3><p>{x.subtitle}</p><small>{x.body}</small></div></Link>)}</div></section>}

      {/* {collections.length > 0 && <section className="home-section home-shell pb-12"><div className="home-section-head"><div><span className="home-eyebrow">THE COLLECTION</span><h2>Choose your kind of stay</h2></div><Link href="/stays" className="home-link">Browse homes <ArrowRight size={15} /></Link></div><div className="collection-rail compact-collection-rail mt-7">{collections.map((c: any) => <Link key={c.slug} href={`/stays?collection=${c.slug}`} className="collection-card compact-collection-card"><Photo src={c.image ?? stays[0]?.images?.[0]} alt={c.title} className="h-full w-full" /><div className="collection-overlay" /><div className="collection-copy"><h3>{c.title}</h3><p>{c.blurb}</p></div></Link>)}</div></section>} */}

     <section className="bg-[#f4f1e9] py-16 sm:py-20 lg:py-24">
  <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-10">
    
    <div className="grid overflow-hidden rounded-[24px] bg-white lg:grid-cols-[1.05fr_0.95fr]">
      
      {/* Image */}
      <div className="relative">
        <Photo
          src="/images/about-us-banner.png"
          alt="Vrindavan Holiday Inn"
          className="h-full w-full object-cover"
        />

        {/* Small image label */}
        <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-[9px] font-medium uppercase tracking-[0.18em] text-[#163f3a] backdrop-blur-sm">
          Vrindavan Holiday Inn
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12">
        
        <div>
          <div className="mb-5 flex items-center gap-2">
            <span className="h-[1px] w-6 bg-[#163f3a]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6f7772]">
              The VHI Standard
            </span>
          </div>

          <h2 className="max-w-[480px] text-[34px] leading-[0.98] tracking-[-0.035em] text-[#123e39] sm:text-[42px] lg:text-[48px]">
            A beautiful house
            <br />
            is only the
            <br />
            beginning.
          </h2>

          <p className="mt-6 max-w-[400px] text-[13px] leading-6 text-[#707873]">
            The stay should feel effortless from the moment you arrive.
            Thoughtful spaces, warm hospitality and everything you need
            to feel at home in Vrindavan.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-[#e7e4dc] pt-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#89908b]">
              Stay differently
            </p>

            <p className="mt-1 text-[12px] text-[#163f3a]">
              Comfort · Privacy · Local hospitality
            </p>
          </div>

          <Link
            href="/about"
            className="inline-flex items-center rounded-full bg-[#123f3a] px-5 py-3 text-[12px] font-medium text-white transition hover:bg-[#0d302c]"
          >
            Discover VHI
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </div>

      </div>
    </div>

  </div>
</section>

      {stories.length > 0 && <section className="home-section home-shell py-12"><div className="home-section-head"><div><span className="home-eyebrow">VHI JOURNAL</span><h2>Stories from Vrindavan</h2></div></div><div className="story-rail mt-7">{stories.map((x: any) => <Link href={x.link || "/contact"} key={x.id} className="story-tile"><Photo src={x.image ?? stays[0]?.images?.[0]} alt={x.title} className="h-full w-full" /><div className="story-tile-overlay" /><div className="story-tile-copy"><span>{x.label}</span><h3>{x.title}</h3><p>{x.subtitle}</p></div></Link>)}</div></section>}

      {instagram.length > 0 && <section className="home-section home-shell pb-12"><div className="home-section-head"><div><span className="home-eyebrow"><Instagram size={13} /> INSTAGRAM</span><h2>See Vrindavan Holiday Inn in real life</h2><p>Small moments, real stays and Vrindavan through our eyes.</p></div><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="home-link">Follow us <ArrowRight size={15} /></a></div><InstagramReelSlider reels={instagram as any} /></section>}

      {host && <section className="home-section home-shell pb-12"><div className="host-compact"><div className="host-compact-image"><Photo src={host.image ?? stays[4]?.images?.[0]} alt={host.title} className="h-full w-full" /></div><div className="host-compact-copy"><span className="home-eyebrow"><Heart size={13} /> {host.label}</span><h2>{host.title}</h2><p>{host.body || host.subtitle}</p><Link href={host.link || "/contact?topic=list-property"} className="btn btn-light mt-5">Talk to Vrindavan Holiday Inn <ArrowRight size={15} /></Link></div></div></section>}


      {testimonials.length > 0 && (
  <section className="bg-[#f4f1e9] py-16 sm:py-20 lg:py-24">
    <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-10">
      <div>
        <span className="home-eyebrow">
          <Star size={13} /> GUEST WORDS
        </span>

        <h2>What guests remember</h2>

        <p>
          Thoughtful stays, shared by the people who stayed with us.
        </p>
      </div>

    <TestimonialsSlider testimonials={testimonials as any} />
    </div>
  </section>
)}

      {faqs.length > 0 && <section className="home-section home-shell pb-12"><div className="home-section-head"><div><span className="home-eyebrow">GOOD TO KNOW</span><h2>Frequently asked questions</h2><p>Everything you may want to know before your stay.</p></div></div><div className="faq-list mt-7">{faqs.map((f: any) => <details key={f.id} className="faq-item"><summary>{f.question}<span>+</span></summary><p>{f.answer}</p></details>)}</div></section>}

    
      <section className="home-final-compact"><div className="home-shell"><div className="final-compact"><div><span className="home-eyebrow home-eyebrow-light">YOUR NEXT VHI</span><h2>Come for Vrindavan. Stay for the feeling of home.</h2></div><Link href="/stays" className="btn btn-light">Explore homes <ArrowRight size={15} /></Link></div></div></section>
    </div>
  );
}
