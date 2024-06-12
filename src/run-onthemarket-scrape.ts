//This one doesn't really work
import { Configuration, Dataset} from "crawlee";
import { createOnTheMarketListingFinder, createOnTheMarketListingScraper } from "./scrapers/onthemarket-scrape";
import fs from "fs";
import defaultCategoryName, { Categories } from "./set-prod";
import { IndexPage, OnTheMarketListing } from "./types";

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
  [Categories.general]:
    "https://www.onthemarket.com/for-sale/property/regents-park/?max-price=575000&min-bedrooms=2&radius=4.0&retirement=false&shared-ownership=false",
};

function createOnTheMarketIndexedUrl(baseUrl: string, index: number): string{
  return baseUrl + `&page=${index}`
}

function createOnTheMarketIndexedUrls(baseUrl: string, startingIndex: number, endingIndex: number, step: number): string[]{
  const outputUrls: string[] = [];
  for(let i = startingIndex; i < endingIndex; i+=step){
    outputUrls.push(createOnTheMarketIndexedUrl(baseUrl, i));
  }
  return outputUrls;
}

function buildOnTheMarketListingUrls(listingIds: string[]){
  return listingIds.map(id => `https://onthemarket.com/details/${id}/`);
}

const url = SearchUrls[defaultCategoryName];
const runOnTheMarketScrape = async () => {
  const startingIndex = 1;
  const endingIndex = 3;
  const step = 1; // onthemarket default
  const indexPageUrls = createOnTheMarketIndexedUrls(url, startingIndex, endingIndex, step);

  // purgeRequestQueueFolder();

  // Find the pages
  config.set("defaultDatasetId", "indexing-onthemarket-"+defaultCategoryName);
  config.set("defaultKeyValueStoreId", "indexing-onthemarket-"+defaultCategoryName);
  config.set("defaultRequestQueueId", "indexing-"+ Math.random().toString());

  const crawler = createOnTheMarketListingFinder();
  console.log(indexPageUrls)
  await crawler.run(indexPageUrls);

  const newListings = (await Dataset.getData<IndexPage>()).items.flatMap(x => x.listings);

  const listingIdToAdDate = new Map<number, Date>();
  for(const listing of newListings){
    listingIdToAdDate.set(parseInt(listing.listingId), listing.listingDate ? new Date(listing.listingDate) : new Date(0));
  }

  config.set("defaultDatasetId", "scraping-onthemarket-"+defaultCategoryName);
  config.set("defaultKeyValueStoreId", "scraping-onthemarket-"+defaultCategoryName);
  config.set("defaultRequestQueueId", "scraping-onthemarket-"+defaultCategoryName);

  const listingScraper = createOnTheMarketListingScraper(listingIdToAdDate);
  const unscrapedListingUrls = buildOnTheMarketListingUrls(newListings.map(x => x.listingId)); 

  await listingScraper.run(unscrapedListingUrls);

  const allData = (await Dataset.getData<OnTheMarketListing>()).items;
  const allDataset = await Dataset.open<{listings: OnTheMarketListing[]}>("all-onthemarket");
  await allDataset.pushData({listings: allData})
};

runOnTheMarketScrape();