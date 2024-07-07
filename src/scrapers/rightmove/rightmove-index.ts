import { PlaywrightCrawler, Dataset } from "crawlee";
import { ElementHandle } from "playwright";
import { getDateFromDateChangedText } from "./rightmove-scrape";
import { IndexedListing, IndexPage } from "../../types";

  
///////////// Gets the listing urls / ids from a page of listings

  // Parses a string containing a date into a date, or returns undefined if it is unable to
  async function getDateFromListingEleAsync(listing: ElementHandle<SVGElement | HTMLElement> | undefined): Promise<Date | undefined> {
    if(listing == null) return;
    const lastListingDateEle = await listing.$(".propertyCard-branchSummary-addedOrReduced");
    const lastListingDateText = await lastListingDateEle?.innerText();
    if(lastListingDateText == undefined) return undefined;
    return getDateFromDateChangedText(lastListingDateText); 
  }
  
  // Find all the listings on page 1, 2, 3, 4... 
  export function createRightmoveListingFinder(notBefore: Date) {
    const crawler = new PlaywrightCrawler({
      async requestHandler({ request, page, log }) {
        // Determine if the last listing is too old
        const listings = await page.$$(".l-searchResult");
        const listingDate = await getDateFromListingEleAsync(listings.at(2));
        if (listingDate == undefined || listingDate < notBefore) {
          log.info("Reached listings which were too old, returning. (This assumes we're searching from newest first)");
      
          const indexOfCurrentRequest = crawler.requestList?.requests.map(x => x.url).indexOf(request.url);
      
          // Make the request list only go up to indexOfCurrentRequest
          let requestDict = crawler.requestList?.requests;
          if (indexOfCurrentRequest !== -1 &&  requestDict != undefined) {
            requestDict = requestDict.slice(0, indexOfCurrentRequest);
          }
      
          return;
      }
  
        log.info(`Getting results for url ${request.loadedUrl?.split(".co.uk")[1]}`)
        const results: IndexedListing[] = [];
  
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
  
          const listingDate = await getDateFromListingEleAsync(listing);
  
          results.push({listingId: propertyId, listingDate: listingDate});
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
  