import { Page } from "playwright";
import { NearestStation } from "../../types";
import { matchToNearestName } from "../shared/station-name-search";

const keywords = ["school", "college", "academy", "ecole", "nursery"];
function isSchool(stationName: string) {
    const lowerStationName = stationName.toLowerCase();
    return keywords.some(x => lowerStationName.includes(x));
}


export async function getNearestStationsAsync(page: Page): Promise<NearestStation[]> {
    // Locate all list items with class 'x63et82'
    const listItems = await page.locator('li.x63et82');

    // Process each list item and extract the station name and distance
    const stations = [];
    const count = await listItems.count();

    for (let i = 0; i < count; i++) {
        const listItem = listItems.nth(i);

        // Locate the <use> element and check its href attribute
        const useElement = await listItem.locator('svg use');
        const hrefAttribute = await useElement.getAttribute('href');
        let isOverground = false;
        if (!(hrefAttribute == '#london-dlr-colour-small' || hrefAttribute == '#london-underground-colour-small')) {
            isOverground = true;
        }

        // Extract the station name and distance
        const stationNameElement = await listItem.locator('.x63et84');
        const distanceElement = await listItem.locator('.x63et83');

        const stationName = await stationNameElement.textContent();
        const distance = (await distanceElement.textContent())?.replace(" miles", "").replace(" mile", "") ?? null;

        if (stationName == null) {
            continue;
        }

        // Constructing the station object
        const station: NearestStation = {
            stationName: isOverground ? "Overground" : stationName ? matchToNearestName(stationName.trim()) : null,
            distanceMiles: distance ? Number(distance) : -1,
            rawText: stationName.trim()
        };

        if (isSchool(stationName)) {
            continue;
        }

        stations.push(station);
    }

    return stations;
}
