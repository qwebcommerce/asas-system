"use client";

import { usePermissions } from "@/components/permissions-provider";
import { defaultMatrix } from "@/lib/access";

export function useAccessAdmin(enabled: boolean) {
  const { matrix } = usePermissions();
  return { matrix: enabled ? matrix : defaultMatrix };
}
