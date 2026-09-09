import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  VSMShadowMap,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createStoneTexture } from "./stone-texture";

export async function createProductScene(host: HTMLDivElement) {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.87;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new Scene();
  let observer: ResizeObserver | undefined;
  const camera = new OrthographicCamera(-7, 7, 4.6, -4.6, 0.1, 100);
  camera.position.set(0, 0, 20);
  camera.layers.enable(1);
  const environmentGenerator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = environmentGenerator.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.24;
  room.dispose();
  environmentGenerator.dispose();
  scene.add(new HemisphereLight(0xf2f5ff, 0x717780, 0.8));
  const light = new DirectionalLight(0xfffaf2, 2.8);
  light.position.set(8, 9, 8);
  light.target.position.set(3, -1, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, {
    left: -9,
    right: 9,
    top: 8,
    bottom: -8,
    near: 0.1,
    far: 35,
  });
  light.shadow.normalBias = 0.012;
  light.shadow.bias = -0.0001;
  light.shadow.radius = 4;
  light.shadow.blurSamples = 8;
  scene.add(light, light.target);
  const stoneFill = new AmbientLight(0xffffff, 2);
  stoneFill.layers.set(1);
  scene.add(stoneFill);

  const stone = createStoneTexture();
  const stoneMaterial = (color: string) =>
    new MeshStandardMaterial({
      color,
      map: stone,
      bumpMap: stone,
      bumpScale: 0.016,
      roughness: 0.94,
    });
  const top = stoneMaterial("#d7d8d8");
  const dark = stoneMaterial("#7b7c7d");
  const pale = stoneMaterial("#bfc0c0");
  const podium = new Group();
  const projection = Math.cos(1.1);
  const leftBlock = new Mesh(new BoxGeometry(4.6 / projection, 4, 6.4), [
    pale,
    dark,
    top,
    dark,
    dark,
    dark,
  ]);
  const rightBlock = new Mesh(new BoxGeometry(7.4 / projection, 4, 6.4), [
    pale,
    pale,
    top,
    pale,
    pale,
    pale,
  ]);
  leftBlock.position.x = -3.7 / projection;
  rightBlock.position.x = 2.3 / projection;
  for (const block of [leftBlock, rightBlock]) {
    block.receiveShadow = true;
    block.castShadow = true;
    block.layers.enable(1);
    podium.add(block);
  }
  podium.rotation.set(0.16, -1.1, -0.08, "ZYX");
  scene.add(podium);

  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d");
  if (!shadowContext) throw new Error("Could not create contact shadow.");
  const gradient = shadowContext.createRadialGradient(64, 64, 3, 64, 64, 64);
  gradient.addColorStop(0, "rgba(12,20,29,0.48)");
  gradient.addColorStop(0.4, "rgba(12,20,29,0.3)");
  gradient.addColorStop(1, "rgba(12,20,29,0)");
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const contactTexture = new CanvasTexture(shadowCanvas);
  const contactMaterial = new MeshBasicMaterial({
    map: contactTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const contact = new Mesh(new PlaneGeometry(12, 3.2), contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(-6.2, 2.01, 1.3);
  podium.add(contact);

  let product: Group;
  try {
    product = (await new GLTFLoader().loadAsync("/models/cardholder.glb"))
      .scene;
  } catch (error) {
    dispose();
    throw error;
  }
  const configuredMaterials = new Set<Material>();
  product.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = object.receiveShadow = true;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (configuredMaterials.has(material)) return;
        configuredMaterials.add(material);
        if (material instanceof MeshStandardMaterial) {
          material.envMapIntensity = 0.65;
          if (material.name.startsWith("Ivory | grained")) {
            material.color.multiplyScalar(0.74);
            material.normalScale.multiplyScalar(1.6);
          }
        }
      });
    }
  });
  scene.add(product);

  function resize() {
    const width = host.clientWidth,
      height = host.clientHeight;
    const mobile = width <= 600;
    const viewHeight = 9.2;
    const viewWidth = (viewHeight * width) / height;
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    const scale = mobile
      ? (viewWidth * 0.65) / 0.10532
      : (viewWidth * 0.318) / 0.10532;
    product.scale.set(scale, scale * 0.865, scale);
    product.rotation.set(-0.16, -0.17, -0.205, "ZYX");
    product.position.set(viewWidth * (mobile ? 0.06 : 0.224), 0, -1.3);
    podium.scale.set(mobile ? 0.6 : viewWidth / 14.27, 1, 1);
    podium.position.set(
      viewWidth * (mobile ? 0.82 : 0.498),
      mobile ? -5.1 : -4.6,
      0,
    );
    podium.updateMatrixWorld(true);
    product.updateMatrixWorld(true);
    // Anchor the floating pose to the actual inclined podium, at any viewport.
    const normal = new Vector3(0, 1, 0).applyQuaternion(podium.quaternion);
    const planePoint = podium.localToWorld(new Vector3(0, 2, 0));
    let lowest = new Vector3(0, Infinity, 0);
    product.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const position = object.geometry.getAttribute("position");
      const vertex = new Vector3();
      for (let i = 0; i < position.count; i++) {
        vertex
          .fromBufferAttribute(position, i)
          .applyMatrix4(object.matrixWorld);
        if (vertex.y < lowest.y) lowest = vertex.clone();
      }
    });
    const surfaceY =
      (normal.dot(planePoint) - normal.x * lowest.x - normal.z * lowest.z) /
      normal.y;
    product.position.y = surfaceY - lowest.y + (mobile ? 0.035 : 0.14);
    product.updateMatrixWorld(true);
    renderer.render(scene, camera);
  }
  observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  renderer.domElement.addEventListener("webglcontextrestored", resize);
  // No perpetual animation loop: the reference composition stays still.
  function dispose() {
    observer?.disconnect();
    renderer.domElement.removeEventListener("webglcontextrestored", resize);
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
      }
    });
    materials.forEach((material) => {
      Object.values(material).forEach((value: unknown) => {
        if (value instanceof Texture) textures.add(value);
      });
      material.dispose();
    });
    textures.forEach((texture) => texture.dispose());
    light.shadow.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }
  return { dispose };
}
