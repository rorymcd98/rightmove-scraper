import * as fs from "fs";
import defaultUrl from "./set-prod";


interface Rules {
  [key: string]: {
    mustInclude: string[][];
    mustExclude: string[];
  };
}

const poundStringToInt = (poundString: string): number => {
  poundString = poundString.replace(",", "");
  return Math.round(Number(poundString.replace("£", "")));
};

// const formattedDate = (date: Date): string => {
//   const day = date.getDate().toString().padStart(2, "0");
//   const month = (date.getMonth() + 1).toString().padStart(2, "0");
//   const year = date.getFullYear().toString().slice(2);
//   return `${day}/${month}/${year}`;
// };

const formatItem = (item: House): NormalisedHouse => {
  const formattedItem = {

  };

  return formattedItem;
};

interface RuleOptions {
  include: boolean;
  exclude: boolean;
}

const matchesGpuRules = (
  gpu: NormalisedHouse,
  rules: Rules,
  ruleOptions: RuleOptions = {
    exclude: false,
    include: false,
  }
): string[] => {
  const matchingGpus = [];
  for (const [gpuName, rule] of Object.entries(rules)) {
    let passesMustInclude = true;
    let passesMustExclude = true;

    if (!ruleOptions.include) {
      passesMustInclude = rule.mustInclude.every((includeArray) => {
        return includeArray.some((include) => {
          return gpu.title.toLowerCase().includes(include.toLowerCase());
        });
      });
    }
    if (!ruleOptions.exclude) {
      passesMustExclude = !rule.mustExclude.some((exclude) => {
        return gpu.title.toLowerCase().includes(exclude.toLowerCase());
      });
    }
    if (passesMustInclude && passesMustExclude) {
      matchingGpus.push(gpuName);
    }
  }
  return matchingGpus;
};

export interface CategorisedGpus {
  [key: string]: FormatGPU[];
}
export async function categoriseGPUs(
  jsonPath: string,
  ruleOptions?: RuleOptions
): Promise<CategorisedGpus> {
  const categorisedGpus: Record<string, FormatGPU[]> = {};
  const seenUrls = new Set<string>();
  try {
    const filenames = fs.readdirSync(jsonPath);
    const rules = fs.readFileSync(`./src/rules${defaultUrl}.json`, "utf-8");
    const rulesJson: Rules = JSON.parse(rules);

    for (const file of filenames) {
      const filePath = `${jsonPath}/${file}`;
      const jsonData = fs.readFileSync(filePath, "utf-8");
      const gpuData: GPUData = JSON.parse(jsonData);

      gpuData.results.forEach((gpu) => {
        const formattedGpu = formatItem(gpu);
        if (seenUrls.has(formattedGpu.itemUrl)) {
          return;
        }
        seenUrls.add(formattedGpu.itemUrl);

        const passesRulesFor = matchesGpuRules(
          formattedGpu,
          rulesJson,
          ruleOptions
        );

        passesRulesFor.forEach((gpuName) => {
          if (!categorisedGpus[gpuName]) {
            categorisedGpus[gpuName] = [];
          }
          categorisedGpus[gpuName].push(formattedGpu);
        });
        if (passesRulesFor.length === 0) {
          if (!categorisedGpus["misc"]) {
            categorisedGpus["misc"] = [];
          }
          categorisedGpus["misc"].push(formattedGpu);
        }
      });
    }
  } catch (err) {
    console.error("An error occurred while reading the GPU data:", err);
  }
  return categorisedGpus;
}
