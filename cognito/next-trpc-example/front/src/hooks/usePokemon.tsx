'use client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { useCallback, useEffect, useState } from 'react';
import { PokemonJson } from '../../../batch';
import { AppRouter } from '../../../lambda';

const url = process.env.NEXT_PUBLIC_API_URL || '';

export const usePokemon = () => {
  const client = createTRPCProxyClient<AppRouter>({
    links: [httpBatchLink({ url })],
  });

  const [pokemon, setPokemon] = useState<PokemonJson>();
  const [error, setError] = useState<unknown>();

  const load = useCallback(async () => {
    try {
      const q = await client.pokemon.query();
      setPokemon(q);
    } catch (error) {
      console.log('error', error);
      setError(error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [!pokemon]);

  return { pokemon, error };
};
