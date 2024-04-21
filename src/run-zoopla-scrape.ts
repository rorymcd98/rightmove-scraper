//This one doesn't really work
import { Configuration, Dataset} from "crawlee";
import { createZooplaListingFinder, createZooplaListingScraper } from "./scrapers/zoopla-scrape";
import fs from "fs";
import defaultCategoryName, { Categories } from "./set-prod";
import { IndexPage, ZooplaListing } from "./types";
import { list } from "blessed";

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
  [Categories.general]:
    "https://www.zoopla.co.uk/for-sale/property/regents-park/?beds_min=2&price_max=475000&q=Regent%27s+Park%2C+London&radius=0&results_sort=newest_listings&search_source=for-sale&hidePoly=false&polyenc=gvhyH%7EuQ%7EVtkUuYv_CyyAvXqdDc%7B%40mtCa%60EuqAylDua%40eoEuAoyCti%40myCltC%7DpC%7EqG%60%7B%40l%7C%40jfD",
};

function createZooplaIndexedUrl(baseUrl: string, index: number): string{
  return baseUrl + `&pn=${index}`
}

function createZooplaIndexedUrls(baseUrl: string, startingIndex: number, endingIndex: number, step: number): string[]{
  const outputUrls: string[] = [];
  for(let i = startingIndex; i < endingIndex; i+=step){
    outputUrls.push(createZooplaIndexedUrl(baseUrl, i));
  }
  return outputUrls;
}

function buildZooplaListingUrls(listingIds: string[]){
  return listingIds.map(id => `https://zoopla.co.uk/for-sale/details/${id}`);
}

const url = SearchUrls[defaultCategoryName];
const runZooplaScrape = async () => {
  const startingIndex = 1;
  const endingIndex = 2;
  const step = 1; // zoopla default
  const indexPageUrls = createZooplaIndexedUrls(url, startingIndex, endingIndex, step);

  // purgeRequestQueueFolder();

  // Find the pages
  config.set("defaultDatasetId", "indexing-zoopla-"+defaultCategoryName);
  config.set("defaultKeyValueStoreId", "indexing-zoopla-"+defaultCategoryName);
  // config.set("defaultRequestQueueId", "indexing-"+defaultUrl);

  var notBeforeDate = new Date();
  notBeforeDate.setDate(notBeforeDate.getDate() - 21);

  const crawler = createZooplaListingFinder(notBeforeDate);
  console.log(indexPageUrls)
  await crawler.run(indexPageUrls);

  const newListings = (await Dataset.getData<IndexPage>()).items.flatMap(x => x.listings);

  const listingIdToAdDate = new Map<number, Date>();
  for(const listing of newListings){
    listingIdToAdDate.set(parseInt(listing.listingId), listing.listingDate ? new Date(listing.listingDate) : new Date(0));
  }

  config.set("defaultDatasetId", "scraping-zoopla-"+defaultCategoryName);
  config.set("defaultKeyValueStoreId", "scraping-zoopla-"+defaultCategoryName);
  config.set("defaultRequestQueueId", "scraping-zoopla-"+defaultCategoryName);

  const listingScraper = createZooplaListingScraper(listingIdToAdDate);
  const unscrapedListingUrls = buildZooplaListingUrls(newListings.map(x => x.listingId)); 

  await listingScraper.run(unscrapedListingUrls);

  const allData = (await Dataset.getData<ZooplaListing>()).items;
  const allDataset = await Dataset.open<{listings: ZooplaListing[]}>("all-zoopla");
  await allDataset.pushData({listings: allData})
};

runZooplaScrape();