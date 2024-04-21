//This file asks chat gpt image preview to take a stab at what the square footage is.
require('dotenv').config();
import { Log } from "crawlee";
import OpenAI from "openai";
import { Page } from "playwright";
import { Sites } from "../types";

const openai = new OpenAI();

async function getRightmoveFloorPlanUrlAsync(page: Page): Promise<string | null>{
    const candidates = await page.$$eval("img", (imgs) => {
        return imgs.map(img => img.getAttribute("src")).filter(src => src?.includes("max_296x197"));
      });

    const miniFloorPlanUrl = candidates?.[0] ?? null;
    if(miniFloorPlanUrl == null){
        return null;
    }
    const floorPlanUrl = miniFloorPlanUrl.replace("_max_296x197", "");
    return floorPlanUrl;
}

async function getZooplaFloorPlanUrlAsync(page: Page): Promise<string | null>{
    const floorPlanDiv = await page.$("div[data-name=floorplan-item]");
    const floorPlanImage = await floorPlanDiv?.$("source");
    const miniSourceAttribute = await floorPlanImage?.getAttribute("srcset");

    if(miniSourceAttribute == null){
        return null;
    }
    const floorPlanUrl = miniSourceAttribute.replace("lid.", "lc.").replace("u/480/360", "").replace(":p", "");
    return floorPlanUrl;
}

async function askGptForSqrFootage(floorPlanUrl: string): Promise<number | undefined>{
    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
        {
            role: "user",
            content: [
            { type: "text", text: "Give me just a number, no other text, for what the square footage is in this floor plan. It should be a number aproximately in the 400-1200 range. It will be state somewhere in this image" },
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

    const pattern: RegExp = /(\d+([.,]\d+)?)/;

    const matches = response.choices[0].message.content?.match(pattern);
    const firstMatch = matches?.at(0);
    if(firstMatch == undefined){
        return firstMatch;
    } else {
        return parseInt(firstMatch.replace(",", ""));
    }
}

export async function getSquareFootageFromGptAsync(page: Page, log: Log, site: Sites): Promise<number | undefined> {

    let floorPlanUrl;
    if (site == "rightmove") floorPlanUrl = await getRightmoveFloorPlanUrlAsync(page);
    if (site == "zoopla") floorPlanUrl = await getZooplaFloorPlanUrlAsync(page);

    if (floorPlanUrl == null){
        log.warning("Something went wrong trying to find the floor plan img src");
        return;
    }
    return askGptForSqrFootage(floorPlanUrl);
}



