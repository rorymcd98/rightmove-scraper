import { PlaywrightCrawler, Dataset, Log, Request } from "crawlee";
import { Page } from "playwright";
import { ListingDebug, RightmoveListing, Tenure } from "../../types";
import { findSquareFootageNlpAsync } from "../nlp-sqft";
import { getSquareFootageFromGptAsync } from "../gpt-sqft";
import { findAllRightmoveImagesAsync } from "../find-images";


///////////// Scrapes data from individual listings

function getDateFromAddedOrReducedString(addedOrReduced: string): Date {
  const englishDate = addedOrReduced.split(" on")[1];
  if (englishDate == undefined) return new Date(0);
  const englishDateArray = englishDate?.split("/");
  return new Date(`${englishDateArray[2]}/${englishDateArray[1]}/${englishDateArray[0]}`);
}

export function getIdFromUrl(url: string): number {
  const justTheId = url.split("properties/")[1].split("/")[0];
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
  const priceString = await findElementsStartingWithAsync(page, "span", "£");
  const rawPrice_pounds = priceString.at(0)?.replace(",", "").replace("£", "");
  if (rawPrice_pounds == undefined) {
    log.warning("Expected to find a price but didn't");
    return;
  }
  return parseInt(rawPrice_pounds);
}

export function getDateFromDateChangedText(dateChangeText: string | null) {
  if (dateChangeText == undefined) {
    return;
  }

  if (dateChangeText.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  if (dateChangeText.includes('today')) {
    return new Date();
  }

  return getDateFromAddedOrReducedString(dateChangeText);
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

  switch (tenures[0]) {
    case "freehold":
    case "share of freehold":
    case "leasehold":
    case "shared ownership":
      return tenures[0];
    case "share":
      return "share of freehold";
    default:
      return undefined
  }
}

async function findTenureAsync(page: Page, log: Log): Promise<Tenure> {
  const tenureString = "Tenure: ";
  const tenureElements = await findElementsStartingWithAsync(page, "h2", tenureString);
  let tenureValue = tenureElements?.at(0)?.replace(tenureString, "").split(" ")[0].trim().toLowerCase();
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

async function findSquareFootageAsync(page: Page, log: Log, request: Request): Promise<[number, ListingDebug["footageResolution"]] | undefined> {
  const squareFootElements = await findElementsEndingWithAsync(page, "p", " sq ft");
  const squareFootValue = squareFootElements?.at(0)?.replace(" sq ft", "");
  if (squareFootValue == undefined) {
    var nlpSquareFootage = await findSquareFootageNlpAsync(page);
    if (nlpSquareFootage == undefined) {
      // do the chat gpt thing here
      const squareFootageFromGpt = await getSquareFootageFromGptAsync(page, log, "rightmove");
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
export function createRightmoveListingScraper() {
  const crawler = new PlaywrightCrawler({
    async requestHandler({ request, page, log, saveSnapshot }) {
      const pageTitle = await page.title();
      log.info(`Title of ${request.loadedUrl} is '${pageTitle}'`);

      if (request.loadedUrl == undefined) {
        log.error("Expected the url to not be null - terminating")
        return;
      }
      const listingId = getIdFromUrl(request.loadedUrl);

      const squareFootageValue = await findSquareFootageAsync(page, log, request);

      if (squareFootageValue == undefined) {
        log.warning(`$Listing doesn't have square footage`);
      }

      const addedOrReducedDate = await findAddedOrReducedDateOnListingAsync(page, log);

      const rawPriceNumber_pounds = await findPriceInPoundsAsync(page, log);

      const tenureValue = await findTenureAsync(page, log);

      const imageUrls = await findAllRightmoveImagesAsync(page);

      const splitTitle = splitString(pageTitle, ", ");
      const titleMain = splitTitle[0];
      const location = splitTitle[1];

      const listingDetails: RightmoveListing =
      {
        listingId: listingId,
        url: request.loadedUrl,
        title: titleMain,
        location: location,
        adDate: addedOrReducedDate ?? null,
        description: null,
        imageUrls: imageUrls,
        price: rawPriceNumber_pounds ?? 0,
        tenure: tenureValue,
        squareFootage: squareFootageValue?.[0] ?? null,
        debug: {
          footageResolution: squareFootageValue?.[1] ?? "unresolved",
        },
        site: "rightmove",
      };

      // Push the list of urls to the dataset
      await Dataset.pushData<RightmoveListing>(listingDetails);
    },
    // Uncomment this option to see the browser window.
    headless: true,
  });
  return crawler;
}