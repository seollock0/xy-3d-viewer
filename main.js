let scene, camera, renderer, controls;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let gridHelper = null;
let selectionOutline = null;

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
   타일 생성 (1x1)
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
  } else if (type.includes("탄광") || type.includes("채집지")) {
    color = 0x666666;
    type = "채집지";
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
  mesh.userData = { x, y, type };

  scene.add(mesh);
  tileMeshes.push(mesh);
}

/* =====================
   깃발 오브젝트 (1x1)
===================== */
function createFlag(x, y) {
  const poleHeight = 1.2;

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, poleHeight),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  pole.position.set(x, poleHeight / 2, -y);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.5),
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide
    })
  );
  flag.position.set(x + 0.4, poleHeight - 0.2, -y);
  flag.rotation.y = Math.PI / 2;

  const group = new THREE.Group();
  group.add(pole);
  group.add(flag);
  group.userData = { x, y, type: "깃발" };

  scene.add(group);
  tileMeshes.push(flag);
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

    if (type.includes("깃발")) {
      createFlag(x, y);
    } else {
      createTile(x, y, type);
    }
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

hud.innerText = `좌표: (${d.x}, ${d.y})\n타입: ${d.type}`;
highlightTile(mesh);
}

/* =====================
   파일 TXT 로드
===================== */
function loadFile() {
  const input = document.getElementById("fileInput");
  const file = input.files[0];
  if (!file) return;

  resetScene();

  const reader = new FileReader();
  reader.onload = e => {
    parseTXT(e.target.result);
    updateGrid();
  };
  reader.readAsText(file);
}

/* =====================
   GitHub Issue 로드
===================== */
async function loadFromIssue() {
  const input = document.getElementById("issueNumber");
  if (!input || !input.value) return;

  resetScene();

  const url = `https://api.github.com/repos/seollock0/xy-3d-viewer/issues/${input.value}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.body) {
    parseTXT(data.body);
    updateGrid();
  }
}

/* =====================
   Reset / Render
===================== */
function resetScene() {
  minX = minY = Infinity;
  maxX = maxY = -Infinity;

  tileMeshes.length = 0;
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
   사각형 표기
===================== */
function highlightTile(mesh) {
  // 이전 선택 제거
  if (selectionOutline) {
    scene.remove(selectionOutline);
    selectionOutline.geometry.dispose();
    selectionOutline.material.dispose();
    selectionOutline = null;
  }

  // 타일 크기 기반 박스 생성
  const box = new THREE.BoxGeometry(
    1.05,
    mesh.geometry.parameters.height * 1.05,
    1.05
  );

  const edges = new THREE.EdgesGeometry(box);
  const material = new THREE.LineBasicMaterial({ color: 0xffff00 });

  selectionOutline = new THREE.LineSegments(edges, material);
  selectionOutline.position.copy(mesh.position);

  scene.add(selectionOutline);
}



/* =====================
   전역 노출 (중요)
===================== */
window.loadFile = loadFile;
window.loadFromIssue = loadFromIssue;
window.resetScene = resetScene;
