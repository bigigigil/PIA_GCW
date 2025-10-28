const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraMode = 0;
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.querySelector('.casaContainer').appendChild(renderer.domElement);
// ... (Configuración de luces y suelo, asumimos que están aquí) ...
// luces
const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(20, 20, 20);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1);
fillLight.position.set(-20, 10, 10);
scene.add(fillLight);
// suelo
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

// --- VARIABLES GLOBALES DEL JUEGO ---
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
let carried = { type: null, count: 0 };
let collected = { ramas: 0, piedritas: 0, zanahoria: 0 };
let ramas = [];
let piedritas = [];
let snowballBox;
let snowballSize = 0.1;
const MAX_SNOWBALL_SIZE = 1;
let isSnowballReady = false;
const FROSTY_MAIN_POSITION = new THREE.Vector3(0, -3, -25);
let frostyModels = [];
let currentFrostyIndex = 0;

const cameraOffset = new THREE.Vector3(0, 5, -15); // detrás y arriba

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // Fondo transparente
document.querySelector('.casaContainer').appendChild(renderer.domElement);





// --- FUNCIONES DE UTILIDAD ---



function updateUI() {
    const carrotElement = document.querySelector('h2:nth-child(3)');
    const branchElement = document.querySelector('h2:nth-child(4)');
    const stoneElement = document.querySelector('h2:nth-child(5)');

    if (carrotElement) carrotElement.textContent = `zanahoria: ${collected.zanahoria}/${GOALS.ZANAHORIA}`;
    if (branchElement) branchElement.textContent = `ramas: ${collected.ramas}/${GOALS.RAMAS}`;
    if (stoneElement) stoneElement.textContent = `piedritas: ${collected.piedritas}/${GOALS.PIEDRITAS}`;
}

function createLocalPlayerMarker() {
    const geometry = new THREE.CircleGeometry(0.5, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
    });
    const marker = new THREE.Mesh(geometry, material);
    // Lo rotamos para que quede horizontal
    marker.rotation.x = -Math.PI / 2;
    marker.rotation.y = 0;
    // CORRECCIÓN DE POSICIÓN: Ahora es RELATIVA al pivot del hámster.
    // El pivot del hámster está 8 unidades por encima del suelo. 
    // Para que el círculo esté en el suelo, debe estar 8.1 unidades por debajo del pivot.
    marker.position.x = 0;
    marker.position.z = 0; // Centrado bajo el hámster
    marker.position.y = -0.3; // Distancia hacia abajo (relativa al pivot, NO al suelo)

    return marker;
}

function createUsernameLabel(username) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Aumentar el tamaño del lienzo para mayor resolución y claridad
    const scaleFactor = 1;
    const baseFontSize = 10;
    const fontSize = baseFontSize * scaleFactor;
    const font = `${fontSize}px Arial`;
    context.font = font;

    const textWidth = context.measureText(username).width;
    canvas.width = (textWidth + 10) * scaleFactor;
    canvas.height = (fontSize + 10) * scaleFactor;

    // Asegurarse de reajustar la fuente después de cambiar el tamaño del lienzo
    context.font = font;

    context.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Fondo semi-transparente
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'white'; // Color del texto
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

            if (options.scale) obj.scale.set(...options.scale);
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

    if (snowball && isMoving) {
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
}

function checkPickupCollision() {
    // 💡 FIX 3: Esta función se ejecuta aquí.
    if (!hamster || !hamsterBox || carried.type) return;

    const checkItem = (item) => {
        if (!item.collected && hamsterBox.intersectsBox(item.box)) {
            // Lógica de recogida
            item.collected = true;
            item.mesh.visible = false;
            scene.remove(item.mesh);

            carried.type = item.type !== 'piedritas' ? item.type : 'piedritas';
            carried.count = 1;
            return true;
        }
        return false;
    };

    if (zanahoria && !zanahoria.collected && checkItem(zanahoria)) return;
    for (const item of ramas) { if (checkItem(item)) return; }
    for (const item of piedritas) { if (checkItem(item)) return; }
}

