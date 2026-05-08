import Link from "next/link";
import { MasterForm } from "../master-form";

export default function NewMasterPage() {
  return (
    <div>
      <Link href="/admin/masters" className="text-[13px] text-ink-mute">← Мастера</Link>
      <h1 className="serif text-[32px] sm:text-[38px] font-light leading-tight mt-3 mb-7">
        Новый мастер
      </h1>
      <MasterForm />
    </div>
  );
}
