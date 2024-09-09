// @@filename: src/hooks/usePropertyData.ts
import { useEffect, useCallback, useState } from 'react';
import { usePropertyContext } from '../context/PropertyContext';
import { ListingWithState, PropertyListing } from '../context/PropertyContext';

export function usePropertyData() {
  const { state, dispatch } = usePropertyContext();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API pagination
      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;

    
      const importedOnTheMarketData = (await import('../../../../storage/datasets/all-onthemarket/000000001.json')).default.listings;

      const hydrateListings = (listings: PropertyListing[]): ListingWithState[] =>
        listings.map(listing => ({
          listing: {
            ...listing,
            adDate: listing.adDate ? new Date(listing.adDate) : null,
            site: listing.site ?? "rightmove",
            roomDimensions: listing.roomDimensions?.sort((a, b) => (b[0] * b[1]) - (a[0] * a[1])) ?? null,
          },
          state: {
            isHidden: false,
            isFavourite: false,
          }
        }));

      const allListings = [
        ...hydrateListings(importedOnTheMarketData),
      ].slice(start, end);

      dispatch({ type: 'APPEND_LISTINGS', payload: allListings });
      setHasMore(allListings.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError('Failed to fetch properties. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, page]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const loadMore = useCallback(() => {
    setPage(prevPage => prevPage + 1);
  }, []);

  return { loadMore, hasMore, isLoading, error };
}