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

  // Whether we should include properties with missing square footages while filtering square footages
  const [showMissingFtg, setShowMissingFtg] = useState<boolean>(true);

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

  const hydrateListing = useCallback((listing: PropertyListing) => {
    listing.adDate = listing.adDate ? new Date(listing.adDate) : null;
    listing.site = listing.site ?? "rightmove";
  }, []);

  const filterAndSortData = useCallback(() => {
    let result = originalData.current;

    if (filterDate) {
      const date = new Date(filterDate);
      result = result.filter(item => new Date(item.adDate ?? new Date(0)) > date);
    }

    if (minSquareFootage !== '' && !isNaN(Number(minSquareFootage))) {
      const fallbackFootage = showMissingFtg ? 1000000 : -1;
      result = result.filter(r => (r.squareFootage ?? fallbackFootage) > Number(minSquareFootage));
    }

    result = sortFilteredData(result);
    setFilteredData(result);
  }, [filterDate, minSquareFootage, sortFilteredData, showMissingFtg]);

  useEffect(() => {
    const fetchData = async () => {
      const importedRightmoveData = await (await import('../../../storage/datasets/all-rightmove/000000032.json')).default.listings as PropertyListing[];
      const importedOnTheMarketData = await (await import('../../../storage/datasets/all-onthemarket/000000025.json')).default.listings as PropertyListing[];

      importedRightmoveData.forEach(hydrateListing);
      importedOnTheMarketData.forEach(hydrateListing);

      const importedData = [...importedRightmoveData, ...importedOnTheMarketData];
      originalData.current = importedData;
      filterAndSortData();
    };

    fetchData();
  }, [hydrateListing, filterAndSortData]);

  // Trigger the filter and sort logic when relevant states change
  useEffect(() => {
    filterAndSortData();
  }, [filterDate, minSquareFootage, sortCriteria, showMissingFtg]);

  return (
    <div>
      <button onClick={() => setSortCriteria("date")}>Sort by Date</button>
      <button onClick={() => setSortCriteria("squareFootage")}>Sort by Square Footage</button>
      <button onClick={() => setShowMissingFtg(!showMissingFtg)}>
        {showMissingFtg ? 'Hide' : 'Show'} missing sqFt
      </button>
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
      <button onClick={filterAndSortData}>Apply Filters (Results: {filteredData.length})</button>
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
