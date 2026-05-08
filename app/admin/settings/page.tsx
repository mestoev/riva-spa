import { getSiteSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div>
      <div className="eyebrow">Конфигурация</div>
      <h1 className="serif text-[26px] sm:text-[44px] font-light leading-tight mt-2 mb-2">
        Настройки салона
      </h1>
      <p className="text-ink-soft mb-6 sm:mb-8 max-w-[640px] text-sm sm:text-base">
        Контакты, часы работы и SEO-метаданные. Изменения сразу применяются на сайте,
        в футере, контактах и Telegram-ботах.
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
