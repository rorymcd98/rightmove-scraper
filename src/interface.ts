import blessed from "blessed";
import { FormatGPU, type CategorisedGpus } from "./parse-prices";
import opn from "opn";
import * as fs from "fs";
import Fuse from "fuse.js";

interface IgnoreData {
  ignoreList: Record<string, boolean>;
  history: Record<string, string[]>;
}

function formatGPUList(categorisedGpus: CategorisedGpus, index: number) {
  const GPU = Object.values(categorisedGpus)[index];
  const gpuList = GPU.map(
    (gpu) => `£${gpu.price}\t${gpu.adDate}\t${gpu.title} Loc: ${gpu.location}`
  );
  return gpuList;
}

const sortGpuList = (
  gpuList: FormatGPU[],
  fuseScores?: (number | undefined)[]
) => {
  const priceSortFunction = (gpuA: FormatGPU, gpuB: FormatGPU) => {
    return gpuA.price - gpuB.price;
  };
  const sortFunction = fuseScores
    ? (gpuA: FormatGPU, gpuB: FormatGPU) => {
        const scoreA = fuseScores[gpuList.indexOf(gpuA)];
        const scoreB = fuseScores[gpuList.indexOf(gpuB)];
        if (scoreA === undefined && scoreB === undefined) {
          return priceSortFunction(gpuA, gpuB);
        } else if (scoreA === undefined) {
          return 1;
        } else if (scoreB === undefined) {
          return -1;
        } else {
          return scoreA - scoreB;
        }
      }
    : priceSortFunction;

  return gpuList.sort(sortFunction);
};

const appendIgnoreList = (gpuUrls: string[]) => {
  const path = "./src/ignore.json";
  try {
    const ignoreFile = fs.readFileSync(path, "utf8");
    const ignoreJson: IgnoreData = JSON.parse(ignoreFile);
    if (!ignoreJson.ignoreList) {
      ignoreJson.ignoreList = {};
    }
    if (!ignoreJson.history) {
      ignoreJson.history = {};
    }
    for (const gpuUrl of gpuUrls) {
      ignoreJson.ignoreList[gpuUrl] = true;
    }
    const timeNow = new Date().getTime();
    ignoreJson.history[timeNow] = gpuUrls;
    const updatedIgnoreList = JSON.stringify(ignoreJson);
    fs.writeFileSync(path, updatedIgnoreList);
  } catch (err) {
    console.log(err);
  }
};

function undoIgnoreList() {
  const path = "./src/ignore.json";
  try {
    const ignoreFile = fs.readFileSync(path, "utf8");
    const ignoreJson: IgnoreData = JSON.parse(ignoreFile);
    if (!ignoreJson.ignoreList) {
      ignoreJson.ignoreList = {};
    }
    if (!ignoreJson.history) {
      ignoreJson.history = {};
    }
    const historyKeys = Object.keys(ignoreJson.history);
    if (historyKeys.length === 0) {
      return;
    }
    const lastHistoryKey = historyKeys[historyKeys.length - 1];
    const gpuUrls = ignoreJson.history[lastHistoryKey];
    for (const gpuUrl of gpuUrls) {
      delete ignoreJson.ignoreList[gpuUrl];
    }
    delete ignoreJson.history[lastHistoryKey];
    const updatedIgnoreList = JSON.stringify(ignoreJson);
    fs.writeFileSync(path, updatedIgnoreList);
  } catch (err) {
    console.log(err);
  }
}

const filterIgnoreList = (
  categorisedGpus: CategorisedGpus
): CategorisedGpus => {
  try {
    const ignoreFile = fs.readFileSync("./src/ignore.json", "utf-8");
    const ignoreJson: IgnoreData = JSON.parse(ignoreFile);
    for (const [category, gpus] of Object.entries(categorisedGpus)) {
      categorisedGpus[category] = gpus.filter((gpu) => {
        return !ignoreJson.ignoreList[gpu.itemUrl];
      });
      if (categorisedGpus[category].length === 0) {
        delete categorisedGpus[category];
      }
    }
    return categorisedGpus;
  } catch (err) {
    console.warn(err);
    return categorisedGpus;
  }
};

