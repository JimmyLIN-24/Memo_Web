import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ---------------------------------------------------------
// 配置 & 状态
// ---------------------------------------------------------
const CONFIG = {
    particleCount: 1000, // 金色碎片
    shapeCount: 200,     // 几何形状 (球/方/三角)
    photoCount: 0,       // 将从 manifest 加载
    
    treeHeight: 18,
    treeRadius: 10,
    
    colors: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff], // 霓虹色系
    gold: 0xffd700,
    
    bloomStrength: 1.2,  // 降低辉光，让星星轮廓更清晰
    bloomRadius: 0.4,
    bloomThreshold: 0.9, // 提高阈值，只让极亮的部分发光
};

const state = {
    expansion: 0,
    targetExpansion: 0,
    rotationSpeed: 0.001,
    targetRotationSpeed: 0.002,
    autoRotate: true,
    // 新增：视角高度控制
    cameraY: 6, // 初始高度降低，更接近平视
    targetCameraY: 6
};

// ---------------------------------------------------------
// 场景初始化
// ---------------------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x001a0f, 0.02); 

// 3. 背景星星 -> 改为球形粒子 (SphereGeometry 太重，用 Points + texture 或 circle sprite)
// 为了性能和效果，用 CircleSprite 或者简单的 PointsMaterial (默认是方点，改圆点需要 map)
// 这里直接用 PointsMaterial 的 map 属性加载一个圆形纹理，或者简单点用 shader
// 最简单且好看的方法：使用 circular sprite texture
const starGeometry = new THREE.BufferGeometry();
const starCount = 2000;
const starPositions = new Float32Array(starCount * 3);
for(let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 100; 
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

// 生成圆形纹理
const canvas = document.createElement('canvas');
canvas.width = 32;
canvas.height = 32;
const context = canvas.getContext('2d');
context.beginPath();
context.arc(16, 16, 16, 0, 2 * Math.PI);
context.fillStyle = 'white';
context.fill();
const starTexture = new THREE.CanvasTexture(canvas);

const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5, // 稍微大一点因为是球形
    map: starTexture,
    transparent: true,
    opacity: 0.8,
    alphaTest: 0.5, // 去掉边缘黑边
    sizeAttenuation: true
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);


const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// 2. 调整视角：平视带一点俯视
camera.position.set(0, state.cameraY, 28); // Z轴拉远一点，Y轴降低
camera.lookAt(0, 4, 0); // 看向树的中下部，保证平视感

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.autoRotate = false;
// 限制垂直旋转角度，防止用户转到奇怪的角度
controls.maxPolarAngle = Math.PI / 2 + 0.1; // 稍微允许低过水平线一点点
controls.minPolarAngle = Math.PI / 3; // 不允许太高俯视

// Postprocessing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = CONFIG.bloomThreshold;
bloomPass.strength = CONFIG.bloomStrength;
bloomPass.radius = CONFIG.bloomRadius;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ---------------------------------------------------------
// 辅助函数：圆锥体随机位置
// ---------------------------------------------------------
function getRandomTreePosition() {
    const t = Math.random(); 
    const y = t * CONFIG.treeHeight;
    const rMax = CONFIG.treeRadius * (1 - t);
    const r = rMax * Math.pow(Math.random(), 0.5);
    const theta = Math.random() * Math.PI * 2;
    
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    
    return {
        pos: new THREE.Vector3(x, y, z),
        t: t,
        theta: theta, 
        rMax: rMax
    };
}

// ---------------------------------------------------------
// 圣诞树构建
// ---------------------------------------------------------
const treeGroup = new THREE.Group();
treeGroup.position.y = -10; 
scene.add(treeGroup);

const allObjectsData = []; 
const dummy = new THREE.Object3D();

// 1. 金色碎片
const particleGeometry = new THREE.TetrahedronGeometry(0.12);
const particleMaterial = new THREE.MeshStandardMaterial({
    color: CONFIG.gold,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0xffaa00,
    emissiveIntensity: 0.4
});
const particleMesh = new THREE.InstancedMesh(particleGeometry, particleMaterial, CONFIG.particleCount);
treeGroup.add(particleMesh);

