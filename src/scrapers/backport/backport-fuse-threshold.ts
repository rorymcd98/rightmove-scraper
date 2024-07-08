import { Configuration, Dataset } from "crawlee";
import { RightmoveListing } from "../../types";
import { StationName, stations } from "../../transport";
import Fuse from "fuse.js";

const options = {
    keys: ['name'],
    threshold: 5,
    includeScores: true,
};

const fuse = new Fuse(Object.keys(stations), options);

const knownMappings: Record<string, StationName | null> = {
    "Archway Underground": "Archway",
    "Pimlico Underground": "Pimlico",
    "Edgware Road (Bakerloo) Underground": "Edgware Road",
    "Edgware Road (Circle Line) Underground": "Edgware Road",
    "Angel Underground": "Angel",
    "Hammersmith (Dist&Picc Line) Underground": "Hammersmith",
    "Paddington (H&C Line)-Underground": "Paddington",
    "Hammersmith (H&C Line) Underground": "Hammersmith",
    "Hackney Central": null,
    "Brondesbury Station": null,
    "Shoreditch High Street Station": null,
    "Caledonian Road & Barnsbury Station": null,
    "Gospel Oak Station": null,
    "Harringay Green Lanes Station": null,
    "Hornsey Station": null,
    "Rectory Road Station": null,
    "Stoke Newington Station": null,
    "Clapton Station": null,
    "Stamford Hill Station": null,
    "Fenchurch Street Station": null,
    "Imperial Wharf Station": null,
    "Feltham Station": null,
}

let count = 0;

function matchToNearestName(candidateStation: string): StationName | null {
    if (candidateStation in knownMappings) {
        return knownMappings[candidateStation];
    }

    candidateStation = candidateStation.replace("Underground", "").replace(/\(.*?\)/g, "").replace("Station", "").trim();
    let results = fuse.search(candidateStation);

    if (results.length == 0) {
        return null;
    }

    results = results.sort((a, b) => a.score - b.score);

    return results[0].item as StationName;
}

const config = Configuration.getGlobalConfig();

async function Main() {

    const seen = new Set();
    const allDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove");
    const allListings = (await allDataset.getData()).items.flatMap(x => x.listings).map(x => {
        if (x.nearestStations == undefined) return x;
        x.nearestStations = x.nearestStations.map(x => {
            const newName = matchToNearestName(x.rawText);
            x.stationName = newName;
            return x;
        });
        return x;
    })
    console.log(count)

    // const newAllDataset = await Dataset.open<{ listings: RightmoveListing[] }>("all-rightmove3");
    // newAllDataset.pushData({ listings: Array.from(allListings.values()) })
}

Main();