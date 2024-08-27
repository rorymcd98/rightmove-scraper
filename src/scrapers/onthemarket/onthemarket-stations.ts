import { Page } from "playwright";
import { NearestStation } from "../../types";
import { matchToNearestName } from "../shared/station-name-search";
import { StationName } from "../../transport";

export async function getNearestStationsAsync(page: Page): Promise<NearestStation[]> {
    // Evaluate and fetch the elements
    let nearestStations = await page.$$eval('.poi-name', (elements) => {
        return elements
            // poi-chips is seemingly only underground (we only want these good)
            // .filter((elem) => elem.querySelector('.poi-chips')?.textContent?.length ?? 0 > 0)
            .map((filteredElem) => {
                let isOverground = false;
                if (!filteredElem.querySelector('.poi-chips')?.textContent?.length ?? 0 > 0) {
                    isOverground = true;
                }

                const distanceText = filteredElem.querySelector('.poi-distance')?.textContent;
                const distanceNum = Number(distanceText?.trim().replace("(", "").replace("mi.)", "") ?? "-1");

                const stationNameText = Array.from(filteredElem.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent)
                    .join('');

                return {
                    stationName: isOverground ? "Overground" : null,
                    distanceMiles: distanceNum,
                    rawText: stationNameText, // For debugging
                };
            })
            .filter((station) => station !== null) as NearestStation[];
    });


    nearestStations = nearestStations.map(x => {
        if (x.stationName == null) {
            x.stationName = matchToNearestName(x.rawText)
        }
        return x;
    });

    return nearestStations
}