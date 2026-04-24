let scene, camera, renderer, controls;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let gridHelper = null;

/* ✅ 타입별 점유 타일 관리 */
const occupiedTilesByType = {
  mine: new Set(),     // 탄광
  trap: new Set(),     // Trap
  column: new Set()    // 1~4열
};

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
  camera.position.set(30, 35, 30);

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
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.6;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  scene.add(new THREE.DirectionalLight(0xffffff, 1));
  scene.add(new THREE.AmbientLight(0x404040));

  window.addEventListener("resize", onResize);
}

/* =====================
   단일 타일 생성
===================== */
function createTile(x, y, color, height) {
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, height, 1),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, height / 2, -y);
  scene.add(mesh);
}

/* =====================
   footprint 계산
===================== */
function getFootprint(x, y, type) {
  const tiles = [];

  if (type === "mine" || type === "column") {
    tiles.push(
      [x, y], [x + 1, y],
      [x, y + 1], [x + 1, y + 1]
    );
  }

  if (type === "trap") {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tiles.push([x + dx, y + dy]);
      }
    }
  }

  return tiles;
}

/* =====================
   오브젝트 생성 (중복 제거 포함)
===================== */
function createObjectAt(x, y, rawType) {
  let color = 0xcccccc;
  let height = 1;
  let tiles = [[x, y]];
  let dedupType = null;

  /* ===== 산맥 (수동) ===== */
  if (rawType.includes("산맥")) {
    color = 0x8b4513;
    height = 3;

  /* ===== 웅덩이 (수동) ===== */
  } else if (rawType.includes("웅덩이")) {
    color = 0x1e90ff;
    height = 0.5;

  /* ===== 탄광 (2x2, 같은 타입만 중복 제거) ===== */
  } else if (rawType.includes("탄광")) {
    color = 0x666666;
    height = 1;
    dedupType = "mine";
    tiles = getFootprint(x, y, "mine");

  /* ===== Trap (3x3, 같은 타입만 중복 제거) ===== */
  } else if (rawType.includes("Trap")) {
    color = 0x800080;
    height = 1;
    dedupType = "trap";
    tiles = getFootprint(x, y, "trap");

  /* ===== 1~4열 (2x2, 같은 타입만 중복 제거) ===== */
  } else if (
    rawType.includes("1열") ||
    rawType.includes("2열") ||
    rawType.includes("3열") ||
    rawType.includes("4열")
  ) {
    dedupType = "column";
    if (rawType.includes("1열")) color = 0x00ff00;
    if (rawType.includes("2열")) color = 0xaaff00;
    if (rawType.includes("3열")) color = 0xff8800;
    if (rawType.includes("4열")) color = 0xcc0000;

    tiles = getFootprint(x, y, "column");
  }

  /* ===== 중복 제거 (같은 타입끼리만) ===== */
  if (dedupType) {
    const occupied = occupiedTilesByType[dedupType];
    const overlap = tiles.some(
      ([tx, ty]) => occupied.has(`${tx},${ty}`)
    );
    if (overlap) return; // ❌ 같은 타입 footprint 겹치면 무시

    tiles.forEach(([tx, ty]) => {
      occupied.add(`${tx},${ty}`);
    });
  }

  /* ===== 실제 생성 ===== */
  tiles.forEach(([tx, ty]) => {
    createTile(tx, ty, color, height);
  });
}

/* =====================
   TXT 파싱
===================== */
function parseTXT(text) {
  text.split(/\r?\n/).forEach(line => {
    const row = line.trim();
    if (!row) return;

    const [x, y, ...rest] = row.split(/\s+/);
    createObjectAt(Number(x), Number(y), rest.join(" "));
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
   데이터 로딩
===================== */
function loadFile() {
  const f = fileInput.files[0];
  if (!f) return;
  resetScene();

  const r = new FileReader();
  r.onload = e => { parseTXT(e.target.result); updateGrid(); };
  r.readAsText(f);
}

/* =====================
   기타
===================== */
function resetScene() {
  minX = Infinity; maxX = -Infinity;
  minY = Infinity; maxY = -Infinity;

  Object.values(occupiedTilesByType).forEach(set => set.clear());

  scene.children = scene.children.filter(o => o.type.includes("Light"));
}

function savePNG() {
  const a = document.createElement("a");
  a.download = "map.png";
  a.href = renderer.domElement.toDataURL("image/png");
  a.click();
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
