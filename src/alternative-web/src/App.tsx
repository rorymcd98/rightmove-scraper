// @@filename: src/App.tsx
import React, { useCallback, useRef, useEffect } from 'react';
import './app-styles.css';
import { usePropertyContext } from './context/PropertyContext';
import { usePropertyData } from './hooks/usePropertyData';
import FilterPanel from './components/FilterPanel';
import ListingGrid from './components/ListingGrid';
import BackToTop from './components/BackToTop';
import ErrorBoundary from './components/ErrorBoundary';
import Pagination from './components/Pagination';

const App: React.FC = () => {
  const { state, dispatch } = usePropertyContext();
  const { loadMore, hasMore, isLoading, error } = usePropertyData();

  useEffect(() => {
    dispatch({ type: 'APPLY_FILTERS_AND_SORT' });
  }, [state.filters, state.sortOption, dispatch]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastListingElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadMore, hasMore, isLoading]);

  return (
      <div className="App">
        <ErrorBoundary>
          <header>
            <h1>Property Listings</h1>
          </header>
          <FilterPanel />
          <main>
            {error && <div className="error-message">{error}</div>}
            <ListingGrid
                listings={state.filteredListings}
                lastListingRef={lastListingElementRef}
            />
            {isLoading && <div className="loading-indicator">Loading...</div>}
          </main>
          <Pagination />
          <BackToTop />
        </ErrorBoundary>
      </div>
  );
};

export default App;
