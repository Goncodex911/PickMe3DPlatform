import type { Metadata } from "next";
import TemplatesClient from "./TemplatesClient";

export const metadata: Metadata = {
  title: "Template library — PickMe3D",
  description: "Explore PickMe3D community templates, find inspiration and keep creating in Canvas Editor.",
};

export default function TemplatesPage() {
  return <TemplatesClient />;
}
