import currentCategory from "../../set-category";
import { StationName } from "../../transport";

export type Tenure = "freehold" | "leasehold" | "share of freehold" | "shared ownership" | "none" | "other";

export interface ListingDebug {
  footageResolution: "listed" | "in-text" | "gpt-image" | "unresolved";
}

export type RoomDimension = [number, number];

export enum Site {
  Rightmove = 'Rightmove',
  Zoopla = 'Zoopla',
  OnTheMarket = 'OnTheMarket'
  // Add other sites as needed
}

export type Room = {
  dimensions: string | null;
  area: number | null;
};

export interface PropertyListing {
  listingId: string;
  url: string;
  compositeKey: string;
  categories: string[];
  title: string;
  description: string | null;
  location: string | null;
  price: number;
  adDate: Date | null;
  squareFootage: number | null;
  roomDimensions: RoomDimension[] | null;
  tenure: Tenure;
  imageUrls: string[];
  debug: ListingDebug;
  category: string;
  site: Site;
  nearestStations: NearestStation[] | null;
  addedOrReduced: string;
  rooms: Room[];
}

export type NearestStation = {
  stationName: StationName | null;
  distanceMiles: number;
  rawText: string;
}

export interface RightmoveListing extends PropertyListing {
  site: Site.Rightmove;
}

export interface ZooplaListing extends PropertyListing {
  site: Site.Zoopla;
}

export interface OnTheMarketListing extends PropertyListing {
  site: Site.OnTheMarket;
}

export type IndexedListing = {
  listingId: string,
  category: string,
  compositeKey: string,
  listingDate: Date | undefined,
}

export type IndexPage = {
  url: string | null;
  dateFound: Date;
  category: string;
  listings: IndexedListing[];
};

export type LineName =
  "Thames" |
  "Piccadilly" |
  "Metropolitan" |
  "Circle" |
  "Hammersmith City" |
  "Northern" |
  "Bakerloo" |
  "Jubilee" |
  "Waterloo City" |
  "Central" |
  "Victoria" |
  "District" |
  "Elizabeth" |
  "Overground";
