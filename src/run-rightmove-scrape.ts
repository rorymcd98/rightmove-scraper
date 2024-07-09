import { Configuration, Dataset } from "crawlee";
import { createRightmoveListingScraper } from "./scrapers/rightmove/rightmove-scrape";
import { createRightmoveListingFinder } from "./scrapers/rightmove/rightmove-index";

import defaultUrl, { Category } from "./set-category";
import { IndexPage, RightmoveListing } from "./types";
import { filterUnique } from "./scrapers/backport/filter-unique";

const config = Configuration.getGlobalConfig();
config.set("purgeOnStart", false);


function purgeRequestQueueFolder() {
  const path = "./storage/request_queues/";
  const files = fs.readdirSync(path);
  for (const file of files) {
    fs.unlinkSync(path + file);
  }
}

const SearchUrls = {
  [Category.general]:
    "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=USERDEFINEDAREA%5E%7B%22id%22%3A%228479230%22%7D&minBedrooms=2&maxPrice=575000&sortType=6&propertyTypes=&mustHave=&dontShow=&furnishTypes=&keywords=",
};

function createRightmoveIndexedUrl(baseUrl: string, index: number): string {
  return baseUrl + `&index=${index}`
}

function createRightmoveIndexedUrls(baseUrl: string, startingIndex: number, endingIndex: number, step: number): string[] {
  const outputUrls: string[] = [];
  for (let i = startingIndex; i < endingIndex; i += step) {
    outputUrls.push(createRightmoveIndexedUrl(baseUrl, i));
  }
  return outputUrls;
}

function buildRightmoveListingUrls(listingIds: string[]) {
  return listingIds.map(id => `https://rightmove.co.uk/properties/${id}`);
}

const url = SearchUrls[defaultUrl];
const runRightmoveScrape = async () => {
  const startingIndex = 0
  const endingIndex = 73;
  const step = 24; // rightmove default
  const indexPageUrls = createRightmoveIndexedUrls(url, startingIndex, endingIndex, step);

  // Find the pages
  config.set("defaultDatasetId", "indexing-rightmove-" + defaultUrl);
  config.set("defaultKeyValueStoreId", "indexing-rightmove-" + defaultUrl);
  config.set("defaultRequestQueueId", Date.now() + "-indexing-rightmove");

  var notBeforeDate = new Date();
  notBeforeDate.setDate(notBeforeDate.getDate() - 2);

  const crawler = createRightmoveListingFinder(notBeforeDate);
  console.log(indexPageUrls)
  await crawler.run(indexPageUrls);

  const newListings = (await Dataset.getData<IndexPage>()).items.flatMap(x => x.listings);
  const allDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
  const allOldData = (await allDataset.getData()).items.flatMap(x => x.listings);


  config.set("defaultDatasetId", "scraping-rightmove-" + defaultUrl);
  config.set("defaultKeyValueStoreId", "scraping-rightmove-" + defaultUrl);
  config.set("defaultRequestQueueId", (Date.now()).toString() + "scraping-rightmove-" + defaultUrl);
  const seenBeforeIds = new Set<number>();
  (await allDataset.getData()).items.flatMap(x => x.listings).forEach(x => seenBeforeIds.add(x.listingId));

  const listingScraper = createRightmoveListingScraper();
  const newListingUrls = newListings.map(x => x.listingId).filter(x => !seenBeforeIds.has(Number(x)));
  const unscrapedListingUrls = buildRightmoveListingUrls(newListingUrls);
  await listingScraper.run(unscrapedListingUrls);

  const allNewData = (await Dataset.getData<RightmoveListing>()).items.filter(x => !seenBeforeIds.has(x.listingId));
  console.log(`${allNewData.length} new results (out of ${newListingUrls.length} found)`)
  const oldCurrentDataset = await Dataset.open<{ listings: RightmoveListing[] }>("current-rightmove");
  await oldCurrentDataset.drop();

  const currentDataset = await Dataset.open<{ listings: RightmoveListing[] }>("current-rightmove");
  const currentData = filterUnique([...allOldData, ...allNewData]);

  await allDataset.pushData({ listings: allNewData })
  await currentDataset.pushData({ listings: currentData });
};

runRightmoveScrape();