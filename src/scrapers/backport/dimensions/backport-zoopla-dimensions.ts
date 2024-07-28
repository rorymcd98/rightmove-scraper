import { Configuration, Dataset, PlaywrightCrawler } from "crawlee";
import { getIdFromUrl } from "../../zoopla/zoopla-scrape";
import { ZooplaListing, RoomDimension } from "../../../types";
import { getRoomDimensionsFromGptAsync } from "../../gpt-sqft";

// copied this because it's easier
function buildZooplaListingUrls(listingIds: string[]) {
    return listingIds.map(id => `https://zoopla.co.uk/for-sale/details/${id}`);
}

const config = Configuration.getGlobalConfig();

type BackportRoomDimensions = { listingId: number, roomDimensions: RoomDimension[] | null };

async function Main() {
    const allDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    const allListings = await allDataset.getData();

    config.set("defaultRequestQueueId", "backport-dimensions-zoopla1243223");
    config.set("defaultDatasetId", "backport-dimensions-zoopla");
    const backporter = createNearestDimensionsBackporter();

    const urls = buildZooplaListingUrls(allListings.items.flatMap(x => x.listings).map(x => x.listingId.toString()));
    backporter.run(urls)
}

async function CreateNewDataset() {
    const backportDataset = await Dataset.open<BackportRoomDimensions>("backport-dimensions-zoopla");
    const backportMap = new Map<Number, RoomDimension[] | null>();

    (await backportDataset.getData()).items.forEach(x => {
        backportMap.set(x.listingId, x.roomDimensions);
    });

    const allDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    const allListings = (await allDataset.getData()).items.flatMap(x => x.listings);

    const uniqueListings = new Map<number, ZooplaListing>();


    for (const listing of allListings) {
        uniqueListings.set(listing.listingId, listing)
    }

    for (const x of uniqueListings.values()) {
        const rooms = backportMap.get(x.listingId);
        x.roomDimensions = rooms ?? null;
    }
    const allDataset2 = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla2");
    await allDataset2.pushData({ listings: Array.from(uniqueListings.values()) })

}

// Main();
CreateNewDataset();

function createNearestDimensionsBackporter() {
    const crawler = new PlaywrightCrawler({
        async requestHandler({ request, page, log }) {
            const pageTitle = await page.title();
            log.info(`Title of ${request.url} is '${pageTitle}'`);

            if (request.url == undefined) {
                log.error("Expected the url to not be null - terminating")
                return;
            }

            const dimensionNames = await getRoomDimensionsFromGptAsync(page, log, "zoopla", request.url);

            const listingId = getIdFromUrl(request.url);

            const res: BackportRoomDimensions =
            {
                listingId: listingId,
                roomDimensions: dimensionNames
            };

            // Push the list of urls to the dataset
            await Dataset.pushData<BackportRoomDimensions>(res);
        },
        // Uncomment this option to see the browser window.
        headless: true,
    });
    return crawler;
}