import { Configuration, Dataset } from "crawlee";
import { createOnTheMarketListingScraper } from "./scrapers/onthemarket/onthemarket-scrape";
import { createOnTheMarketListingFinder } from "./scrapers/onthemarket/onthemarket-index";

import defaultCategoryName, { Category } from "./set-category";
import { IndexPage, OnTheMarketListing } from "./types";
import { filterUnique } from "./scrapers/backport/filter-unique";

const config = Configuration.getGlobalConfig();
config.set("purgeOnStart", false);


function purgeRequestQueueFolder() {
  return;
  // don't want to do this really
  const path = "./storage/request_queues/";
  const files = fs.readdirSync(path);
  for (const file of files) {
    fs.unlinkSync(path + file);
  }
}

const SearchUrls = {
  [Category.general]:
    "https://www.onthemarket.com/for-sale/property/regents-park/?max-price=575000&min-bedrooms=2&radius=4.0&retirement=false&shared-ownership=false&sort-field=update_date",
};

function createOnTheMarketIndexedUrl(baseUrl: string, index: number): string {
  return baseUrl + `&page=${index}`
}

function createOnTheMarketIndexedUrls(baseUrl: string, startingIndex: number, endingIndex: number, step: number): string[] {
  const outputUrls: string[] = [];
  for (let i = startingIndex; i < endingIndex; i += step) {
    outputUrls.push(createOnTheMarketIndexedUrl(baseUrl, i));
  }
  return outputUrls;
}

function buildOnTheMarketListingUrls(listingIds: string[]) {
  return listingIds.map(id => `https://onthemarket.com/details/${id}/`);
}

const url = SearchUrls[defaultCategoryName];
const runOnTheMarketScrape = async () => {
  const startingIndex = 1;
  const endingIndex = 4;
  const step = 1; // onthemarket default
  const indexPageUrls = createOnTheMarketIndexedUrls(url, startingIndex, endingIndex, step);

  // purgeRequestQueueFolder();

  // Find the pages
  config.set("defaultDatasetId", "indexing-onthemarket-" + defaultCategoryName);
  config.set("defaultKeyValueStoreId", "indexing-onthemarket-" + defaultCategoryName);
  config.set("defaultRequestQueueId", Date.now() + "-indexing-onthemarket");

  const crawler = createOnTheMarketListingFinder();
  console.log(indexPageUrls)
  await crawler.run(indexPageUrls);

  const newListings = (await Dataset.getData<IndexPage>()).items.flatMap(x => x.listings);

  const listingIdToAdDate = new Map<number, Date>();
  for (const listing of newListings) {
    listingIdToAdDate.set(parseInt(listing.listingId), listing.listingDate ? new Date(listing.listingDate) : new Date(0));
  }

  config.set("defaultDatasetId", "scraping-onthemarket-" + defaultCategoryName);
  config.set("defaultKeyValueStoreId", "scraping-onthemarket-" + defaultCategoryName);
  config.set("defaultRequestQueueId", (Date.now()).toString() + "scraping-onthemarket-" + defaultCategoryName);
  const allDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket");
  const seenBeforeIds = new Set<number>((await allDataset.getData()).items.flatMap(x => x.listings).map(x => x.listingId));

  const listingScraper = createOnTheMarketListingScraper(listingIdToAdDate);
  const unscrapedListingUrls = buildOnTheMarketListingUrls(newListings.map(x => x.listingId).filter(x => !seenBeforeIds.has(Number(x))));

  await listingScraper.run(unscrapedListingUrls);

  const allNewData = (await Dataset.getData<OnTheMarketListing>()).items.filter(x => !seenBeforeIds.has(x.listingId));
  console.log(allNewData.length + " new results")
  const allOldData = (await allDataset.getData()).items.flatMap(x => x.listings);
  await allDataset.pushData({ listings: allNewData })

  // Drop then re-add data to the current dataset
  const oldCurrentDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("current-onthemarket");
  await oldCurrentDataset.drop();

  const currentData = filterUnique([...allOldData, ...allNewData]);

  const currentDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("current-onthemarket");
  await currentDataset.pushData({ listings: currentData });
};

runOnTheMarketScrape();