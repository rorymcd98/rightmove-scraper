import { Page } from "playwright";


export async function findAllRightmoveImagesAsync(page: Page): Promise<string[]> {
    const imgIdentifier = "_max_135x100";
    const validSrcs = await page.$$eval("img", (imgs, identifier) =>{
        return imgs.map(img => img.getAttribute("src")!).filter(s => s != null).filter(src => src?.includes(identifier))
    }, imgIdentifier);
    return validSrcs.map(s => s?.replace(imgIdentifier, ""));
}

export async function findAllZooplaImagesAsync(page: Page): Promise<string[]> {
    const validSrcs = await page.$$eval("source", (imgs) =>{
        return imgs.map(img => img.getAttribute("srcset")!).filter(s => s != null).map(srcset => srcset.split(" ").at(-2) ?? "")
    });
    return validSrcs;
}