import { PropertyListing } from "../types";

export function filterUnique<TPropertyListing extends PropertyListing>(listings: TPropertyListing[]) {
    const seenBefore = new Set<number>();
    listings = listings.filter(x => {
        const seen = seenBefore.has(x.listingId);
        seenBefore.add(x.listingId);
        return !seen;
    })
    return listings;
}