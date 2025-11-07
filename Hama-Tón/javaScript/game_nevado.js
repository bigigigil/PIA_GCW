const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraMode = 0;
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.querySelector('.casaContainer').appendChild(renderer.domElement);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(20, 20, 20);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1);
fillLight.position.set(-20, 10, 10);
scene.add(fillLight);

const loader = new THREE.TextureLoader();
const snowTexture = loader.load('./models/textures/nieve.png');

const floorGeometry = new THREE.PlaneGeometry(2000, 2000, 200, 200);
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: snowTexture,
    roughness: 1,
    metalness: 0,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = (-Math.PI / 2);
floor.position.y = -11;
scene.add(floor);

const moveState = { forward: false, backward: false, left: false, right: false };
const turnSpeed = 0.05;
const moveSpeed = 1.5;
const HAMSTER_HEIGHT = 8;
const MODEL_Y_OFFSET = -3;
const DELIVERY_RADIUS = 20;

const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();

const audioController = {
    backgroundMusic: new THREE.Audio(listener),
    isContextResumed: false,
};

let juegoPausado = false;
let isMoving = false;

let hamster, zanahoria, snowball;
let hamsterBox;
const remotePlayers = new Map();

const GOALS = { RAMAS: 2, PIEDRITAS: 10, ZANAHORIA: 1 };
const MAX_LIVES = 3;
let LIVES = MAX_LIVES;

const OBJECT_ORDER = [
    'snowball_base',
    'ramas',
    'piedritas',
    'zanahoria'
];
let currentObjectiveIndex = 0;

let carried = { type: null, count: 0 };
let collected = { ramas: 0, piedritas: 0, zanahoria: 0 };

let ramas = [];
let piedritas = [];
let pines = [];
let snowballBox;
let snowballSize = 0.1;
const MAX_SNOWBALL_SIZE = 1;
const GROW_RATE = 0.005;
let isSnowballReady = false;
let isCarryingSnowball = false;

const FOREST_BOUNDS = 300;

const DIFFICULTY_SETTINGS = {
    EASY: { BOUNDS: 250, LIGHTING: true },
    HARD: { BOUNDS: 500, LIGHTING: false }
};

let currentDifficulty = DIFFICULTY_SETTINGS.EASY;
let currentBounds = currentDifficulty.BOUNDS;

const FROSTY_MAIN_POSITION = new THREE.Vector3(0, -3, -25);
let frostyModels = [];
let currentFrostyIndex = 0;
let carriedModel = null;
let droppedItems = [];
let snowParticles;
let confettiParticles = [];
const MAX_CONFETTI_PARTICLES = 500;

const cameraOffset = new THREE.Vector3(0, 5, -15);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.querySelector('.casaContainer').appendChild(renderer.domElement);

function getRandomPosition() {
    const x = (Math.random() * 2 - 1) * currentBounds;
    const z = (Math.random() * 2 - 1) * currentBounds;
    const y = -3;

    if (x > -50 && x < 50 && z > -50 && z < 50) {
        return getRandomPosition();
    }

    return [x, y, z];
}

function addIndicatorLight(mesh) {
    const light = new THREE.PointLight(0x0077b3, 1, 100);
    light.position.set(0, 10, 0);
    mesh.add(light);
    return light;
}

function updateUI() {
    const username = window.localStorage.getItem('username') || 'Tú';
    const usernameElement = document.getElementById('usernameDisplay') || document.querySelector('h1');
    if (usernameElement) usernameElement.textContent = username;

    const livesElement = document.getElementById('livesDisplay');
    const carrotElement = document.getElementById('carrotDisplay');
    const branchElement = document.getElementById('branchDisplay');
    const stoneElement = document.getElementById('stoneDisplay');
    const carriedElement = document.getElementById('carriedDisplay');
    const objectiveElement = document.getElementById('objectiveDisplay');
    const messageElement = document.getElementById('gameMessage');
    const shareBtn = document.getElementById('shareTwitterBtn');

    if (livesElement) {
        livesElement.textContent = `Vidas: ${LIVES}`;
    }

    if (carrotElement) carrotElement.textContent = `zanahoria: ${collected.zanahoria}/${GOALS.ZANAHORIA}`;
    if (branchElement) branchElement.textContent = `ramas: ${collected.ramas}/${GOALS.RAMAS}`;
    if (stoneElement) stoneElement.textContent = `piedritas: ${collected.piedritas}/${GOALS.PIEDRITAS}`;

    if (carriedElement) {
        if (carried.type) {
            carriedElement.textContent = `Llevas: ${carried.type} (${carried.count})`;
        } else if (isCarryingSnowball) {
            carriedElement.textContent = `Llevas: Base de Nieve Lista`;
        } else {
            carriedElement.textContent = `Llevas: Nada`;
        }
    }

    if (objectiveElement) {
        if (currentObjectiveIndex < OBJECT_ORDER.length) {
            objectiveElement.textContent = `Objetivo: ${OBJECT_ORDER[currentObjectiveIndex].toUpperCase().replace('_', ' ')}`;
        } else {
            objectiveElement.textContent = `Objetivo: COMPLETADO`;
        }
    }

    if (LIVES <= 0) {
        if (messageElement) messageElement.textContent = 'GAME OVER ( ´ཀ` )⁭';
        juegoPausado = true;
        if (shareBtn) shareBtn.style.display = 'none';
    } else if (currentFrostyIndex === frostyModels.length - 1) {
        if (messageElement) messageElement.textContent = '¡GANASTE FELICIDADES!✧｡٩(ˊᗜˋ)و✧*｡';

        const username = window.localStorage.getItem('username') || 'Tú';
        const score = 100;
        showShareButton(username, score);
    } else {

        // if (shareBtn) shareBtn.style.display = 'none';
    }
}

