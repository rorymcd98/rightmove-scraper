import { Page } from "playwright";

const imgIdentifier = "_max_135x100";

export async function findAllImagesAsync(page: Page): Promise<string[]> {
    const validSrcs = await page.$$eval("img", (imgs, identifier) =>{
        return imgs.map(img => img.getAttribute("src")!).filter(s => s != null).filter(src => src?.includes(identifier))
    }, imgIdentifier);
    return validSrcs.map(s => s?.replace(imgIdentifier, ""));
}