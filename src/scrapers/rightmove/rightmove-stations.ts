import { Page } from "playwright";
import { NearestStation } from "../../types";
import { matchToNearestName } from "../shared/station-name-search";

export async function getNearestStationsAsync(page: Page): Promise<NearestStation[]> {
    // Evaluate and fetch the elements
    const stationPanel = await page.locator("#Stations-panel");
    const listItems = await stationPanel.locator('ul > li');

    // Process each list item and extract the station name and distance
    const stations = [];
    const count = await listItems.count();

    for (let i = 0; i < count; i++) {
        const listItem = listItems.nth(i);

        const stationNameElement = await listItem.locator('.cGDiWU3FlTjqSs-F1LwK4');
        const distanceElement = await listItem.locator('._1ZY603T1ryTT3dMgGkM7Lg');

        const stationName = await stationNameElement.textContent();
        const distance = (await distanceElement.textContent())?.replace(" miles", "").replace(" mile", "") ?? null;

        // Handle the edge case of King's Cross (there are so many stations that sometimes we miss the underground)
        const nationalRailTag = await listItem.locator('svg[data-testid="svg-nationalrail"]');
        const nationalRailTagCount = await nationalRailTag.count();
        if (nationalRailTagCount > 0) {
            if (stationName?.includes("King") && stationName.includes("Cross")) {

                // Constructing the station object
                const kingsCross: NearestStation = {
                    stationName: "King's Cross St Pancras",
                    distanceMiles: distance ? Number(distance) : -1,
                    rawText: stationName?.trim() ?? ""
                };

                stations.push(kingsCross);
                continue
            }
        }

        // Check for the existence of the underground tag
        const undergroundTag = await listItem.locator('svg[data-testid="svg-underground"]');
        const undergroundTagCount = await undergroundTag.count();

        if (undergroundTagCount === 0) {
            // Skip this list item if it doesn't contain the underground tag
            continue;
        }

        // Constructing the station object
        const station: NearestStation = {
            stationName: stationName ? matchToNearestName(stationName) : null,
            distanceMiles: distance ? Number(distance) : -1,
            rawText: stationName?.trim() ?? ""
        };

        stations.push(station);
    }

    return stations;
}