function checkDeliveryCollision() {
    if (!hamster || !frostyModels[currentFrostyIndex] || !carried.type) return;

    const frostyMesh = frostyModels[currentFrostyIndex];
    const distanceToFrosty = hamster.position.distanceTo(frostyMesh.position);

    // Si el hámster está lo suficientemente cerca para hacer la "entrega"
    if (distanceToFrosty < DELIVERY_RADIUS) {

        let shouldProgress = false;

        switch (carried.type) {
            case 'ramas':
                if (currentFrostyIndex === 1 && collected.ramas < GOALS.RAMAS) {
                    collected.ramas += carried.count;
                    if (collected.ramas >= GOALS.RAMAS) shouldProgress = true;
                }
                break;
            case 'piedritas':
                if (currentFrostyIndex === 2 && collected.piedritas < GOALS.PIEDRITAS) {
                    // Si llevamos piedritas, asumimos que entregamos el resto de las que faltan
                    collected.piedritas = GOALS.PIEDRITAS;
                    shouldProgress = true;
                }
                break;
            case 'zanahoria':
                if (currentFrostyIndex === 3 && collected.zanahoria < GOALS.ZANAHORIA) {
                    collected.zanahoria += carried.count;
                    shouldProgress = true;
                }
                break;
        }

        if (shouldProgress) {
            // Avanzar el modelo Frosty al siguiente estado
            progressFrostyModel();
        }

        // Entregado el item (o los items), el hámster no lleva nada más
        if (carried.type) {
            console.log(`Entrega exitosa de ${carried.type} a Frosty!`);
        }
        carried.type = null;
        carried.count = 0;
        updateUI();
    }
}

function checkFrostyCollision() {
    if (currentFrostyIndex === 0 && snowball && frostyModels[0] && isSnowballReady) {
        const frostyMainBox = new THREE.Box3().setFromObject(frostyModels[0]);
        snowballBox.setFromObject(snowball);

        if (snowballBox.intersectsBox(frostyMainBox)) {
            console.log("Colisión: Bola de nieve lista con Frosty0. ¡Construyendo Frosty1!");

            frostyModels[0].visible = false;
            snowball.visible = false;
            scene.remove(snowball);
            snowball = null;

            currentFrostyIndex = 1;
            frostyModels[currentFrostyIndex].visible = true;
            isSnowballReady = false;
        }
    }
}

function progressFrostyModel() {
    if (currentFrostyIndex >= frostyModels.length - 1) return;

    const nextIndex = currentFrostyIndex + 1;

    if (nextIndex === 2 && collected.ramas < GOALS.RAMAS) return;
    if (nextIndex === 3 && collected.piedritas < GOALS.PIEDRITAS) return;
    if (nextIndex === 4 && collected.zanahoria < GOALS.ZANAHORIA) return;

    // Si se cumple la condición para avanzar
    if (frostyModels[currentFrostyIndex]) {
        frostyModels[currentFrostyIndex].visible = false;
    }
    currentFrostyIndex = nextIndex;
    if (frostyModels[currentFrostyIndex]) {
        frostyModels[currentFrostyIndex].visible = true;
    }
    console.log(`❄️ Muñeco de nieve avanzado a fase Frosty${currentFrostyIndex}`);
}

