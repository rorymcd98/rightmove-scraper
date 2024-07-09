import Fuse from "fuse.js";
import { StationName, stations } from "../../transport";

const options = {
    keys: ['name'],
    threshold: 0.9
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

export function matchToNearestName(candidateStation: string): StationName | null {
    if (candidateStation in knownMappings) {
        return knownMappings[candidateStation];
    }

    candidateStation = candidateStation.replace("Underground", "").replace(/\(.*?\)/g, "").replace("Station", "").trim();
    const results = fuse.search(candidateStation);

    if (results.length == 0) {
        return null;
    }

    const res = results[0].item as StationName;

    // All the overground woods seem to become Chorleywood
    if (res == "Chorleywood") {
        if (candidateStation.includes("orley")) {
            return res;
        }
        return null;
    }

    return res;
}