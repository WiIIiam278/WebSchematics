import './lib/nbt.js';
import * as pako from './lib/pako.js';
import render from './renderer.js';

export default async function renderSchematic(file, parent, resources) {
    const nbtData = await getNbtData(file);
    const width = nbtData.value.Width.value;
    const height = nbtData.value.Height.value;
    const length = nbtData.value.Length.value;
    render(getBlocks(nbtData), width, height, length, parent, resources);
}

async function readFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            resolve(pako.inflate(event.target.result));
        }
        reader.readAsArrayBuffer(file);
    });
}

async function getNbtData(file) {
    const data = await readFile(file);
    return new Promise((resolve, reject) => {
        nbt.parse(data, function (error, data) {
            if (error) { throw error; }

            resolve(data);
        });
    });
}

function getBlockData(palette, blockId) {
    // Iterate through each key pair in the palette values
    for (const [key, value] of Object.entries(palette)) {
        if (value.value === blockId) {
            // If the key contains a closing bracket, return only everything before the bracket
            if (key.includes("[")) {
                return {
                    name: key.substring(0, key.indexOf("[")),
                    properties: key.substring(key.indexOf("[") + 1, key.indexOf("]")).split(",")
                };
            }
            return {
                name: key,
            };
        }
    }
    return {
        name: "minecraft:air",
    };
}

function getBlocks(nbtData) {
    // Get dimensions of the schematic
    const width = nbtData.value.Width.value;
    const height = nbtData.value.Height.value;
    const length = nbtData.value.Length.value;

    // Get the palette and block data
    const palette = nbtData.value.Palette.value;
    const blockData = nbtData.value.BlockData.value;

    // Create a new 3d array
    let skippedBlocks = [];
    let blocks = [];
    for (let y = 0; y < height; y++) {
        blocks[y] = [];
        for (let x = 0; x < width; x++) {
            blocks[y][x] = [];
            for (let z = 0; z < length; z++) {
                const blockId = blockData[x + z * width + y * width * length];
                const data = getBlockData(palette, blockId);
                if (data === undefined) {
                    skippedBlocks.push(blockId);
                    continue;
                }
                blocks[y][x][z] = data;
            }
        }
    }
    if (skippedBlocks.length > 0) {
        console.warn("Failed to get block data for: " + skippedBlocks);
    }
    return blocks;
}