function createLocalPlayerMarker() {
    const geometry = new THREE.CircleGeometry(0.5, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00b3b3,
        transparent: true,
        opacity: 0,
        depthTest: false,
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.rotation.y = 0.01;
    marker.position.x = 0;
    marker.position.z = 0;
    marker.position.y = -0.05;

    return marker;
}

function createUsernameLabel(username) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const scaleFactor = 1;
    const baseFontSize = 10;
    const fontSize = baseFontSize * scaleFactor;
    const font = `${fontSize}px Arial`;
    context.font = font;

    const textWidth = context.measureText(username).width;
    canvas.width = (textWidth + 10) * scaleFactor;
    canvas.height = (fontSize + 10) * scaleFactor;

    context.font = font;

    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(username, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);

    return sprite;
}

function loadModel(objPath, mtlPath, options = {}, onLoad) {
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.load(mtlPath, (materials) => {
        materials.preload();

        const objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(objPath, (obj) => {

            if (options.scale && Array.isArray(options.scale)) obj.scale.set(...options.scale);
            if (options.position) obj.position.set(...options.position);
            if (options.rotation) obj.rotation.set(...options.rotation);

            obj.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshBasicMaterial({
                        map: child.material.map,
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(obj);

            if (onLoad) onLoad(obj);
        });
    });
}

function getFloorHeight(x, z) {
    return floor.position.y;
}

function updateHamsterMovement() {
    if (!hamster || juegoPausado) return;

    if (moveState.left) hamster.rotation.y += turnSpeed;
    if (moveState.right) hamster.rotation.y -= turnSpeed;

    const direction = new THREE.Vector3();
    let movedThisFrame = false;

    if (moveState.forward) {
        direction.x = Math.sin(hamster.rotation.y);
        direction.z = Math.cos(hamster.rotation.y);
        movedThisFrame = true;
    } else if (moveState.backward) {
        direction.x = -Math.sin(hamster.rotation.y);
        direction.z = -Math.cos(hamster.rotation.y);
        movedThisFrame = true;
    }

    if (movedThisFrame) {
        hamster.position.x += direction.x * moveSpeed;
        hamster.position.z += direction.z * moveSpeed;
    }

    isMoving = movedThisFrame;

    const floorY = getFloorHeight(hamster.position.x, hamster.position.z);
    hamster.position.y = floorY + HAMSTER_HEIGHT + MODEL_Y_OFFSET;

    if (snowball && !isCarryingSnowball && snowballSize < MAX_SNOWBALL_SIZE && isMoving) {
        const distanceToSnowball = hamster.position.distanceTo(snowball.position);

        if (distanceToSnowball < 25) {
            const pushDirection = new THREE.Vector3().subVectors(snowball.position, hamster.position).normalize();
            const pushSpeed = 1.0;
            snowball.position.add(pushDirection.multiplyScalar(pushSpeed));

            if (snowballSize < MAX_SNOWBALL_SIZE) {
                snowballSize = Math.min(MAX_SNOWBALL_SIZE, snowballSize + GROW_RATE);
                snowball.scale.set(snowballSize * 20, snowballSize * 20, snowballSize * 20);
                snowball.position.y = -3;

                if (snowballSize >= MAX_SNOWBALL_SIZE && !isSnowballReady) {
                    isSnowballReady = true;
                    console.log("¡Bola de nieve lista para ser la base!");
                    collectSound.play();
                }
            }
        }
    }

    if (isCarryingSnowball && snowball) {
        snowball.position.copy(hamster.position);
        snowball.position.y += 10;
        snowball.rotation.y += 0.05;
    }

    if (carriedModel) {
        carriedModel.position.copy(hamster.position);
        carriedModel.position.y = hamster.position.y + 8;
        carriedModel.rotation.y += 0.05;
    }
}

function pickUpSnowball() {
    if (!snowball || juegoPausado || carried.type || isCarryingSnowball) return;

    const distanceToSnowball = hamster.position.distanceTo(snowball.position);

    if (distanceToSnowball < 15) {
        if (isSnowballReady) {
            isCarryingSnowball = true;
            console.log("Bola de nieve grande recogida. ¡Llévala a Frosty!");
            updateUI();
        }
        else if (snowballSize < 0.2) {
            isCarryingSnowball = true;
            console.log("Bola de nieve pequeña recogida. ¡Llévala a Frosty para intentar hacerla más grande!");
            updateUI();
        }
    }
}
function dropCarriedItem() {
    collectSound.play();
    if (juegoPausado) return;

    if (isCarryingSnowball && snowball) {
        isCarryingSnowball = false;
        snowball.position.copy(hamster.position);
        snowball.position.y = -3;
        snowball.rotation.y = 0;
        console.log("Bola de nieve soltada.");
        updateUI();
        return;
    }

    if (carried.type && carriedModel) {

        const DROP_DISTANCE = 25; 
        const dropPosition = hamster.position.clone();

        const forwardVector = new THREE.Vector3(
            Math.sin(hamster.rotation.y),
            0,
            Math.cos(hamster.rotation.y)
        );

        dropPosition.x += forwardVector.x * DROP_DISTANCE;
        dropPosition.z += forwardVector.z * DROP_DISTANCE;

        scene.remove(carriedModel);

        carriedModel.position.copy(dropPosition);
        carriedModel.position.y = floor.position.y + 3;

        carriedModel.traverse((child) => {
            if (child.isMesh && child.material.transparent) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });

        scene.add(carriedModel);

        const droppedItem = {
            mesh: carriedModel,
            box: new THREE.Box3().setFromObject(carriedModel),
            type: carried.type,
            count: carried.count,
            collected: false
        };
        droppedItems.push(droppedItem);

        console.log(`Se soltó ${carried.type} en el suelo.`);
        carried.type = null;
        carried.count = 0;
        carriedModel = null;
        updateUI();
    }
}

function setCarriedModel(itemType) {
    if (carriedModel) {
        scene.remove(carriedModel);
        carriedModel = null;
    }

    let modelPath = '';
    let mtlPath = '';
    let scaleX = 15;
    let scaleY = 15;
    let scaleZ = 15;
    let color = 0x00ccff;

    if (itemType === 'ramas') {
        modelPath = './models/nevado/rama.obj';
        mtlPath = './models/nevado/rama.mtl';
        scaleX = scaleY = scaleZ = 25;
    } else if (itemType === 'piedritas') {
        modelPath = './models/nevado/piedrita.obj';
        mtlPath = './models/nevado/piedrita.mtl';
        scaleX = scaleY = scaleZ = 50;
    } else if (itemType === 'zanahoria') {
        modelPath = './models/nevado/zanahoria.obj';
        mtlPath = './models/nevado/zanahoria.mtl';
        scaleX = scaleY = scaleZ = 30;

    } else {
        return;
    }

    loadModel(modelPath, mtlPath, {
        scale: [scaleX, scaleY, scaleZ],
        position: hamster.position.clone().add(new THREE.Vector3(0, 8, 0)).toArray(),
    }, (obj) => {
        carriedModel = obj;
        carriedModel.traverse((child) => {
            if (child.isMesh) {
                child.material.color.set(color);
                child.material.transparent = true;
                child.material.opacity = 0.8;
            }
        });
    });
}

function checkPickupCollision() {
    if (!hamster || !hamsterBox || isCarryingSnowball) return;
    if (carried.type && carried.count >= GOALS[carried.type.toUpperCase()]) return;

    const processPickup = (item, isDropped = false) => {

        if (!isDropped && item.collected === true) return false;

        if (hamsterBox.intersectsBox(item.box)) {

            if (carried.type && carried.type !== item.type) return false;
            if (item.type === 'zanahoria' && carried.count >= 1) return false;

            item.mesh.visible = false;
            scene.remove(item.mesh);

            if (isDropped) {

                droppedItems = droppedItems.filter(d => d !== item);
            } else {
      
                item.collected = true;
            }

            carried.type = item.type;
          
            carried.count += (isDropped ? item.count : 1);

            if (carriedModel === null) {
                setCarriedModel(item.type);
            }

            console.log(`Recogido: ${carried.type} (${carried.count})`);
            collectSound.play();
            return true;
        }
        return false;
    };

    for (let i = droppedItems.length - 1; i >= 0; i--) { 
        const item = droppedItems[i];
        if (item.mesh) item.box.setFromObject(item.mesh);

        if (processPickup(item, true)) return;
    }

    if (zanahoria && !zanahoria.collected && processPickup(zanahoria)) return;
    for (const item of ramas) { if (!item.collected && processPickup(item)) return; }
    for (const item of piedritas) { if (!item.collected && processPickup(item)) return; }

    updateUI();
}

function checkDeliveryCollision() {
    if (!hamster || !frostyModels[currentFrostyIndex] || (!carried.type && !isCarryingSnowball)) return;

    const frostyMesh = frostyModels[currentFrostyIndex];
    const distanceToFrosty = hamster.position.distanceTo(frostyMesh.position);

    if (distanceToFrosty < DELIVERY_RADIUS) {
        let deliveredItem = carried.type || (isCarryingSnowball ? 'snowball_base' : null);
        let shouldProgress = false;

        const expectedItem = OBJECT_ORDER[currentObjectiveIndex];

        if (deliveredItem === expectedItem) {

            switch (deliveredItem) {
                case 'snowball_base':
                    if (isCarryingSnowball && isSnowballReady) {
                        isCarryingSnowball = false;
                        shouldProgress = true;
                        if (snowball) scene.remove(snowball);
                    } else if (isCarryingSnowball && !isSnowballReady) {
                        LIVES--;
                    }
                    break;
                case 'ramas':

                    if (currentObjectiveIndex === 1 && carried.type === 'ramas' && carried.count === GOALS.RAMAS) {
                        collected.ramas = carried.count;
                        shouldProgress = true;
                    }
                    else if (currentObjectiveIndex === 1 && carried.type === 'ramas' && carried.count < GOALS.RAMAS) {
                        console.log(`Fallo parcial: Necesitas ${GOALS.RAMAS} ramas. Llevas ${carried.count}.`);

                        return;
                    }
                    break;
                case 'piedritas':
                    if (currentObjectiveIndex === 2 && carried.type === 'piedritas' && carried.count === GOALS.PIEDRITAS) {
                        collected.piedritas = carried.count;
                        shouldProgress = true;
                    }
                    else if (currentObjectiveIndex === 2 && carried.type === 'piedritas' && carried.count < GOALS.PIEDRITAS) {
                        console.log(`Fallo parcial: Necesitas ${GOALS.PIEDRITAS} piedritas. Llevas ${carried.count}.`);
                        return;
                    }
                    break;
                case 'zanahoria':
                    if (currentObjectiveIndex === 3 && carried.type === 'zanahoria' && carried.count === GOALS.ZANAHORIA) {
                        collected.zanahoria = carried.count;
                        shouldProgress = true;
                    }
                    break;
            }

            if (shouldProgress) {
                progressFrostyModel(expectedItem);
            }

        }

        else {
            if (carried.type || isCarryingSnowball) {
                LIVES--;
                moveState.forward = moveState.backward = moveState.left = moveState.right = false;

                const messageElement = document.getElementById('gameMessage');
                const errorMessage = `❌ ¡Error! Se esperaba ${expectedItem.toUpperCase()}. Vidas: ${LIVES}`;
                if (messageElement) {
                    messageElement.textContent = errorMessage;
                    setTimeout(() => {
                        if (messageElement.textContent === errorMessage) {
                            messageElement.textContent = '';
                        }
                    }, 3000);
                }
                let deliveredType = carried.type || (isCarryingSnowball ? 'snowball_base' : null);

                if (deliveredType === 'ramas' || deliveredType === 'piedritas' || deliveredType === 'zanahoria') {
                    const listToRespawn = deliveredType === 'ramas' ? ramas :
                        deliveredType === 'piedritas' ? piedritas :
                            deliveredType === 'zanahoria' ? [zanahoria] : [];

                    listToRespawn.forEach(item => {
                        if (item.collected) {
                            item.collected = false;
                            item.mesh.visible = true;
                            scene.add(item.mesh);
                        }
                    });

                    droppedItems = droppedItems.filter(item => {
                        if (item.type === deliveredType) {
                            scene.remove(item.mesh);
                            return false;
                        }
                        return true;
                    });

                    console.log(`⚠️ Los ${deliveredType} reaparecen en el mundo.`);
                }

                if (deliveredType === 'snowball_base' && snowball) {
                    snowball.visible = true;
                    snowball.position.set(-50, -3, 0);
                    isSnowballReady = false;
                    snowballSize = 0.1;
                    snowball.scale.set(snowballSize * 20, snowballSize * 20, snowballSize * 20);
                }

                carried.type = null;
                carried.count = 0;
                isCarryingSnowball = false;
                if (carriedModel) {
                    scene.remove(carriedModel);
                    carriedModel = null;
                }
            }
        }

        if (shouldProgress) {
            console.log(`Entrega exitosa de ${deliveredItem} a Frosty!`);

            carried.type = null;
            carried.count = 0;
            isCarryingSnowball = false;
            if (carriedModel) {
                scene.remove(carriedModel);
                carriedModel = null;
            }
        }

        updateUI();
    }
}


function progressFrostyModel(deliveredItem) {
    if (currentFrostyIndex >= frostyModels.length - 1) return;

    if (deliveredItem === OBJECT_ORDER[currentObjectiveIndex]) {
        currentObjectiveIndex++;

        const nextFrostyIndex = currentFrostyIndex + 1;

        if (nextFrostyIndex < frostyModels.length) {
            if (frostyModels[currentFrostyIndex]) {
                frostyModels[currentFrostyIndex].visible = false;
            }
            currentFrostyIndex = nextFrostyIndex;
            if (frostyModels[currentFrostyIndex]) {
                frostyModels[currentFrostyIndex].visible = true;
            }
            console.log(`❄️ Muñeco de nieve avanzado a fase Frosty${currentFrostyIndex}`);
            winSound.play();
            if (snowball) snowball.visible = false;
        } else if (currentFrostyIndex === frostyModels.length - 1) {
            winSound.play();
            showConfetti();
            console.log("¡Muñeco de Nieve Completo! ¡Ganaste! 🎉");


        }

        carried.type = null;
        carried.count = 0;
        if (carriedModel) {
            scene.remove(carriedModel);
            carriedModel = null;
        }
    }
}

function createRemoteHamster(socketId, username, initialPosition, isLocal = false) {
    if (isLocal) {
        if (hamster && hamster.userData.label) {
            hamster.remove(hamster.userData.label);
            hamster.userData.label = null;
        }
        return;
    }
    if (!hamster || remotePlayers.has(socketId)) return;

    const remoteHamster = hamster.clone();

    remoteHamster.traverse(child => {
        if (child.name === 'player_label' || child.name === 'player_marker') {
            remoteHamster.remove(child);
        }
    });

    if (remoteHamster.userData.label) {
        remoteHamster.remove(remoteHamster.userData.label);
        remoteHamster.userData.label = null;
    }

    remoteHamster.name = username;
    remoteHamster.userData.socketId = socketId;

    const labelContainer = new THREE.Object3D();
    labelContainer.name = 'label_container';

    const label = createUsernameLabel(username);
    label.name = 'player_label';

    label.position.set(0, 1.3, 0);

    labelContainer.add(label);

    labelContainer.position.set(0, 0, 0.5);
    remoteHamster.add(labelContainer);

    remoteHamster.userData.labelContainer = labelContainer;
    remoteHamster.userData.label = label;

    const randomX = Math.random() * 40 - 20;
    const randomZ = Math.random() * 40 - 20;
    const spawnY = HAMSTER_HEIGHT + MODEL_Y_OFFSET + floor.position.y;

    remoteHamster.position.set(randomX, spawnY, randomZ);

    if (initialPosition && initialPosition.x !== undefined) {
        remoteHamster.position.set(initialPosition.x, initialPosition.y || spawnY, initialPosition.z);
    }

    remoteHamster.userData.targetPosition = remoteHamster.position.clone();

    scene.add(remoteHamster);
    remotePlayers.set(socketId, remoteHamster);
}

function updateRemoteHamsterPosition(socketId, x, y, z, rotationY) {
    const remoteHamster = remotePlayers.get(socketId);
    if (remoteHamster) {
        remoteHamster.userData.targetPosition.set(x, y, z);
        remoteHamster.userData.targetRotationY = rotationY;
    }
}

function removeRemoteHamster(socketId) {
    const remoteHamster = remotePlayers.get(socketId);
    if (remoteHamster) {
        scene.remove(remoteHamster);
        remotePlayers.delete(socketId);
    }
}

function createSnowParticles() {
    if (snowParticles) {
        scene.remove(snowParticles);
        snowParticles.geometry.dispose();
        snowParticles.material.dispose();
    }

    const particleCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    const spreadX = FOREST_BOUNDS * 2;
    const spreadZ = FOREST_BOUNDS * 2;
    const spawnY = 300; 

    for (let i = 0; i < particleCount; i++) {
        const x = THREE.MathUtils.randFloatSpread(spreadX); 
        const y = THREE.MathUtils.randFloat(0, spawnY);     
        const z = THREE.MathUtils.randFloatSpread(spreadZ);
        vertices.push(x, y, z);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 8,
        map: new THREE.TextureLoader().load('./models/textures/snowflake.png'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });
    snowParticles = new THREE.Points(geometry, material);
    scene.add(snowParticles);
    console.log("Sistema de partículas de nieve creado.");
}

function showConfetti(duration = 5000) { 

    if (snowParticles) {
        snowParticles.visible = false; 
    }

    confettiParticles.forEach(cp => {
        scene.remove(cp);
        cp.geometry.dispose();
        cp.material.dispose();
    });
    confettiParticles = [];

    const confettiCount = MAX_CONFETTI_PARTICLES;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    const velocities = []; 
    const rotations = []; 
    
    const confettiColors = [
        new THREE.Color(0xff0000), new THREE.Color(0x00ff00),
        new THREE.Color(0x0000ff), new THREE.Color(0xffff00),
        new THREE.Color(0xff00ff), new THREE.Color(0x00ffff)
    ];


    for (let i = 0; i < confettiCount; i++) {
 
        positions.push(
            hamster.position.x + THREE.MathUtils.randFloatSpread(100), 
            hamster.position.y + 100 + THREE.MathUtils.randFloat(0, 50), 
            hamster.position.z + THREE.MathUtils.randFloatSpread(100) 
        );

        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        colors.push(color.r, color.g, color.b);
        sizes.push(THREE.MathUtils.randFloat(3, 10));

        velocities.push(
            THREE.MathUtils.randFloatSpread(10), 
            THREE.MathUtils.randFloat(5, 15),    
            THREE.MathUtils.randFloatSpread(10)  
        );

        rotations.push(
            Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2
        );
    }


    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(velocities), 3));
    geometry.setAttribute('rotation', new THREE.BufferAttribute(new Float32Array(rotations), 3));

    const material = new THREE.PointsMaterial({
        vertexColors: true,
        size: 10,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        // map: confettiTexture,
        blending: THREE.AdditiveBlending
    });

    const confettiSystem = new THREE.Points(geometry, material);
    scene.add(confettiSystem);
    confettiParticles.push(confettiSystem);

    console.log("Confetti lanzado!");

    setTimeout(() => {
        scene.remove(confettiSystem);
        confettiSystem.geometry.dispose();
        confettiSystem.material.dispose();
        confettiParticles = confettiParticles.filter(cp => cp !== confettiSystem);
        console.log("Confetti disipado.");

        if (snowParticles) {
            snowParticles.visible = true;
        }

    }, duration);
}

