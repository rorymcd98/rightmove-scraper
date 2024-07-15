import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import Listing from './Listing';
import { LineName, PropertyListing, Site } from '../../types';
import { stations } from '../../transport';

type SortCriteria = "date" | "squareFootage";
type LineNameMap = Map<LineName, number>;
export type ListingTag = {
  listingId: number,
  site: Site,
};

type ListingWithState = {
  listing: PropertyListing,
  state: {
    isHidden: boolean,
    isFavourite: boolean,
  }
}

// If there is a station with a defined name
// If that station is on a line included in a positive (valid) filter
// If the distance on the filter exceeds the actual distance
// We found a match - show the property!
function filterDataByDistances(filter: LineNameMap, data: ListingWithState[]): ListingWithState[] {
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
    if (!property.listing.nearestStations) return false;
    return property.listing.nearestStations.some(station => {
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
  const [filteredData, setFilteredData] = useState<ListingWithState[]>([]);
  const [showMissingFtg, setShowMissingFtg] = useState<boolean>(() => JSON.parse(localStorage.getItem('showMissingFtg') || 'true'));
  const [hidden, setHidden] = useState<ListingTag[]>(() => JSON.parse(localStorage.getItem('hiddenListings') || '[]'));
  useEffect(() => {
    localStorage.setItem('hiddenListings', JSON.stringify(hidden));
  }, [hidden]);
  const addHidden = (listing: ListingTag) => {
    if (!hidden.some(x => x.listingId == listing.listingId && x.site == listing.site)) {
      const newHidden = [...hidden, listing];
      setHidden(newHidden);
    }
  };
  const removeHidden = (listing: ListingTag) => {
    if (hidden.some(x => x.listingId == listing.listingId && x.site == listing.site)) {
      const newHidden = hidden.filter(item => !(item.site == listing.site && item.listingId == listing.listingId));
      setHidden(newHidden);
    }
  };

  const [favourites, setFavourite] = useState<ListingTag[]>(() => JSON.parse(localStorage.getItem('favouriteListings') || '[]'));
  useEffect(() => {
    localStorage.setItem('favouriteListings', JSON.stringify(favourites));
  }, [favourites]);
  const addFavourite = (listing: ListingTag) => {
    if (!favourites.some(x => x.listingId == listing.listingId && x.site == listing.site)) {
      const newFavourite = [...favourites, listing];
      setFavourite(newFavourite);
    }
  };
  const removeFavourite = (listing: ListingTag) => {
    if (favourites.some(x => x.listingId == listing.listingId && x.site == listing.site)) {
      const newFavourite = favourites.filter(item => !(item.site == listing.site && item.listingId == listing.listingId));
      setFavourite(newFavourite);
    }
  };

  const [stationDistanceFilters, setStationDistanceFilters] = useState<LineNameMap>(() => {
    const savedFilters = localStorage.getItem('stationDistanceFilters');
    if (savedFilters) {
      return new Map(JSON.parse(savedFilters));
    }
    return new Map<LineName, number>([
      ["Jubilee", 0],
      ["Elizabeth", 0],
      ["Central", 0],
      ["Metropolitan", 0],
      ["Circle", 0],
      ["Hammersmith City", 0],
      ["Thames", 0],
      ["Northern", 0],
      ["Victoria", 0],
      ["Bakerloo", 0],
      ["District", 0],
      ["Piccadilly", 0],
      ["Waterloo City", 0],
    ]);
  });
  const [showStationDropdown, setShowStationDropdown] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const originalData = useRef<ListingWithState[]>([]);

  const sortFilteredData = useCallback((data: ListingWithState[]): ListingWithState[] => {
    if (!sortCriteria) return data;

    let sortedData = [...data];
    if (sortCriteria === "squareFootage") {
      sortedData.sort((a, b) => (b.listing.squareFootage || 0) - (a.listing.squareFootage || 0));
    } else if (sortCriteria === "date") {
      sortedData.sort((a, b) => {
        const firstDate = b.listing.adDate ? new Date(b.listing.adDate).getTime() : new Date(0).getTime();
        const secondDate = a.listing.adDate ? new Date(a.listing.adDate).getTime() : new Date(0).getTime();
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
      data = data.filter(item => new Date(item.listing.adDate ?? new Date(0)) > date);
    }

    if (minSquareFootage !== '' && !isNaN(Number(minSquareFootage))) {
      const fallbackFootage = showMissingFtg ? 1000000 : -1;
      data = data.filter(r => (r.listing.squareFootage ?? fallbackFootage) > Number(minSquareFootage));
    }

    data = data.filter(x => {
      const listing = x.listing;
      const isHidden = hidden.some(x => x.listingId == listing.listingId && x.site == listing.site);
      const isFavourite = favourites.some(x => x.listingId == listing.listingId && x.site == listing.site);
      x.state.isHidden = isHidden;
      x.state.isFavourite = isFavourite;
      if (isHidden && !showHidden) return false;
      if (!isFavourite && showFavourite) return false;
      return true;
    })

    data = sortFilteredData(data);
    setFilteredData(data);
    setCurrentPage(1); // Reset to the first page after filtering
  }, [filterDate, minSquareFootage, sortFilteredData, showMissingFtg, stationDistanceFilters, hidden, favourites, showFavourite, showHidden]);

  useEffect(() => {
    const fetchData = async () => {
      const importedRightmoveData = (await import('../../../storage/datasets/current-rightmove/000000001.json')).default.listings as unknown as PropertyListing[];
      const importedOnTheMarketData = (await import('../../../storage/datasets/current-onthemarket/000000001.json')).default.listings as unknown as PropertyListing[];
      const importedZooplaData = (await import('../../../storage/datasets/current-zoopla/000000001.json')).default.listings as unknown as PropertyListing[];

      importedRightmoveData.forEach(hydrateListing);
      importedOnTheMarketData.forEach(hydrateListing);
      importedZooplaData.forEach(hydrateListing);

      const importedData: ListingWithState[] = [...importedRightmoveData, ...importedOnTheMarketData, ...importedZooplaData].map(x => { return { listing: x, state: { isHidden: false, isFavourite: true } } });
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

  const paginator = <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
    <span style={{ margin: '0 10px' }}>Page {currentPage} of {totalPages}</span>
    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
  </div>

  const minSquareFootageSet = !(minSquareFootage == null || minSquareFootage == "0" || Number(minSquareFootage) <= 0);

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
        <div style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="number"
            placeholder="Enter a minimum square footage"
            value={minSquareFootage}
            onChange={(e) => setMinSquareFootage(e.target.value)}
          />
          <label style={{ opacity: minSquareFootageSet ? "100%" : "20%" }}>
            <input
              disabled={!minSquareFootageSet}
              type="checkbox"
              checked={!showMissingFtg}
              onChange={() => setShowMissingFtg(!showMissingFtg)}
            />
            Hide missing square footage
          </label>
        </div>
        <button onClick={filterAndSortData}>Apply Filters (Results: {filteredData.length})</button>
      </div>
      <div>
        {paginator}
        <div style={{ overflowY: 'hidden' }}>
          {paginatedData.map((listingWithState) => {
            const listing = listingWithState.listing;
            const isHidden = listingWithState.state.isHidden;
            const isFavourite = listingWithState.state.isFavourite;
            // Redundant checks but 
            if (isHidden && !showHidden) {
              return;
            }
            if (!isFavourite && showFavourite) {
              return;
            }
            return <Listing
              key={`${listing.site}${listing.listingId}`}
              listing={listing}
              isHidden={isHidden}
              addHidden={addHidden}
              removeHidden={removeHidden}
              isFavourite={isFavourite}
              addFavourite={addFavourite}
              removeFavourite={removeFavourite}
            />
          }
          )}
        </div>
        {paginator}
      </div>
    </>
  );
}

export default App;
