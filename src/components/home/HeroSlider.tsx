"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Photo from "@/components/site/Photo";

type Banner = {
  id: string;
  label?: string | null;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  image?: string | null;
  mobileImage?: string | null;
  link?: string | null;
  buttonText?: string | null;
};

export default function HeroSlider({ banners, fallback }: { banners: Banner[]; fallback: Banner }) {
  const slides = banners.length ? banners : [fallback];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  const slide = slides[index] ?? slides[0];
  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  return (
    <section className="home-hero-slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="home-hero-slider-media">
        <picture>
          {slide.mobileImage && <source media="(max-width: 640px)" srcSet={slide.mobileImage} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={slide.image || ""} alt={slide.title} className="h-full w-full object-cover" />
        </picture>
        <div className="home-hero-slider-overlay" />
      </div>
      <div className="home-shell relative flex min-h-[570px] items-end pb-24 pt-20 sm:min-h-[640px] sm:pb-28">
        <div className="max-w-2xl text-white">
          <span className="home-eyebrow home-eyebrow-light">{slide.label ?? "VHI VRINDAVAN"}</span>
          <h1 className="mt-4 max-w-3xl text-5xl leading-[.94] tracking-tight sm:text-6xl lg:text-7xl">{slide.title}</h1>
          {slide.subtitle && <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">{slide.subtitle}</p>}
          {slide.link && <Link href={slide.link} className="btn btn-light mt-7 inline-flex">{slide.buttonText || "Explore homes"} <ArrowRight size={15} /></Link>}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="home-hero-slider-controls">
          <button type="button" onClick={prev} aria-label="Previous banner"><ChevronLeft size={18} /></button>
          <div className="home-hero-slider-dots" aria-label="Banner slides">
            {slides.map((s, i) => <button key={s.id} type="button" onClick={() => setIndex(i)} aria-label={`Go to banner ${i + 1}`} className={i === index ? "active" : ""} />)}
          </div>
          <button type="button" onClick={next} aria-label="Next banner"><ChevronRight size={18} /></button>
        </div>
      )}
    </section>
  );
}
