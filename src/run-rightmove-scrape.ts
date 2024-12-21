import { Configuration, Dataset } from "crawlee";
import { createRightmoveListingScraper } from "./scrapers/rightmove/rightmove-scrape";
import { createRightmoveListingFinder } from "./scrapers/rightmove/rightmove-index";

import currentCategory, { Category } from "./set-category";
import { IndexPage, RightmoveListing } from "./types";
import { filterUnique } from "./scrapers/filter-unique-func";
import { ListingIdDataset } from "./scrapers/backport/backport-search-category";

const config = Configuration.getGlobalConfig();
config.set("purgeOnStart", false);

const SearchUrls = {
  [Category.general]:
    "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=USERDEFINEDAREA%5E%7B%22id%22%3A%228479230%22%7D&minBedrooms=2&sortType=6&propertyTypes=&mustHave=&dontShow=&furnishTypes=&keywords=",
  [Category.jamie]:
    "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=USERDEFINEDAREA%5E%7B%22id%22%3A%228760020%22%7D&minBedrooms=2&sortType=6&propertyTypes=&mustHave=&dontShow=&furnishTypes=&keywords=",
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

const url = SearchUrls[currentCategory];
const runRightmoveScrape = async () => {
  const startingIndex = 0
  const endingIndex = 72;
  const step = 24; // rightmove default
  const indexPageUrls = createRightmoveIndexedUrls(url, startingIndex, endingIndex, step);

  // Find the pages
  config.set("defaultDatasetId", "indexing-rightmove-" + currentCategory);
  config.set("defaultKeyValueStoreId", "indexing-rightmove-" + currentCategory);
  config.set("defaultRequestQueueId", Date.now() + "-indexing-rightmove");

  var notBeforeDate = new Date();
  notBeforeDate.setDate(notBeforeDate.getDate() - 2);

  const crawler = createRightmoveListingFinder(notBeforeDate);
  console.log(indexPageUrls)
  await crawler.run(indexPageUrls);

  const newListings = (await Dataset.getData<IndexPage>()).items.flatMap(x => x.listings);
  const allDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
  const allOldData = (await allDataset.getData()).items.flatMap(x => x.listings);

  // Record which category these listings belong to
  const forCategoryDataset = await Dataset.open<ListingIdDataset>(`search-rightmove-${currentCategory}`);
  const oldForCategory = (await forCategoryDataset.getData()).items.flatMap(x => x.listingIds);
  const forCategorySet = new Set(oldForCategory);
  await forCategoryDataset.pushData({ listingIds: newListings.map(x => Number(x.listingId)).filter(x => !forCategorySet.has(x)) });
  const listingIdsForThisSearch = new Set<number>((await forCategoryDataset.getData()).items.flatMap(x => x.listingIds));

  config.set("defaultDatasetId", "scraping-rightmove-" + currentCategory);
  config.set("defaultKeyValueStoreId", "scraping-rightmove-" + currentCategory);
  config.set("defaultRequestQueueId", (Date.now()).toString() + "scraping-rightmove-" + currentCategory);
  const seenBeforeIds = new Set<number>();
  (await allDataset.getData()).items.flatMap(x => x.listings).forEach(x => seenBeforeIds.add(x.listingId));

  const listingScraper = createRightmoveListingScraper();
  const newListingIds = newListings.map(x => x.listingId).filter(x => !seenBeforeIds.has(Number(x)));
  const unscrapedListingUrls = buildRightmoveListingUrls(newListingIds);
  await listingScraper.run(unscrapedListingUrls);

  const allNewData = (await Dataset.getData<RightmoveListing>()).items.filter(x => !seenBeforeIds.has(x.listingId));
  console.log(`${allNewData.length} new results (out of ${newListingIds.length} found)`)
  const oldCurrentDataset = await Dataset.open<{ listings: RightmoveListing[] }>("current-rightmove");
  await oldCurrentDataset.drop();

  const currentDataset = await Dataset.open<{ listings: RightmoveListing[] }>("current-rightmove");
  const currentData = filterUnique([...allOldData, ...allNewData].filter(x => listingIdsForThisSearch.has(x.listingId)));

  await allDataset.pushData({ listings: allNewData })
  await currentDataset.pushData({ listings: currentData });
};

runRightmoveScrape();