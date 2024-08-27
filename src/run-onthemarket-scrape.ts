import { Configuration, Dataset } from "crawlee";
import { createOnTheMarketListingScraper } from "./scrapers/onthemarket/onthemarket-scrape";
import { createOnTheMarketListingFinder } from "./scrapers/onthemarket/onthemarket-index";

import currentCategory, { Category } from "./set-category";
import { IndexPage, OnTheMarketListing } from "./types";
import { filterUnique } from "./scrapers/filter-unique-func";
import { ListingIdDataset as ListingIdDataset } from "./scrapers/backport/backport-search-category";

const config = Configuration.getGlobalConfig();
config.set("purgeOnStart", false);

const SearchUrls = {
  [Category.general]:
    "https://www.onthemarket.com/for-sale/property/regents-park/?max-price=605000&min-bedrooms=2&radius=4.0&retirement=false&shared-ownership=false&sort-field=update_date",
  [Category.jamie]:
    "https://www.onthemarket.com/for-sale/property/kensington-and-chelsea/?max-price=605000&min-bedrooms=2&polygons0=mngyHh%7CWjLdPjDha%40hDhCsA~cC~Vj_AjD%60%5DhDhCtAnpAiDhCkDvXaWbPuYja%40odAzrBuIfCwi%40fn%40ui%40fC%7BaC_dCk%7C%40gn%40sAqGmdA%7Di%40id%40%7Bi%40uQsGuYia%40sIia%40%3FucAkDcP%3Fc%60EiDguCkDcPtAcyAtIoTh%5CqGvyCpGjTqGb_B%3Fta%40zKll%40hCtQzKuIvv%40%3FhjBhL%7Ci%40%60OlT%60WpGhDrG%60g%40fC~FqGjL%3FjLzK&retirement=false&shared-ownership=false&sort-field=update_date"
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

const url = SearchUrls[currentCategory];
const runOnTheMarketScrape = async () => {
  const startingIndex = 1;
  const endingIndex = 3;
  const step = 1; // onthemarket default
  const indexPageUrls = createOnTheMarketIndexedUrls(url, startingIndex, endingIndex, step);

  // Find the pages
  config.set("defaultDatasetId", "indexing-onthemarket-" + currentCategory);
  config.set("defaultKeyValueStoreId", "indexing-onthemarket-" + currentCategory);
  config.set("defaultRequestQueueId", Date.now() + "-indexing-onthemarket");

  const crawler = createOnTheMarketListingFinder();
  console.log(indexPageUrls)
  await crawler.run(indexPageUrls);

  const newListings = (await Dataset.getData<IndexPage>()).items.flatMap(x => x.listings);

  const listingIdToAdDate = new Map<number, Date>();
  for (const listing of newListings) {
    listingIdToAdDate.set(parseInt(listing.listingId), listing.listingDate ? new Date(listing.listingDate) : new Date(0));
  }

  // Record which category these listings belong to
  const forCategoryDataset = await Dataset.open<ListingIdDataset>(`search-rightmove-${currentCategory}`);
  const oldForCategory = (await forCategoryDataset.getData()).items.flatMap(x => x.listingIds);
  const forCategorySet = new Set(oldForCategory);
  await forCategoryDataset.pushData({ listingIds: newListings.map(x => Number(x.listingId)).filter(x => !forCategorySet.has(x)) });
  const listingIdsForThisSearch = new Set<number>((await forCategoryDataset.getData()).items.flatMap(x => x.listingIds));

  config.set("defaultDatasetId", "scraping-onthemarket-" + currentCategory);
  config.set("defaultKeyValueStoreId", "scraping-onthemarket-" + currentCategory);
  config.set("defaultRequestQueueId", (Date.now()).toString() + "scraping-onthemarket-" + currentCategory);
  const allDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("all-onthemarket");
  const seenBeforeIds = new Set<number>((await allDataset.getData()).items.flatMap(x => x.listings).map(x => x.listingId));

  const listingScraper = createOnTheMarketListingScraper(listingIdToAdDate);
  const newListingUrls = newListings.map(x => x.listingId).filter(x => !seenBeforeIds.has(Number(x)));
  const unscrapedListingUrls = buildOnTheMarketListingUrls(newListingUrls);

  await listingScraper.run(unscrapedListingUrls);

  const allNewData = (await Dataset.getData<OnTheMarketListing>()).items.filter(x => !seenBeforeIds.has(x.listingId));
  console.log(`${allNewData.length} new results (out of ${newListingUrls.length} found)`)
  const allOldData = (await allDataset.getData()).items.flatMap(x => x.listings);
  await allDataset.pushData({ listings: allNewData })

  // Drop then re-add data to the current dataset
  const oldCurrentDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("current-onthemarket");
  await oldCurrentDataset.drop();

  const currentData = filterUnique([...allOldData, ...allNewData].filter(x => listingIdsForThisSearch.has(x.listingId)));

  const currentDataset = await Dataset.open<{ listings: OnTheMarketListing[] }>("current-onthemarket");
  await currentDataset.pushData({ listings: currentData });
};

runOnTheMarketScrape();