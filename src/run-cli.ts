import { categoriseGPUs } from "./parse-prices";
import { createUI } from "./interface";
import prod from "./set-prod";
const jsonPath = `./storage/datasets/${prod}/`;

(async () => {
  const categorisedGpus = await categoriseGPUs(jsonPath);
  await createUI(categorisedGpus);
})();
