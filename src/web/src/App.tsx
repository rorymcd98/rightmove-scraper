import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import Listing from './Listing';
import { LineName, PropertyListing, RightmoveListing } from '../../types';
import { stations } from '../../transport';

type SortCriteria = "date" | "squareFootage";
type LineNameMap = Map<LineName, number>;

// If there is a station with a defined name
// If that station is on a line included in a positive (valid) filter
// If the distance on the filter exceeds the actual distance
// We found a match - show the property!
function filterDataByDistances(filter: LineNameMap, data: PropertyListing[]): PropertyListing[] {
  const posStationFilters: LineNameMap = new Map();
  for (const entry of filter.entries()) {
    if (entry[1] > 0) {
      posStationFilters.set(entry[0], entry[1]);
    }
  }

  if (posStationFilters.size === 0) {
    return data;
  }

  return data.filter(property => {
    if (!property.nearestStations) return false;
    return property.nearestStations.some(station => {
      if (!station.stationName) return false;
      const lines = stations[station.stationName];
      return lines.some(line => {
        const distance = posStationFilters.get(line); // Use posStationFilters instead of filter
        if (distance === undefined) return false;
        if (station.distanceMiles >= 0 && distance >= station.distanceMiles) {
          return true;
        }
        return false;
      });
    });
  });
}


function App() {
  const [filterDate, setFilterDate] = useState(() => localStorage.getItem('filterDate') || '');
  const [minSquareFootage, setMinSquareFootage] = useState<string>(() => localStorage.getItem('minSquareFootage') || '');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria | null>(() => localStorage.getItem('sortCriteria') as SortCriteria || null);
  const [showFavourite, setShowFavourite] = useState<boolean>(() => JSON.parse(localStorage.getItem('showFavourite') || 'false'));
  const [showHidden, setShowHidden] = useState<boolean>(() => JSON.parse(localStorage.getItem('showHidden') || 'false'));
  const [filteredData, setFilteredData] = useState<PropertyListing[]>([]);
  const [showMissingFtg, setShowMissingFtg] = useState<boolean>(() => JSON.parse(localStorage.getItem('showMissingFtg') || 'true'));
  const [stationDistanceFilters, setStationDistanceFilters] = useState<LineNameMap>(() => {
    const savedFilters = localStorage.getItem('stationDistanceFilters');
    if (savedFilters) {
      return new Map(JSON.parse(savedFilters));
    }
    return new Map([
      ["Bakerloo", 0],
      ["Central", 0],
      ["Circle", 0],
      ["District", 0],
      ["Hammersmith City", 0],
      ["Jubilee", 0],
      ["Metropolitan", 0],
      ["Northern", 0],
      ["Piccadilly", 0],
      ["Victoria", 0],
      ["Waterloo City", 0],
    ]);
  });
  const [showStationDropdown, setShowStationDropdown] = useState<boolean>(false);

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
    let data = originalData.current;

    data = filterDataByDistances(stationDistanceFilters, data);

    if (filterDate) {
      const date = new Date(filterDate);
      data = data.filter(item => new Date(item.adDate ?? new Date(0)) > date);
    }

    if (minSquareFootage !== '' && !isNaN(Number(minSquareFootage))) {
      const fallbackFootage = showMissingFtg ? 1000000 : -1;
      data = data.filter(r => (r.squareFootage ?? fallbackFootage) > Number(minSquareFootage));
    }

    data = sortFilteredData(data);
    setFilteredData(data);
    setCurrentPage(1); // Reset to the first page after filtering
  }, [filterDate, minSquareFootage, sortFilteredData, showMissingFtg, stationDistanceFilters]);

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

  useEffect(() => {
    localStorage.setItem('stationDistanceFilters', JSON.stringify(Array.from(stationDistanceFilters.entries())));
  }, [stationDistanceFilters]);

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

  const handleInputChange = (lineName: LineName, value: string) => {
    const newValue = Math.min(Math.max(parseFloat(value), 0), 1);

    const oldValue = stationDistanceFilters.get(lineName);
    if (oldValue == newValue) return;

    const newFilters = new Map(stationDistanceFilters);
    newFilters.set(lineName, newValue);
    setStationDistanceFilters(newFilters);
  };

  return (
    <>
      <div style={{ display: "inline-flex", flexDirection: "row", width: "100%", justifyContent: "space-around" }}>
        <div>
          <button onClick={() => setShowStationDropdown(!showStationDropdown)}>
            {showStationDropdown ? "Hide stations" : "Show stations"}
          </button>
          {showStationDropdown &&
            <div style={{ position: "fixed", display: "flex", flexDirection: "column", textAlign: "left", backgroundColor: "gray", padding: "5px" }}>
              {[...stationDistanceFilters.entries()].map(([lineName, distance]) => (
                <div key={lineName} style={{ display: "flex", alignItems: "center", margin: "5px 0", opacity: distance > 0 ? "100%" : "20%" }}>
                  <span style={{ flexGrow: 1 }}>{lineName.slice(0, 12).trim()}:</span>
                  <input
                    style={{ marginLeft: '5px', width: "3rem" }}
                    type="number"
                    value={distance}
                    onChange={(e) => handleInputChange(lineName, e.target.value)}
                    step="0.1"
                  />
                </div>
              ))}
            </div>
          }
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
        <div style={{ overflowY: 'scroll' }}>
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
