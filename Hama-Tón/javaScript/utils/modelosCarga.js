import * as THREE from 'three';

export function loadModel(objPath, mtlPath, options = {}, onLoad) {
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
                        castShadow: true,
                        receiveShadow: true,
                    });
                }
            });
            if (onLoad) onLoad(obj);
        });
    });
}

/**
 * @param {string} username
 * @returns {THREE.Sprite}
 */
export function createUsernameLabel(username) {
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

/**
 * @returns {THREE.Mesh}
 */
export function createLocalPlayerMarker() {
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