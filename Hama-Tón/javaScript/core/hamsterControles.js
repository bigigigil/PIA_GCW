import * as THREE from 'three';

const turnSpeed = 0.05;
const moveSpeed = 1.5;
const moveState = { forward: false, backward: false, left: false, right: false };
let isMoving = false;

const HAMSTER_HEIGHT = 8;
const MODEL_Y_OFFSET = -3;
const floorY = -11;

export function updateHamsterMovement(hamster, gameSpecifics) {
    if (!hamster) return;

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

    hamster.position.y = floorY + HAMSTER_HEIGHT + MODEL_Y_OFFSET;

    if (gameSpecifics.updateObjectLogic) {
        gameSpecifics.updateObjectLogic(hamster, isMoving);
    }
}

export function setupMovementKeydown(callback) {
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        switch (key) {
            case 'w': moveState.forward = true; break;
            case 's': moveState.backward = true; break;
            case 'a': moveState.left = true; break;
            case 'd': moveState.right = true; break;
            case 'arrowleft': moveState.left = true; break; 
            case 'arrowright': moveState.right = true; break; 
        }

        if (callback) callback(key);
    });
}

export function setupMovementKeyup() {
    document.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        switch (key) {
            case 'w': moveState.forward = false; break;
            case 's': moveState.backward = false; break;
            case 'a': moveState.left = false; break;
            case 'd': moveState.right = false; break;
            case 'arrowleft': moveState.left = false; break;
            case 'arrowright': moveState.right = false; break;
        }
    });
}