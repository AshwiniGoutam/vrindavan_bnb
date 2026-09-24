"use client";

import { useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Instagram,
  Play,
} from "lucide-react";
import Photo from "@/components/site/Photo";

type Reel = {
  id: string;
  title: string;
  label?: string | null;
  videoUrl?: string | null;
  image?: string | null;
};

export default function InstagramReelSlider({
  reels,
}: {
  reels: Reel[];
}) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "prev" | "next") => {
    const slider = sliderRef.current;
    if (!slider) return;

    const card = slider.querySelector<HTMLElement>(
      ".instagram-reel-card"
    );

    if (!card) return;

    const gap = 22;
    const amount = card.offsetWidth + gap;

    slider.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  };

  if (!reels.length) return null;

  return (
    <section className="instagram-section">
      <div className="instagram-container">
        {/* ================= SLIDER ================= */}

        <div className="instagram-slider-wrapper">

          {/* PREVIOUS */}

          <button
            type="button"
            className="instagram-slider-arrow instagram-slider-arrow-left"
            onClick={() => scroll("prev")}
            aria-label="Previous"
          >
            <ArrowLeft size={22} />
          </button>


          {/* CARDS */}

          <div
            ref={sliderRef}
            className="instagram-slider"
          >
            {reels.map((reel) => (
              <a
                key={reel.id}
                href={
                  reel.videoUrl ||
                  "https://www.instagram.com/"
                }
                target="_blank"
                rel="noreferrer"
                className="instagram-reel-card"
              >

                {/* IMAGE */}

                <div className="instagram-reel-image">

                  {reel.image ? (
                    <Photo
                      src={reel.image}
                      alt={reel.title}
                      className="instagram-reel-photo"
                    />
                  ) : (
                    <div className="instagram-reel-placeholder">
                      <Instagram size={36} />
                    </div>
                  )}

                  {/* DARK GRADIENT */}

                  <div className="instagram-reel-gradient" />


                  {/* TOP */}

                  <div className="instagram-reel-top">

                    <span className="instagram-reel-pill">
                      <Instagram size={13} />
                      Reel
                    </span>

                    <span className="instagram-reel-external">
                      <ExternalLink size={16} />
                    </span>

                  </div>


                  {/* PLAY BUTTON */}

                  <span className="instagram-play-button">
                    <Play
                      size={22}
                      fill="currentColor"
                    />
                  </span>


                  {/* BOTTOM CONTENT */}

                  <div className="instagram-reel-content">

                    <span className="instagram-reel-label">
                      {reel.label || "STAY WITH US"}
                    </span>

                    <h3>
                      {reel.title}
                    </h3>

                    <span className="instagram-reel-line" />

                  </div>

                </div>

              </a>
            ))}
          </div>


          {/* NEXT */}

          <button
            type="button"
            className="instagram-slider-arrow instagram-slider-arrow-right"
            onClick={() => scroll("next")}
            aria-label="Next"
          >
            <ArrowRight size={22} />
          </button>

        </div>

      </div>
    </section>
  );
}