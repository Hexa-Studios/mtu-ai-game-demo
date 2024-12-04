// Configuration
const COLORS = {
    BACKGROUND: 0x87CEEB,  // Light blue for sky
    GROUND: 0x2d5c27,      // Green for main ground
    PLAYER: 0x4169E1,      // Royal blue
    COLLECTIBLE: 0xFF6B6B  // Coral red
};

const LIGHTING_CONFIG = {
    AMBIENT: {
        COLOR: 0xffffff,    // Color of ambient light
        INTENSITY: 0.9      // Intensity of ambient light (0-1)
    },
    DIRECTIONAL: {
        COLOR: 0xFFF8D5,    // Warm sunlight color
        INTENSITY: 1,
        POSITION: { x: 10, y: 10, z: 10 }  // Light position
    },
    RENDERER: {
        EXPOSURE: 1.2,          // Tone mapping exposure (higher = brighter)
        SATURATION: 3,        // Color saturation multiplier
        CONTRAST: 1.1           // Contrast adjustment
    }
};

const CAMERA_CONFIG = {
    FOLLOW: {
        HEIGHT: 4,        // Height above player
        DISTANCE: 10,     // Distance behind player
        SPEED: 0.1,      // How quickly camera follows player
        ANGLE: {          // Camera angle relative to player
            TILT: -0.2,   // Downward tilt (in radians)
            OFFSET: 0     // Horizontal rotation offset (in radians)
        }
    },
    FOV: 75,             // Field of view
    NEAR: 0.1,           // Near clipping plane
    FAR: 1000,           // Far clipping plane
    INITIAL: {           // Starting position
        X: 0,
        Y: 5,
        Z: 10
    }
};

const GAME_CONFIG = {
    MOVE_SPEED: 0.2,
    ROTATION_SPEED: 0.05,
    CAR_SCALE: 1.0,
    PLANE_SIZE: 40
};

// Collectible configurations
const COLLECTIBLES_CONFIG = [
    { id: 'gem_red', color: 0xFF6B6B, scale: 0.5, rotationSpeed: 0.02, bounceHeight: 0.2, bounceSpeed: 0.003 },
    { id: 'gem_blue', color: 0xFF6B6B, scale: 0.6, rotationSpeed: 0.03, bounceHeight: 0.3, bounceSpeed: 0.004 },
    { id: 'gem_green', color: 0xFF6B6B, scale: 0.4, rotationSpeed: 0.01, bounceHeight: 0.15, bounceSpeed: 0.002 },
    { id: 'crystal_purple', color: 0xFF6B6B, scale: 0.7, rotationSpeed: 0.015, bounceHeight: 0.25, bounceSpeed: 0.0035 },
    { id: 'crystal_gold', color: 0xFF6B6B, scale: 0.45, rotationSpeed: 0.025, bounceHeight: 0.22, bounceSpeed: 0.0025 }
];

// Game setup
let scene, camera, renderer, player, plane, collectibles = [], collectedCount = 0;
let playerVelocity = new THREE.Vector3();
let playerRotationVelocity = 0;
let targetCameraPosition = new THREE.Vector3();
let composer;
let carModel = null;
let nextCollectibleNumber = 1; // Track which number should be collected next

// Array to hold obstacle meshes
let obstacles = [];

// Create text sprite for collectible numbers
function createTextSprite(number) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;

    // Draw number
    context.fillStyle = '#000000';
    context.font = 'bold 192px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(number.toString(), 128, 128);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2.5, 2.5, 1);
    sprite.position.y = 1.5;
    return sprite;
}

// Create collectible with number
function createCollectible(config, position, number) {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.3,
        metalness: 0.3,
        emissive: config.color,
        emissiveIntensity: 0.2
    });

    const collectible = new THREE.Mesh(geometry, material);
    collectible.position.copy(position);
    collectible.scale.multiplyScalar(config.scale);

    // Add number sprite
    const numberSprite = createTextSprite(number);
    numberSprite.position.y = 1.5;
    collectible.add(numberSprite);

    // Store the collectible's number
    collectible.userData = {
        ...config,
        number: number
    };

    scene.add(collectible);
    collectibles.push(collectible);
}

// Modified spawn collectibles function
function spawnCollectibles() {
    // Clear existing collectibles
    collectibles.forEach(collectible => scene.remove(collectible));
    collectibles = [];

    const numCollectibles = 5;
    const positions = [];

    // Generate random positions
    for (let i = 0; i < numCollectibles; i++) {
        let position;
        do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 10; // Between 5 and 15 units from center
            position = new THREE.Vector3(
                Math.cos(angle) * radius,
                0.5,
                Math.sin(angle) * radius
            );
        } while (positions.some(pos => pos.distanceTo(position) < 3)); // Ensure minimum distance between collectibles

        positions.push(position);
        createCollectible(
            COLLECTIBLES_CONFIG[i % COLLECTIBLES_CONFIG.length],
            position,
            i + 1 // Number from 1 to 5
        );
    }
}

