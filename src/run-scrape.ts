import { Configuration, Dataset} from "crawlee";
import { createListingFinder, createListingScraper } from "./scrape";
import fs from "fs";
import defaultUrl, { Urls } from "./set-prod";
import { IndexPage } from "./types";

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
  [Urls.general]:
    "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=STATION%5E3509&minBedrooms=2&maxPrice=475000&radius=5.0&sortType=6&propertyTypes=&includeSSTC=false&mustHave=&dontShow=&furnishTypes=&keywords=",
  [Urls.andAnother]:
    "",
  [Urls.another]:
    "",
};

function createIndexedUrl(baseUrl: string, index: number): string{
  return baseUrl + `&index=${index}`
}

function createIndexedUrls(baseUrl: string, startingIndex: number, endingIndex: number, step: number): string[]{
  const outputUrls: string[] = [];
  for(let i = startingIndex; i < endingIndex; i+=step){
    outputUrls.push(createIndexedUrl(baseUrl, i));
  }
  return outputUrls;
}

function buildListingUrls(listingIds: string[]){
  return listingIds.map(id => `https://rightmove.co.uk/properties/${id}`);
}

const url = SearchUrls[defaultUrl];
(async () => {
  const startingIndex = 0
  const endingIndex = 1 // corresponds to 300 results
  const step = 24; // rightmove default
  const indexPageUrls = createIndexedUrls(url, startingIndex, endingIndex, step);

  // purgeRequestQueueFolder();

  // Find the pages
  config.set("defaultDatasetId", "indexing-"+defaultUrl);
  config.set("defaultKeyValueStoreId", "indexing-"+defaultUrl);
  config.set("defaultRequestQueueId", "indexing-"+defaultUrl);

  var notBeforeDate = new Date();
  notBeforeDate.setDate(notBeforeDate.getDate() - 1);

  const crawler = createListingFinder(notBeforeDate);
  await crawler.run(indexPageUrls);

  // const alreadyScrapedDataset = await Dataset.open<string[]>(alreadyScrapedDbName);
  // const alreadyScrapedIds = new Set<string>((await (alreadyScrapedDataset).getData()).items.flatMap(x => x));

  const newListingIds = (await Dataset.getData<IndexPage>()).items.flatMap(x => x.listingUrls);
  // const unscrapedIds = newListingIds.filter(x => !alreadyScrapedIds.has(x)); 
  const unscrapedIds = newListingIds;

  config.set("defaultDatasetId", "scraping-"+defaultUrl);
  config.set("defaultKeyValueStoreId", "scraping-"+defaultUrl);
  config.set("defaultRequestQueueId", "scraping-"+defaultUrl);

  const listingScraper = createListingScraper();
  const unscrapedListingUrls = buildListingUrls(unscrapedIds); 
  await listingScraper.run(unscrapedListingUrls.slice(0,3));
})();
