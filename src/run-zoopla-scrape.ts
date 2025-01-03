//This one doesn't really work
import { Configuration, Dataset } from "crawlee";
import { createZooplaListingFinder, createZooplaListingScraper } from "./scrapers/zoopla/zoopla-scrape";
import currentCategory, { Category } from "./set-category";
import { IndexPage, ZooplaListing } from "./types";
import { filterUnique } from "./scrapers/filter-unique-func";
import { ListingIdDataset } from "./scrapers/backport/backport-search-category";

const config = Configuration.getGlobalConfig();
config.set("purgeOnStart", false);

const SearchUrls = {
  [Category.general]:
    "https://www.zoopla.co.uk/for-sale/property/regents-park/?beds_min=2&polyenc=gvhyH~uQ~VtkUuYv_CyyAvXqdDc%7B%40mtCa%60EuqAylDua%40eoEuAoyCti%40myCltC%7DpC~qG%60%7B%40l%7C%40jfD&q=Regent%27s%20Park%2C%20London&radius=0&results_sort=newest_listings&search_source=for-sale",
  [Category.jamie]:
    "https://www.zoopla.co.uk/for-sale/property/station/tube/kings-cross-st-pancras/?beds_min=2&q=King%27s+Cross+St.+Pancras+Station%2C+London&results_sort=newest_listings&search_source=for-sale&radius=0&hidePoly=false&polyenc=_wlyHtyYzyAi%7BArv%40rMhi%40%60c%40bb%40%7CyHgyAhwB%7D%7DAzsAmtAiCoaAutCepArgB%7DaB%7BcBidAafAoRejBP%7DtDmF%7DvClK%7D%7EAv%60%40kgAjyFz%60%40%7DBcw%40%7ENhGhBwBb%40iBvDgAfZv%40iLrw%40%60NpxEf%5BvfB"
};

function createZooplaIndexedUrl(baseUrl: string, index: number): string {
  return baseUrl + `&pn=${index}`
}

function createZooplaIndexedUrls(baseUrl: string, startingIndex: number, endingIndex: number, step: number): string[] {
  const outputUrls: string[] = [];
  for (let i = startingIndex; i < endingIndex; i += step) {
    outputUrls.push(createZooplaIndexedUrl(baseUrl, i));
  }
  return outputUrls;
}

function buildZooplaListingUrls(listingIds: string[]) {
  return listingIds.map(id => `https://zoopla.co.uk/for-sale/details/${id}`);
}

const url = SearchUrls[currentCategory];

const extraHTTPHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br'
}

const runZooplaScrape = async () => {
  const startingIndex = 1;
  const endingIndex = 4;
  const step = 1; // zoopla default
  const indexPageUrls = createZooplaIndexedUrls(url, startingIndex, endingIndex, step);

  // purgeRequestQueueFolder();

  // Find the pages
  config.set("defaultDatasetId", "indexing-zoopla-" + currentCategory);
  config.set("defaultKeyValueStoreId", "indexing-zoopla-" + currentCategory);
  config.set("defaultRequestQueueId", Date.now() + "-indexing-zoopla");


  const crawler = createZooplaListingFinder();
  console.log(indexPageUrls)

  const indexerRequests = indexPageUrls;
  // .map(url => ({
  //   url,
  //   headers: extraHTTPHeaders,
  // }));

  await crawler.run(indexerRequests);

  const newListings = (await Dataset.getData<IndexPage>()).items.flatMap(x => x.listings);
  const allDataset = await Dataset.open<{ listings: ZooplaListing[] }>("all-zoopla");
  const allOldData = (await allDataset.getData()).items.flatMap(x => x.listings);

  const listingIdToAdDate = new Map<number, Date>();
  for (const listing of newListings) {
    listingIdToAdDate.set(parseInt(listing.listingId), listing.listingDate ? new Date(listing.listingDate) : new Date());
  }

  // Record which category these listings belong to
  const forCategoryDataset = await Dataset.open<ListingIdDataset>(`search-rightmove-${currentCategory}`);
  const oldForCategory = (await forCategoryDataset.getData()).items.flatMap(x => x.listingIds);
  const forCategorySet = new Set(oldForCategory);
  await forCategoryDataset.pushData({ listingIds: newListings.map(x => Number(x.listingId)).filter(x => !forCategorySet.has(x)) });
  const listingIdsForThisSearch = new Set<number>((await forCategoryDataset.getData()).items.flatMap(x => x.listingIds));

  config.set("defaultDatasetId", "scraping-zoopla-" + currentCategory);
  config.set("defaultKeyValueStoreId", "scraping-zoopla-" + currentCategory);
  config.set("defaultRequestQueueId", (Date.now()).toString() + "scraping-zoopla-" + currentCategory);
  const seenBeforeIds = new Set<number>();
  (await allDataset.getData()).items.flatMap(x => x.listings).forEach(x => seenBeforeIds.add(x.listingId));

  const listingScraper = createZooplaListingScraper(listingIdToAdDate);
  const newListingIds = newListings.map(x => x.listingId).filter(x => !seenBeforeIds.has(Number(x)));
  const unscrapedListingUrls = buildZooplaListingUrls(newListingIds);


  const scraperRequests = unscrapedListingUrls;

  await listingScraper.run(scraperRequests); // list of urls -> list of requests

  const allNewData = (await Dataset.getData<ZooplaListing>()).items.filter(x => !seenBeforeIds.has(x.listingId));
  console.log(`${allNewData.length} new results (out of ${newListingIds.length} found)`)
  const oldCurrentDataset = await Dataset.open<{ listings: ZooplaListing[] }>("current-zoopla");
  await oldCurrentDataset.drop();

  const currentDataset = await Dataset.open<{ listings: ZooplaListing[] }>("current-zoopla");
  const currentData = filterUnique([...allOldData, ...allNewData].filter(x => listingIdsForThisSearch.has(x.listingId)));

  await allDataset.pushData({ listings: allNewData })
  await currentDataset.pushData({ listings: currentData });
};

runZooplaScrape();