"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { transitionBooking, type StatusTransition } from "@/lib/bookings";

async function actorTag(): Promise<string> {
  // We don't have proper admin user identity yet — just tag with cookie presence.
  const c = cookies().get("riva_admin")?.value;
  return c ? "web:admin" : "web:unknown";
}

export async function changeBookingStatus(id: string, status: StatusTransition) {
  await transitionBooking(id, status, await actorTag());
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

export async function deleteBooking(id: string) {
  // Hard delete is rare — admins usually cancel instead. Provide for cleanup.
  await prisma.adminEvent.deleteMany({ where: { bookingId: id } });
  await prisma.booking.delete({ where: { id } });
  revalidatePath("/admin/bookings");
}
