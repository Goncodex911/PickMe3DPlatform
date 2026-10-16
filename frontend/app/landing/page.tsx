import type { Metadata } from "next";
import ProjectLanding from "@/components/ProjectLanding";

export const metadata: Metadata = {
  title: "PickMe3D — A space for your ideas",
  description: "Design visually with Canvas Editor, explore community templates and turn ideas into prompts with PickMe3D.",
};

export default function LandingPage() {
  return <ProjectLanding />;
}
