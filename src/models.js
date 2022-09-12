import * as THREE from './lib/three.js';
import './lib/lodash.js';

let resourcesUrl = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2';

export default async function loadModel(block, resources) {
    resourcesUrl = resources;
    // Load the model json
    const model = await loadModelJson(block);
    if (model === undefined || model === null || model.elements === undefined) {
        return null;
    }
    // Load the textures
    const textures = await loadTextureMap(model.textures);
    // Create a new group
    const group = new THREE.Group();
    // Iterate through each element in the model
    for (const [, value] of Object.entries(model.elements)) {
        // Scale vertices
        let from0 = value.from[0] / 16;
        let from1 = value.from[1] / 16;
        let from2 = value.from[2] / 16;
        let to0 = value.to[0] / 16;
        let to1 = value.to[1] / 16;
        let to2 = value.to[2] / 16;
        // Create a new box geometry
        const geometry = new THREE.BoxGeometry(to0 - from0, to1 - from1, to2 - from2);
        // Position geometry
        geometry.translate((to0 + from0) / 2, (to1 + from1) / 2, (to2 + from2) / 2);
        // Create mesh with resolved textures
        const resolvedTextures = resolveTextures(value, textures);
        if (resolvedTextures == null) {
            continue;
        }
        const mesh = new THREE.Mesh(geometry, resolvedTextures);
        // Center the mesh in the group
        mesh.position.x -= 0.5;
        mesh.position.y -= 0.5;
        mesh.position.z -= 0.5;
        // Add the mesh to the group
        group.add(mesh);
    }
    return group;
}

async function loadModelJson(block) {
    // If the model name contains minecraft:, remove it
    let modelName = block.name;
    if (modelName.startsWith("minecraft:")) {
        modelName = modelName.substring(modelName.indexOf(":") + 1);
    }

    // Check properties
    if (block.properties) {
        // Get the shape property (shape=)
        let shape = block.properties.find(property => property.startsWith("shape="));
        if (shape) {
            // If the shape starts with inner or outer, append it to the model name
            let type = shape.substring(shape.indexOf("=") + 1);
            if (type.startsWith("inner")) {
                modelName += "_inner";
            } else if (type.startsWith("outer")) {
                modelName += "_outer";
            }
        }
    }
    // Load the URL as a json object
    const model = await fetch(`${resourcesUrl}/assets/minecraft/models/${modelName}.json`).then(response => {
        if (response.status === 200) {
            return response.json();
        }
        throw new Error(`Failed to load model ${modelName}`);
    }).catch(() => {
        return undefined;
    });
    if (model && model["parent"] !== undefined) {
        // If the model has a parent, load the parent model
        const parentModel = await loadModelJson({
            name: model["parent"]
        });
        // Merge the parent model with the current model, adding
        if (parentModel) {
            _.merge(model, parentModel);
        }
    }
    return model;
}

async function loadTexture(textureName) {
    // If the texture name contains minecraft:, remove it
    if (textureName.startsWith("minecraft:")) {
        textureName = textureName.substring(textureName.indexOf(":") + 1);
    }
    // Load the URL as a texture
    const textureLoader = new THREE.TextureLoader();
    return new Promise((resolve) => {
        textureLoader.load(`${resourcesUrl}/assets/minecraft/textures/${textureName}.png`, (texture) => {
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            resolve(texture);
        });
    });
}

// Load textures into a map
async function loadTextureMap(textures) {
    // Create a new map
    const textureMap = {};
    for (const [key, value] of Object.entries(textures)) {
        if (value.startsWith("#")) {
            // If the value starts with a #, it's a reference to another texture
            textureMap[key] = textureMap[value.substring(1)];
        } else {
            // Otherwise, load the texture
            textureMap[key] = await loadTexture(value);
        }
    }
    return textureMap;
}

function resolveTextures(element, textureMap) {
    // Return array of the six faces from textures of the element
    let textures = {};
    for (const [face, data] of Object.entries(element.faces)) {
        let texture = data.texture;
        if (texture.startsWith("#")) {
            texture = texture.substring(1);
        }
        if (textureMap[texture] !== undefined) {
            let textureImage = textureMap[texture];

            // If data has a uv, crop the texture to match the four values
            if (data.uv !== undefined) {
                let uv = data.uv;
                let start = new THREE.Vector2(uv[0] / 16, uv[1] / 16);
                let end = new THREE.Vector2(uv[2] / 16, uv[3] / 16);

                // Apply uv to texture
                textureImage.offset.set(start.x, start.y);
                textureImage.repeat.set(end.x - start.x, end.y - start.y);
            }

            // If data has a tintindex, use the tinted texture
            if (data.tintindex !== undefined) {
                textures[face] = new THREE.MeshBasicMaterial({
                    map: textureImage, transparent: true,
                    color: new THREE.Color(`hsl(113, 100%, 40%)`)
                });
            } else {
                textures[face] = new THREE.MeshBasicMaterial({ map: textureImage, transparent: true });
            }
        }
    }

    // Order faces
    let faceOrder = ["north", "south", "up", "down", "east", "west"];
    let textureArray = [];
    for (const face of faceOrder) {
        if (textures[face] !== undefined) {
            textureArray.push(textures[face]);
        } else {
            textureArray.push(new THREE.TextureLoader().load("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="));
        }
    }
    return textureArray;
}