// Update score display
function updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = `Score: ${collectedCount}`;
}

// Modified check collectibles function
function checkCollectibles() {
    const playerPosition = new THREE.Vector3();
    player.getWorldPosition(playerPosition);

    collectibles.forEach((collectible, index) => {
        const collectiblePosition = new THREE.Vector3();
        collectible.getWorldPosition(collectiblePosition);

        if (playerPosition.distanceTo(collectiblePosition) < 1) {
            if (collectible.userData.number === nextCollectibleNumber) {
                scene.remove(collectible);
                collectibles.splice(index, 1);
                collectedCount++;
                nextCollectibleNumber++;
                updateScoreDisplay();
                displayCollectedImage(collectible.userData);
            }
        }
    });
}

// Display collected image
function displayCollectedImage(collectibleInfo) {
    const imageContainer = document.createElement('div');
    imageContainer.style.position = 'fixed';
    imageContainer.style.top = '10px';
    imageContainer.style.right = '10px';
    imageContainer.style.width = '200px';
    imageContainer.style.padding = '10px';
    imageContainer.style.backgroundColor = 'rgba(255,255,255,0.8)';
    imageContainer.style.borderRadius = '5px';

    const collectibleInfoDiv = document.createElement('div');
    collectibleInfoDiv.style.marginBottom = '5px';
    collectibleInfoDiv.style.textAlign = 'center';
    collectibleInfoDiv.style.fontFamily = 'Arial, sans-serif';
    collectibleInfoDiv.textContent = `Collected #${collectibleInfo.number}!`;

    const image = document.createElement('img');
    image.src = `./star-image.png?${new Date().getTime()}`; //  Use timestamp to ensure unique images  
    image.style.width = '100%';
    image.style.height = '200px';
    image.style.objectFit = 'cover';
    image.style.borderRadius = '3px';

    imageContainer.appendChild(collectibleInfoDiv);
    imageContainer.appendChild(image);
    document.body.appendChild(imageContainer);

    // Remove image after 3 seconds
    setTimeout(() => {
        document.body.removeChild(imageContainer);
    }, 3000);
}

// Function to create obstacles
function createObstacles() {
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark red
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);

    const positions = [
        { x: 5, y: 0.5, z: 5 },
        { x: -5, y: 0.5, z: -5 },
        { x: 10, y: 0.5, z: -10 },
        { x: -10, y: 0.5, z: 10 },
    ]; // Predefined positions for obstacles

    positions.forEach(pos => {
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        obstacle.position.set(pos.x, pos.y, pos.z);
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        scene.add(obstacle);
        obstacles.push(obstacle);
    });
}

// Function to check for collisions
function checkCollisions() {
    const playerPosition = new THREE.Vector3();
    player.getWorldPosition(playerPosition);

    obstacles.forEach(obstacle => {
        const obstaclePosition = new THREE.Vector3();
        obstacle.getWorldPosition(obstaclePosition);

        const distance = playerPosition.distanceTo(obstaclePosition);
        if (distance < 1.5) { // Collision threshold
            // Stop player movement
            playerVelocity.set(0, 0, 0);
        }
    });
}

