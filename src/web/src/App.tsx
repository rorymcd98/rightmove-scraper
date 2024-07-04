import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import Listing from './Listing';
import { PropertyListing } from '../../types';

type SortCriteria = "date" | "squareFootage";

function App() {
  const [filterDate, setFilterDate] = useState('');
  const [minSquareFootage, setMinSquareFootage] = useState<string>('');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria | null>(null);
  const [showFavourite, setShowFavourite] = useState<boolean>(false);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [filteredData, setFilteredData] = useState<PropertyListing[]>([]);

  const originalData = useRef<PropertyListing[]>([]);

  const sortFilteredData = useCallback((data: PropertyListing[]): PropertyListing[] => {
    if (!sortCriteria) return data;

    let sortedData = [...data];
    if (sortCriteria === "squareFootage") {
      sortedData.sort((a, b) => (b.squareFootage || 0) - (a.squareFootage || 0));
    } else if (sortCriteria === "date") {
      sortedData.sort((a, b) => {
        const firstDate = b.adDate ? new Date(b.adDate).getTime() : new Date(0).getTime();
        const secondDate = a.adDate ? new Date(a.adDate).getTime() : new Date(0).getTime();
        return firstDate - secondDate;
      });
    }
    return sortedData;
  }, [sortCriteria]);

  // Filter Function (Memoized)
  const filterData = useCallback(() => {
    let result = originalData.current;

    if (filterDate) {
      const date = new Date(filterDate);
      result = result.filter(item => new Date(item.adDate ?? new Date(0)) > date);
    }

    if (minSquareFootage !== '' && !isNaN(Number(minSquareFootage))) {
      result = result.filter(r => (r.squareFootage ?? -1) > Number(minSquareFootage));
    }

    result = sortFilteredData(result);
    setFilteredData(result);
  }, [filterDate, minSquareFootage, sortFilteredData]);

  // Data Hydration
  const hydrateListing = useCallback((listing: PropertyListing) => {
    listing.adDate = listing.adDate ? new Date(listing.adDate) : null;
    listing.site = listing.site ?? "rightmove";
  }, []);

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      const importedRightmoveData = await (await import('../../../storage/datasets/all-rightmove/000000032.json')).default.listings as PropertyListing[];
      const importedOnTheMarketData = await (await import('../../../storage/datasets/all-onthemarket/000000025.json')).default.listings as PropertyListing[];

      importedRightmoveData.forEach(hydrateListing);
      importedOnTheMarketData.forEach(hydrateListing);

      const importedData = [...importedRightmoveData, ...importedOnTheMarketData];
      originalData.current = importedData;
      setFilteredData(sortFilteredData(importedData)); // Set filteredData with imported data, already sorted if sortCriteria exists
    };

    fetchData();
  }, [hydrateListing, sortFilteredData]);

  return (
    <div>
      <button onClick={() => setSortCriteria("squareFootage")}>Sort by Square Footage</button>
      <button onClick={() => setSortCriteria("date")}>Sort by Date</button>
      <button onClick={() => setShowFavourite(!showFavourite)}>
        {showFavourite ? "Hide favourites" : "Only show favourites"}
      </button>
      <button onClick={() => setShowHidden(!showHidden)}>
        {showHidden ? "Remove hidden" : "Show hidden"}
      </button>
      <input
        type="date"
        placeholder="Dates after: (YYYY-MM-DD)"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
      />
      <input
        type="number"
        placeholder="Enter a minimum square footage"
        value={minSquareFootage}
        onChange={(e) => setMinSquareFootage(e.target.value)}
      />
      <button onClick={filterData}>Apply Filters (Results: {filteredData.length})</button>
      <div style={{ overflowY: 'scroll', maxHeight: '600px' }}>
        {filteredData.map((listing) => (
          <Listing
            key={listing.listingId}
            listing={listing}
            showFavourite={showFavourite}
            showHidden={showHidden}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
