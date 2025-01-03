// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, Dataset, Log, Request } from "crawlee";
import { ElementHandle, Page } from "playwright";
import { IndexPage, IndexedListing, ListingDebug, ZooplaListing, Tenure } from "../../types";
import { findSquareFootageNlpAsync } from "../nlp-sqft";
import { getRoomDimensionsFromGptAsync, getSquareFootageFromGptAsync } from "../gpt-sqft";
import { findAllZooplaImagesAsync } from "../find-images";
import { getNearestStationsAsync } from "./zoopla-stations";
import currentCategory from "../../set-category";


///////////// Scrape data from individual listings

export function getIdFromUrl(url: string): number {
  console.log(url)
  const justTheId = url.split("details/")[1].split("/")[0];
  return parseInt(justTheId);
}

async function findElementsEndingWithAsync(page: Page, elementType: string, endsWith: string): Promise<(string | null)[]> {
  return findElementsEndingWithsAsync(page, elementType, [endsWith]);
}

async function findElementsEndingWithsAsync(page: Page, elementType: string, endsWiths: string[]): Promise<(string | null)[]> {
  const candidates = await page.$$eval(elementType, (divs, candidates) => {
    return divs.filter(d => candidates.some(cand => d.innerHTML.endsWith(cand), candidates)).map(el => el.textContent);
  }, endsWiths);

  return candidates;
}

async function findElementsStartingWithAsync(page: Page, elementType: string, startsWith: string): Promise<(string | null)[]> {
  return findElementsStartingWithsAsync(page, elementType, [startsWith]);
}

async function findElementsStartingWithsAsync(page: Page, elementType: string, startsWiths: string[]): Promise<(string | null)[]> {
  const candidates = await page.$$eval(elementType, (divs, candidates) => {
    return divs.filter(d => candidates.some(cand => d.innerHTML?.startsWith(cand))).map(el => el.textContent);
  }, startsWiths);

  return candidates;
}

async function findPriceInPoundsAsync(page: Page, log: Log) {
  const priceStrings = await findElementsStartingWithAsync(page, "p", "£");
  const rawPrice_pounds = priceStrings.map(price => parseInt(price?.replace(",", "").replace("£", "") ?? "0"));
  let maxPrice = 0;
  for (let price of rawPrice_pounds) {
    maxPrice = Math.max(maxPrice, price);
  }
  if (maxPrice < 20_000) {
    log.warning("Expected to find a price but didn't");
    return;
  }
  return maxPrice;
}


function convertMonthString(monthString: string): number {
  monthString = monthString.toLowerCase();
  if (monthString.startsWith("jan")) return 1;
  if (monthString.startsWith("feb")) return 2;
  if (monthString.startsWith("mar")) return 3;
  if (monthString.startsWith("apr")) return 4;
  if (monthString.startsWith("may")) return 5;
  if (monthString.startsWith("jun")) return 6;
  if (monthString.startsWith("jul")) return 7;
  if (monthString.startsWith("aug")) return 8;
  if (monthString.startsWith("sep")) return 9;
  if (monthString.startsWith("oct")) return 10;
  if (monthString.startsWith("nov")) return 11;
  if (monthString.startsWith("dec")) return 12;
  return 0;
}

function converDayString(dayString: string): number {
  return parseInt(dayString.replace(/\D/g, ''));
}

//Converts `Listed on 1st Apr 2024` to a Date
function getDateFromDateChangedText(dateChangeText: string | null) {
  if (dateChangeText == undefined) {
    return;
  }

  const dateChangeStrings = dateChangeText.split(" ");
  if (dateChangeStrings.length < 3) {
    return;
  }

  const yearString = dateChangeStrings.at(-1) ?? "blah";
  const monthString = dateChangeStrings.at(-2) ?? "jan";
  const dayString = dateChangeStrings.at(-3) ?? "1st";

  const year = parseInt(yearString);
  const month = convertMonthString(monthString);
  const day = converDayString(dayString);

  return new Date(year, month - 1, day);
}

async function findAddedOrReducedDateOnListingAsync(page: Page, log: Log) {
  const datesList = ["Added ", "Reduced "];
  const addedOrReduced = await findElementsStartingWithsAsync(page, "div", datesList);
  const dateChangeText = addedOrReduced?.[0];

  return getDateFromDateChangedText(dateChangeText);
}

// Just searches the page for a <p>freehold || leasehold || sharehold</p>
async function findTenureBackupAsync(page: Page): Promise<Tenure | undefined> {
  const tenures = await page.$$eval("p", (ps) => {
    return ps
      .map(p => p.textContent?.toLowerCase()) // transform to lower case
      .filter(text => text === 'freehold' || text === 'leasehold' || text === 'share of freehold' || text === 'shared ownership'); // strict equality check
  });

  return tenures[0];
}

async function findTenureAsync(page: Page, log: Log): Promise<Tenure> {
  const tenureElements = await findElementsStartingWithsAsync(page, "div", ["Freehold", "Leasehold", "Share of free", "Shared"]);
  let tenureValue = tenureElements.at(0)?.toLowerCase();
  // If we didn't manage to find it, resort to the backup
  tenureValue = tenureValue ?? await findTenureBackupAsync(page);

  switch (tenureValue) {
    case undefined:
      log.warning("Could not find tenure information");
      return "none";
    case "freehold":
    case "leasehold":
      return tenureValue;
    case "shared":
      return "shared ownership"
    case "share":
      return "share of freehold";
    default: {
      log.info(`Tenure value of '${tenureValue}' is not recongised`)
      return "other";
    }
  }
}

