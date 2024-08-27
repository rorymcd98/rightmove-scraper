import { Dataset } from "crawlee";
import { OnTheMarketListing, PropertyListing, RightmoveListing, ZooplaListing } from "../../types";
import { StationName } from "../../transport";
import { matchToNearestName } from "../shared/station-name-search";
import { filterUnique } from "../filter-unique-func";


async function MainRightmoveAsync() {
    const allOldDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    const allOld = await allOldDataset.getData();
    await allOldDataset.drop();

    const unique = filterUnique(allOld.items.flatMap(x => x.listings));

    const allNewDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    await allNewDataset.pushData({ listings: unique });
}

function backportStationNameLocal<TPropertyListing extends PropertyListing>(listings: TPropertyListing[]) {
    listings = listings.map(x => {
        if (x.nearestStations == null) {
            return x;
        }
        x.nearestStations = x.nearestStations.map(x => {
            const lwr = x.rawText.toLowerCase()
            if (lwr.includes("ing's cross") || lwr.includes("ings cross")) {
                x.stationName = matchToNearestName(x.rawText)
            }
            return x;
        })

        return x;
    })
    return listings;
}


// MainRightmoveAsync();

async function MainOnTheMarket() {
    const allOldDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket");
    const allOld = await allOldDataset.getData();
    // await allOldDataset.drop();

    // const unique = filterUnique(allOld.items.flatMap(x => x.listings));
    const unique = backportStationNameLocal(allOld.items.flatMap(x => x.listings));


    const allNewDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket3");
    await allNewDataset.pushData({ listings: unique });
}


MainOnTheMarket();


function filterImages(listings: ZooplaListing[]) {
    return listings.map(x => {
        x.imageUrls = x.imageUrls.filter(x => x.includes("1024/768") && !x.includes("jpg:p"));
        return x;
    })
}

function filterSchools(listings: ZooplaListing[]) {
    const keywords = ["school", "college", "academy", "ecole", "nursery"];

    return listings.map(listing => {
        listing.nearestStations = listing.nearestStations?.filter(station =>
            !keywords.some(keyword => station.rawText?.toLowerCase().includes(keyword))
        ) ?? null;

        return listing;
    });
}

const keywords: Partial<Record<StationName, string[]>> = {
    "King's Cross St Pancras": ["king's cross", "kings cross", "pancras"],
    "Finsbury Park": ["finsbury"]
};

function remapOvergrounds(listings: ZooplaListing[]): ZooplaListing[] {
    return listings.map(listing => {
        listing.nearestStations = listing.nearestStations?.map(station => {
            if (station.stationName === "Overground") {
                for (let [key, values] of Object.entries(keywords)) {
                    let good = key as StationName;
                    if (values?.some(value => station.rawText.toLowerCase().includes(value.toLowerCase()))) {
                        station.stationName = good;
                        break;
                    }
                }
            }
            return station;
        }) ?? null;

        return listing;
    });
}

async function MainZoopla() {
    const allOldDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla3");
    const allOld = await allOldDataset.getData();
    // await allOldDataset.drop();

    // const unique = filterUnique(allOld.items.flatMap(x => x.listings));
    // const unique = filterSchools(allOld.items.flatMap(x => x.listings));

    const unique = remapOvergrounds(allOld.items.flatMap(x => x.listings));

    const allNewDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla4");
    await allNewDataset.pushData({ listings: unique });

    const currentZoopla = await Dataset.open<{ listings: ZooplaListing[] }>("current-zoopla");
    await currentZoopla.drop();


    const ncurrentZoopla = await Dataset.open<{ listings: ZooplaListing[] }>("current-zoopla");
    await ncurrentZoopla.pushData({ listings: unique });
}


// MainZoopla();