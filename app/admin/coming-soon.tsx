// Placeholder for admin sections that aren't built out yet (5.1–5.4).
export function ComingSoon({ title, stage }: { title: string; stage: string }) {
  return (
    <div>
      <div className="eyebrow">Раздел</div>
      <h1 className="serif text-[36px] sm:text-[44px] font-light leading-tight mt-2 mb-6">
        {title}
      </h1>
      <div className="bg-bg-0 border border-line rounded-xl p-7 max-w-[520px]">
        <div className="font-mono text-[11px] tracking-wider uppercase text-gold-3 mb-2">
          этап {stage}
        </div>
        <p className="text-ink-soft leading-relaxed m-0">
          Этот раздел в работе — добавим в следующем этапе. А пока всё это можно делать через
          Telegram-бот владельца:
        </p>
        <ul className="text-ink-soft text-sm mt-4 leading-relaxed list-disc pl-5">
          <li>Заявки и подтверждение — через уведомления и /pending</li>
          <li>Услуги и мастера — пока правятся в коде, перенесём в админку</li>
          <li>Расписание — генерится автоматически на 14 дней вперёд</li>
        </ul>
      </div>
    </div>
  );
}
