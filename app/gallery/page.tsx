import type { Metadata } from "next";
import { GalleryClient } from "./gallery-client";

export const metadata: Metadata = {
  title: "Галерея",
  description: "Интерьеры RIVA POOL SPA: бассейн на террасе, хаммам, массажные кабинеты, лаунж-зона.",
};

export default function GalleryPage() {
  return <GalleryClient />;
}
