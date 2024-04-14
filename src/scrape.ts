// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, Dataset, Log, Request } from "crawlee";
import { ElementHandle, Page } from "playwright";
import { IndexPage, ListingDebug, RightmoveListing, Tenure } from "./types";
import { findSquareFootageNlpAsync } from "./npl-sqft";
import { getSquareFootageFromGptAsync } from "./gpt-sqft";
import { findAllImagesAsync } from "./find-images";


///////////// Scrape data from individual listings

function getIdFromUrl(url: string): number {
  const justTheId = url.split("properties/")[1].split("/")[0];
  return parseInt(justTheId);
}

async function findElementsEndingWithAsync(page: Page, elementType: string, endsWith: string): Promise<(string | null)[]>{
  return findElementsEndingWithsAsync(page, elementType, [endsWith]);
}

async function findElementsEndingWithsAsync(page: Page, elementType: string, endsWiths: string[]): Promise<(string | null)[]>{
  const candidates = await page.$$eval(elementType, (divs, candidates) => {
    return divs.filter(d => candidates.some(cand => d.innerHTML.endsWith(cand), candidates)).map(el => el.textContent);
  }, endsWiths);

  return candidates;
}

async function findElementsStartingWithAsync(page: Page, elementType: string, startsWith: string): Promise<(string | null)[]>{
  return findElementsStartingWithsAsync(page, elementType, [startsWith]);
}

async function findElementsStartingWithsAsync(page: Page, elementType: string, startsWiths: string[]): Promise<(string | null)[]>{
  const candidates = await page.$$eval(elementType, (divs, candidates) => {
    return divs.filter(d => candidates.some(cand => d.innerHTML?.startsWith(cand))).map(el => el.textContent);
  }, startsWiths);

  return candidates;
}

async function findPriceInPoundsAsync(page: Page, log: Log){
  const priceString = await findElementsStartingWithAsync(page, "span", "£");
  const rawPrice_pounds = priceString.at(0)?.replace(",", "").replace("£", "");
  if(rawPrice_pounds == undefined){
    log.warning("Expected to find a price but didn't");
    return;
  }
  return parseInt(rawPrice_pounds);
}