for (let i = 0; i < CONFIG.particleCount; i++) {
    const { pos } = getRandomTreePosition();
    pos.add(new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)));

    dummy.position.copy(pos);
    dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    dummy.scale.setScalar(0.5 + Math.random());
    dummy.updateMatrix();
    particleMesh.setMatrixAt(i, dummy.matrix);
    
    allObjectsData.push({
        type: 'mesh',
        mesh: particleMesh,
        index: i,
        originalPos: pos.clone(),
        direction: new THREE.Vector3(pos.x, 0, pos.z).normalize(),
        rotationSpeed: (Math.random()-0.5) * 0.02,
        scale: dummy.scale.x,
        randomPhase: Math.random() * Math.PI * 2
    });
}

// 2. 几何形状
const geometries = [
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.SphereGeometry(0.25, 16, 16),
    new THREE.OctahedronGeometry(0.3)
];

const shapesGroup = new THREE.Group();
treeGroup.add(shapesGroup);

for (let i = 0; i < CONFIG.shapeCount; i++) {
    const { pos } = getRandomTreePosition();
    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.6,
        emissive: color,
        emissiveIntensity: 1.5 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    mesh.scale.setScalar(0.8 + Math.random() * 0.5);
    
    mesh.userData = {
        originalPos: pos.clone(),
        direction: new THREE.Vector3(pos.x, Math.random()-0.5, pos.z).normalize(),
        rotationSpeed: (Math.random()-0.5) * 0.03,
        randomPhase: Math.random() * Math.PI * 2
    };
    
    shapesGroup.add(mesh);
}

// 3. 照片卡片
const photoGroup = new THREE.Group();
treeGroup.add(photoGroup);
const textureLoader = new THREE.TextureLoader();
const cardGeo = new THREE.PlaneGeometry(1.5, 1.8); 
const cardBackGeo = new THREE.PlaneGeometry(1.5, 1.8); 
cardBackGeo.rotateY(Math.PI); 

const frameColors = [0xffffff, 0xffeb3b, 0xff4081, 0x00bcd4, 0x4caf50, 0x9c27b0, 0xff9800];
const frameGeo = new THREE.BoxGeometry(1.6, 1.9, 0.05);

fetch('photos_manifest.json')
    .then(response => response.json())
    .then(photoList => {
        CONFIG.photoCount = photoList.length;
        photoList.forEach((filename, index) => {
            const { pos, t, theta } = getRandomTreePosition();
            const rSurface = CONFIG.treeRadius * (1 - t);
            const dir = new THREE.Vector3(pos.x, 0, pos.z).normalize();
            pos.set(dir.x * rSurface, pos.y, dir.z * rSurface);
            pos.addScaledVector(dir, (Math.random() - 0.5) * 2);

            const url = `photos/${filename}`;
            textureLoader.load(url, (tex) => {
                tex.minFilter = THREE.LinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.anisotropy = maxAnisotropy;
                tex.colorSpace = THREE.SRGBColorSpace; 
                createPhoto(tex, pos, t, theta);
            }, undefined, () => createPhoto(null, pos, t, theta, true));
        });
    })
    .catch(err => {
        console.error("Failed to load photo manifest:", err);
    });

