import { Configuration, Dataset, PlaywrightCrawler } from "crawlee";
import { getIdFromUrl } from "../zoopla/zoopla-scrape";
import currentCategory from "../../set-category";
import { NearestStation, ZooplaListing } from "../../types";
import { getNearestStationsAsync } from "../zoopla/zoopla-stations";

// copied this because it's easier
function buildZooplaListingUrls(listingIds: string[]) {
    return listingIds.map(id => `https://zoopla.co.uk/for-sale/details/${id}`);
}

const config = Configuration.getGlobalConfig();

type BackportStations = { listingId: number, nearestStations: NearestStation[] };

async function Main() {

    const allDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    const allListings = await allDataset.getData();

    config.set("defaultRequestQueueId", "backport-stations-zoopla-" + currentCategory);
    config.set("defaultDatasetId", "backport-stations-zoopla-" + currentCategory);
    const backporter = createNearestStationsBackporter();

    const urls = buildZooplaListingUrls(allListings.items.flatMap(x => x.listings).map(x => x.listingId.toString()));
    backporter.run(urls)
}

async function CreateNewDataset() {
    const backportDataset = await Dataset.open<BackportStations>("backport-stations-zoopla-" + currentCategory);
    const backportMap = new Map<Number, NearestStation[]>();

    (await backportDataset.getData()).items.forEach(x => {
        backportMap.set(x.listingId, x.nearestStations);
    });

    const allDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    const allListings = (await allDataset.getData()).items.flatMap(x => x.listings);

    const uniqueListings = new Map<number, ZooplaListing>();


    for (const listing of allListings) {
        uniqueListings.set(listing.listingId, listing)
    }

    for (const x of uniqueListings.values()) {
        const nearest = backportMap.get(x.listingId);
        x.nearestStations = nearest ?? null;
    }
    const allDataset2 = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla2");
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