async function findAddedOrReducedDateAsync(page: Page, log: Log){
  const datesList = ["Added ", "Reduced "];
  const addedOrReduced = await findElementsStartingWithsAsync(page, "div", datesList);
  const dateChangeText = addedOrReduced?.[0];
 
  if(dateChangeText == undefined){
    log.warning(`Expected to find a 'div' starting with "added on" or "reduced on" but didn't`);
    return;
  }
  
  if(dateChangeText.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  if(dateChangeText.includes('today')) {
    return new Date();
  }
  
  return getDateFromAddedOrReducedString(dateChangeText);
}

// Just searches the page for a <p>freehold || leasehold || sharehold</p>
async function findTenureBackupAsync(page: Page): Promise<Tenure | undefined>{
  const tenures = await page.$$eval("p", (ps) => {
    return ps
      .map(p => p.textContent?.toLowerCase()) // transform to lower case
      .filter(text => text === 'freehold' || text === 'leasehold' || text === 'sharehold'); // strict equality check
  });

  switch(tenures[0]){
    case "freehold":
    case "sharehold":
    case "leasehold":
      return tenures[0];
    case "share":
      return "sharehold";
    default:
      return undefined
  }
}

async function findTenureAsync(page: Page, log: Log): Promise<Tenure>{
  const tenureString = "Tenure: ";
  const tenureElements = await findElementsStartingWithAsync(page, "h2", tenureString);
  let tenureValue = tenureElements?.at(0)?.replace(tenureString, "").split(" ")[0].trim().toLowerCase();
  // If we didn't manage to find it, resort to the backup
  tenureValue = tenureValue ?? await findTenureBackupAsync(page);

  switch(tenureValue){
    case undefined:
      log.warning("Could not find tenure information");
      return "none";
    case "freehold":
    case "sharehold":
    case "leasehold":
      return tenureValue;
    case "share":
      return "sharehold";
    default: {
      log.info(`Tenure value of '${tenureValue}' is not recongised`)
      return "other"; 
    }
  }
}

async function findSquareFootageAsync(page: Page, log: Log, request: Request): Promise<[number, ListingDebug["footageResolution"]] | undefined> {
  const squareFootElements = await findElementsEndingWithAsync(page, "p", " sq ft");
  const squareFootValue = squareFootElements?.at(0)?.replace(" sq ft", "");
  if(squareFootValue == undefined) {
    var nlpSquareFootage = await findSquareFootageNlpAsync(page);
    if (nlpSquareFootage == undefined){
      // do the chat gpt thing here
      const squareFootageFromGpt = await getSquareFootageFromGptAsync(page, log);
      if (squareFootageFromGpt == undefined) return;
      return [squareFootageFromGpt, "gpt-image"]; 
    }
    return [nlpSquareFootage, "in-text"];
  }
  return [parseInt(squareFootValue), "listed"];  
}

function splitString(str: string, delimeter: string) {
  var splitPoint = str.indexOf(delimeter);
  var firstPart = str.substring(0, splitPoint);
  var secondPart = str.substring(splitPoint + 2);
  return [firstPart, secondPart];
}

// Get the data from each listing
export function createListingScraper() {
  const crawler = new PlaywrightCrawler({
    async requestHandler({ request, page, log, saveSnapshot }) {
      const pageTitle = await page.title();
      log.info(`Title of ${request.loadedUrl} is '${pageTitle}'`);
      
      if (request.loadedUrl == undefined){
        log.error("Expected the url to not be null - terminating")
        return;
      }
      const listingId = getIdFromUrl(request.loadedUrl);

      const squareFootageValue = await findSquareFootageAsync(page, log, request);

      if (squareFootageValue == undefined){
        log.warning(`$Listing doesn't have square footage`);
      }

      const addedOrReducedDate = await findAddedOrReducedDateAsync(page, log);

      const rawPriceNumber_pounds = await findPriceInPoundsAsync(page, log);

      const tenureValue = await findTenureAsync(page, log);
  
      const imageUrls = await findAllImagesAsync(page);

      const splitTitle = splitString(pageTitle, ", ");
      const titleMain = splitTitle[0];
      const location = splitTitle[1];

      const indexPage: RightmoveListing = 
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
          }
        };

    // Push the list of urls to the dataset
    await Dataset.pushData<RightmoveListing>(indexPage);
    },
    // Uncomment this option to see the browser window.
    headless: true,
  });
  return crawler;
}

///////////// Find listing links


function getDateFromAddedOrReducedString(addedOrReduced: string): Date{
  return new Date(addedOrReduced.split(" on")[1]);
}

// Parses a string containing a date into a date, or returns undefined if it is unable to
async function getDateFromListingEleAsync(listing: ElementHandle<SVGElement | HTMLElement>): Promise<Date | undefined> {
  const lastListingDateEle = await listing.$(".propertyCard-branchSummary-addedOrReduced");
  const lastListingDateText = await lastListingDateEle?.innerText();
  if(lastListingDateText == undefined) return undefined;
  return getDateFromAddedOrReducedString(lastListingDateText); 
}

// Find all the listings on page 1, 2, 3, 4... 
export function createListingFinder(notBefore: Date) {
  const crawler = new PlaywrightCrawler({
    async requestHandler({ request, page, log, saveSnapshot }) {
      log.info(`Getting results for url ${request.loadedUrl?.split(".co.uk")[1]}`)
      const results: string[] = [];
      const listings = await page.$$(".l-searchResult");

      if (listings.length == 0) {
        log.info(`No listings found for the url ${request.loadedUrl}, terminating`);
        return;
      }

      log.info("Found: " +  listings.length);


      for (const listing of listings) {
        const listingId = await listing.getAttribute("id");// should be in the form property-{propertyId}
        const propertyId = listingId?.split("-")[1];

        if (propertyId == null) {
          log.warning("Could not find propertyId for listingId:", {listingId});
          continue;
        }

        results.push(propertyId);
      }

      const indexPage: IndexPage = {
        url: request.loadedUrl ?? null, 
        listingUrls: results, 
        dateFound: new Date()
      };

      // Push the list of urls to the dataset
      await Dataset.pushData<IndexPage>(indexPage);

      // Determine if the last listing is too old
      const listingDate = await getDateFromListingEleAsync(listings.at(-1)!);
      if (listingDate == undefined || listingDate < notBefore) {
        log.info("Reached listings which were too old, returning. (This assumes we're searching from newest first)")
      }
    },
    // Uncomment this option to see the browser window.
    headless: true,
  });
  return crawler;
}