function animate() {
    requestAnimationFrame(animate);

    if (!juegoPausado) {
        updateHamsterMovement();

        if (hamster) hamsterBox.setFromObject(hamster);
        ramas.forEach(item => { if (item.mesh) item.box.setFromObject(item.mesh); });
        piedritas.forEach(item => { if (item.mesh) item.box.setFromObject(item.mesh); });
        if (zanahoria && zanahoria.mesh) zanahoria.box.setFromObject(zanahoria.mesh);
        droppedItems.forEach(item => { if (item.mesh) item.box.setFromObject(item.mesh); });

        ramas.forEach(item => { if (item.mesh) item.mesh.rotation.y += 0.01; });
        piedritas.forEach(item => { if (item.mesh) item.mesh.rotation.y += 0.01; });
        if (zanahoria && zanahoria.mesh) zanahoria.mesh.rotation.y += 0.01;

        if (hamster && hamster.userData.labelContainer) {
            hamster.userData.labelContainer.rotation.y = -hamster.rotation.y;
        }

        if (hamster && isMoving) {
            if (typeof window.sendHamsterMovement === 'function') {
                window.sendHamsterMovement({
                    x: hamster.position.x,
                    y: hamster.position.y,
                    z: hamster.position.z,
                    rotationY: hamster.rotation.y
                });
            }
        }

        remotePlayers.forEach(remoteHamster => {
            const target = remoteHamster.userData.targetPosition;
            remoteHamster.position.lerp(target, 0.2);

            const targetRotationY = remoteHamster.userData.targetRotationY;
            if (targetRotationY !== undefined) {
                remoteHamster.rotation.y = THREE.MathUtils.lerp(
                    remoteHamster.rotation.y,
                    targetRotationY,
                    0.2
                );
            }
            if (remoteHamster.userData.labelContainer) {
                remoteHamster.userData.labelContainer.rotation.y = -remoteHamster.rotation.y;
            }
        });

        if (snowball && snowballBox) snowballBox.setFromObject(snowball);

        if (hamster) hamsterBox.setFromObject(hamster);

        if (hamster) {
            if (cameraMode === 0) {
                const desiredPosition = new THREE.Vector3(
                    hamster.position.x,
                    hamster.position.y + 60,
                    hamster.position.z + 100
                );
                camera.position.lerp(desiredPosition, 0.1);

                const lookTarget = new THREE.Vector3(
                    hamster.position.x,
                    hamster.position.y + 10,
                    hamster.position.z
                );

                pines.forEach(pino => {
                    if (pino.visible) pino.visible = false;
                });

                camera.lookAt(lookTarget);

            } else if (cameraMode === 1 && frostyModels[currentFrostyIndex]) {
                const frosty = frostyModels[currentFrostyIndex];

                const desiredPosition = new THREE.Vector3(
                    frosty.position.x + 10,
                    frosty.position.y + 500,
                    frosty.position.z + 500
                );
                camera.position.lerp(desiredPosition, 0.1);
                camera.lookAt(frosty.position);

                const lookTarget = new THREE.Vector3(
                    hamster.position.x + 5,
                    hamster.position.y + 5,
                    hamster.position.z + 5,
                );

                pines.forEach(pino => {
                    if (!pino.visible) pino.visible = true;
                });

                camera.lookAt(lookTarget);
            }
        }

        const snowPosAttr = snowParticles?.geometry?.attributes?.position;
        if (snowParticles && snowPosAttr?.array) {
            const positions = snowPosAttr.array;
            const particleSpeed = 0.8;
            const yRange = 300;

            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= particleSpeed;

                if (positions[i] < -30) {
                    positions[i] = yRange;
                    positions[i - 1] = THREE.MathUtils.randFloatSpread(FOREST_BOUNDS * 2);
                    positions[i + 1] = THREE.MathUtils.randFloatSpread(FOREST_BOUNDS * 2);
                }
            }
            snowPosAttr.needsUpdate = true;
        }

        if (confettiParticles.length > 0) {
            const GRAVITY = -9.8 * 0.1;
            const DRAG = 0.98;
            const deltaTime = 1 / 60;

            confettiParticles.forEach(confettiSystem => {
                const posAttr = confettiSystem.geometry.attributes.position;
                const velAttr = confettiSystem.geometry.attributes.velocity;
                const rotAttr = confettiSystem.geometry.attributes.rotation; 

                if (!posAttr || !velAttr || !rotAttr) return;

                const positions = posAttr.array;
                const velocities = velAttr.array;
                const rotations = rotAttr.array;

                for (let i = 0; i < positions.length; i += 3) {
                    velocities[i + 1] += GRAVITY * deltaTime; 
                    
                    velocities[i] *= DRAG;
                    velocities[i + 1] *= DRAG;
                    velocities[i + 2] *= DRAG;

                    positions[i] += velocities[i] * deltaTime;
                    positions[i + 1] += velocities[i + 1] * deltaTime;
                    positions[i + 2] += velocities[i + 2] * deltaTime;

                    rotations[i] += Math.sin(deltaTime * 5) * 0.1; 
                }
                posAttr.needsUpdate = true;
                rotAttr.needsUpdate = true;
            });
        }

        checkPickupCollision();
        checkDeliveryCollision();
    }

    renderer.render(scene, camera);
}