// Function to create landscape
function createLandscape() {
    const landscapeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown color for landscape
    const landscapeGeometry = new THREE.CylinderGeometry(50, 50, 10, 32);

    const landscape = new THREE.Mesh(landscapeGeometry, landscapeMaterial);
    landscape.position.y = -10; // Slightly below the main plane
    landscape.rotation.x = Math.PI; // Rotate to lay flat
    landscape.receiveShadow = true;
    scene.add(landscape);

    // Add some hills
    const hillMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Forest green
    const hillGeometry = new THREE.SphereGeometry(5, 32, 32);
    const hillPositions = [
        { x: 25, y: 2.5, z: 25 },
        { x: -25, y: 2.5, z: -25 },
        { x: 30, y: 2.5, z: -30 },
        { x: -30, y: 2.5, z: 30 },
    ]; // Predefined positions for hills

    // Add some far hills
    const farHillMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x6B8E23 }), // Olive green
        new THREE.MeshStandardMaterial({ color: 0x556B2F }), // Dark olive green
        new THREE.MeshStandardMaterial({ color: 0x8FBC8F }), // Dark sea green
        new THREE.MeshStandardMaterial({ color: 0x2E8B57 })  // Sea green
    ]; // Different shades of green

    const farHillGeometry = new THREE.SphereGeometry(30, 128, 128); // Larger hills

    const farHillPositions = [
        // Top row
        { x: -60, y: 4.5, z: 80 },
        { x: -30, y: 5.5, z: 80 },
        { x: 0, y: 7.5, z: 80 },
        { x: 30, y: 8.5, z: 80 },
        { x: 60, y: 7.5, z: 80 },
        // Bottom row
        { x: -60, y: 7.5, z: -80 },
        { x: -28, y: 4.5, z: -80 },
        { x: 0, y: 5, z: -80 },
        { x: 30, y: 7.5, z: -80 },
        { x: 60, y: 6, z: -80 },
        // Left column
        { x: -80, y: 5, z: -60 },
        { x: -80, y: 7.5, z: -30 },
        { x: -80, y: 8.5, z: 0 },
        { x: -80, y: 7.5, z: 30 },
        { x: -80, y: 6.5, z: 60 },
        // Right column
        { x: 80, y: 7.5, z: -60 },
        { x: 80, y: 4, z: -30 },
        { x: 80, y: 9, z: 0 },
        { x: 80, y: 5, z: 30 },
        { x: 80, y: 7.5, z: 60 }
    ]; // Encircling the plane

    hillPositions.forEach(pos => {
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.position.set(pos.x, pos.y, pos.z);
        hill.castShadow = true;
        hill.receiveShadow = true;
        scene.add(hill);
    });

    // Function to create text sprite for hill numbers
    function createHillNumberSprite(number) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;

        // Draw number
        context.fillStyle = '#FFFFFF'; // White color for visibility
        context.font = 'bold 128px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(number.toString(), 128, 128);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(5, 5, 1);
        sprite.position.y = 20; // Position above the hill
        return sprite;
    }

    // Add numbers to far hills
    farHillPositions.forEach((pos, index) => {
        const material = farHillMaterials[Math.floor(Math.random() * 4) % farHillMaterials.length];
        const hill = new THREE.Mesh(farHillGeometry, material);
        hill.position.set(pos.x, pos.y, pos.z);
        hill.castShadow = true;
        hill.receiveShadow = true;
        scene.add(hill);

        // Add number sprite above the hill
        // const numberSprite = createHillNumberSprite(index + 1);
        // numberSprite.position.set(pos.x, pos.y + 15, pos.z);
        // scene.add(numberSprite);
    });
}

// Camera drag controls
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraOffset = new THREE.Vector3();
let draggedCameraPosition = new THREE.Vector3();

// Add mouse event listeners
// function initMouseControls() {
//     document.addEventListener('mousedown', onMouseDown);
//     document.addEventListener('mousemove', onMouseMove);
//     document.addEventListener('mouseup', onMouseUp);
// }

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseMove(event) {
    if (!isDragging) return;

    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };

    // Calculate camera movement based on drag
    const dragSpeed = 0.01;
    draggedCameraPosition.copy(camera.position);
    draggedCameraPosition.x += deltaMove.x * dragSpeed;
    draggedCameraPosition.y = Math.max(2, draggedCameraPosition.y - deltaMove.y * dragSpeed);

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp() {
    isDragging = false;
}

// Keyboard movement
function onKeyDown(event) {
    const moveDistance = GAME_CONFIG.MOVE_SPEED;
    switch (event.key) {
        case 'ArrowUp':
            playerVelocity.z = -moveDistance;
            break;
        case 'ArrowDown':
            playerVelocity.z = moveDistance;
            break;
        case 'ArrowLeft':
            playerRotationVelocity = GAME_CONFIG.ROTATION_SPEED;
            break;
        case 'ArrowRight':
            playerRotationVelocity = -GAME_CONFIG.ROTATION_SPEED;
            break;
    }
}

// Add key up handler
function onKeyUp(event) {
    switch (event.key) {
        case 'ArrowUp':
        case 'ArrowDown':
            playerVelocity.z = 0;
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            playerRotationVelocity = 0;
            break;
    }
}

