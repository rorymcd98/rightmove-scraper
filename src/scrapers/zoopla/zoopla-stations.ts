import { Page } from "playwright";
import { NearestStation } from "../../types";
import { matchToNearestName } from "../shared/station-name-search";
import { stat } from "fs";

const keywords = ["school", "college", "academy", "ecole", "nursery"];
function isSchool(stationName: string) {
    const lowerStationName = stationName.toLowerCase();
    return keywords.some(x => lowerStationName.includes(x));
}


export async function getNearestStationsAsync(page: Page): Promise<NearestStation[]> {
    // Locate all list items with class 'b1ub3l3'
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight/4);
        window.scrollTo(0, document.body.scrollHeight/2);
        window.scrollTo(0, 3*document.body.scrollHeight/4);
        window.scrollTo(0, document.body.scrollHeight);
    });
    await page.screenshot({path: "screenshot.png", fullPage: true, type: "png"});
    await page.waitForSelector('.b1ub3l3', {timeout: 15000});
    const listItems = await page.locator('.b1ub3l3');

    // Process each list item and extract the station name and distance
    const stations = [];
    const count = await listItems.count();
    for (let i = 0; i < count; i++) {
        const listItem = listItems.nth(i);

        // Extract the station name and distance
        const stationNameElement = await listItem.locator('p.b1ub3l4');
        const distanceElement = await listItem.locator('p.b1ub3l5');

        const stationName = await stationNameElement.textContent();
        const distance = (await distanceElement.textContent())?.replace(" miles", "").replace(" mile", "") ?? null;

        if (stationName == null || isSchool(stationName)) {
            continue;
        }

        const isOverground = stationName.includes("verground");

        // Constructing the station object
        const station: NearestStation = {
            stationName: isOverground ? "Overground" : stationName ? matchToNearestName(stationName.trim()) : null,
            distanceMiles: distance ? Number(distance) : -1,
            rawText: stationName.trim()
        };
        stations.push(station);
    }

    return stations;
}
