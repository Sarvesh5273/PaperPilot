'use client';

import { useState, useEffect } from 'react';
import { PaperOutline } from '@/types';
import { loadOutlines } from '@/lib/storage';

export function useOutlines() {
  const [outlines, setOutlines] = useState<PaperOutline[]>([]);

  useEffect(() => {
    setOutlines(loadOutlines());
    const handler = () => setOutlines(loadOutlines());
    window.addEventListener('paperpilot:outlines-changed', handler);
    return () => window.removeEventListener('paperpilot:outlines-changed', handler);
  }, []);

  return outlines;
}
