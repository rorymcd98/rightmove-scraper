import { Dataset } from "crawlee";
import { PropertyListing, RightmoveListing, Site } from "../../types";


export function recoverSite<TPropertyListing extends PropertyListing>(listings: TPropertyListing[], site: Site) {
    listings = listings.map(x => {
        x.site = site
        return x;
    });
    return listings;
}

async function MainRightmoveAsync() {
    const allOldDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    const allOld = await allOldDataset.getData();
    await allOldDataset.drop();

    // const unique = filterUnique(allOld.items.flatMap(x => x.listings));
    const unique = recoverSite(allOld.items.flatMap(x => x.listings), "rightmove");

    const allNewDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    await allNewDataset.pushData({ listings: unique });
}


MainRightmoveAsync();