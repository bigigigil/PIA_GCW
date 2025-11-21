import { actualizarIA } from './balonIA.js';

const ballSpeed = 0.05;
const floorY = -0.5;
const ballRadius = 2.5;

let hamster;
let pelota;

// --- escena, cámara y render ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.querySelector('.canchaContainer').appendChild(renderer.domElement);

camera.position.set(0, 7, 5);
camera.lookAt(0, 0, 0);


// --- Luces ---
const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(20, 20, 20);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1);
fillLight.position.set(-20, 10, 10);
scene.add(fillLight);


// --- Suelo/Cancha ---
const textureLoader = new THREE.TextureLoader();
const floorTexture = textureLoader.load('./models/textures/cancha.png');
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(1, 1);

const floorGeometry = new THREE.PlaneGeometry(40, 20);
const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 10,
    metalness: 0,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = (-Math.PI / 2);
floor.position.y = floorY;
scene.add(floor);


// --- Función de Carga de Modelos ---
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
                }
            });

            scene.add(obj);

            if (onLoad) onLoad(obj);
        });
    });
}

// --- Cargar Modelos ---
loadModel('./models/hamster.obj', './models/hamster.mtl', {
    scale: [5, 5, 5],
    position: [0, floorY, 0], 
    rotation: [-0.5, 0, 0],
}, (obj) => { hamster = obj; });


loadModel('./models/futbol/pelota.obj', './models/futbol/pelota.mtl', {
    scale: [1, 1, 1],
    position: [0, floorY, 5], 
    rotation: [0.01, 0, 0],
}, (obj) => { pelota = obj; });

document.addEventListener('keydown', (event) => {
    if (!hamster) return;

    const speed = 1;
    const turnSpeed = 0.5;

    switch (event.key) {
        case 'ArrowLeft':
            hamster.rotation.y += turnSpeed;
            break;
        case 'ArrowRight':
            hamster.rotation.y -= turnSpeed;
            break;
        case 'ArrowUp':
            hamster.rotation.y = -9.4;
            break;

        case 'ArrowDown': hamster.rotation.y = 0; break;
        case 'w':
            hamster.position.x += Math.sin(hamster.rotation.y) * speed;
            hamster.position.z += Math.cos(hamster.rotation.y) * speed;
            break;
        case 's':
            hamster.position.x -= Math.sin(hamster.rotation.y) * speed;
            hamster.position.z -= Math.cos(hamster.rotation.y) * speed;
            break;

        case 'a':
            hamster.position.x += Math.cos(hamster.rotation.y) * speed;
            hamster.position.z -= Math.sin(hamster.rotation.y) * speed;
            break;
        case 'd':
            hamster.position.x -= Math.cos(hamster.rotation.y) * speed;
            hamster.position.z += Math.sin(hamster.rotation.y) * speed;
            break;
    }
});

function animate() {
    requestAnimationFrame(animate);

    actualizarIA(hamster, pelota, ballSpeed, floorY, ballRadius);

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});