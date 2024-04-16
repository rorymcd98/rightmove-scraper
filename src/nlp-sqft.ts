import { Page } from "playwright";

// This seeks to find the square footage of a listing page by looking for things like "{d} sq ft"
export async function findSquareFootageNlpAsync(page: Page): Promise<number | undefined>{
    // Obtain the entire page content as text
  const pageContent = await page.content();
    const squareFootPattern = /(\d+(\,\d+)?(\.\d+)?)\s?(sq|square|sqr)(\s?)(foot|feet|ft|f)/gi;
    const squareMeterPattern = /(\d+(\,\d+)?(\.\d+)?)\s?(sq|square|sqr)(\s?)(m|mtr|meter)/gi;

    const highestSquareFootage = findHighestArea(pageContent, squareFootPattern);
    if (highestSquareFootage < 250){
        const highestSquareMeterage = findHighestArea(pageContent, squareMeterPattern)
        if (highestSquareMeterage < 32){// <- Poe's law but for London
            return undefined;
        } else {
            return highestSquareMeterage * 10.76; // Converts it to square foot
        }
    } else {
        return highestSquareFootage == 0 ? undefined : highestSquareFootage;
    }
}

function findHighestArea(content: string, pattern: RegExp): number {
    const found = pattern.exec(content);
    if(found && found.length > 0){
        // Delete the thing we just found
        content.replace(found[0], "");
        return Math.max(parseInt(found[1]), findHighestArea(content, pattern));
    }
    return 0;
}