// Archivo: javaScript/game_nevado.js (Funciones de GameApi)
function createRemoteHamster(socketId, username, initialPosition, isLocal = false) {
    if (isLocal) {
        // El jugador local ya es la variable 'hamster' cargada.
        // Si el hámster local aún no ha cargado, esto podría ser un problema de timing.
        // Asumiendo que el hámster local ya cargó antes de que se llame esta función.
        return;
    }
    if (!hamster || remotePlayers.has(socketId)) return;

    const remoteHamster = hamster.clone();
    remoteHamster.name = username;
    remoteHamster.userData.socketId = socketId;

    // 1. Clonar y cambiar color (Tu lógica de color rojo para diferenciar)
    remoteHamster.traverse((child) => {
        if (child.isMesh) {
            // Revertir a material original si es necesario, o simplemente no clonar/cambiar el color
            // Dejar el modelo con su material por defecto (si lo carga el clone)
            // Si el modelo local no se modifica, el clone será igual.
            // Si el hámster local tiene un material modificado por Three.js, podría ser mejor recargar/aplicar el material original.
            // Por ahora, solo quitamos el cambio a rojo.
        }
    });

    // 2. Agregar solo el nombre de usuario
    const label = createUsernameLabel(username);
    // POSICIÓN CORREGIDA: -5 en Y local
     label.position.set(0, 0.8, 0.5);
    remoteHamster.add(label);
    remoteHamster.userData.label = label;
    // ---------------------------------------------

    // 2. Posición inicial (Aleatoria o por defecto si no hay datos de red iniciales)
    const randomX = Math.random() * 40 - 20;
    const randomZ = Math.random() * 40 - 20;
    const spawnY = HAMSTER_HEIGHT + MODEL_Y_OFFSET + floor.position.y;

    remoteHamster.position.set(randomX, spawnY, randomZ);

    // Si el servidor enviara una posición inicial, úsala aquí:
    if (initialPosition && initialPosition.x !== undefined) {
        remoteHamster.position.set(initialPosition.x, initialPosition.y || spawnY, initialPosition.z);
    }

    // 💡 IMPORTANTE: Almacenamos la posición objetivo para la interpolación
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

// ----------------------------------------------------
// ## CICLO DE ANIMACIÓN
// ----------------------------------------------------


function animate() {
    requestAnimationFrame(animate);

    if (!juegoPausado) {
        updateHamsterMovement();

        // Lógica de Envío Multijugador (solo si se mueve)
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
            // Usamos lerp (interpolación lineal) para mover el modelo suavemente 
            remoteHamster.position.lerp(target, 0.2);

            // --- ¡Añadir esta lógica de interpolación de rotación! ---
            const targetRotationY = remoteHamster.userData.targetRotationY;
            if (targetRotationY !== undefined) {
                // Interpolación angular para rotación (evitar saltos al cruzar 0/2*PI)
                remoteHamster.rotation.y = THREE.MathUtils.lerp(
                    remoteHamster.rotation.y,
                    targetRotationY,
                    0.2 // Mismo factor de suavidad
                );
            }
            // -----------------------------------------------------------

            // Opcional: Rotar el modelo para simular la dirección
            // remoteHamster.lookAt(target); // (Esta línea se puede eliminar si se usa lerp de rotación)
        });

        // Recalcular Box3s (solo los activos)
        if (hamster) hamsterBox.setFromObject(hamster);
        ramas.forEach(item => { if (item.mesh) item.box.setFromObject(item.mesh); });
        piedritas.forEach(item => { if (item.mesh) item.box.setFromObject(item.mesh); });
        if (zanahoria && zanahoria.mesh) zanahoria.box.setFromObject(zanahoria.mesh);
        if (snowball) snowballBox.setFromObject(snowball);

        // Animación de rotación para objetos recolectables
        ramas.forEach(item => { if (item.mesh) item.mesh.rotation.y += 0.01; });
        piedritas.forEach(item => { if (item.mesh) item.mesh.rotation.y += 0.01; });
        if (zanahoria && zanahoria.mesh) zanahoria.mesh.rotation.y += 0.01;


        if (hamster) {
            // Lógica de cámara (omitiendo detalles)
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

        // Lógica de Colisión principal
        checkPickupCollision();
        checkDeliveryCollision();
        checkFrostyCollision();
    }

    renderer.render(scene, camera);
}


// ----------------------------------------------------
// ## EXPOSICIÓN DE LA API DE JUEGO (GLOBAL)
// ----------------------------------------------------
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
    if (!hamster || juegoPausado) return; // Añadido chequeo de pausa

    switch (event.key.toLowerCase()) {
        case 'w': moveState.forward = true; break;
        case 's': moveState.backward = true; break;
        case 'a': moveState.left = true; break;
        case 'd': moveState.right = true; break;
        case 'arrowleft': hamster.rotation.y += turnSpeed * 10; break;
        case 'arrowright': hamster.rotation.y -= turnSpeed * 10; break;
        case 'c': cameraMode = (cameraMode + 1) % 2; break;
    }
});

document.addEventListener('keyup', (event) => {
    if (!hamster || juegoPausado) return; // Añadido chequeo de pausa

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

// --- Carga Inicial de Modelos (debe ejecutarse al final) ---

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




// ... (Tu código de carga de loadModel para Hamster, Ramas, etc.) ...

// game_nevado.js (Buscar y modificar la carga del hámster local)

loadModel('./models/hamster.obj', './models/hamster.mtl', {
    scale: [15, 15, 15],
    position: [0, -3, 10],
}, (obj) => {
    hamster = obj;
    hamsterBox = new THREE.Box3().setFromObject(hamster);
    hamster.position.y = floor.position.y + HAMSTER_HEIGHT + MODEL_Y_OFFSET;
    scene.add(hamster);

    // --- NUEVAS ADICIONES PARA EL JUGADOR LOCAL ---
    const username = window.localStorage.getItem('username') || 'Tú';

    // 1. Agregar el círculo distintivo
    const marker = createLocalPlayerMarker();
    hamster.add(marker); 
    
    const label = createUsernameLabel(username);
   
    label.position.set(0, 0.8, 0.5);
    hamster.add(label);

    hamster.userData.label = label;

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