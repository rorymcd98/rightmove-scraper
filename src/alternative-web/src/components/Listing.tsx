// @@filename: src/components/Listing.tsx
import React, { useState, useCallback } from "react";
import { usePropertyContext } from '../context/PropertyContext';
import { ListingWithState, ListingTag } from '../context/PropertyContext';
import ImageGallery from './ImageGallery';

interface ListingProps {
  listingWithState: ListingWithState;
}

const formatRoomDimensions = (roomDimensions: number[][]): string => {
  return roomDimensions.map(x => `${x[0].toFixed(1)}m x ${x[1].toFixed(1)}m`).join(", ");
};

const Listing: React.FC<ListingProps> = React.memo(({ listingWithState }) => {
  const { dispatch } = usePropertyContext();
  const [showDetails, setShowDetails] = useState<boolean>(true);

  const { listing, state } = listingWithState;
  const { isHidden, isFavourite } = state;

  const listingTag: ListingTag = {
    listingId: listing.listingId,
    site: listing.site,
  };

  const handleFavourite = useCallback(() => {
    dispatch({ type: 'TOGGLE_FAVOURITE', payload: listingTag });
  }, [dispatch, listingTag]);

  const handleHidden = useCallback(() => {
    dispatch({ type: 'TOGGLE_HIDDEN', payload: listingTag });
  }, [dispatch, listingTag]);

  const toggleDetails = useCallback(() => {
    setShowDetails(!showDetails);
  }, [showDetails]);

  return (
      <div className="listing" role="article">
        <h2 onClick={toggleDetails} tabIndex={0} role="button" aria-expanded={showDetails}>
          {listing.title} - {listing.tenure}
        </h2>
        <ImageGallery images={listing.imageUrls} />
        <div className="listing-details">
          <p><strong>Price:</strong> {Number(listing.price).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}</p>
          {showDetails && (
              <>
                <p><strong>Square Footage:</strong> {listing.squareFootage || 'N/A'}</p>
                {listing.roomDimensions && (
                    <p><strong>Rooms:</strong> {formatRoomDimensions(listing.roomDimensions)}</p>
                )}
                <p><strong>Date:</strong> {listing.adDate?.toLocaleDateString()}</p>
                <p><strong>Location:</strong> {listing.location}</p>
                <p><strong>Category:</strong> {listing.category}</p>
                <a href={listing.url} target="_blank" rel="noopener noreferrer">View More</a>
              </>
          )}
          <div className="listing-actions">
            <button onClick={handleHidden} aria-pressed={isHidden}>
              {isHidden ? "Unhide" : "Hide"}
            </button>
            <button onClick={handleFavourite} aria-pressed={isFavourite}>
              {isFavourite ? "Unfavourite" : "Favourite"}
            </button>
          </div>
        </div>
      </div>
  );
});

export default Listing;
