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
   타입 기반 자동 색상 시스템
===================== */
const typeColorMap = {};

function generateColor() {
  const h = Math.random();
  const s = 0.55 + Math.random() * 0.3;
  const l = 0.45 + Math.random() * 0.2;
  const color = new THREE.Color();
  color.setHSL(h, s, l);
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

  /* HUD */
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
   범용 타일 생성 (✅ y축 반전 반영)
===================== */
function createTile(x, y, type) {
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);

  if (!typeColorMap[type]) {
    typeColorMap[type] = generateColor();
  }

  const height = 1;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, height, 1),
    new THREE.MeshStandardMaterial({ color: typeColorMap[type] })
  );

  // ✅ 핵심 변경: y 증가 = 화면 위쪽
  mesh.position.set(x, height / 2, y);

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
   Grid (✅ y축 기준 통일)
===================== */
function updateGrid() {
  if (gridHelper) scene.remove(gridHelper);

  const size = Math.max(maxX - minX, maxY - minY) + 6;
  gridHelper = new THREE.GridHelper(size, size);
  gridHelper.position.set(
    (minX + maxX) / 2,
    0,
    (minY + maxY) / 2
  );
  scene.add(gridHelper);

  controls.target.set(
    (minX + maxX) / 2,
    0,
    (minY + maxY) / 2
  );
  controls.update();
}

/* =====================
   선택 사각형 표시
===================== */
function highlightTile(mesh) {
  if (selectionOutline) {
    scene.remove(selectionOutline);
    selectionOutline.geometry.dispose();
    selectionOutline.material.dispose();
    selectionOutline = null;
  }

  const geo = mesh.geometry.parameters;
  const box = new THREE.BoxGeometry(
    (geo.width || 1) * 1.05,
    (geo.height || 1) * 1.05,
    (geo.depth || 1) * 1.05
  );

  const edges = new THREE.EdgesGeometry(box);
  const material = new THREE.LineBasicMaterial({ color: 0xffff00 });

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
   파일(TXT) 로드
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
   GitHub Issue 로드
===================== */
function loadFromIssue() {
  const input = document.getElementById("issueNumber");
  if (!input || !input.value) {
    alert("Issue 번호를 입력하세요.");
    return;
  }

  resetScene();

  const url = `https://api.github.com/repos/seollock0/xy-3d-viewer/issues/${input.value}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.body) return;
      parseTXT(data.body);
      updateGrid();
    });
}

/* =====================
   Reset / Render
===================== */
function resetScene() {
  minX = minY = Infinity;
  maxX = maxY = -Infinity;
  tileMeshes.length = 0;

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
   전역 노출
===================== */
window.loadFile = loadFile;
window.loadFromIssue = loadFromIssue;
window.resetScene = resetScene;
