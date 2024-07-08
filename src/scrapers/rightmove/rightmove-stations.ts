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