function createPhoto(texture, pos, heightRatio, theta, isPlaceholder) {
    const group = new THREE.Group();
    const randomColor = frameColors[Math.floor(Math.random() * frameColors.length)];
    const frameMat = new THREE.MeshStandardMaterial({ color: randomColor, roughness: 0.9 });
    
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.025; 
    group.add(frame);
    
    let mat;
    if (isPlaceholder) {
        mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6) });
    } else {
        mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });
    }
    
    const photo = new THREE.Mesh(cardGeo, mat);
    photo.position.y = 0.15;
    photo.position.z = 0.001; 
    group.add(photo);

    const photoBack = new THREE.Mesh(cardBackGeo, mat);
    photoBack.position.y = 0.15;
    photoBack.position.z = -0.051; 
    group.add(photoBack);

    group.position.copy(pos);
    group.lookAt(0, pos.y, 0);
    group.rotateY(Math.PI);
    const tiltAngle = -Math.PI / 4; 
    group.rotateX(tiltAngle);
    group.rotateY((Math.random() - 0.5) * 0.5);
    group.rotateZ((Math.random() - 0.5) * 0.2);
    
    group.userData = {
        originalPos: pos.clone(),
        direction: new THREE.Vector3(pos.x, 0, pos.z).normalize(), 
        initialQuaternion: group.quaternion.clone(),
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        randomPhase: Math.random() * 100
    };
    photoGroup.add(group);
}

// 灯光
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const mainLight = new THREE.PointLight(0xffd700, 1.5, 50);
mainLight.position.set(10, 20, 10);
scene.add(mainLight);

// 1. 优化星星：轮廓清晰但有亮度
// 减弱 emissiveIntensity, 增加 roughness 使其更像实体
const starShape = new THREE.Shape();
const points = 5;
const outerRadius = 1.5;
const innerRadius = 0.7;
for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0) ? outerRadius : innerRadius;
    const a = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
}
starShape.closePath();

const starExtrudeGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2
});
starExtrudeGeo.center(); 

const starMat = new THREE.MeshStandardMaterial({ 
    color: 0xffd700, // 纯金
    emissive: 0xffd700, 
    emissiveIntensity: 0.8, // 降低自发光强度，避免 bloom 糊成一团
    roughness: 0.2,
    metalness: 1.0 // 全金属感
});
const star = new THREE.Mesh(starExtrudeGeo, starMat);
star.position.y = CONFIG.treeHeight + 1; 
treeGroup.add(star);


// ---------------------------------------------------------
// MediaPipe Hands & Visuals
// ---------------------------------------------------------
const videoElement = document.getElementById('video-element');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');
const toggleCameraBtn = document.getElementById('toggleCamera');
const cameraContainer = document.getElementById('cameraContainer');

let cameraEnabled = false;
let hands;
let cameraFeed;

toggleCameraBtn.addEventListener('click', async () => {
    if (!cameraEnabled) {
        await startCamera();
    } else {
        stopCamera();
    }
});

async function startCamera() {
    if (!window.Hands) {
        alert("AI模型加载中...");
        return;
    }
    
    toggleCameraBtn.textContent = "关闭摄像头";
    cameraContainer.style.display = "block";
    cameraEnabled = true;

    hands = new window.Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    hands.onResults(onResults);

    if (typeof window.Camera === 'undefined') {
        setTimeout(startCamera, 500);
        return;
    }

    cameraFeed = new window.Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 640, 
        height: 480
    });

    try {
        await cameraFeed.start();
        document.getElementById('loading').style.display = 'none';
    } catch (e) {
        console.error(e);
        stopCamera();
    }
}

function stopCamera() {
    if (cameraFeed) {
        const stream = videoElement.srcObject;
        if (stream) stream.getTracks().forEach(t => t.stop());
        videoElement.srcObject = null;
    }
    cameraEnabled = false;
    toggleCameraBtn.textContent = "开启摄像头互动";
    cameraContainer.style.display = "none";
    
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    state.targetExpansion = 0;
    state.rotationSpeed = 0.001;
}

