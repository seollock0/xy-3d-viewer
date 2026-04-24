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

  /* =====================
     HUD 패널
  ===================== */
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

  /* ✅ 클릭 이벤트 (OrbitControls 대응: capture 단계) */
  renderer.domElement.addEventListener(
    "pointerdown",
    onPointerSelect,
    true
  );

  window.addEventListener("resize", onResize);
}

/* =====================
   단일 타일 생성 (항상 1x1)
===================== */
function createTile(x, y, type) {
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);

  let color = 0xcccccc;
  let height = 1;

  if (type.includes("산맥")) {
    color = 0x8b4513;
    height = 3;
  } else if (type.includes("웅덩이")) {
    color = 0x1e90ff;
    height = 0.5;
  } else if (type.includes("Trap")) {
    color = 0x800080;
  } else if (type.includes("탄광")) {
    color = 0x666666;
  } else if (type.includes("1열")) {
    color = 0x00ff00;
  } else if (type.includes("2열")) {
    color = 0xaaff00;
  } else if (type.includes("3열")) {
    color = 0xff8800;
  } else if (type.includes("4열")) {
    color = 0xcc0000;
  }

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, height, 1),
    new THREE.MeshStandardMaterial({ color })
  );

  mesh.position.set(x, height / 2, -y);

  /* ✅ 클릭용 메타데이터 */
  mesh.userData = { x, y, type };

  scene.add(mesh);
  tileMeshes.push(mesh);
}

/* =====================
   TXT / Issue 파서 (# 주석 지원)
===================== */
function parseTXT(text) {
  text.split(/\r?\n/).forEach(line => {
    const row = line.trim();
    if (!row) return;
    if (row.startsWith("#")) return;

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
   Grid
===================== */
function updateGrid() {
  if (gridHelper) scene.remove(gridHelper);

  const size = Math.max(maxX - minX, maxY - minY) + 6;
  gridHelper = new THREE.GridHelper(size, size);
  gridHelper.position.set(
    (minX + maxX) / 2,
    0,
    -(minY + maxY) / 2
  );
  scene.add(gridHelper);

  controls.target.set(
    (minX + maxX) / 2,
    0,
    -(minY + maxY) / 2
  );
  controls.update();
}

/* =====================
   선택 타일 테두리 표시
===================== */
function highlightTile(mesh) {
  if (selectionOutline) {
    scene.remove(selectionOutline);
    selectionOutline.geometry.dispose();
    selectionOutline.material.dispose();
    selectionOutline = null;
  }

  const box = new THREE.BoxGeometry(1.02, mesh.scale.y * 1.02, 1.02);
  const edges = new THREE.EdgesGeometry(box);
  const material = new THREE.LineBasicMaterial({
    color: 0xffff00
  });

  selectionOutline = new THREE.LineSegments(edges, material);
  selectionOutline.position.copy(mesh.position);

  scene.add(selectionOutline);
}

/* =====================
   클릭 → HUD + 하이라이트
===================== */
function onPointerSelect(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(tileMeshes, false);

  if (hits.length === 0) return;

  const mesh = hits[0].object;
  const d = mesh.userData;

  hud.innerText = `좌표: (${d.x}, ${d.y})\n타입: ${d.type}`;
  highlightTile(mesh);
}

/* =====================
   데이터 로드
===================== */
function loadFile() {
  const f = fileInput.files[0];
  if (!f) return;

  resetScene();
  const r = new FileReader();
  r.onload = e => {
    parseTXT(e.target.result);
    updateGrid();
  };
  r.readAsText(f);
}

async function loadFromIssue() {
  const n = issueNumber.value;
  if (!n) return;

  resetScene();
  const url = `https://api.github.com/repos/seollock0/xy-3d-viewer/issues/${n}`;
  const res = await fetch(url);
  const data = await res.json();

  parseTXT(data.body || "");
  updateGrid();
}

/* =====================
   기타
===================== */
function resetScene() {
  minX = Infinity;
  maxX = -Infinity;
  minY = Infinity;
  maxY = -Infinity;

  tileMeshes.length = 0;

  if (selectionOutline) {
    scene.remove(selectionOutline);
    selectionOutline.geometry.dispose();
    selectionOutline.material.dispose();
    selectionOutline = null;
  }

  scene.children = scene.children.filter(o => o.type.includes("Light"));
  if (hud) hud.innerText = "타일을 클릭하세요";
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
