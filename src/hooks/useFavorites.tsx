import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  type FavoriteItem,
} from "@/lib/favorites.functions";

export interface FavoriteInput {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster?: string | null;
  year?: string | null;
  rating?: number | null;
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchFavorites = useServerFn(listFavorites);
  const addFn = useServerFn(addFavorite);
  const removeFn = useServerFn(removeFavorite);

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => fetchFavorites(),
    enabled: !!user,
  });

  const keys = useMemo(
    () => new Set(favorites.map((f) => `${f.mediaType}-${f.tmdbId}`)),
    [favorites],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["favorites"] });

  const addMut = useMutation({
    mutationFn: (item: FavoriteInput) => addFn({ data: item }),
    onSuccess: invalidate,
  });

  const removeMut = useMutation({
    mutationFn: (item: { tmdbId: number; mediaType: "movie" | "tv" }) =>
      removeFn({ data: item }),
    onSuccess: invalidate,
  });

  return {
    user,
    favorites: favorites as FavoriteItem[],
    isLoading,
    isFavorite: (mediaType: "movie" | "tv", tmdbId: number) =>
      keys.has(`${mediaType}-${tmdbId}`),
    add: addMut.mutate,
    remove: removeMut.mutate,
    isMutating: addMut.isPending || removeMut.isPending,
  };
}
