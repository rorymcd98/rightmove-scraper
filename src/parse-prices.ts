import * as fs from "fs";
import prod from "./set-prod";

interface GPU {
  title: string;
  price: string;
  itemUrl: string;
  adDate: string;
  location: string | null;
}
export interface FormatGPU {
  title: string;
  price: number;
  itemUrl: string;
  adDate: string;
  location: string;
}

interface GPUData {
  count: number;
  pageUrl: string;
  results: GPU[];
}

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

const formattedDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(2);
  return `${day}/${month}/${year}`;
};

const formatGpu = (gpu: GPU): FormatGPU => {
  const formattedGpu = {
    price: poundStringToInt(gpu.price),
    title: gpu.title.replace(/\r?\n|\r/g, ""),
    itemUrl: (gpu.itemUrl = "https://gumtree.com/" + gpu.itemUrl),
    adDate: formattedDate(new Date(gpu.adDate)),
    location: gpu.location?.replace(/\r?\n|\r/g, "") || "(No location)",
  };

  return formattedGpu;
};

interface RuleOptions {
  ignoresMustInclude: boolean;
  ignoresMustExclude: boolean;
}

const matchesGpuRules = (
  gpu: FormatGPU,
  rules: Rules,
  ruleOptions: RuleOptions = {
    ignoresMustExclude: false,
    ignoresMustInclude: false,
  }
): string[] => {
  const matchingGpus = [];
  for (const [gpuName, rule] of Object.entries(rules)) {
    let passesMustInclude = true;
    let passesMustExclude = true;

    if (!ruleOptions.ignoresMustInclude) {
      passesMustInclude = rule.mustInclude.every((includeArray) => {
        return includeArray.some((include) => {
          return gpu.title.toLowerCase().includes(include.toLowerCase());
        });
      });
    }
    if (!ruleOptions.ignoresMustExclude) {
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
    const rules = fs.readFileSync(`./src/rules${prod}.json`, "utf-8");
    const rulesJson: Rules = JSON.parse(rules);

    for (const file of filenames) {
      const filePath = `${jsonPath}/${file}`;
      const jsonData = fs.readFileSync(filePath, "utf-8");
      const gpuData: GPUData = JSON.parse(jsonData);

      gpuData.results.forEach((gpu) => {
        const formattedGpu = formatGpu(gpu);
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
