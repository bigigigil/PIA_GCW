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

const floorGeometry = new THREE.PlaneGeometry(1000, 1000, 200, 200);
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: snowTexture,
    roughness: 1,
    metalness: 0,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = (-Math.PI / 2) + 0.05;
floor.position.y = -11;
scene.add(floor);

const moveState = { forward: false, backward: false, left: false, right: false };
const turnSpeed = 0.05;
const moveSpeed = 1.5;
const HAMSTER_HEIGHT = 8;
const MODEL_Y_OFFSET = -3;
const DELIVERY_RADIUS = 20;

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
let snowballBox;
let snowballSize = 0.1;
const MAX_SNOWBALL_SIZE = 1;
const GROW_RATE = 0.005;
let isSnowballReady = false;
let isCarryingSnowball = false;

const FROSTY_MAIN_POSITION = new THREE.Vector3(0, -3, -25);
let frostyModels = [];
let currentFrostyIndex = 0;
let carriedModel = null;

const cameraOffset = new THREE.Vector3(0, 5, -15);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.querySelector('.casaContainer').appendChild(renderer.domElement);

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
        if (messageElement) messageElement.textContent = '¡Juego Terminado! 😵 Sin Vidas';
        juegoPausado = true;
    } else if (currentFrostyIndex === frostyModels.length - 1) {
        if (messageElement) messageElement.textContent = '¡Felicidades! Muñeco de Nieve Completo. ¡Ganaste! 🎉';
      
    } else {
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
        carriedModel.position.y += 8;
        carriedModel.rotation.y += 0.05;
    }
    if (carried.type && carried.count > 0 && hamster) {
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
    if (juegoPausado) return;

    if (isCarryingSnowball && snowball) {
        isCarryingSnowball = false;
        snowball.position.copy(hamster.position);
        snowball.position.y = -3;
        snowball.rotation.y = 0;
        console.log("Bola de nieve soltada.");
    }

    if (carried.type && carried.count > 0) {
        console.log(`Se soltó ${carried.type} (objeto perdido).`);
        carried.type = null;
        carried.count = 0;
    }
    updateUI();
}

// game_nevado.js (Alrededor de la línea 336)

