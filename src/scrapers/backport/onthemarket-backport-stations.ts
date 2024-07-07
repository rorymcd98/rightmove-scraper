import { Configuration, Dataset, PlaywrightCrawler } from "crawlee";
import { getIdFromUrl } from "../onthemarket/onthemarket-scrape";
import defaultCategoryName from "../../set-category";
import { NearestStation, OnTheMarketListing } from "../../types";
import { getNearestStationsAsync } from "../onthemarket/onthemarket-stations";
import Listing from "../../web/src/Listing";

// copied this because it's easier
function buildOnTheMarketListingUrls(listingIds: string[]) {
    return listingIds.map(id => `https://onthemarket.com/details/${id}/`);
}

const config = Configuration.getGlobalConfig();

type BackportStations = { listingId: number, nearestStations: NearestStation[] };

async function Main() {

    const allDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket");
    const allListings = await allDataset.getData();

    config.set("defaultRequestQueueId", "backport-stations-onthemarket-" + defaultCategoryName);
    config.set("defaultDatasetId", "backport-stations-onthemarket-" + defaultCategoryName);
    const backporter = createNearestStationsBackporter();

    const urls = buildOnTheMarketListingUrls(allListings.items.flatMap(x => x.listings).map(x => x.listingId.toString()));
    backporter.run(urls)
    const allNewData = (await Dataset.getData<BackportStations>()).items;
    // const backportDataset = await Dataset.open<{ listings: BackportStations[] }>("backport-stations-onthemarket-general");
    // await backportDataset.pushData({ listings: allNewData })
}

async function CreateNewDataset() {
    const backportDataset = await Dataset.open<BackportStations>("backport-stations-onthemarket-" + defaultCategoryName);
    const backportMap = new Map<Number, NearestStation[]>();

    const allBackports = (await backportDataset.getData()).items.forEach(x => {
        backportMap.set(x.listingId, x.nearestStations);
    });

    const allDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket");
    const allListings = (await allDataset.getData()).items.flatMap(x => x.listings);

    const uniqueListings = new Map<number, OnTheMarketListing>();


    for (const listing of allListings) {
        uniqueListings.set(listing.listingId, listing)
    }

    for (const x of uniqueListings.values()) {
        const nearest = backportMap.get(x.listingId);
        x.nearestStations = nearest ?? null;
    }
    const allDataset2 = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket2");
    await allDataset2.pushData({ listings: Array.from(uniqueListings.values()) })

}

// Main();
CreateNewDataset();

function createNearestStationsBackporter() {
    const crawler = new PlaywrightCrawler({
        async requestHandler({ request, page, log }) {
            const pageTitle = await page.title();
            log.info(`Title of ${request.loadedUrl} is '${pageTitle}'`);

            if (request.loadedUrl == undefined) {
                log.error("Expected the url to not be null - terminating")
                return;
            }

            const stationNames = await getNearestStationsAsync(page);

            const listingId = getIdFromUrl(request.loadedUrl);

            const res: BackportStations =
            {
                listingId: listingId,
                nearestStations: stationNames
            };

            // Push the list of urls to the dataset
            await Dataset.pushData<BackportStations>(res);
        },
        // Uncomment this option to see the browser window.
        headless: true,
    });
    return crawler;
}