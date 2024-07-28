import { Configuration, Dataset, PlaywrightCrawler } from "crawlee";
import { getIdFromUrl } from "../../rightmove/rightmove-scrape";
import { RightmoveListing, RoomDimension } from "../../../types";
import { getRoomDimensionsFromGptAsync } from "../../gpt-sqft";

// copied this because it's easier
function buildRightmoveListingUrls(listingIds: string[]) {
    return listingIds.map(id => `https://rightmove.co.uk/properties/${id}`);
}

const config = Configuration.getGlobalConfig();

type BackportRoomDimensions = { listingId: number, roomDimensions: RoomDimension[] | null };

async function Main() {

    const allDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    const allListings = await allDataset.getData();

    config.set("defaultRequestQueueId", "backport-dimensions-rightmove");
    config.set("defaultDatasetId", "backport-dimensions-rightmove");
    const backporter = createNearestDimensionsBackporter();

    const urls = buildRightmoveListingUrls(allListings.items.flatMap(x => x.listings).map(x => x.listingId.toString()).slice(-500,));
    backporter.run(urls)
}

async function CreateNewDataset() {
    const backportDataset = await Dataset.open<BackportRoomDimensions>("backport-dimensions-rightmove");
    const backportMap = new Map<Number, RoomDimension[] | null>();

    (await backportDataset.getData()).items.forEach(x => {
        backportMap.set(x.listingId, x.roomDimensions);
    });

    const allDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    const allListings = (await allDataset.getData()).items.flatMap(x => x.listings);

    const uniqueListings = new Map<number, RightmoveListing>();


    for (const listing of allListings) {
        uniqueListings.set(listing.listingId, listing)
    }

    for (const x of uniqueListings.values()) {
        const rooms = backportMap.get(x.listingId);
        x.roomDimensions = rooms ?? null;
    }
    const allDataset2 = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove2");
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

            const dimensionNames = await getRoomDimensionsFromGptAsync(page, log, "rightmove");

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