'use client';

import { useState, useEffect } from 'react';
import { PaperCollection } from '@/types';
import { loadCollections } from '@/lib/storage';

export function useCollections() {
  const [collections, setCollections] = useState<PaperCollection[]>([]);

  useEffect(() => {
    setCollections(loadCollections());
    const handler = () => setCollections(loadCollections());
    window.addEventListener('paperpilot:collections-changed', handler);
    return () => window.removeEventListener('paperpilot:collections-changed', handler);
  }, []);

  return collections;
}
