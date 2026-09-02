'use client';
import { useState, useEffect } from 'react';
import { loadCollections } from '@/lib/storage';
import { PaperCollection } from '@/types';

export function useCollections() {
  const [collections, setCollections] = useState<PaperCollection[]>([]);
  
  useEffect(() => {
    const load = () => setCollections(loadCollections());
    load();
    window.addEventListener('paperpilot:collections-changed', load);
    return () => window.removeEventListener('paperpilot:collections-changed', load);
  }, []);
  
  return collections;
}
