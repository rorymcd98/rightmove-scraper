import { PlaywrightCrawler, Dataset, Log, Request } from "crawlee";
import { Page } from "playwright";
import { ListingDebug, OnTheMarketListing, Tenure } from "../../types";
import { findSquareFootageNlpAsync } from "../nlp-sqft";
import { getSquareFootageFromGptAsync } from "../gpt-sqft";
import { findAllOnTheMarketImagesAsync } from "../find-images";
import { getNearestStationsAsync } from "./onthemarket-stations";

///////////// Scrape data from individual listings

export function getIdFromUrl(url: string): number {
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
  const priceStrings = await findElementsStartingWithAsync(page, "a", "£");
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

async function findTenureAsync(page: Page, log: Log): Promise<Tenure> {
  const upperCandidates = ["Freehold", "Leasehold", "Share of free", "Shared"];
  const lowerCandidates = upperCandidates.map(c => c.toLowerCase());
  const allCandidates = [...lowerCandidates, ...upperCandidates];

  const tenureElements = await findElementsStartingWithsAsync(page, "span", allCandidates);
  let tenureValue = tenureElements.at(0)?.toLowerCase();

  //This backup doesn't work because every page has 'shared ownership' on it 
  // tenureValue = tenureValue ?? await findTenureBackupAsync(page);

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
      // One last attempt at resolution
      if (tenureValue && typeof tenureValue === 'string') {
        if (tenureValue.toLowerCase().includes("freehold")) {
          return "freehold";
        } else if (tenureValue.toLowerCase().includes("leasehold")) {
          return "leasehold";
        } else if (tenureValue.toLowerCase().includes("shared")) {
          return "shared ownership";
        } else if (tenureValue.toLowerCase().includes("share")) {
          return "share of freehold";
        }
      }
      log.info(`Tenure value of '${tenureValue}' is not recongised`)
      return "other";
    }
  }
}

async function findSquareFootageAsync(page: Page, log: Log): Promise<[number, ListingDebug["footageResolution"]] | undefined> {
  const squareFootSibling = await page.$("svg[data-icon=ruler-combined]");
  const squareFootParent = await squareFootSibling?.evaluateHandle((node) => node.parentElement);

  // This should be in the form `512 sq ft / 49 sq m`
  const squareAreaValue = await squareFootParent?.asElement()?.innerText();
  const squareFootValue = squareAreaValue?.split(" sq ft").at(0);

  if (squareFootValue == undefined || Number.isInteger(parseInt(squareFootValue))) {
    var nlpSquareFootage = await findSquareFootageNlpAsync(page);
    if (nlpSquareFootage == undefined) {
      // do the chat gpt thing here
      const squareFootageFromGpt = await getSquareFootageFromGptAsync(page, log, "onthemarket");
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
export function createOnTheMarketListingScraper(listingIdToDateMap: Map<number, Date>) {
  const crawler = new PlaywrightCrawler({
    async requestHandler({ request, page, log }) {
      const pageTitle = await page.title();
      log.info(`Title of ${request.loadedUrl} is '${pageTitle}'`);

      if (request.loadedUrl == undefined) {
        log.error("Expected the url to not be null - terminating")
        return;
      }
      const listingId = getIdFromUrl(request.loadedUrl);

      const rawPriceNumber_pounds = await findPriceInPoundsAsync(page, log);

      const tenureValue = await findTenureAsync(page, log);

      const imageUrls = await findAllOnTheMarketImagesAsync(page);

      const squareFootageValue = await findSquareFootageAsync(page, log);

      const stationNames = await getNearestStationsAsync(page);

      if (squareFootageValue == undefined) {
        log.warning(`$Listing doesn't have square footage`);
      }

      const splitTitle = splitString(pageTitle, ", ");
      const titleMain = splitTitle[0];
      const location = splitTitle[1];

      const indexPage: OnTheMarketListing =
      {
        listingId: listingId,
        url: request.loadedUrl,
        title: titleMain,
        location: location,
        adDate: listingIdToDateMap.get(listingId) ?? new Date(),
        description: null,
        imageUrls: imageUrls,
        price: rawPriceNumber_pounds ?? 0,
        tenure: tenureValue,
        squareFootage: squareFootageValue?.[0] ?? null,
        debug: {
          footageResolution: squareFootageValue?.[1] ?? "unresolved",
        },
        site: "onthemarket",
        nearestStations: stationNames
      };

      // Push the list of urls to the dataset
      await Dataset.pushData<OnTheMarketListing>(indexPage);
    },
    // Uncomment this option to see the browser window.
    headless: true,
  });
  return crawler;
}