function onResults(results) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
                color: '#FFD700', 
                lineWidth: 3
            });
            window.drawLandmarks(canvasCtx, landmarks, {
                color: '#FF0000', 
                lineWidth: 2, 
                radius: 4
            });
        }
        
        const landmarks = results.multiHandLandmarks[0];
        const centerX = landmarks[9].x; 
        const rotationInput = (centerX - 0.5) * 2;
        // 5. 降低横向旋转灵敏度：原来 0.03 -> 0.015
        state.rotationSpeed = -rotationInput * 0.015;

        // 4. 垂直移动控制相机高度
        // centerY: 0 (top) -> 1 (bottom)
        // 对应相机高度 Y: 18 (高) -> -2 (低)
        const centerY = landmarks[9].y;
        const targetY = 18 - (centerY * 20); // Map 0..1 to 18..-2
        
        // 平滑过渡，灵敏度低一点 (lerp factor 小一点)
        state.targetCameraY = targetY;

        const thumb = landmarks[4];
        const index = landmarks[8];
        const distance = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
        
        let expansion = (distance - 0.05) / 0.15;
        expansion = Math.max(0, Math.min(1, expansion));
        state.targetExpansion = expansion * 15; 
        
    } else {
        state.rotationSpeed = THREE.MathUtils.lerp(state.rotationSpeed, 0.002, 0.05);
        state.targetExpansion = THREE.MathUtils.lerp(state.targetExpansion, 0, 0.05);
        // 无手势时恢复默认视角
        state.targetCameraY = 6; 
    }
    
    canvasCtx.restore();
}


// ---------------------------------------------------------
// 交互事件 (Mouse/Touch)
// ---------------------------------------------------------
document.addEventListener('mousemove', (e) => {
    if (!cameraEnabled) {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        // 鼠标旋转也降低灵敏度
        state.rotationSpeed = x * 0.002;
    }
});
const interactStart = () => { if (!cameraEnabled) state.targetExpansion = 8; };
const interactEnd = () => { if (!cameraEnabled) state.targetExpansion = 0; };
document.addEventListener('mousedown', interactStart);
document.addEventListener('mouseup', interactEnd);
document.addEventListener('touchstart', interactStart);
document.addEventListener('touchend', interactEnd);


// ---------------------------------------------------------
// 动画循环
// ---------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    state.expansion = THREE.MathUtils.lerp(state.expansion, state.targetExpansion, 0.1);
    treeGroup.rotation.y += state.rotationSpeed;
    
    // 平滑更新相机高度
    // 灵敏度调节: 0.05 比较慢且平滑
    state.cameraY = THREE.MathUtils.lerp(state.cameraY, state.targetCameraY, 0.05);
    camera.position.y = state.cameraY;
    camera.lookAt(0, 4, 0); // 始终盯着树心
    
    star.rotation.y = time;
    star.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
    
    stars.rotation.y = time * 0.05;

    let i = 0;
    for (const data of allObjectsData) {
        dummy.position.copy(data.originalPos).addScaledVector(data.direction, state.expansion);
        dummy.position.y += Math.sin(time * 2 + data.randomPhase) * 0.05;
        
        const rotSpeed = data.rotationSpeed * (1 + state.expansion);
        dummy.rotation.x += rotSpeed;
        dummy.rotation.y += rotSpeed;
        dummy.scale.setScalar(data.scale);
        
        dummy.updateMatrix();
        data.mesh.setMatrixAt(data.index, dummy.matrix);
    }
    if (allObjectsData.length > 0) allObjectsData[0].mesh.instanceMatrix.needsUpdate = true;

    shapesGroup.children.forEach(mesh => {
        const data = mesh.userData;
        mesh.position.copy(data.originalPos).addScaledVector(data.direction, state.expansion);
        mesh.rotation.x += data.rotationSpeed;
        mesh.rotation.y += data.rotationSpeed;
        mesh.material.emissiveIntensity = 1 + Math.sin(time * 3 + data.randomPhase) * 0.5;
    });

    photoGroup.children.forEach(group => {
        const data = group.userData;
        
        group.position.copy(data.originalPos).addScaledVector(data.direction, state.expansion * 0.8);
        group.position.y += Math.sin(time * 1.5 + data.randomPhase) * 0.02;
        
        if (state.expansion > 0.05) {
             group.rotation.x += 0.02;
             group.rotation.y += 0.01;
        } else {
             if (data.initialQuaternion) {
                 group.quaternion.slerp(data.initialQuaternion, 0.1);
             }
        }
    });
    
    controls.update();
    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.setSize(new THREE.Vector2(window.innerWidth, window.innerHeight));
});

animate();
