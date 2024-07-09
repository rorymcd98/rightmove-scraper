//This file asks chat gpt image preview to take a stab at what the square footage is.
require('dotenv').config();
import { Log } from "crawlee";
import OpenAI from "openai";
import { Page } from "playwright";
import { Sites } from "../types";

const openai = new OpenAI();

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

    const lastSource = floorPlanImage.locator('source').last();

    if (lastSource == null || ! await lastSource.isVisible()) {
        return null;
    }

    const floorPlanUrl = (await lastSource.getAttribute("srcset"))?.replace("480/360", "1200/900").split(" ").at(0)?.replace(":p", "");
    console.log(floorPlanUrl);
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

export async function getSquareFootageFromGptAsync(page: Page, log: Log, site: Sites): Promise<number | undefined> {

    let floorPlanUrl;
    if (site == "rightmove") floorPlanUrl = await getRightmoveFloorPlanUrlAsync(page);
    if (site == "zoopla") floorPlanUrl = await getZooplaFloorPlanUrlAsync(page);
    if (site == "onthemarket") floorPlanUrl = await getOnTheMarketFloorPlanUrlAsync(page);

    if (floorPlanUrl == null) {
        log.warning("Something went wrong trying to find the floor plan img src");
        return;
    }
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



