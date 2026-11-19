"use client";

import HeroSliderManager from "@/components/admin/storefront/hero-slider-manager";

type SliderControlProps = {
  adminEmail: string;
};

export default function SliderControl(_props: SliderControlProps) {
  return (
    <div className="min-w-0 w-full">
      <HeroSliderManager embedded />
    </div>
  );
}