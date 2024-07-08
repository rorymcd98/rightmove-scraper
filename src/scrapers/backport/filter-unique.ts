import { Dataset } from "crawlee";
import { OnTheMarketListing, PropertyListing, RightmoveListing } from "../../types";

export function filterUnique<TPropertyListing extends PropertyListing>(listings: TPropertyListing[]) {
    const seenBefore = new Set<number>();
    listings = listings.filter(x => {
        const seen = seenBefore.has(x.listingId);
        seenBefore.add(x.listingId);
        return !seen;
    })
    return listings;
}

async function MainRightmoveAsync() {
    const allOldDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    const allOld = await allOldDataset.getData();
    await allOldDataset.drop();

    const unique = filterUnique(allOld.items.flatMap(x => x.listings));

    const allNewDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    await allNewDataset.pushData({ listings: unique });
}


// MainRightmoveAsync();

async function MainOnTheMarket() {
    const allOldDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket");
    const allOld = await allOldDataset.getData();
    await allOldDataset.drop();

    const unique = filterUnique(allOld.items.flatMap(x => x.listings));

    const allNewDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket");
    await allNewDataset.pushData({ listings: unique });
}


// MainOnTheMarket();