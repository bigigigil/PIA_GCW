import * as THREE from 'three';
import { setupMovementKeydown, setupMovementKeyup, updateHamsterMovement } from './PlayerControls.js';
import { loadModel, createUsernameLabel, createLocalPlayerMarker } from '../utils/ModelLoader.js';

let renderer, scene, camera, hamster;
let isPaused = false;
let gameLoopCallback = () => {};
let gameSpecifics = {};
let remotePlayers = new Map();
let cameraMode = 0; 

export function initScene(containerSelector, floorY, floorTexturePath, floorSize = 2000) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    document.querySelector(containerSelector).appendChild(renderer.domElement);

    // Luces
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(20, 20, 20);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1);
    fillLight.position.set(-20, 10, 10);
    scene.add(fillLight);

    // Suelo
    const loader = new THREE.TextureLoader();
    const floorTexture = loader.load(floorTexturePath);

    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize, 200, 200);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: floorTexture,
        roughness: 1,
        metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = (-Math.PI / 2);
    floor.position.y = floorY;
    scene.add(floor);

    // Configuración inicial de la cámara
    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

export function loadPlayer(initialPosition, playerScale, customKeyListener, specificLogic = {}) {
    gameSpecifics = specificLogic;

    loadModel('./models/hamster.obj', './models/hamster.mtl', {
        scale: playerScale,
        position: initialPosition,
    }, (obj) => {
        hamster = obj;
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
        hamster.userData.labelContainer = labelContainer;
    });

    // Configurar controles de movimiento (comunes)
    setupMovementKeyup();
    
    // Configurar controles de movimiento + teclas especiales (específicas)
    setupMovementKeydown((key) => {
        if (key === 'c') {
            cameraMode = (cameraMode + 1) % 2;
        }
        if (customKeyListener) customKeyListener(key);
    });
}

export function setGameLoopLogic(callback) {
    gameLoopCallback = callback;
}

export function animate() {
    requestAnimationFrame(animate);

    if (!isPaused && hamster) {
        updateHamsterMovement(hamster, gameSpecifics);

        gameLoopCallback(hamster, scene, camera, cameraMode);

        if (hamster.userData.labelContainer) {
            hamster.userData.labelContainer.rotation.y = -hamster.rotation.y;
        }
    }

    renderer.render(scene, camera);
}

export const game = {
    initScene,
    loadPlayer,
    setGameLoopLogic,
    animate,
    setScenePaused: (paused) => { isPaused = paused; },
    getHamster: () => hamster,
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getRemotePlayers: () => remotePlayers,
    getCameraMode: () => cameraMode,
};