function setCarriedModel(itemType) {
    if (carriedModel) {
        return;
    }

    let modelPath = '';
    let mtlPath = '';
    // Simplificamos la escala a valores individuales en lugar de un array para evitar el error de spread.
    let scaleX = 15;
    let scaleY = 15;
    let scaleZ = 15; 

    if (itemType === 'ramas') {
        modelPath = './models/nevado/rama.obj';
        mtlPath = './models/nevado/rama.mtl';
    } else if (itemType === 'piedritas') {
        modelPath = './models/nevado/piedrita.obj';
        mtlPath = './models/nevado/piedrita.mtl';
    } else {
        return;
    }

    loadModel(modelPath, mtlPath, {
        // Pasar la escala como un array nuevo para que sea iterable
        scale: [scaleX, scaleY, scaleZ], 
        position: hamster.position.clone().add(new THREE.Vector3(0, 8, 0)).toArray(), // Aseguramos que position sea un array
    }, (obj) => {
        carriedModel = obj;
        carriedModel.traverse((child) => {
            if (child.isMesh) {
                child.material.color.set(0x7f6a5b);
                child.material.transparent = true;
                child.material.opacity = 0.8;
            }
        });
        scene.add(carriedModel);
    });
}
function checkPickupCollision() {

    if (!hamster || !hamsterBox || isCarryingSnowball) return;
    if (carried.type && carried.type !== 'ramas' && carried.type !== 'piedritas' && carried.type !== 'zanahoria') return;
    // Si ya lleva ramas/piedritas, solo puede recoger más del mismo tipo
    if (carried.type && carried.type !== 'ramas' && carried.type !== 'piedritas') return;


    const checkItem = (item) => {
        if (!item.collected && hamsterBox.intersectsBox(item.box)) {

            if (carried.type && carried.type !== item.type) return false;

            if ((carried.type === 'ramas' || carried.type === 'piedritas') && item.type === 'zanahoria') return false;


            item.collected = true;
            item.mesh.visible = false;
            scene.remove(item.mesh);

            carried.type = item.type;
            carried.count++;

            if (carried.count === 1 && carried.type !== 'zanahoria') {
                setCarriedModel(item.type);
            }

            console.log(`Recogido: ${carried.type} (${carried.count})`);
            return true;
        }
        return false;
    };

    if (zanahoria && !zanahoria.collected && checkItem(zanahoria)) return;
    for (const item of ramas) { if (checkItem(item)) continue; }
    for (const item of piedritas) { if (checkItem(item)) continue; }

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
                        if (snowball) snowball.visible = false; // Ocultar bola base
                    } else if (isCarryingSnowball && !isSnowballReady) {
                        LIVES--;
                        // ... (Mensaje de error, detener hámster y reaparición de bola de nieve, sin progreso)
                    }
                    break;
              case 'ramas':
                    // **Control estricto:** Solo progresa si lleva la cantidad EXACTA.
                    if (currentObjectiveIndex === 1 && carried.type === 'ramas' && carried.count === GOALS.RAMAS) {
                        collected.ramas = carried.count; 
                        shouldProgress = true;
                    } 
                    // Si se intentó entregar RAMAS, pero no tiene la cantidad completa:
                    else if (currentObjectiveIndex === 1 && carried.type === 'ramas' && carried.count < GOALS.RAMAS) {
                        // El jugador no pierde vida, pero la entrega falla.
                        console.log(`Fallo parcial: Necesitas ${GOALS.RAMAS} ramas. Llevas ${carried.count}.`);
                        // No hace nada más, solo evita el progreso.
                        return; // Salir sin limpiar carried ni perder vida
                    }
                    break;
                case 'piedritas':
                     // **Control estricto:** Solo progresa si lleva la cantidad EXACTA.
                    if (currentObjectiveIndex === 2 && carried.type === 'piedritas' && carried.count === GOALS.PIEDRITAS) {
                        collected.piedritas = carried.count;
                        shouldProgress = true;
                    }
                    // Si se intentó entregar PIEDRITAS, pero no tiene la cantidad completa:
                    else if (currentObjectiveIndex === 2 && carried.type === 'piedritas' && carried.count < GOALS.PIEDRITAS) {
                        console.log(`Fallo parcial: Necesitas ${GOALS.PIEDRITAS} piedritas. Llevas ${carried.count}.`);
                        return; // Salir sin limpiar carried ni perder vida
                    }
                    break;
                case 'zanahoria':
                    // La zanahoria ya se recoge individualmente, solo se verifica que se lleva
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

        // --- Lógica de Error/Pérdida de Vida ---
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
                // --- Lógica de reaparición general ---
             // --- Lógica de reaparición general ---
                let deliveredType = carried.type || (isCarryingSnowball ? 'snowball_base' : null);
                
                if (deliveredType === 'ramas' || deliveredType === 'piedritas' || deliveredType === 'zanahoria') {
                    // Solo reaparece si llevaba algo recolectable
                    const listToRespawn = deliveredType === 'ramas' ? ramas : (deliveredType === 'piedritas' ? piedritas : (deliveredType === 'zanahoria' ? [zanahoria] : []));

                    listToRespawn.forEach(item => {
                        // Reaparecer SÓLO los elementos que el hámster había recogido.
                        if (item.collected) { 
                            item.collected = false;
                            item.mesh.visible = true;
                            scene.add(item.mesh);
                        }
                    });

                    console.log(`⚠️ Todos los ${deliveredType} reaparecen en el mundo.`);
                }
                
                // Resetear la bola de nieve si es el caso (snowball_base)
                if (deliveredType === 'snowball_base' && snowball) {
                    snowball.visible = true;
                    snowball.position.set(-50, -3, 0);
                    isSnowballReady = false;
                    snowballSize = 0.1;
                    snowball.scale.set(snowballSize * 20, snowballSize * 20, snowballSize * 20);
                }
                
                // Limpiar carried state y modelo visual después del error
                carried.type = null;
                carried.count = 0;
                isCarryingSnowball = false;
                if (carriedModel) {
                    scene.remove(carriedModel);
                    carriedModel = null;
                }
            }
        }

        // --- Limpieza de Inventario y Modelo Visual (Entrega Exitosa) ---
        // Este bloque solo se ejecuta si shouldProgress fue TRUE.
        if (shouldProgress) {
            console.log(`Entrega exitosa de ${deliveredItem} a Frosty!`);
            
            // Limpiar inventario y modelo visual, ya que el progreso ocurre.
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
function checkFrostyCollision() {
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
            snowball.visible = false;
        } else if (currentFrostyIndex === frostyModels.length - 1) {
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

function animate() {
    requestAnimationFrame(animate);

    if (!juegoPausado) {
        updateHamsterMovement();

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
        ramas.forEach(item => { if (item.mesh) item.box.setFromObject(item.mesh); });
        piedritas.forEach(item => { if (item.mesh) item.box.setFromObject(item.mesh); });
        if (zanahoria && zanahoria.mesh) zanahoria.box.setFromObject(zanahoria.mesh);

        ramas.forEach(item => { if (item.mesh) item.mesh.rotation.y += 0.01; });
        piedritas.forEach(item => { if (item.mesh) item.mesh.rotation.y += 0.01; });
        if (zanahoria && zanahoria.mesh) zanahoria.mesh.rotation.y += 0.01;


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
                camera.lookAt(lookTarget);

            } else if (cameraMode === 1 && frostyModels[currentFrostyIndex]) {
                const frosty = frostyModels[currentFrostyIndex];

                const desiredPosition = new THREE.Vector3(
                    frosty.position.x,
                    frosty.position.y + 80,
                    frosty.position.z + 500
                );
                camera.position.lerp(desiredPosition, 0.1);
                camera.lookAt(frosty.position);
            }
        }

        checkPickupCollision();
        checkDeliveryCollision();
    }

    renderer.render(scene, camera);
}

