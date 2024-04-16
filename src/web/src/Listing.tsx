import React, { useState, useEffect } from "react";
import { RightmoveListing } from '../../types';
interface ListingProps {
  listing: RightmoveListing;
  showHidden: boolean;
  showFavourite: boolean;
}

const Listing: React.FC<ListingProps> = ({ listing, showHidden, showFavourite }) => {

  //create states for the buttons
  const [favourite, setFavourite] = useState<boolean>(false);
  const [hide, setHide] = useState<boolean>(false);

  // check if listing is already in local storage
  useEffect(() => {
    if(localStorage.getItem('favouriteListings')) {
      let favouriteListings = JSON.parse(localStorage.getItem('favouriteListings') || '[]');
      setFavourite(favouriteListings.includes(listing.listingId));
    }
    if(localStorage.getItem('hiddenListings')) {
      let hiddenListings = JSON.parse(localStorage.getItem('hiddenListings') || '[]');
      setHide(hiddenListings.includes(listing.listingId));
    }
  }, [listing.listingId]);

  const handleFavourite = () => {
    let favouriteListings = JSON.parse(localStorage.getItem('favouriteListings') || '[]');

    //add or remove listing to/from favourites
    if(favourite) {
      setFavourite(false);
      favouriteListings.splice(favouriteListings.indexOf(listing.listingId), 1);
    } else {
      setFavourite(true);
      favouriteListings.push(listing.listingId);
    }

    //save the changes in local storage
    localStorage.setItem('favouriteListings', JSON.stringify(favouriteListings));
  }

  const handleHide = () => {
    let hiddenListings = JSON.parse(localStorage.getItem('hiddenListings') || '[]');

    //add or remove listing to/from hidden
    if(hide) {
      setHide(false);
      hiddenListings.splice(hiddenListings.indexOf(listing.listingId), 1);
    } else {
      setHide(true);
      hiddenListings.push(listing.listingId);
    }

    //save the changes in local storage
    localStorage.setItem('hiddenListings', JSON.stringify(hiddenListings));
  }

  //hide the listing from view
  if((hide && !showHidden) || (!favourite && showFavourite)) return null;

  return <div style={{border: '1px solid #ddd', margin: '10px', padding: '10px'}}>
  <h2>{listing.title}</h2>
  <div style={{display: 'flex', overflowX: 'auto', maxHeight: '200px'}}>
    {listing.imageUrls.map((imageUrl, index) =>
      <img key={index} src={imageUrl} alt="listing" style={{maxHeight: '200px', marginRight: '10px'}}/>
    )}
  </div>
  <div style={{display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center"}}>
    <span>
      <p>{listing.location}</p>
      <p>{listing.description}</p>
      <p>Square Footage:{listing.squareFootage}</p>
      <p>Price: {Number(listing.price).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}</p>
      <p>Tenure: {listing.tenure}</p>
      <a href={listing.url} target="_blank" rel="noopener noreferrer">View more</a>
    </span>
    <span>
      <button onClick={handleHide}>{hide ? "Unhide" : "Hide"}</button>
      <button onClick={handleFavourite}>{favourite ? "Unfavourite" : "Favourite"}</button>
    </span>
  </div>
</div>
}

export default Listing;
