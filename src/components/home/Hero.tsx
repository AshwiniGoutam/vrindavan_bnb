"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import Photo from "@/components/site/Photo";
import { waLink } from "@/lib/config";

export type HeroPic = { src: string | null; alt: string };

export default function Hero({ pics }: { pics: HeroPic[] }) {
  const hero = pics[0];
  const secondary = pics.slice(1, 3);

  return (
    <MotionConfig reducedMotion="user">
      <section className="home-hero">
        <div className="home-hero-media">
          <Photo src={hero?.src} alt={hero?.alt ?? "Vrindavan Holiday Inn private villa"} className="h-full w-full" />
          <div className="home-hero-scrim" />
        </div>

        <div className="relative mx-auto flex min-h-[680px] max-w-[1440px] items-end px-5 pb-36 pt-20 sm:px-8 lg:min-h-[760px] lg:px-10">
          <div className="max-w-3xl text-white">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur-md"
            >
              <Sparkles size={14} /> Handpicked stays across India
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08 }}
              className="max-w-3xl text-5xl leading-[0.96] tracking-tight sm:text-6xl lg:text-8xl"
            >
              Your own house,
              <br />
              wherever you&apos;re going.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg"
            >
              Private villas, thoughtful hosts and the feeling of having a place that is completely yours.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href="/stays" className="btn btn-light">
                Explore stays <ArrowRight size={17} />
              </Link>
              <a href={waLink("Hi, help me find a Vrindavan Holiday Inn stay.")} target="_blank" rel="noreferrer" className="hero-outline-btn">
                <Play size={15} /> Ask our stay team
              </a>
            </motion.div>
          </div>

          {secondary.length > 0 && (
            <div className="absolute bottom-10 right-6 hidden w-[310px] gap-2 sm:flex lg:right-10">
              {secondary.map((pic, index) => (
                <motion.div
                  key={`${pic.alt}-${index}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.25 + index * 0.1 }}
                  className="home-hero-thumb"
                >
                  <Photo src={pic.src} alt={pic.alt} className="h-full w-full" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}
