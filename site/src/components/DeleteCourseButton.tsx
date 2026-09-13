"use client";

import { useRouter } from "next/navigation";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

export default function DeleteCourseButton({
  course,
  redirectTo,
  iconOnly = false,
}: {
  course: string;
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch(`/api/cours/${encodeURIComponent(course)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Échec de la suppression.");
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <ConfirmDeleteButton
      onConfirm={handleDelete}
      label="Supprimer le cours"
      iconOnly={iconOnly}
    />
  );
}
