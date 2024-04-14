// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, Dataset } from "crawlee";
import { Categories } from "./run-scrape";

interface GumtreeListing {
  title: string;
  price: string;
  adDate: Date;
  itemUrl: string;
  location: string | null;
}

interface GumtreePage {
  count: number;
  pageUrl: string;
  results: GumtreeListing[];
}

function stripAdAge(text: string): string {
  const strippedText = text.replace("Ad posted", "").replace("ago", "").trim();
  return strippedText;
}

function terminateFromTitle(title: string): boolean {
  const pattern = /Page (\d+)\/(\d+)/;
  const matches = pattern.exec(title);

  if (matches) {
    const first_number = matches[1];
    const second_number = matches[2];
    console.log(first_number, second_number);
    return first_number === second_number;
  } else {
    return false;
  }
}

function parseAdDate(text: string): Date {
  if (text.includes("URGENT")) {
    return new Date();
  }
  const strippedText = stripAdAge(text);
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (!strippedText.includes("days")) return date;

  const daysAdPosted = Number(strippedText.split(" ")[0]);
  date.setDate(date.getDate() - daysAdPosted);
  return date;
}
export function createCrawler(
  daysOldLimit: number,
  paginationLimit = 100,
  url: Categories
) {
  let count = 1;
  const crawler = new PlaywrightCrawler({
    async requestHandler({ request, page, log, saveSnapshot }) {
      const pageTitle = await page.title();
      log.info(`Title of ${request.loadedUrl} is '${pageTitle}'`);

      const results: GumtreeListing[] = [];
      let areFreshResults = false;
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - daysOldLimit);

      const naturalresults = await page.$('[data-q="naturalresults"]');
      if (naturalresults === null) {
        log.info("No results found on page");
        return;
      }
      const listings = await naturalresults.$$(".listing-link");
      for (const listing of listings) {
        const link = await listing.getAttribute("href");
        const title = await listing.$eval(
          ".listing-title",
          (element) => element.textContent
        );
        const price = await listing.$eval(
          ".listing-price",
          (element) => element.textContent
        );
        const location = await listing.$eval(
          ".listing-location",
          (element) => element.textContent
        );
        if (title === null || price === null || link === null) {
          log.warning("Skipping null item:", { title, price, link });
          continue;
        }

        const adAgeText =
          (await listing.$eval(
            ".listing-posted-date",
            (element) => element.textContent
          )) || "0";

        const adDate = parseAdDate(adAgeText);
        if (adDate > dateLimit) areFreshResults = true;
        results.push({
          title,
          price,
          adDate,
          itemUrl: link,
          location: location,
        });
      }
      const pageResults: GumtreePage = {
        count,
        pageUrl: request.url,
        results,
      };
      await Dataset.pushData(pageResults);

      if (terminateFromTitle(pageTitle)) {
        log.info("Terminating as the last page was reached.");
        return;
      }
      if (!areFreshResults) {
        log.info("Terminating as the results are too old.");
        return;
      }
      if (count >= paginationLimit) {
        log.info("Terminating as the pagination limit was reached.");
        return;
      }
      count++;
      const nextUrl = `${url}${count}`;
      log.info(`Adding next page: ${nextUrl}`);
      await crawler.addRequests([nextUrl]);
    },
    // Uncomment this option to see the browser window.
    headless: true,
  });
  return crawler;
}
