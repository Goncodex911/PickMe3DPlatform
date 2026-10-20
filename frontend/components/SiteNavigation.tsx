"use client";

import { usePathname } from "next/navigation";
import SiteNav from "@/components/SiteNav";

/** Document previews and full-screen editing tools provide their own controls. */
export default function SiteNavigation() {
  const pathname = usePathname();
  if (/^\/(editor|embed|canvas-demo)(\/|$)/.test(pathname) || /^\/slides\/(edit|view)(\/|$)/.test(pathname)) return null;
  return <SiteNav key={pathname} />;
}
