/**
 * 嵌入式3D人体模型 - 直接集成在Dashboard首页
 * 支持开关控制显示/隐藏
 */

let scene, camera, renderer, controls;
let humanModel, particleSystem, ringSystem;
let mixer;
let clock;
let isAnimating = true;
let sharedMaterial;
let mainRing, innerRing, outerRing;
let isInitialized = false;
let animationId = null;

function waitForThreeJS(timeout = 15000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (typeof THREE !== 'undefined' && THREE.GLTFLoader && THREE.OrbitControls) {
                resolve();
                return;
            }
            if (Date.now() - start > timeout) {
                reject(new Error('Three.js 加载超时'));
                return;
            }
            setTimeout(check, 200);
        };
        check();
    });
}

const HumanModelEmbed = {
    container: null,
    canvasContainer: null,
    loadingEl: null,
    statsEl: null,
    controlsEl: null,
    _initialized: false,

    async init(containerId) {
        if (this._initialized) {
            this.show();
            return true;
        }

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('3D模型容器未找到:', containerId);
            return false;
        }

        this.canvasContainer = this.container.querySelector('#embed-canvas-container');
        this.loadingEl = this.container.querySelector('#embed-loading');
        this.statsEl = this.container.querySelector('#embed-stats');
        this.controlsEl = this.container.querySelector('#embed-controls');

        try {
            await waitForThreeJS();
            this._initThreeJS();
            this._setupEventListeners();
            this._initialized = true;
            this.show();
            return true;
        } catch (error) {
            console.error('3D模型初始化错误:', error);
            if (this.loadingEl) {
                this.loadingEl.innerHTML = `<div style="color:#ff6666; padding: 20px;">加载失败: ${error.message}<br><small>请刷新页面重试</small></div>`;
            }
            return false;
        }
    },

    _initThreeJS() {
        if (!this.canvasContainer) return;

        clock = new THREE.Clock();
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.Fog(0x000000, 5, 20);

        const width = this.canvasContainer.clientWidth || 600;
        const height = this.canvasContainer.clientHeight || 480;

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 1.0, 5);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        this.canvasContainer.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 10;
        controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(0, 0.9, 0);
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;

        this._setupLighting();
        this._createParticles();
        this._createRings();
        this._loadGLBModel();
        this._animate();
    },

    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x004444, 0.5);
        scene.add(ambientLight);

        const mainLight = new THREE.PointLight(0x00ffff, 2, 20);
        mainLight.position.set(3, 5, 3);
        scene.add(mainLight);

        const fillLight = new THREE.PointLight(0x0088ff, 1.5, 20);
        fillLight.position.set(-3, 3, -3);
        scene.add(fillLight);

        const bottomLight = new THREE.PointLight(0x00ffff, 1, 15);
        bottomLight.position.set(0, -2, 0);
        scene.add(bottomLight);
    },

    _createParticles() {
        const particleCount = 400;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = 0.8 + Math.random() * 1.5;

            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = 0.5 + r * Math.cos(phi) * 0.6;
            positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

            colors[i3] = 0;
            colors[i3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i3 + 2] = 1;
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.012,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        particleSystem = new THREE.Points(particles, particleMaterial);
        scene.add(particleSystem);
    },

    _createRings() {
        ringSystem = new THREE.Group();

        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });

        mainRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.75, 64), ringMaterial);
        mainRing.rotation.x = -Math.PI / 2;
        mainRing.position.y = -0.5;
        ringSystem.add(mainRing);

        innerRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.52, 64), ringMaterial);
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = -0.5;
        ringSystem.add(innerRing);

        outerRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.92, 64), ringMaterial);
        outerRing.rotation.x = -Math.PI / 2;
        outerRing.position.y = -0.5;
        ringSystem.add(outerRing);

        const gridHelper = new THREE.GridHelper(2, 20, 0x00ffff, 0x004444);
        gridHelper.position.y = -0.5;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.25;
        ringSystem.add(gridHelper);

        scene.add(ringSystem);
    },

    _loadGLBModel() {
        const loader = new THREE.GLTFLoader();
        const modelPath = '/views/user/human-model/Xbot.glb';

        const loadingText = this.loadingEl?.querySelector('#embed-loading-text');
        if (loadingText) loadingText.textContent = '正在加载3D人体模型...';

        loader.load(
            modelPath,
            (gltf) => {
                humanModel = gltf.scene;

                const box = new THREE.Box3().setFromObject(humanModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 1.8 / maxDim;
                humanModel.scale.setScalar(scale);
                humanModel.position.sub(center.multiplyScalar(scale));
                humanModel.position.y += 0.9;

                let vertexCount = 0;
                let faceCount = 0;

                sharedMaterial = new THREE.MeshPhongMaterial({
                    color: 0x00ffff,
                    wireframe: false,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide,
                    shininess: 100,
                    emissive: 0x003344,
                    emissiveIntensity: 0.5,
                    flatShading: false
                });

                humanModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material = sharedMaterial;

                        if (child.geometry) {
                            vertexCount += child.geometry.attributes.position.count;
                            if (child.geometry.index) {
                                faceCount += child.geometry.index.count / 3;
                            } else {
                                faceCount += child.geometry.attributes.position.count / 3;
                            }
                        }
                    }
                });

                const vEl = this.statsEl?.querySelector('#embed-vertex-count');
                const fEl = this.statsEl?.querySelector('#embed-face-count');
                if (vEl) vEl.textContent = vertexCount.toLocaleString();
                if (fEl) fEl.textContent = Math.floor(faceCount).toLocaleString();

                if (this.loadingEl) this.loadingEl.style.display = 'none';

                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(humanModel);
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                }

                scene.add(humanModel);
            },
            (xhr) => {
                if (loadingText) {
                    if (xhr.total > 0) {
                        const percent = Math.round((xhr.loaded / xhr.total) * 100);
                        loadingText.textContent = `加载中... ${percent}%`;
                    } else {
                        const mb = (xhr.loaded / 1024 / 1024).toFixed(1);
                        loadingText.textContent = `已加载 ${mb} MB...`;
                    }
                }
            },
            (error) => {
                console.error('模型加载失败:', error);
                if (loadingText) {
                    loadingText.innerHTML = '模型加载失败<br><small>请检查网络连接</small>';
                    loadingText.style.color = '#ff6666';
                }
            }
        );
    },

    _setupEventListeners() {
        const autoRotate = this.container.querySelector('#embed-auto-rotate');
        const showWireframe = this.container.querySelector('#embed-show-wireframe');
        const showGlow = this.container.querySelector('#embed-show-glow');
        const rotateSpeed = this.container.querySelector('#embed-rotate-speed');
        const resetBtn = this.container.querySelector('#embed-reset-view');
        const toggleBtn = this.container.querySelector('#embed-toggle-anim');
        const expandBtn = this.container.querySelector('#embed-expand-btn');

        if (autoRotate) {
            autoRotate.addEventListener('change', (e) => {
                if (controls) controls.autoRotate = e.target.checked;
            });
        }
        if (rotateSpeed) {
            rotateSpeed.addEventListener('input', (e) => {
                if (controls) controls.autoRotateSpeed = parseFloat(e.target.value);
            });
        }
        if (showWireframe) {
            showWireframe.addEventListener('change', (e) => {
                if (sharedMaterial) {
                    sharedMaterial.wireframe = e.target.checked;
                    sharedMaterial.flatShading = e.target.checked;
                    sharedMaterial.needsUpdate = true;
                }
            });
        }
        if (showGlow) {
            showGlow.addEventListener('change', (e) => {
                if (sharedMaterial) {
                    sharedMaterial.emissiveIntensity = e.target.checked ? 0.5 : 0.1;
                    sharedMaterial.opacity = e.target.checked ? 0.9 : 1;
                }
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (camera && controls) {
                    camera.position.set(0, 1.0, 5);
                    controls.target.set(0, 0.9, 0);
                    controls.update();
                }
            });
        }
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isAnimating = !isAnimating;
                toggleBtn.textContent = isAnimating ? '⏸ 暂停' : '▶ 播放';
            });
        }
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                window.open('/views/user/human-model/index.html', '_blank');
            });
        }

        this._resizeHandler = () => this._onResize();
        window.addEventListener('resize', this._resizeHandler);
    },

    _onResize() {
        if (!this.canvasContainer || !camera || !renderer) return;
        const width = this.canvasContainer.clientWidth;
        const height = this.canvasContainer.clientHeight;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    },

    _animate() {
        animationId = requestAnimationFrame(() => this._animate());
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        if (isAnimating) {
            if (particleSystem) particleSystem.rotation.y = time * 0.08;
            if (mainRing) mainRing.rotation.z = time * 0.4;
            if (innerRing) innerRing.rotation.z = -time * 0.25;
            if (outerRing) outerRing.rotation.z = time * 0.15;
            if (mixer) mixer.update(delta);
        }

        if (controls) controls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    },

    show() {
        if (this.container) this.container.style.display = 'block';
        if (!this._initialized) {
            this.init('human-model-embed-wrapper');
        } else {
            setTimeout(() => this._onResize(), 100);
        }
    },

    hide() {
        if (this.container) this.container.style.display = 'none';
    },

    toggle() {
        if (!this.container || this.container.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    },

    destroy() {
        if (animationId) cancelAnimationFrame(animationId);
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        if (renderer) {
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.remove();
            }
        }
        this._initialized = false;
    }
};

window.HumanModelEmbed = HumanModelEmbed;
export default HumanModelEmbed;