function createZanahoria(position) {
    if (zanahoria && zanahoria.mesh) {
        zanahoria.mesh.position.set(...position);
        zanahoria.collected = false;
        zanahoria.mesh.visible = true;
        scene.add(zanahoria.mesh);
        return;
    }

    loadModel('./models/nevado/zanahoria.obj', './models/nevado/zanahoria.mtl', {
        scale: [30, 30, 30],
        position: position,
    }, (obj) => {
        zanahoria = { mesh: obj, box: new THREE.Box3().setFromObject(obj), collected: false, type: 'zanahoria' };
        scene.add(obj);
        if (currentDifficulty.LIGHTING) {
            zanahoria.light = addIndicatorLight(obj);
        }
    });
}


function initGame() {

    const PINE_COUNT = 50;
    const PINE_SCALE = [15, 15, 15];

    if (snowball && snowball.userData.light) {
        snowball.remove(snowball.userData.light);
        snowball.userData.light = null;
    }
    if (currentDifficulty.LIGHTING && snowball) {
        snowball.userData.light = addIndicatorLight(snowball);
    }

    ramas.forEach(item => { if (item.mesh) scene.remove(item.mesh); }); ramas = [];
    for (let i = 0; i < GOALS.RAMAS; i++) {
        const pos = getRandomPosition();
        loadModel('./models/nevado/rama.obj', './models/nevado/rama.mtl', {
            scale: [25, 25, 25],
            position: pos,
            rotation: [0, Math.random() * Math.PI * 2, 0],
        }, (obj) => {
            const item = { mesh: obj, box: new THREE.Box3().setFromObject(obj), collected: false, type: 'ramas' };
            ramas.push(item);
            if (currentDifficulty.LIGHTING) {
                item.light = addIndicatorLight(obj);
            }
        });
    }

    piedritas.forEach(item => { if (item.mesh) scene.remove(item.mesh); }); piedritas = [];
    for (let i = 0; i < GOALS.PIEDRITAS; i++) {
        const pos = getRandomPosition();
        loadModel('./models/nevado/piedrita.obj', './models/nevado/piedrita.mtl', {
            scale: [50, 50, 50],
            position: pos,
            rotation: [0, Math.random() * Math.PI * 2, 0],
        }, (obj) => {
            const item = { mesh: obj, box: new THREE.Box3().setFromObject(obj), collected: false, type: 'piedritas' };
            piedritas.push(item);
            if (currentDifficulty.LIGHTING) {
                item.light = addIndicatorLight(obj);
            }
        });
    }

    const carrotPos = getRandomPosition();
    createZanahoria(carrotPos);

    if (!scene.userData.pinesAdded) {
        pines.forEach(p => scene.remove(p));
        pines = [];

        for (let i = 0; i < PINE_COUNT; i++) {
            const pos = getRandomPosition();
            if (pos[0] > -80 && pos[0] < 80 && pos[2] > -80 && pos[2] < 80) { continue; }
            loadModel('./models/nevado/pino.obj', './models/nevado/pino.mtl', {
                scale: PINE_SCALE,
                position: pos,
                rotation: [0, Math.random() * Math.PI * 2, 0],
            }, (obj) => {
                scene.add(obj);
                pines.push(obj);

                if (cameraMode === 0) {
                    obj.visible = false;
                }
            });
        }

        scene.userData.pinesAdded = true;

    }

    if (!snowParticles) {
        createSnowParticles();
    }
}

