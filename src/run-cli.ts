import { categoriseGPUs } from "./parse-prices";
import { createUI } from "./interface";
import defaultUrl from "./set-prod";
const jsonPath = `./storage/datasets/${defaultUrl}/`;

(async () => {
  const categorisedGpus = await categoriseGPUs(jsonPath);
  await createUI(categorisedGpus);
})();
