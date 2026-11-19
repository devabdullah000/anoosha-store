"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import css from "./storefront.module.css";
export default function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ ready: false, visible: true });
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    )
      return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState({ ready: true, visible: true });
          observer.disconnect();
        }
      },
      { threshold: 0.07, rootMargin: "0px 0px -25px 0px" },
    );
    if (node.getBoundingClientRect().top > window.innerHeight - 25)
      setState({ ready: true, visible: false });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${css.reveal} ${className}`}
      data-ready={state.ready}
      data-visible={state.visible}
    >
      {children}
    </div>
  );
}
