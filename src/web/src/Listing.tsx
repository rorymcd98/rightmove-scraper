import React, { useState } from "react";
import { PropertyListing } from '../../types';
import { StationName, stations } from "../../transport";
import { ListingTag } from "./App";

interface ListingProps {
  listing: PropertyListing;
  isFavourite: boolean;
  addFavourite: (listing: ListingTag) => void;
  removeFavourite: (listing: ListingTag) => void;
  isHidden: boolean;
  addHidden: (listing: ListingTag) => void;
  removeHidden: (listing: ListingTag) => void;
}

const Listing: React.FC<ListingProps> = ({ listing, isFavourite, addFavourite, removeFavourite, isHidden, addHidden, removeHidden }) => {

  const [showAllImages, setShowAllImages] = useState<boolean>(false);


  const listingTag: ListingTag = {
    listingId: listing.listingId,
    site: listing.site,
  }

  const handleFavourite = () => {
    if (isFavourite) {
      removeFavourite(listingTag);
    } else {
      addFavourite(listingTag)
    }
  }

  const handleHidden = () => {

    if (isHidden) {
      removeHidden(listingTag);
    } else {
      addHidden(listingTag)
    }
  }

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
          <button onClick={handleHidden}>{isHidden ? "Unhide" : "Hide"}</button>
          <button onClick={handleFavourite} style={{ marginLeft: '10px' }}>{isFavourite ? "Unfavourite" : "Favourite"}</button>
        </div>
      </div>
    </div >
  );
}

export default Listing;