document.addEventListener('keydown', (event) => {
    if (!hamster || juegoPausado) return;
    window.GameApi.resumeAudioContext();
    switch (event.key.toLowerCase()) {
        case 'w': moveState.forward = true; break;
        case 's': moveState.backward = true; break;
        case 'a': moveState.left = true; break;
        case 'd': moveState.right = true; break;
        case 'arrowleft': hamster.rotation.y += turnSpeed * 10; break;
        case 'arrowright': hamster.rotation.y -= turnSpeed * 10; break;
        case 'c': cameraMode = (cameraMode + 1) % 2; break;
        case 'l': dropCarriedItem(); break;
        case 'k': pickUpSnowball(); break;
    }
});

document.addEventListener('keyup', (event) => {
    if (!hamster || juegoPausado) return;

    switch (event.key.toLowerCase()) {
        case 'w': moveState.forward = false; break;
        case 's': moveState.backward = false; break;
        case 'a': moveState.left = false; break;
        case 'd': moveState.right = false; break;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('DOMContentLoaded', updateUI);

const frostyPaths = [
    { obj: './models/nevado/frosty0.obj', mtl: './models/nevado/frosty0.mtl' },
    { obj: './models/nevado/frosty1.obj', mtl: './models/nevado/frosty1.mtl' },
    { obj: './models/nevado/frosty2.obj', mtl: './models/nevado/frosty2.mtl' },
    { obj: './models/nevado/frosty3.obj', mtl: './models/nevado/frosty3.mtl' },
    { obj: './models/nevado/frosty.obj', mtl: './models/nevado/frosty.mtl' }

];
frostyPaths.forEach((path, index) => {
    loadModel(path.obj, path.mtl, {
        scale: [20, 20, 20],
        position: FROSTY_MAIN_POSITION.toArray(),
    }, (obj) => {
        frostyModels[index] = obj;
        obj.visible = (index === 0);
        if (index === 0) {
            scene.add(obj);
            currentFrostyIndex = 0;
        }
    });
});

loadModel('./models/hamster.obj', './models/hamster.mtl', {
    scale: [15, 15, 15],
    position: [0, -3, 10],
}, (obj) => {
    hamster = obj;
    hamsterBox = new THREE.Box3().setFromObject(hamster);
    hamster.position.y = floor.position.y + HAMSTER_HEIGHT + MODEL_Y_OFFSET;
    scene.add(hamster);

    const username = window.localStorage.getItem('username') || 'Tú';

    const marker = createLocalPlayerMarker();
    hamster.add(marker);
    const labelContainer = new THREE.Object3D();
    labelContainer.name = 'label_container';
    const label = createUsernameLabel(username);
    label.name = 'player_label';
    label.position.set(0, 1.3, 0);
    labelContainer.add(label);
    labelContainer.position.set(0, 0, 0.5);

    hamster.add(labelContainer);

    hamster.userData.label = label;
    hamster.userData.labelContainer = labelContainer;

    updateUI();
});

const snowballPos = [-50, -3, 0];
loadModel(frostyPaths[0].obj, frostyPaths[0].mtl, {
    scale: [snowballSize * 20, snowballSize * 20, snowballSize * 20],
    position: snowballPos,
}, (obj) => {
    snowball = obj;
    snowballBox = new THREE.Box3().setFromObject(snowball);
    scene.add(snowball);
});


function showShareButton(username, score) {
    const btn = document.getElementById('shareTwitterBtn');
    if (btn) {
        btn.style.display = 'inline-block';

        btn.onclick = () => {
            shareOnTwitter(username, score);
        };
    }
}

function shareOnTwitter(username, score) {
    const text = encodeURIComponent(`¡${username} ganó en Hama-Tón con ${score} puntos! ¡Completa el muñeco de nieve! ☃️ #HamaTon #ThreeJS`);
    const url = `https://x.com/intent/post?text=${text}`;
    window.open(url, '_blank');
}

window.GameApi = {
    createRemoteHamster,
    updateRemoteHamsterPosition,
    removeRemoteHamster,

    setPauseState: (estado) => {
        juegoPausado = estado;
    },
    isGamePaused: () => juegoPausado,

    startGame: function (mode) {
        if (mode === 'HARD') {
            currentDifficulty = DIFFICULTY_SETTINGS.HARD;
        } else {
            currentDifficulty = DIFFICULTY_SETTINGS.EASY;
        }
        currentBounds = currentDifficulty.BOUNDS;

        LIVES = MAX_LIVES;
        currentObjectiveIndex = 0;
        collected = { ramas: 0, piedritas: 0, zanahoria: 0 };
        carried = { type: null, count: 0 };
        droppedItems.forEach(item => { scene.remove(item.mesh); });
        droppedItems = [];

        initGame();
        juegoPausado = false;

        window.GameApi.resumeAudioContext();
        updateUI();
    },

    resumeAudioContext: function () {
        if (!audioController.isContextResumed) {
            listener.context.resume().then(() => {
                console.log('AudioContext resumed!');
                audioController.isContextResumed = true;

                if (!audioController.backgroundMusic.isPlaying && document.getElementById('toggleMusica')?.checked) {
                    audioController.backgroundMusic.play();
                }
            }).catch(err => {
                console.error("Error resuming AudioContext:", err);
            });
        }
    },

    setAudioVolume: function (type, isChecked) {
        window.GameApi.resumeAudioContext();

        if (type === 'music') {
            audioController.backgroundMusic.setVolume(isChecked ? 0.5 : 0);
            if (isChecked && !audioController.backgroundMusic.isPlaying) {
                audioController.backgroundMusic.play();
            }
        } else if (type === 'master') {
            listener.setMasterVolume(isChecked ? 1.0 : 0);
        }
    }
};


const backgroundMusic = new THREE.Audio(listener);
audioLoader.load('./audio/nevado.mp3', function (buffer) {
    audioController.backgroundMusic.setBuffer(buffer);
    audioController.backgroundMusic.setLoop(true);
    audioController.backgroundMusic.setVolume(0.5);
});


const collectSound = new THREE.Audio(listener);
audioLoader.load('./audio/pop.mp3', function (buffer) {
    collectSound.setBuffer(buffer);
    collectSound.setVolume(1.0);
});

const winSound = new THREE.Audio(listener);
audioLoader.load('./audio/ta-da!.mp3', function (buffer) {
    winSound.setBuffer(buffer);
    winSound.setVolume(1.0);
});

animate();