import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { ContactClient } from "./contact-client";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: "Контакты",
    description: `Связаться с ${s.name}: ${s.phone}, ${s.address}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSiteSettings();
  return <ContactClient settings={settings} />;
}