function fuseSearch(searchTerm: string, categorisedGpus: CategorisedGpus) {
  const options = {
    keys: ["title"],
    includeMatches: true,
    includeScore: true,
  };
  const fuseCategorisedGpus: CategorisedGpus = {};
  const fuseIndicesRecord: Record<string, number[]> = {};
  const fuseScoresRecord: Record<string, (number | undefined)[]> = {};
  Object.entries(categorisedGpus).forEach(([gpuCategory, gpuList]) => {
    const fuse = new Fuse(gpuList, options);
    const results = fuse.search(searchTerm);
    fuseCategorisedGpus[gpuCategory] = results.map((result) => result.item);
    fuseIndicesRecord[gpuCategory] = results.map((result) => result.refIndex);
    fuseScoresRecord[gpuCategory] = results.map((result) => result.score);

    if (fuseCategorisedGpus[gpuCategory].length === 0) {
      delete fuseCategorisedGpus[gpuCategory];
    }
  });
  return { fuseCategorisedGpus, fuseIndicesRecord, fuseScoresRecord };
}

export async function createUI(unfilteredCategorisedGpus: CategorisedGpus) {
  const screen = blessed.screen({
    smartCSR: true,
    title: "GPU Price Tracker",
  });
  let searchTerm = "";
  let categorisedGpus = unfilteredCategorisedGpus;
  let isPriceSorted = false;
  const indeces = { category: 0, gpu: 0 };
  let indicesRecord: Record<string, number[]> = {};
  function recheckCategories(categoryIndex = 0, gpuIndex?: number) {
    let newCategorisedGpus = unfilteredCategorisedGpus;
    let newFuseScoresRecord:
      | Record<string, (number | undefined)[]>
      | undefined = {};
    if (searchTerm.length > 0) {
      const { fuseCategorisedGpus, fuseIndicesRecord, fuseScoresRecord } =
        fuseSearch(searchTerm, unfilteredCategorisedGpus);
      indicesRecord = fuseIndicesRecord;
      newCategorisedGpus = fuseCategorisedGpus;
      newFuseScoresRecord = isPriceSorted ? undefined : fuseScoresRecord;
    }
    Object.keys(newCategorisedGpus).forEach((category) => {
      const fuseScores = newFuseScoresRecord?.[category];
      newCategorisedGpus[category] = sortGpuList(
        newCategorisedGpus[category],
        fuseScores
      );
    });

    // newCategorisedGpus = filterIgnoreList(newCategorisedGpus);
    categoryList.setItems(Object.keys(newCategorisedGpus));
    gpuList.setItems(formatGPUList(newCategorisedGpus, categoryIndex));
    categorisedGpus = newCategorisedGpus;
    indeces.category = categoryIndex;
    indeces.gpu = gpuIndex ?? 0;
    categoryList.select(categoryIndex);
    gpuList.select(gpuIndex ?? 0);
    if (gpuIndex === undefined) {
      focusCategoryList();
    }
    highlightGpuList();
    screen.render();
  }

  const categoryList = blessed.list({
    parent: screen,
    left: 0,
    top: 0,
    width: "30%",
    height: "100%",
    border: {
      type: "line",
    },
    style: {
      fg: "white",
      bg: "blue",
      selected: {
        fg: "black",
        bg: "white",
      },
    },
    interactive: true,
    items: Object.keys(categorisedGpus),
  });
  const gpuList = blessed.list({
    parent: screen,
    left: "30%",
    top: 0,
    width: "70%",
    height: "100%",
    border: {
      type: "line",
    },
    style: {
      fg: "white",
      bg: "blue",
      selected: {
        fg: "black",
        bg: "white",
      },
    },
    interactive: true,
    items: formatGPUList(categorisedGpus, 0),
  });
  const searchBar = blessed.textbox({
    parent: screen,
    left: 0,
    top: 0,
    width: "30%",
    height: 3,
    border: {
      type: "line",
    },
    style: {
      fg: "white",
      bg: "blue",
      selected: {
        fg: "black",
        bg: "white",
      },
    },
    interactive: true,
    value: searchTerm,
  });
  searchBar.on("submit", (value) => {
    searchTerm = value;
    recheckCategories();
  });
  searchBar.hide();

  function highlightGpuList() {
    // do nothing for now
  }

  function toggleSearchBar() {
    if (searchBar.hidden) {
      searchBar.show();
      searchBar.focus();
    } else {
      searchBar.hide();
      focusCategoryList();
    }
    screen.render();
  }
  screen.on("keypress", (ch, key) => {
    globalSwitch(key);
    if (key.name === "f") {
      searchTerm = "";
      toggleSearchBar();
    }
    if (key.ctrl && key.name === "s") {
      isPriceSorted = !isPriceSorted;
      recheckCategories(indeces.category, indeces.gpu);
    }
    if (key.ctrl && key.name === "z") {
      undoIgnoreList();
      recheckCategories(indeces.category, indeces.gpu);
    }
  });

  searchBar.on("keypress", (ch, key) => {
    if (key.name === "escape" || key.name === "f" || key.name === "up") {
      toggleSearchBar();
    }
    if (key.name === "enter") {
      searchTerm = searchBar.value;
      recheckCategories(indeces.category, indeces.gpu);
      toggleSearchBar();
    }
    if (key.name === "backspace") {
      searchTerm = searchTerm.slice(0, -1);
      searchBar.setValue(searchTerm);
    }
    if (key.name === "space") {
      searchTerm += " ";
      searchBar.setValue(searchTerm);
    }
    if (key.name === "delete") {
      searchTerm = "";
      searchBar.setValue(searchTerm);
    }
    const alph = "abcdefghijklmnopqrstuvwxyz";
    const alphabet =
      alph +
      alph.toUpperCase +
      "1234567890" +
      "[]\\;',./`~!@#$%^&*()_+{}|:\"<>?" +
      "-=" +
      "£";
    if (alphabet.includes(key.full)) {
      searchTerm += key.full;
      searchBar.setValue(searchTerm);
    }
    screen.render();
  });

  function focusCategoryList() {
    categoryList.focus();
    categoryList.style.selected.bg = "red";
    gpuList.style.selected.bg = "white";
    screen.render();
  }
  function focusGpuList() {
    gpuList.focus();
    gpuList.style.selected.bg = "red";
    categoryList.style.selected.bg = "white";
    screen.render();
  }
  focusCategoryList();
  recheckCategories();

  function makeNavigationSwitch(
    list: blessed.Widgets.ListElement,
    isCategoryList = false,
    indeces = { category: 0, gpu: 0 }
  ) {
    return (key: any) => {
      let index = isCategoryList ? indeces.category : indeces.gpu;
      if (key.ctrl && key.name === "x") {
        const gpuList = Object.values(categorisedGpus)[indeces.category];
        const gpuUrls = gpuList.map((gpu) => gpu.itemUrl);
        appendIgnoreList(gpuUrls);
        recheckCategories();

        return;
      }

      switch (key.name) {
        case "up":
          list.up(1);
          index = Math.max(index - 1, 0);
          break;
        case "down":
          list.down(1);
          index = Math.min(index + 1, Object.keys(categorisedGpus).length - 1);
          break;
        case "right":
          focusGpuList();
          break;
        case "left":
          focusCategoryList();
          if (!isCategoryList) {
            index = 0;
            gpuList.select(0);
          }
          break;
        case "r":
          recheckCategories();
          break;
        case "x":
          if (!isCategoryList) {
            const gpu =
              Object.values(categorisedGpus)[indeces.category][indeces.gpu];
            const gpuUrl = gpu.itemUrl;
            appendIgnoreList([gpuUrl]);
            index = Math.min(index, Object.keys(categorisedGpus).length - 2);
            recheckCategories(indeces.category, index);
          }
          break;
        case "enter":
          if (!isCategoryList) {
            //Get the url and goto it
            const gpu =
              Object.values(categorisedGpus)[indeces.category][indeces.gpu];
            const url = gpu.itemUrl;
            opn(url);
          }
          break;
        default:
          break;
      }
      if (isCategoryList) {
        gpuList.setItems(formatGPUList(categorisedGpus, index));
        indeces.category = index; // Update indeces.category
      } else {
        indeces.gpu = index; // Update indeces.gpu
      }
    };
  }

  const categoryNavigationSwitch = makeNavigationSwitch(
    categoryList,
    true,
    indeces
  );
  const gpuNavigationSwitch = makeNavigationSwitch(gpuList, false, indeces);

  categoryList.on("select", (item, index) => {
    gpuList.setItems(["a"]);
    focusGpuList();
  });

  categoryList.on("keypress", (ch, key) => {
    categoryNavigationSwitch(key);
    screen.render();
  });

  gpuList.on("keypress", (ch, key) => {
    gpuNavigationSwitch(key);
    screen.render();
  });

  function globalSwitch(key: any) {
    switch (key.name) {
      case "q":
        return process.exit(0);
    }
  }

  screen.render();
}
