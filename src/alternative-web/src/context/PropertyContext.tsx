// @@filename: src/context/PropertyContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { PropertyListing, Site, Room } from '../types';

export type ListingTag = {
  listingId: string;
  site: Site;
};

export type ListingWithState = {
  listing: PropertyListing;
  state: {
    isHidden: boolean;
    isFavourite: boolean;
  }
};

export type PropertyState = {
  listings: ListingWithState[];
  filteredListings: ListingWithState[];
  filterDate: string;
  minSquareFootage: string;
  sortCriteria: "date" | "squareFootage" | "limitingRoomArea" | null;
  showFavourite: boolean;
  showHidden: boolean;
  showMissingFtg: boolean;
  showMissingRoomDimensions: boolean;
  limitingRoomNumber: number;
  limitingArea: number;
  limitingDimension: number;
  currentPage: number;
  categoryFilters: {[key: string]: boolean};
  searchTerm: string;
  filters: {
    // Define your filter properties here
    // For example:
    // minPrice: number;
    // maxPrice: number;
    // bedrooms: number;
  };
}

type PropertyAction =
    | { type: 'SET_LISTINGS'; payload: ListingWithState[] }
    | { type: 'APPEND_LISTINGS'; payload: ListingWithState[] }
    | { type: 'SET_FILTERED_LISTINGS'; payload: ListingWithState[] }
    | { type: 'SET_FILTER'; payload: { key: keyof PropertyState; value: any } }
    | { type: 'TOGGLE_FAVOURITE'; payload: ListingTag }
    | { type: 'TOGGLE_HIDDEN'; payload: ListingTag }
    | { type: 'SET_CATEGORY_FILTER'; payload: { category: string; checked: boolean } }
    | { type: 'SET_SEARCH_TERM'; payload: string }
    | { type: 'APPLY_FILTERS_AND_SORT' };

const initialState: PropertyState = {
  listings: [],
  filteredListings: [],
  filterDate: '',
  minSquareFootage: '',
  sortCriteria: null,
  showFavourite: false,
  showHidden: false,
  showMissingFtg: false,
  showMissingRoomDimensions: false,
  limitingRoomNumber: 0,
  limitingArea: 0,
  limitingDimension: 0,
  currentPage: 1,
  categoryFilters: {},
  searchTerm: '',
  filters: {},
};

function propertyReducer(state: PropertyState, action: PropertyAction): PropertyState {
  switch (action.type) {
    case 'SET_LISTINGS':
      return { ...state, listings: action.payload, filteredListings: applyFiltersAndSort({ ...state, listings: action.payload }) };
    case 'APPEND_LISTINGS':
      const newState = { ...state, listings: [...state.listings, ...action.payload] };
      return { ...newState, filteredListings: applyFiltersAndSort(newState) };
    case 'SET_FILTERED_LISTINGS':
      return { ...state, filteredListings: action.payload };
    case 'SET_FILTER':
      const updatedState = { ...state, [action.payload.key]: action.payload.value };
      return { ...updatedState, filteredListings: applyFiltersAndSort(updatedState) };
    case 'TOGGLE_FAVOURITE':
      const updatedListings = state.listings.map(item =>
          item.listing.listingId === action.payload.listingId && item.listing.site === action.payload.site
              ? { ...item, state: { ...item.state, isFavourite: !item.state.isFavourite } }
              : item
      );
      return { ...state, listings: updatedListings, filteredListings: applyFiltersAndSort({ ...state, listings: updatedListings }) };
    case 'TOGGLE_HIDDEN':
      const hiddenUpdatedListings = state.listings.map(item =>
          item.listing.listingId === action.payload.listingId && item.listing.site === action.payload.site
              ? { ...item, state: { ...item.state, isHidden: !item.state.isHidden } }
              : item
      );
      return { ...state, listings: hiddenUpdatedListings, filteredListings: applyFiltersAndSort({ ...state, listings: hiddenUpdatedListings }) };
    case 'SET_CATEGORY_FILTER':
      const updatedCategoryFilters = {
        ...state.categoryFilters,
        [action.payload.category]: action.payload.checked
      };
      return { ...state, categoryFilters: updatedCategoryFilters, filteredListings: applyFiltersAndSort({ ...state, categoryFilters: updatedCategoryFilters }) };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload, filteredListings: applyFiltersAndSort({ ...state, searchTerm: action.payload }) };
    case 'APPLY_FILTERS_AND_SORT':
      return { ...state, filteredListings: applyFiltersAndSort(state) };
    default:
      return state;
  }
}

const PropertyContext = createContext<{
  state: PropertyState;
  dispatch: React.Dispatch<PropertyAction>;
} | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(propertyReducer, initialState);

  return (
      <PropertyContext.Provider value={{ state, dispatch }}>
        {children}
      </PropertyContext.Provider>
  );
}

export function usePropertyContext() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
}

// Utility function to apply filters and sorting
function applyFiltersAndSort(state: PropertyState): ListingWithState[] {
  let filtered = state.listings.filter(item => {
    if (state.showFavourite && !item.state.isFavourite) return false;
    if (!state.showHidden && item.state.isHidden) return false;
    if (state.showMissingFtg && item.listing.squareFootage !== null) return false;
    if (state.showMissingRoomDimensions && item.listing.rooms && item.listing.rooms.every((room: Room) => room.dimensions !== null)) return false;
    if (state.minSquareFootage && item.listing.squareFootage && item.listing.squareFootage < parseFloat(state.minSquareFootage)) return false;
    if (state.filterDate && item.listing.addedOrReduced && new Date(item.listing.addedOrReduced) < new Date(state.filterDate)) return false;
    if (state.searchTerm && !item.listing.title.toLowerCase().includes(state.searchTerm.toLowerCase())) return false;

    // Apply category filters
    if (Object.values(state.categoryFilters).some(value => value)) {
      return state.categoryFilters[item.listing.category] || false;
    }

    return true;
  });

  if (state.sortCriteria) {
    filtered.sort((a, b) => {
      if (state.sortCriteria === 'date' && a.listing.addedOrReduced && b.listing.addedOrReduced) {
        return new Date(b.listing.addedOrReduced).getTime() - new Date(a.listing.addedOrReduced).getTime();
      } else if (state.sortCriteria === 'squareFootage') {
        return (b.listing.squareFootage || 0) - (a.listing.squareFootage || 0);
      } else if (state.sortCriteria === 'limitingRoomArea' && a.listing.rooms && b.listing.rooms) {
        const aArea = Math.min(...a.listing.rooms.map((room: Room) => room.area || Infinity));
        const bArea = Math.min(...b.listing.rooms.map((room: Room) => room.area || Infinity));
        return bArea - aArea;
      }
      return 0;
    });
  }

  return filtered;
}
