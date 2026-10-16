import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — PickMe3D",
  description: "Sign in to PickMe3D to design in Canvas Editor, explore templates and save your ideas.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
