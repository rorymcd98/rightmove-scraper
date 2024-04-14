export type Tenure = "freehold" | "leasehold" | "sharehold" | "none" | "other";

export interface ListingDebug{
  footageResolution: "listed" | "in-text" | "gpt-image" | "unresolved";
}

export interface RightmoveListing {
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
  debug: ListingDebug
}

export type IndexPage = {
  url: string | null;
  dateFound: Date;
  listingUrls: string[];
};
