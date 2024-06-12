import React, { useEffect, useRef, useState } from 'react'
import './App.css'
import Listing from './Listing' // Import the new Listing component
import { PropertyListing } from '../../types';

function App() {
  const [filterDate, setFilterDate] = useState('');
  const [minSquareFootage, setMinSquareFootage] = useState<number | null>(null);
  const [showFavourite, setShowFavourite] = useState<boolean>(false);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [filteredData, setFilteredData] = useState<PropertyListing[]>([]);

  const originalData = useRef<PropertyListing[]>([]);

  const sortBySquareFootage = () => {
    let sortedData = [...filteredData];
    sortedData.sort((a, b) => (b.squareFootage || 0) - (a.squareFootage || 0));
    setFilteredData(sortedData);
  }

  const sortByDate = () => {
    let sortedData = [...filteredData];
    sortedData.sort((a, b) => {
      const firstDate = b.adDate ? new Date(b.adDate).getTime() : new Date(0).getTime();
      const secondDate = a.adDate ? new Date(a.adDate).getTime() : new Date(0).getTime();
      return firstDate - secondDate;
    });
    setFilteredData(sortedData);
  }

  const filterData = () => {
    let result = originalData.current;

    if (filterDate) {
      const date = new Date(filterDate);
      result = result.filter(item => item.adDate ?? new Date(0) > date);
    }

    if (minSquareFootage != null && minSquareFootage > 0) {
      result = result.filter(r => (r.squareFootage ?? -1) > minSquareFootage);
    }

    setFilteredData(result);
  }

  function hydrateListing(listing: PropertyListing) {
    listing.adDate = listing.adDate ? new Date(listing.adDate) : null;
    listing.site = listing.site ?? "rightmove";
  }

  useEffect(() => {
    const fetchData = async () => {
      const importedRightmoveData = await (await import('../../../storage/datasets/all-rightmove/000000023.json')).default.listings as PropertyListing[];
      const importedOnTheMarketData = await (await import('../../../storage/datasets/all-onthemarket/000000016.json')).default.listings as PropertyListing[];

      importedRightmoveData.forEach(hydrateListing);
      importedOnTheMarketData.forEach(hydrateListing);

      const importedData = [...importedOnTheMarketData, ...importedRightmoveData];
      originalData.current = importedData;
      setFilteredData(importedData); // Set filteredData with imported data
    };

    fetchData();
  }, []);

  return (
    <div>
      <button onClick={sortBySquareFootage}>Sort by Square Footage</button>
      <button onClick={sortByDate}>Sort by Date</button>
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
        value={minSquareFootage?.toString() ?? ""}
        onChange={(e) => setMinSquareFootage(parseInt(e.target.value) == 0 ? null : Number(e.target.value))}
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
  )
}

export default App
