import React, { useState, useEffect } from "react";
import { PropertyListing } from '../../types';
import { StationName, stations } from "../../transport";

interface ListingProps {
  listing: PropertyListing;
  showHidden: boolean;
  showFavourite: boolean;
}

const Listing: React.FC<ListingProps> = ({ listing, showHidden, showFavourite }) => {

  const [favourite, setFavourite] = useState<boolean>(false);
  const [hide, setHide] = useState<boolean>(false);
  const [showAllImages, setShowAllImages] = useState<boolean>(false);

  useEffect(() => {
    if (localStorage.getItem('favouriteListings')) {
      let favouriteListings = JSON.parse(localStorage.getItem('favouriteListings') || '[]');
      setFavourite(favouriteListings.includes(listing.listingId));
    }
    if (localStorage.getItem('hiddenListings')) {
      let hiddenListings = JSON.parse(localStorage.getItem('hiddenListings') || '[]');
      setHide(hiddenListings.includes(listing.listingId));
    }
  }, [listing.listingId]);

  const handleFavourite = () => {
    let favouriteListings = JSON.parse(localStorage.getItem('favouriteListings') || '[]');

    if (favourite) {
      setFavourite(false);
      favouriteListings.splice(favouriteListings.indexOf(listing.listingId), 1);
    } else {
      setFavourite(true);
      favouriteListings.push(listing.listingId);
    }

    localStorage.setItem('favouriteListings', JSON.stringify(favouriteListings));
  }

  const handleHide = () => {
    let hiddenListings = JSON.parse(localStorage.getItem('hiddenListings') || '[]');

    if (hide) {
      setHide(false);
      hiddenListings.splice(hiddenListings.indexOf(listing.listingId), 1);
    } else {
      setHide(true);
      hiddenListings.push(listing.listingId);
    }

    localStorage.setItem('hiddenListings', JSON.stringify(hiddenListings));
  }

  if ((hide && !showHidden) || (!favourite && showFavourite)) return null;

  const baseLimit = 5;
  const imagesLimit = showAllImages ? 100 : baseLimit;

  return (
    <div style={{ border: '1px solid #ddd', margin: '10px', padding: '10px' }}>
      <h2>{listing.title}</h2>
      <div style={{ display: 'flex', overflowX: 'auto', maxHeight: '200px', alignItems: "center", overflowY: "hidden" }}>
        {listing.imageUrls.slice(0, imagesLimit).map((imageUrl, index) =>
          <img key={index} src={imageUrl} alt="listing" style={{ maxHeight: '200px', marginRight: '10px' }} />
        )}
        {listing.imageUrls.length > baseLimit && !showAllImages &&
          <button style={{ background: "gray", border: "solid black 1px", borderRadius: "50%", padding: "2px" }} onClick={() => setShowAllImages(true)}>+</button>
        }
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', marginTop: '10px' }}>
        <div style={{ paddingRight: '10px' }}>
          <p>Square Footage: {listing.squareFootage}</p>
          <p>Price: {Number(listing.price).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}</p>
          <p>Tenure: {listing.tenure}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p>Date: {listing.adDate?.toLocaleDateString()}</p>
          <p>Site: {listing.site}</p>
          <a href={listing.url} target="_blank" rel="noopener noreferrer">View More</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
          {listing.nearestStations?.filter(x => x != null && x.stationName != null).map(x => (
            <div>
              {x.stationName} ({x.distanceMiles}mi.):  {stations[x.stationName as StationName]?.join(", ")}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", textAlign: 'right', paddingLeft: '10px' }}>
          <button onClick={handleHide}>{hide ? "Unhide" : "Hide"}</button>
          <button onClick={handleFavourite} style={{ marginLeft: '10px' }}>{favourite ? "Unfavourite" : "Favourite"}</button>
        </div>
      </div>
    </div >
  );
}

export default Listing;