async function findSquareFootageAsync(page: Page, log: Log, request: Request, identifier: string): Promise<[number, ListingDebug["footageResolution"]] | undefined> {
  const squareFootElements = await findElementsEndingWithAsync(page, "div", " sq. ft");
  const squareFootValue = squareFootElements?.at(0)?.replace(" sq. ft", "");
  if (squareFootValue == undefined) {
    var nlpSquareFootage = await findSquareFootageNlpAsync(page);
    if (nlpSquareFootage == undefined) {
      // do the chat gpt thing here
      const squareFootageFromGpt = await getSquareFootageFromGptAsync(page, log, "zoopla", identifier);
      if (squareFootageFromGpt == undefined) return;
      return [squareFootageFromGpt, "gpt-image"];
    }
    return [nlpSquareFootage, "in-text"];
  }
  return [parseInt(squareFootValue.replace(",", "")), "listed"];
}

function splitString(str: string, delimeter: string) {
  var splitPoint = str.indexOf(delimeter);
  var firstPart = str.substring(0, splitPoint);
  var secondPart = str.substring(splitPoint + 2);
  return [firstPart, secondPart];
}

// Get the data from each listing
export function createZooplaListingScraper(listingIdToDateMap: Map<number, Date>) {
  const crawler = new PlaywrightCrawler({
    maxConcurrency: 5,
    retryOnBlocked: true,
    async requestHandler({ request, page, log }) {
      const pageTitle = await page.title();
      log.info(`Title of ${request.url} is '${pageTitle}'`);

      if (request.url == undefined) {
        log.error("Expected the url to not be null - terminating")
        return;
      }
      const listingId = getIdFromUrl(request.url);
      const identifier = listingId + "zoopla";

      const rawPriceNumber_pounds = await findPriceInPoundsAsync(page, log);

      const tenureValue = await findTenureAsync(page, log);

      const imageUrls = await findAllZooplaImagesAsync(page);

      const splitTitle = splitString(pageTitle, ", ");
      const titleMain = splitTitle[0];
      const location = splitTitle[1];

      const nearestStations = await getNearestStationsAsync(page);

      const squareFootageValue = await findSquareFootageAsync(page, log, request, identifier);
      if (squareFootageValue == undefined) {
        log.warning(`$Listing doesn't have square footage`);
      }
      const roomDimensions = await getRoomDimensionsFromGptAsync(page, log, "zoopla", identifier);

      const indexPage: ZooplaListing =
      {
        listingId: listingId,
        url: request.loadedUrl,
        title: titleMain,
        location: location,
        adDate: listingIdToDateMap.get(listingId) ?? null,
        description: null,
        imageUrls: imageUrls,
        price: rawPriceNumber_pounds ?? 0,
        tenure: tenureValue,
        squareFootage: squareFootageValue?.[0] ?? null,
        roomDimensions: roomDimensions,
        debug: {
          footageResolution: squareFootageValue?.[1] ?? "unresolved",
        },
        site: "zoopla",
        nearestStations: nearestStations
      };

      // Push the list of urls to the dataset
      await Dataset.pushData<ZooplaListing>(indexPage);
    },
    // Uncomment this option to see the browser window.
    headless: true,
  });
  return crawler;
}

///////////// Find listing links

// Parses a string containing a date into a date, or returns undefined if it is unable to
async function getDateFromListingEleAsync(listing: ElementHandle<SVGElement | HTMLElement>): Promise<Date | undefined> {
  // In the format `Listed on 1st Apr 2024`
  const lastListingDateEle = await listing.$(".jlg7241");
  const lastListingDateText = await lastListingDateEle?.innerText();
  if (lastListingDateText == undefined) return undefined;
  return getDateFromDateChangedText(lastListingDateText);
}

// Find all the listings on page 1, 2, 3, 4... 
export function createZooplaListingFinder() {
  const crawler = new PlaywrightCrawler({
    persistCookiesPerSession: true,
    maxConcurrency: 5,
    retryOnBlocked: true,
    async requestHandler({ request, page, log }) {
      const listings = await page.$$(".dkr2t83");

      log.info(`Getting results for url ${request.loadedUrl?.split(".co.uk")[1]}`)
      const results: IndexedListing[] = [];

      if (listings.length == 0) {
        log.info(`No listings found for the url ${request.loadedUrl}, terminating`);
        return;
      }

      log.info("Found: " + listings.length);


      for (const listing of listings) {
        const listingId = await listing.getAttribute("id");// should be in the form property-{propertyId}
        const propertyId = listingId?.split("_")[1];
        const listingDate = await getDateFromListingEleAsync(listing);

        if (propertyId == null) {
          log.warning("Could not find propertyId for listingId:", { listingId });
          continue;
        }

        results.push({ listingId: propertyId, listingDate: listingDate });
      }

      const indexPage: IndexPage = {
        url: request.loadedUrl ?? null,
        listings: results,
        dateFound: new Date()
      };

      // Push the list of urls to the dataset
      await Dataset.pushData<IndexPage>(indexPage);
    },
    // Uncomment this option to see the browser window.
    headless: true,
  });
  return crawler;
}
