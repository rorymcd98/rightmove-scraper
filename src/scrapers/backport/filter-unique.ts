import { Dataset } from "crawlee";
import { OnTheMarketListing, PropertyListing, RightmoveListing, ZooplaListing } from "../../types";

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


function filterImages(listings: ZooplaListing[]) {
    return listings.map(x => {
        x.imageUrls = x.imageUrls.filter(x => x.includes("1024/768") && !x.includes("jpg:p"));
        return x;
    })
}

async function MainZoopla() {
    const allOldDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    const allOld = await allOldDataset.getData();
    await allOldDataset.drop();

    // const unique = filterUnique(allOld.items.flatMap(x => x.listings));
    const unique = filterImages(allOld.items.flatMap(x => x.listings));

    const allNewDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    await allNewDataset.pushData({ listings: unique });

    const currentZoopla = await Dataset.open<{ listings: ZooplaListing[] }>("current-zoopla");
    await currentZoopla.drop();


    const ncurrentZoopla = await Dataset.open<{ listings: ZooplaListing[] }>("current-zoopla");
    await ncurrentZoopla.pushData({ listings: unique });
}


MainZoopla();