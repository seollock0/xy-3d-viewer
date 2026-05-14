let scene, camera, renderer, controls;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let gridHelper = null;

/* =====================
   Raycaster / HUD / Selection
===================== */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tileMeshes = [];
let hud;
let selectionOutline = null;

/* =====================
   색상 풀
===================== */
const COLOR_POOL = [
  0xe6194b, 0x3cb44b, 0xffe119, 0x4363d8, 0xf58231,
  0x911eb4, 0x46f0f0, 0xf032e6, 0xbcf60c, 0xfabebe
];

const usedColors = new Set();
const typeColorMap = {};

function getNextAvailableColor() {
  for (const hex of COLOR_POOL) {
    if (!usedColors.has(hex)) {
      usedColors.add(hex);
      return new THREE.Color(hex);
    }
  }
  const color = new THREE.Color();
  color.setHSL(Math.random(), 0.6, 0.5);
  return color;
}

init();
animate();

/* =====================
   초기화
===================== */
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    3000
  );
  camera.position.set(40, 50, 40);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("scene").appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  scene.add(new THREE.DirectionalLight(0xffffff, 1));
  scene.add(new THREE.AmbientLight(0x404040));

  // HUD
  hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.top = "10px";
  hud.style.left = "10px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.75)";
  hud.style.color = "#fff";
  hud.style.fontSize = "13px";
  hud.style.borderRadius = "6px";
  hud.style.zIndex = "100";
  hud.innerText = "타일을 클릭하세요";
  document.body.appendChild(hud);

  renderer.domElement.addEventListener("pointerdown", onPointerSelect, true);
  window.addEventListener("resize", onResize);
}

/* =====================
   타일 생성 (✅ 핵심 수정)
===================== */
function createTile(x, y, type) {
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);

  if (!typeColorMap[type]) {
    typeColorMap[type] = getNextAvailableColor();
  }

  const height = 1;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, height, 1),
    new THREE.MeshStandardMaterial({ color: typeColorMap[type] })
  );

  // ✅ Y 뒤집기
  mesh.position.set(x, height / 2, -y);

  mesh.userData = { x, y, type };
  scene.add(mesh);
  tileMeshes.push(mesh);
}

/* =====================
   TXT 파서
===================== */
function parseTXT(text) {
  text.split(/\r?\n/).forEach(line => {
    const row = line.trim();
    if (!row || row.startsWith("#")) return;

    const parts = row.split(/\s+/);
    if (parts.length < 3) return;

    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const type = parts.slice(2).join(" ");

    if (Number.isNaN(x) || Number.isNaN(y)) return;

    createTile(x, y, type);
  });
}

/* =====================
   Grid (✅ 같이 반전)
===================== */
function updateGrid() {
  if (gridHelper) scene.remove(gridHelper);

  const size = Math.max(maxX - minX, maxY - minY) + 6;
  gridHelper = new THREE.GridHelper(size, size);

  // ✅ 중심도 같이 뒤집기
  gridHelper.position.set(
    (minX + maxX) / 2,
    0,
    -(minY + maxY) / 2
  );

  scene.add(gridHelper);

  // ✅ 카메라도 동일 기준
  controls.target.set(
    (minX + maxX) / 2,
    0,
    -(minY + maxY) / 2
  );

  controls.update();
}

/* =====================
   선택 표시
===================== */
function highlightTile(mesh) {
  if (selectionOutline) {
    scene.remove(selectionOutline);
    selectionOutline.geometry.dispose();
    selectionOutline.material.dispose();
  }

  const geo = mesh.geometry.parameters;

  const box = new THREE.BoxGeometry(
    geo.width * 1.05,
    geo.height * 1.05,
    geo.depth * 1.05
  );

  const edges = new THREE.EdgesGeometry(box);
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

  selectionOutline = new THREE.LineSegments(edges, material);
  selectionOutline.position.copy(mesh.position);

  scene.add(selectionOutline);
}

/* =====================
   클릭 처리
===================== */
function onPointerSelect(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(tileMeshes, false);
  if (!hits.length) return;

  const mesh = hits[0].object;
  const d = mesh.userData;

  hud.innerText = `좌표: (${d.x}, ${d.y})\n오브젝트: ${d.type}`;
  highlightTile(mesh);
}

/* =====================
   파일 로드
===================== */
function loadFile() {
  const input = document.getElementById("fileInput");
  if (!input.files.length) return;

  resetScene();

  const reader = new FileReader();
  reader.onload = e => {
    parseTXT(e.target.result);
    updateGrid();
  };

  reader.readAsText(input.files[0]);
}

/* =====================
   Reset
===================== */
function resetScene() {
  minX = minY = Infinity;
  maxX = maxY = -Infinity;
  tileMeshes.length = 0;
  usedColors.clear();
  for (const k in typeColorMap) delete typeColorMap[k];

  if (selectionOutline) {
    scene.remove(selectionOutline);
    selectionOutline = null;
  }

  scene.children = scene.children.filter(o => o.type.includes("Light"));
  hud.innerText = "타일을 클릭하세요";
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* =====================
   전역
===================== */
window.loadFile = loadFile;
window.resetScene = resetScene;
