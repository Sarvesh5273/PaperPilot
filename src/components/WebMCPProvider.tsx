'use client';

import { useWebMCPTools } from '@/hooks/useWebMCPTools';

export function WebMCPProvider() {
  useWebMCPTools();
  return null;
}
