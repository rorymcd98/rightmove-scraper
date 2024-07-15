import { PlaywrightCrawler, Dataset, Log, Request } from "crawlee";
import { ElementHandle, Page } from "playwright";
import { IndexPage, IndexedListing, Tenure } from "../../types";


/// Gets the listings from a page

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

function convertDayString(dayString: string): number {
  return parseInt(dayString.replace(/\D/g, ''));
}

// Just searches the page for a <p>freehold || leasehold || sharehold</p>
async function findTenureBackupAsync(page: Page): Promise<Tenure | undefined> {
  const tenures = await page.$$eval("p", (ps) => {
    return ps
      .map(p => p.textContent?.toLowerCase()) // transform to lower case
      .filter(text => text === 'freehold' || text === 'leasehold' || text === 'share of freehold' || text === 'shared ownership'); // strict equality check
  });

  return tenures[0]
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
  const day = convertDayString(dayString);

  return new Date(year, month - 1, day);
}

// Parses a string containing a date into a date, or returns undefined if it is unable to
async function getDateFromListingEleAsync(listing: ElementHandle<SVGElement | HTMLElement>): Promise<Date | undefined> {
  // In the format `Listed on 1st Apr 2024`
  const lastListingDateEle = await listing.$(".jlg7241");
  const lastListingDateText = await lastListingDateEle?.innerText();
  if (lastListingDateText == undefined) return undefined;
  return getDateFromDateChangedText(lastListingDateText);
}

// Find all the listings on page 1, 2, 3, 4... 
export function createOnTheMarketListingFinder() {
  const crawler = new PlaywrightCrawler({
    async requestHandler({ request, page, log }) {
      const listings = await page.$$(".otm-PropertyCard");

      log.info(`Getting results for url ${request.loadedUrl?.split(".com")[1]}`)
      const results: IndexedListing[] = [];

      if (listings.length == 0) {
        log.info(`No listings found for the url ${request.loadedUrl}, terminating`);
        return;
      }

      log.info("Found: " + listings.length);

      for (const listing of listings) {
        const firstChild = await listing.$("div");
        const listingId = await firstChild?.getAttribute("id");// should be in the form property-{propertyId}
        const propertyId = listingId?.split("-")?.[1];

        const listingDate = new Date();

        if (propertyId == null) {
          log.error("Could not find propertyId for listingId:", { listingId });
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