// Load the car model
function loadCarModel() {
    return new Promise((resolve, reject) => {
        const loader = new THREE.GLTFLoader();
        loader.load(
            'red-car.glb',
            (gltf) => {
                carModel = gltf.scene;
                carModel.scale.set(
                    GAME_CONFIG.CAR_SCALE,
                    GAME_CONFIG.CAR_SCALE,
                    GAME_CONFIG.CAR_SCALE
                );
                resolve(carModel);
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error);
                reject(error);
            }
        );
    });
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Initialization function
async function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.BACKGROUND);

    // Create camera with configuration
    camera = new THREE.PerspectiveCamera(
        CAMERA_CONFIG.FOV,
        window.innerWidth / window.innerHeight,
        CAMERA_CONFIG.NEAR,
        CAMERA_CONFIG.FAR
    );
    camera.position.set(CAMERA_CONFIG.INITIAL.X, CAMERA_CONFIG.INITIAL.Y, CAMERA_CONFIG.INITIAL.Z);
    camera.lookAt(0, 0, 0);

    // Create renderer with enhanced settings
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = LIGHTING_CONFIG.RENDERER.EXPOSURE;
    document.body.appendChild(renderer.domElement);

    // Add lighting with configuration
    const ambientLight = new THREE.AmbientLight(
        LIGHTING_CONFIG.AMBIENT.COLOR,
        LIGHTING_CONFIG.AMBIENT.INTENSITY
    );
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
        LIGHTING_CONFIG.DIRECTIONAL.COLOR,
        LIGHTING_CONFIG.DIRECTIONAL.INTENSITY
    );
    directionalLight.position.set(
        LIGHTING_CONFIG.DIRECTIONAL.POSITION.x,
        LIGHTING_CONFIG.DIRECTIONAL.POSITION.y,
        LIGHTING_CONFIG.DIRECTIONAL.POSITION.z
    );
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create main gameplay ground
    const planeGeometry = new THREE.PlaneGeometry(GAME_CONFIG.PLANE_SIZE * 2, GAME_CONFIG.PLANE_SIZE * 2);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.GROUND,
        metalness: 0.3,
        roughness: 0.7
    });
    plane = new THREE.Mesh(planeGeometry, groundMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Create landscape
    createLandscape();

    // Create obstacles
    createObstacles();

    try {
        // Load and create player
        player = await loadCarModel();
        scene.add(player);
        player.position.y = 0.5;
        player.rotation.y = Math.PI;

        // Update materials
        player.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    } catch (error) {
        console.error('Failed to load car model:', error);
    }

    // Create collectibles
    spawnCollectibles();

    // Add event listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();
}

// Function to update debug information
function updateDebugInfo() {
    const debugElement = document.getElementById('debug');
    const playerPosition = new THREE.Vector3();
    player.getWorldPosition(playerPosition);
    debugElement.textContent = `Player Position: (${playerPosition.x.toFixed(2)}, ${playerPosition.y.toFixed(2)}, ${playerPosition.z.toFixed(2)})`;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update player rotation
    player.rotation.y += playerRotationVelocity;

    // Calculate movement direction based on player's rotation
    const moveDirection = new THREE.Vector3(0, 0, playerVelocity.z);
    moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);

    // Update player position with velocity
    player.position.x += moveDirection.x;
    player.position.z += moveDirection.z;

    // Keep player within bounds (half of plane size minus a small margin)
    const boundaryLimit = (GAME_CONFIG.PLANE_SIZE / 2) - 1;
    player.position.x = Math.max(-boundaryLimit, Math.min(boundaryLimit, player.position.x));
    player.position.z = Math.max(-boundaryLimit, Math.min(boundaryLimit, player.position.z));

    // Check for collisions
    checkCollisions();

    // Update debug information
    updateDebugInfo();

    // Calculate default camera position based on player's rotation
    cameraOffset.set(
        0,
        CAMERA_CONFIG.FOLLOW.HEIGHT,
        CAMERA_CONFIG.FOLLOW.DISTANCE
    );

    // Apply camera angle adjustments
    cameraOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), CAMERA_CONFIG.FOLLOW.ANGLE.TILT);
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y + CAMERA_CONFIG.FOLLOW.ANGLE.OFFSET);

    targetCameraPosition.set(
        player.position.x + cameraOffset.x,
        player.position.y + cameraOffset.y,
        player.position.z + cameraOffset.z
    );

    // If dragging, use dragged position, otherwise smoothly return to default position
    const targetPosition = isDragging ? draggedCameraPosition : targetCameraPosition;

    // Smoothly move camera to target position
    camera.position.x = lerp(camera.position.x, targetPosition.x, isDragging ? 1 : CAMERA_CONFIG.FOLLOW.SPEED);
    camera.position.y = lerp(camera.position.y, targetPosition.y, isDragging ? 1 : CAMERA_CONFIG.FOLLOW.SPEED);
    camera.position.z = lerp(camera.position.z, targetPosition.z, isDragging ? 1 : CAMERA_CONFIG.FOLLOW.SPEED);

    // Make camera look at player with vertical offset for better view
    camera.lookAt(
        player.position.x,
        player.position.y + 1,
        player.position.z
    );

    checkCollectibles();

    // Animate collectibles using their individual configurations
    collectibles.forEach(collectible => {
        const config = collectible.userData;
        collectible.rotation.y += config.rotationSpeed;
        collectible.position.y = 0.75 + Math.sin(Date.now() * config.bounceSpeed) * config.bounceHeight;
    });

    // Use renderer instead of composer
    renderer.render(scene, camera);
}

// Start the game
init();

// Helper function for smooth interpolation
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}
