"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

type Testimonial = {
  id: string;
  quote: string;
  name: string;
  location?: string | null;
  rating?: number | null;
  source?: string | null;
};

type Props = {
  testimonials: Testimonial[];
};

export default function TestimonialsSlider({ testimonials }: Props) {
  const [current, setCurrent] = useState(0);
  const [visibleCount, setVisibleCount] = useState(2);

  useEffect(() => {
    const updateVisibleCount = () => {
      setVisibleCount(window.innerWidth < 768 ? 1 : 2);
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);

    return () => {
      window.removeEventListener("resize", updateVisibleCount);
    };
  }, []);

  const maxIndex = Math.max(
    0,
    testimonials.length - visibleCount
  );

  useEffect(() => {
    if (current > maxIndex) {
      setCurrent(maxIndex);
    }
  }, [current, maxIndex]);

  useEffect(() => {
    if (testimonials.length <= visibleCount) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5500);

    return () => clearInterval(interval);
  }, [maxIndex, testimonials.length, visibleCount]);

  if (!testimonials.length) return null;

  const goPrev = () => {
    setCurrent((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const goNext = () => {
    setCurrent((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const cardWidth = visibleCount === 1 ? "100%" : "calc(50% - 10px)";

  return (
    <div className="mt-7">
      {/* Slider */}
      <div className="relative overflow-hidden">
        <div
          className="flex gap-5 transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(calc(-${current} * (${100 / visibleCount}% + ${
              visibleCount === 2 ? "10px" : "0px"
            })))`,
          }}
        >
          {testimonials.map((testimonial) => {
            const rating = Math.max(
              1,
              Math.min(5, Number(testimonial.rating) || 5)
            );

            return (
              <article
                key={testimonial.id}
                className="shrink-0 rounded-[22px] border border-[#e7e4dc] bg-white p-6 sm:p-7"
                style={{ width: cardWidth }}
              >
                {/* Stars */}
                <div className="flex items-center gap-1 text-[#b5965a]">
                  {Array.from({ length: rating }).map((_, index) => (
                    <Star
                      key={index}
                      size={14}
                      fill="currentColor"
                      strokeWidth={1.5}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="mt-5 min-h-[105px] text-[15px] leading-7 tracking-[-0.01em] text-[#294641] sm:text-[16px]">
                  “{testimonial.quote}”
                </p>

                {/* Guest */}
                <div className="mt-6 border-t border-[#eeeae2] pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <b className="block text-[12px] font-semibold text-[#163f3a]">
                        {testimonial.name}
                      </b>

                      {testimonial.location && (
                        <span className="mt-1 block text-[10px] text-[#7b827d]">
                          {testimonial.location}
                        </span>
                      )}
                    </div>

                    {testimonial.source === "GOOGLE" && (
                      <span className="rounded-full bg-[#f4f1e9] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#66706a]">
                        Google review
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      {testimonials.length > visibleCount && (
        <div className="mt-6 flex items-center justify-between">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`Go to testimonial ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === current
                    ? "w-6 bg-[#163f3a]"
                    : "w-1.5 bg-[#c9cec9]"
                }`}
              />
            ))}
          </div>

          {/* Arrows */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous testimonial"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dcded8] bg-white text-[#163f3a] transition hover:bg-[#f4f1e9]"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next testimonial"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dcded8] bg-white text-[#163f3a] transition hover:bg-[#f4f1e9]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}