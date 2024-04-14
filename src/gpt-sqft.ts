//This file asks chat gpt image preview to take a stab at what the square footage is.
require('dotenv').config();
import { Log } from "crawlee";
import OpenAI from "openai";
import { Page } from "playwright";

const openai = new OpenAI();

async function getMiniFloorPlanUrlAsync(page: Page): Promise<string | null>{
    const candidates = await page.$$eval("img", (imgs) => {
        return imgs.map(img => img.getAttribute("src")).filter(src => src?.includes("max_296x197"));
      });

    return candidates?.[0] ?? null;
}

export async function getSquareFootageFromGptAsync(page: Page, log: Log): Promise<number | undefined> {

    const miniFloorPlanUrl = await getMiniFloorPlanUrlAsync(page);
    if(miniFloorPlanUrl == null){
        log.warning("Something went wrong trying to find the floor plan img src");
        return;
    }
    const floorPlanUrl = miniFloorPlanUrl.replace("_max_296x197", "");

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
                "url": floorPlanUrl,
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
        return parseInt(firstMatch);
    }
}