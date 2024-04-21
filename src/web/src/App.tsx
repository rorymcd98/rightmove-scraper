import React, { useEffect, useRef, useState } from 'react'
import './App.css'
import Listing from './Listing' // Import the new Listing component
import { PropertyListing } from '../../types';

function App() {
  const [data, setData] = useState<PropertyListing[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [showFavourite, setShowFavourite] = useState<boolean>(false);
  const [showHidden, setShowHidden] = useState<boolean>(false);

  const originalData = useRef<PropertyListing[]>([]);

  const sortSquareFootage = () => {
    let sortedData = [...originalData.current];
    sortedData.sort((a, b) => (b.squareFootage || 0) - (a.squareFootage || 0));
    setData(sortedData);
  }

  const sortDate = () => {
    let sortedData = [...originalData.current];
    sortedData.sort((a, b) => {
      const firstDate = b.adDate ?? new Date(0);
      const secondDate = a.adDate ?? new Date(0);
      return firstDate.getTime() - secondDate.getTime();
    });
    setData(sortedData);
  }

  const filterBeforeDate = (dateString: string) => {
    const date = new Date(dateString);
    console.log("Here")
    console.log(originalData.current)
    console.log(date)
    const filteredData = originalData.current.filter((item) => {
      return (item.adDate ?? new Date(0)) > date;
    });
    console.log(filteredData)
    setData(filteredData);
  }

  function hydrateListing(listing: PropertyListing){
    listing.adDate = listing.adDate == null ? null : new Date(listing.adDate);
    listing.site = listing.site ?? "rightmove"; // rightmoves were the only ones which were null at some point
  }

  useEffect(() => {
    const fetchData = async () => {
      const importedRightmoveData = await (await import('../../../storage/datasets/all-rightmove/000000006.json')).default.listings as PropertyListing[];
      const importedOnTheMarketData = await (await import('../../../storage/datasets/all-onthemarket/000000001.json')).default.listings as PropertyListing[];
      
      // Re-hydrate
      importedRightmoveData.forEach(hydrateListing);
      importedOnTheMarketData.forEach(hydrateListing);
      
      // Spenny spready
      const importedData = [...importedOnTheMarketData, ...importedRightmoveData];
      originalData.current = importedData;
      setData(importedData);
    };

    fetchData();
  }, []);

  return (
    <div>
      <button onClick={sortSquareFootage}>Sort by Square Footage</button>
      <button onClick={sortDate}>Sort by Date</button>
      <button onClick={() => {setShowFavourite(!showFavourite)}}>{showFavourite ? "Hide favourites" : "Only show favourites"}</button>
      <button onClick={() => {setShowHidden(!showHidden)}}>{showHidden ? "Remove hidden" : "Show hidden"}</button>
      <input
        type="text"
        placeholder="Enter date (YYYY-MM-DD)"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
      />
      <button onClick={() => filterBeforeDate(filterDate)}>Filter Before Date</button>
      <div style={{overflowY: 'scroll', maxHeight: '600px'}}>
        {data.map((listing) => (
          <Listing key={listing.listingId} listing={listing} showFavourite={showFavourite} showHidden={showHidden} />
        ))}
      </div>
    </div>
  )
}

export default App
