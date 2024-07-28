import { Configuration, Dataset, PlaywrightCrawler } from "crawlee";
import { getIdFromUrl } from "../zoopla/zoopla-scrape";
import { ZooplaListing } from "../../types";
import { getSquareFootageFromGptAsync } from "../gpt-sqft";

// copied this because it's easier
function buildZooplaListingUrls(listingIds: string[]) {
    return listingIds.map(id => `https://zoopla.co.uk/for-sale/details/${id}`);
}

const config = Configuration.getGlobalConfig();

type BackportSquareFootage = { listingId: number, squareFootage: number | null };

async function Main() {
    const allDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    const allListings = await allDataset.getData();

    config.set("defaultRequestQueueId", "backport-squarefootages-zoopla");
    config.set("defaultDatasetId", "backport-squarefootages-zoopla");
    const backporter = createNearestSquarefootagesBackporter();

    const urls = buildZooplaListingUrls(allListings.items.flatMap(x => x.listings).filter(x => x.debug.footageResolution == "unresolved").map(x => x.listingId.toString()));
    backporter.run(urls)
}

async function CreateNewDataset() {
    const backportDataset = await Dataset.open<BackportSquareFootage>("backport-squarefootages-zoopla");
    const backportMap = new Map<Number, number | null>();

    (await backportDataset.getData()).items.forEach(x => {
        backportMap.set(x.listingId, x.squareFootage);
    });

    const allDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
    const allListings = (await allDataset.getData()).items.flatMap(x => x.listings);

    const uniqueListings = new Map<number, ZooplaListing>();


    for (const listing of allListings) {
        uniqueListings.set(listing.listingId, listing)
    }

    for (const x of uniqueListings.values()) {
        const rooms = backportMap.get(x.listingId);
        x.squareFootage = rooms ?? null;
    }
    const allDataset2 = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla2");
    await allDataset2.pushData({ listings: Array.from(uniqueListings.values()) })

}

// Main();
CreateNewDataset();

function createNearestSquarefootagesBackporter() {
    const crawler = new PlaywrightCrawler({
        async requestHandler({ request, page, log }) {
            const pageTitle = await page.title();
            log.info(`Title of ${request.url} is '${pageTitle}'`);

            if (request.url == undefined) {
                log.error("Expected the url to not be null - terminating")
                return;
            }

            const squarefootageNames = await getSquareFootageFromGptAsync(page, log, "zoopla", request.url) ?? null;

            const listingId = getIdFromUrl(request.url);

            const res: BackportSquareFootage =
            {
                listingId: listingId,
                squareFootage: squarefootageNames
            };

            // Push the list of urls to the dataset
            await Dataset.pushData<BackportSquareFootage>(res);
        },
        // Uncomment this option to see the browser window.
        headless: true,
    });
    return crawler;
}