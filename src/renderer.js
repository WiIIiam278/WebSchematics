import * as THREE from './lib/three.js';
import { OrbitControls } from './lib/orbitcontrols.js'
import loadModel from "./models.js";

export default function render(blocks, width, height, length, parent, resources) {
    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    console.log(parentWidth, parentHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, parentWidth / parentHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(parentWidth, parentHeight);
    parent.appendChild(renderer.domElement);

    const skippedBlocks = [];
    for (let y = 0; y < blocks.length; y++) {
        for (let x = 0; x < blocks[y].length; x++) {
            for (let z = 0; z < blocks[y][x].length; z++) {
                const block = blocks[y][x][z];
                const id = block.name;
                const properties = block.properties;
                if (id === "minecraft:air") {
                    continue;
                }

                // Get the blockName by removing the namespace
                let blockName = id.substring(id.indexOf(":") + 1);

                // Check for waxed state blocks (if block name starts with waxed_)
                if (blockName.startsWith("waxed_")) {
                    // Remove the waxed_ prefix
                    blockName = blockName.substring(6);
                }

                // Load the model
                block.name = 'block/' + blockName;
                loadModel(block, resources).then(model => {
                    if (model === null) {
                        skippedBlocks.push(block);
                        return;
                    }
                    
                    // Set the position of the model
                    model.position.set(x, y, z);

                    // Validate properties
                    if (properties) {
                        // Get if upside down
                        const half = properties.find(property => property.startsWith("half="));
                        const upsideDown = half && half.substring(5) === "top";
                        if (upsideDown) {
                            model.rotation.x = Math.PI;
                        }

                        // Get facing property
                        const facing = properties.find(property => property.startsWith("facing="));
                        if (facing) {
                            // Get the direction
                            const direction = facing.substring(7);
                            // Rotate the model
                            switch (direction) {
                                case "north":
                                    model.rotation.y += upsideDown ? -Math.PI / 2 : Math.PI / 2;
                                    break;
                                case "east":
                                    model.rotation.y += 0;
                                    break;
                                case "south":
                                    model.rotation.y += upsideDown ? Math.PI / 2 : -Math.PI / 2;
                                    break;
                                case "west":
                                    model.rotation.y += upsideDown ? - Math.PI : Math.PI;
                                    break;
                            }
                        }

                        // Get type property
                        const type = properties.find(property => property.startsWith("type="));
                        if (type) {
                            // Get the type
                            const typeValue = type.substring(5);
                            // If type is top, move up 0.5
                            if (typeValue === "top") {
                                model.position.y += 0.5;
                            }
                        }

                        // Get axis property
                        const axis = properties.find(property => property.startsWith("axis="));
                        if (axis) {
                            // Get the direction
                            const direction = axis.substring(5);
                            switch (direction) {
                                case "x":
                                    model.rotation.z = Math.PI / 2;
                                    break;
                                case "y":
                                    model.rotation.y = 0;
                                    break;
                                case "z":
                                    model.rotation.x = Math.PI / 2;
                                    break;
                            }
                        }
                    }

                    // Add the model to the scene
                    scene.add(model);
                });
            }
        }
    }
    if (skippedBlocks.length > 0) {
        console.log("Failed to render blocks: " + skippedBlocks);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, height + (height / 3), 10);
    controls.target.set(width / 2, 0, length / 2);
    controls.autoRotate = true;
    controls.update();

    // Add a grid at the bottom of the scene
    const gridSize = Math.max(width, length);
    const gridHelper = new THREE.GridHelper(gridSize, gridSize);
    gridHelper.position.set((width / 2) - 0.5, -0.5, (length / 2) - 0.5);
    scene.add(gridHelper);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    animate();
}