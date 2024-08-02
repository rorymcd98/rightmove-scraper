//This file asks chat gpt image preview to take a stab at what the square footage is.
require('dotenv').config();
import { Log } from "crawlee";
import OpenAI from "openai";
import { Page } from "playwright";
import { RoomDimension, Site } from "../types";

const openai = new OpenAI();
const FloorPlanUrls = new Map<string, string | undefined>();

async function getRightmoveFloorPlanUrlAsync(page: Page): Promise<string | null> {
    const candidates = await page.$$eval("img", (imgs) => {
        return imgs.map(img => img.getAttribute("src")).filter(src => src?.includes("max_296x197"));
    });

    const miniFloorPlanUrl = candidates?.[0] ?? null;
    if (miniFloorPlanUrl == null) {
        return null;
    }
    const floorPlanUrl = miniFloorPlanUrl.replace("_max_296x197", "");
    return floorPlanUrl;
}

async function getZooplaFloorPlanUrlAsync(page: Page): Promise<string | null> {
    const floorPlanImage = page.locator('div[data-testid="floorplan-thumbnail-0"]');

    try {
        await floorPlanImage.waitFor({ timeout: 3000 });
    } catch (e) {
        console.warn(`Failed to find floor plan for ${page.url}`)
        return null;
    }

    const lastSource = floorPlanImage.locator('source').last();

    const floorPlanUrl = (await lastSource.getAttribute("srcset"))?.replace("480/360", "1200/900")
        .split(" ")
        .at(0)
        ?.replace(":p", "");

    return floorPlanUrl ?? null;
}



async function getOnTheMarketFloorPlanUrlAsync(page: Page): Promise<string | null> {
    if (await page.getByRole('button', { name: 'Floorplan' }).isHidden()) return null;
    await page.getByRole('button', { name: 'Floorplan' }).click();
    const floorPlanImage = await page.getByRole('img', { name: 'Floorplan' }).first();
    const sourceAttribute = await floorPlanImage?.getAttribute("src");

    if (sourceAttribute == null) {
        return null;
    }

    return sourceAttribute;
}

async function askGptForSqrFootage(floorPlanUrl: string): Promise<number | undefined> {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Give me just a number, no other text, for what the square footage is in this floor plan. It should be a number aproximately in the 400-1200 range. It will be state somewhere in this image" },
                    {
                        type: "image_url",
                        image_url: {
                            url: floorPlanUrl,
                            detail: "low",
                        },
                    },
                ],
            },
        ],
    });

    const pattern: RegExp = /(\d+([.,]\d+)?)/;

    const matches = response.choices[0].message.content?.match(pattern);
    const firstMatch = matches?.at(0);
    if (firstMatch == undefined) {
        return firstMatch;
    } else {
        return parseInt(firstMatch.replace(",", ""));
    }
}

async function getFloorPlan(page: Page, site: Site, identifier: string, log: Log) {
    let floorPlanUrl;
    if (FloorPlanUrls.has(identifier)) {
        floorPlanUrl = FloorPlanUrls.get(identifier);
    } else {
        if (site == "rightmove") floorPlanUrl = await getRightmoveFloorPlanUrlAsync(page);
        if (site == "zoopla") floorPlanUrl = await getZooplaFloorPlanUrlAsync(page);
        if (site == "onthemarket") floorPlanUrl = await getOnTheMarketFloorPlanUrlAsync(page);
    }

    FloorPlanUrls.set(identifier, floorPlanUrl ?? undefined)

    if (floorPlanUrl == null) {
        log.warning("Something went wrong trying to find the floor plan img src");
        return;
    }

    return floorPlanUrl;
}


export async function getSquareFootageFromGptAsync(page: Page, log: Log, site: Site, identifier: string): Promise<number | undefined> {
    const floorPlanUrl = await getFloorPlan(page, site, identifier, log);

    if (floorPlanUrl == null) return;

    const gptSqrFootage = await askGptForSqrFootage(floorPlanUrl);

    if (gptSqrFootage == null) {
        return;
    }

    // We probably found it in squareMeters
    if (gptSqrFootage < 300) {
        return gptSqrFootage * 10.7;
    }
    return gptSqrFootage;
}


// Room dimensions

async function askGptForRoomDimensions(floorPlanUrl: string, log: Log): Promise<RoomDimension[] | null> {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "This image is a floor-plan and will contain some bedrooms. Give me just the XY dimensions in meters of the bedrooms (only) in an array of square bracket tuples (don't inlcude the units) e.g. [[1.12, 2.34], [4.23, 2.12]]. The dimensions of each bedroom will typically in the form: d.ddm x d.ddm. Do not include any other text in the response." },
                    {
                        type: "image_url",
                        image_url: {
                            url: floorPlanUrl,
                        },
                    },
                ],
            },
        ],
    });
    const res = response.choices[0].message.content;
    if (res == null) {
        log.info(`Could not get room dimension response from GPT for: ${floorPlanUrl}`)
        return null;
    }
    try {
        let roomDimensions = JSON.parse(res);
        if (Array.isArray(roomDimensions)) {
            roomDimensions = roomDimensions.filter(x => x != null).map(x => [x[0] ?? 0, x[1] ?? 0])
        }
        return roomDimensions;
    }
    catch {
        log.info(`Failed to parse json: ${res}`)
        return null;
    }
}

export async function getRoomDimensionsFromGptAsync(page: Page, log: Log, site: Site, identifier: string): Promise<RoomDimension[] | null> {
    const floorPlanUrl = await getFloorPlan(page, site, identifier, log);

    if (floorPlanUrl == null) return null;

    return await askGptForRoomDimensions(floorPlanUrl, log);
}

