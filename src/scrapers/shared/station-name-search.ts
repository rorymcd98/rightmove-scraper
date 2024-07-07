import Fuse from "fuse.js";
import { StationName, stations } from "../../transport";

const options = {
    keys: ['name'],
};

const fuse = new Fuse(Object.keys(stations), options);

const knownMappings: Record<string, StationName> = {
    "Archway Underground": "Archway",
    "Pimlico Underground": "Pimlico",
    "Edgware Road (Bakerloo) Underground": "Edgware Road",
    "Edgware Road (Circle Line) Underground": "Edgware Road",
    "Angel Underground": "Angel",
    "Hammersmith (Dist&Picc Line) Underground": "Hammersmith",
    "Paddington (H&C Line)-Underground": "Paddington",
    "Hammersmith (H&C Line) Underground": "Hammersmith",
}

export function matchToNearestName(candidateStation: string): StationName | null {
    if (candidateStation in knownMappings) {
        return knownMappings[candidateStation];
    }

    candidateStation.replace("Underground", "").replace(/\(.*?\)/g, "");

    const results = fuse.search(candidateStation);

    if (results.length == 0) {
        return null;
    }

    return results[0].item as StationName;
}