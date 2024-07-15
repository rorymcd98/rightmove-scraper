import { Dataset } from "crawlee";
import { OnTheMarketListing, RightmoveListing, ZooplaListing } from "../../types";

export type ListingIdDataset = {
    listingIds: number[]
}

async function MainRightmoveAsync() {
    const allOldDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    const allListingIds = (await allOldDataset.getData()).items.flatMap(x => x.listings).map(x => x.listingId);
    const searchDataSet = await Dataset.open<ListingIdDataset>("search-rightmove-general");
    await searchDataSet.pushData({ listingIds: allListingIds });
}

async function MainOnTheMarketAsync() {
    const allOldDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket");
    const allListingIds = (await allOldDataset.getData()).items.flatMap(x => x.listings).map(x => x.listingId);
    const searchDataSet = await Dataset.open<ListingIdDataset>("search-onthemarket-general");
    await searchDataSet.pushData({ listingIds: allListingIds });
}

async function MainZooplaAsync() {
    const allOldDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    const allListingIds = (await allOldDataset.getData()).items.flatMap(x => x.listings).map(x => x.listingId);
    const searchDataSet = await Dataset.open<ListingIdDataset>("search-zoopla-general");
    await searchDataSet.pushData({ listingIds: allListingIds });
}

// MainRightmoveAsync();
// MainOnTheMarketAsync();
// MainZooplaAsync();