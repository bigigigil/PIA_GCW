/**
 * @param {THREE.Object3D} hamster 
 * @param {THREE.Object3D} pelota 
 * @param {number} ballSpeed 
 * @param {number} floorY 
 * @param {number} ballRadius 
 */
export function actualizarIA(hamster, pelota, ballSpeed, floorY, ballRadius) {
   
    if (!hamster || !pelota) return;

    const dx = hamster.position.x - pelota.position.x;
    const dz = hamster.position.z - pelota.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance > 1.5) { 
        const dirX = dx / distance;
        const dirZ = dz / distance;

        const moveX = dirX * ballSpeed;
        const moveZ = dirZ * ballSpeed;

        pelota.position.x += moveX;
        pelota.position.z += moveZ;
        pelota.position.y = floorY;

        const moveDistance = Math.sqrt(moveX * moveX + moveZ * moveZ);
        const angle = moveDistance / ballRadius;

        const moveVector = new THREE.Vector3(moveX, 0, moveZ).normalize();
        const up = new THREE.Vector3(0, 1, 0);

        const rotationAxis = new THREE.Vector3().crossVectors(up, moveVector).normalize();

        pelota.rotateOnAxis(rotationAxis, angle);

    } else if (distance < 1.5) {
        console.log("¡El hámster fue arrollado por la pelota!");
    }
    hamster.position.y = floorY;
}