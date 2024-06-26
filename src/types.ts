export type Tenure = "freehold" | "leasehold" | "share of freehold" | "shared ownership" | "none" | "other";

export interface ListingDebug{
  footageResolution: "listed" | "in-text" | "gpt-image" | "unresolved";
}

export type Sites = "rightmove" | "onthemarket" | "zoopla";

export interface PropertyListing {
  listingId: number; // also in URL
  url: string;
  title: string;
  description: string | null;
  location: string | null;
  price: number;
  adDate: Date | null;
  squareFootage: number | null;
  tenure: Tenure;
  imageUrls: string[];
  debug: ListingDebug;
  site: Sites | null;
}

export interface RightmoveListing extends PropertyListing {
  site: "rightmove";
}

export interface ZooplaListing extends PropertyListing {
  site: "zoopla";
}

export interface OnTheMarketListing extends PropertyListing {
  site: "onthemarket";
}


export type IndexedListing = {
  listingId: string,
  listingDate: Date | undefined,
}

export type IndexPage = {
  url: string | null;
  dateFound: Date;
  listings: IndexedListing[];
};
