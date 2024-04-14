import { Configuration } from "crawlee";
import { createCrawler } from "./scrape";
import fs from "fs";
const config = Configuration.getGlobalConfig();
config.set("purgeOnStart", false);

function purgeRequestQueueFolder() {
  const path = "./storage/request_queues/";
  const files = fs.readdirSync(path);
  for (const file of files) {
    fs.unlinkSync(path + file);
  }
}

import prod, { Prod } from "./set-prod";

const Categories = {
  [Prod.general]:
    "https://www.gumtree.com/for-sale/computers-software/computers-pcs-laptops/memory-motherboards-processors/uk/page",
  [Prod.gpu]:
    "https://www.gumtree.com/search?search_category=video-cards-sound-cards&search_location=uk&page=",
  [Prod.laptop]:
    "https://www.gumtree.com/for-sale/computers-software/computers-pcs-laptops/laptops/uk/page",
};

const url = Categories[prod];
(async () => {
  const initialPage = 1;
  // purgeRequestQueueFolder();

  config.set("defaultDatasetId", prod);
  config.set("defaultKeyValueStoreId", prod);
  config.set("defaultRequestQueueId", prod);
  const crawler = createCrawler(2, 100, url);
  await crawler.run([url + initialPage]);
})();
