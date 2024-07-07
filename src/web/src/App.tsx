import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import Listing from './Listing';
import { LineName, PropertyListing, RightmoveListing } from '../../types';
import { StationName } from '../../transport';

type SortCriteria = "date" | "squareFootage";

function App() {
  const [filterDate, setFilterDate] = useState(() => localStorage.getItem('filterDate') || '');
  const [minSquareFootage, setMinSquareFootage] = useState<string>(() => localStorage.getItem('minSquareFootage') || '');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria | null>(() => localStorage.getItem('sortCriteria') as SortCriteria || null);
  const [showFavourite, setShowFavourite] = useState<boolean>(() => JSON.parse(localStorage.getItem('showFavourite') || 'false'));
  const [showHidden, setShowHidden] = useState<boolean>(() => JSON.parse(localStorage.getItem('showHidden') || 'false'));
  const [filteredData, setFilteredData] = useState<PropertyListing[]>([]);
  const [showMissingFtg, setShowMissingFtg] = useState<boolean>(() => JSON.parse(localStorage.getItem('showMissingFtg') || 'true'));
  const [stationDistanceFilters, setStationDistanceFilters] = useState<Record<LineName, Number>>({
    "Bakerloo": -1,
    "Central": -1,
    "Circle": -1,
    "District": -1,
    "Hammersmith City": -1,
    "Jubilee": -1,
    "Metropolitan": -1,
    "Northern": -1,
    "Piccadilly": -1,
    "Victoria": -1,
    "Waterloo City": -1,
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

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
    setCurrentPage(1); // Reset to the first page after filtering
  }, [filterDate, minSquareFootage, sortFilteredData, showMissingFtg]);

  useEffect(() => {
    const fetchData = async () => {
      // const importedRightmoveData = await (await import('../../../storage/datasets/all-rightmove/000000033.json')).default.listings as PropertyListing[];
      const importedRightmoveData = [] as unknown as RightmoveListing[];
      const importedOnTheMarketData = await (await import('../../../storage/datasets/all-onthemarket/000000001.json')).default.listings as unknown as PropertyListing[];

      importedRightmoveData.forEach(hydrateListing);
      importedOnTheMarketData.forEach(hydrateListing);

      const importedData = [...importedRightmoveData, ...importedOnTheMarketData];
      originalData.current = importedData;
      filterAndSortData();
    };

    fetchData();
  }, [hydrateListing, filterAndSortData]);

  useEffect(() => {
    filterAndSortData();
  }, [filterDate, minSquareFootage, sortCriteria, showMissingFtg]);

  useEffect(() => {
    localStorage.setItem('filterDate', filterDate);
  }, [filterDate]);

  useEffect(() => {
    localStorage.setItem('minSquareFootage', minSquareFootage);
  }, [minSquareFootage]);

  useEffect(() => {
    localStorage.setItem('sortCriteria', sortCriteria || '');
  }, [sortCriteria]);

  useEffect(() => {
    localStorage.setItem('showFavourite', JSON.stringify(showFavourite));
  }, [showFavourite]);

  useEffect(() => {
    localStorage.setItem('showHidden', JSON.stringify(showHidden));
  }, [showHidden]);

  useEffect(() => {
    localStorage.setItem('showMissingFtg', JSON.stringify(showMissingFtg));
  }, [showMissingFtg]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(filteredData.length / itemsPerPage)) {
      setCurrentPage(newPage);
    }
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const childItemStyle = {
    backgroundColor: 'rgb(200, 200, 200)',
    borderRadius: '10px',
    margin: '5px',
  };

  return (
    <>
      <div style={{ display: "inline-flex", flexDirection: "row", width: "100%", justifyContent: "space-around" }}>
        <div>
          <label htmlFor="sortDropdown">Sort by: </label>
          <select
            id="sortDropdown"
            onChange={(e) => setSortCriteria(e.target.value as SortCriteria)}
            value={sortCriteria ?? ''}
          >
            <option value="" disabled>Select Sorting</option>
            <option value="date">Date</option>
            <option value="squareFootage">Square Footage</option>
          </select>
        </div>
        <div style={{ "display": "flex", flexDirection: "column", textAlign: "left" }}>
          <label>
            <input
              type="checkbox"
              checked={!showMissingFtg}
              onChange={() => setShowMissingFtg(!showMissingFtg)}
            />
            Hide missing square footage
          </label>
          <label>
            <input
              type="checkbox"
              checked={showFavourite}
              onChange={() => setShowFavourite(!showFavourite)}
            />
            Only show favourites
          </label>
          <label>
            <input
              type="checkbox"
              checked={showHidden}
              onChange={() => setShowHidden(!showHidden)}
            />
            Show hidden
          </label>
        </div>
        <div>
          <label htmlFor="filterDate">Filter after: </label>
          <input
            id="filterDate"
            type="date"
            placeholder="Dates after: (YYYY-MM-DD)"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div>
          <input
            type="number"
            placeholder="Enter a minimum square footage"
            value={minSquareFootage}
            onChange={(e) => setMinSquareFootage(e.target.value)}
          />
        </div>
        <button onClick={filterAndSortData}>Apply Filters (Results: {filteredData.length})</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
        <span style={{ margin: '0 10px' }}>Page {currentPage} of {totalPages}</span>
        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      </div>
      <div>
        <div style={{ overflowY: 'scroll', maxHeight: '600px' }}>
          {paginatedData.map((listing) => (
            <Listing
              key={listing.listingId}
              listing={listing}
              showFavourite={showFavourite}
              showHidden={showHidden}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