window.GameApi = {
    createRemoteHamster,
    updateRemoteHamsterPosition,
    removeRemoteHamster,

    setPauseState: (estado) => {
        juegoPausado = estado;
    },
    isGamePaused: () => juegoPausado
};

document.addEventListener('keydown', (event) => {
    if (!hamster || juegoPausado) return;

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

loadModel(frostyPaths[0].obj, frostyPaths[0].mtl, {
    scale: [snowballSize * 20, snowballSize * 20, snowballSize * 20],
    position: [-50, -3, 0],
}, (obj) => {
    snowball = obj;
    snowballBox = new THREE.Box3().setFromObject(snowball);
    scene.add(snowball);
});


for (let i = 0; i < GOALS.RAMAS; i++) {
    loadModel('./models/nevado/rama.obj', './models/nevado/rama.mtl', {
        scale: [20, 20, 20],
        position: [70 + i * 20, -3, -10 + i * 10],
        rotation: [0, 0, 0],
    }, (obj) => {
        ramas.push({ mesh: obj, box: new THREE.Box3().setFromObject(obj), collected: false, type: 'ramas' });
    });
}

for (let i = 0; i < GOALS.PIEDRITAS; i++) {
    loadModel('./models/nevado/piedrita.obj', './models/nevado/piedrita.mtl', {
        scale: [20, 20, 20],
        position: [90 + i * 10, -3, 0 + i * 10],
        rotation: [0, 0, 0],
    }, (obj) => {
        piedritas.push({ mesh: obj, box: new THREE.Box3().setFromObject(obj), collected: false, type: 'piedritas' });
    });
}

loadModel('./models/nevado/zanahoria.obj', './models/nevado/zanahoria.mtl', {
    scale: [20, 20, 20],
    position: [50, -3, -25],
}, (obj) => {
    zanahoria = { mesh: obj, box: new THREE.Box3().setFromObject(obj), collected: false, type: 'zanahoria' };
    scene.add(obj);
});


animate();