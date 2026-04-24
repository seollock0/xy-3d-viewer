let scene, camera, renderer, controls;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let gridHelper = null;

/* =====================
   타입별 점유 타일 (중복 제거용)
===================== */
const occupiedTilesByType = {
  mine: new Set(),     // 탄광
  trap: new Set(),     // Trap
  column: new Set()    // 1~4열
};

/* =====================
   Raycaster + HUD + Tile Mesh 관리
===================== */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tileMeshes = [];   // ✅ 클릭 대상 전용 타일 Mesh
let hud;

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

  /* =====================
     HUD 패널
  ===================== */
  hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.top = "10px";
  hud.style.left = "10px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.7)";
  hud.style.color = "#fff";
  hud.style.fontSize = "13px";
  hud.style.borderRadius = "6px";
  hud.style.zIndex = "100";
  hud.innerText = "타일을 클릭하세요";
  document.body.appendChild(hud);

  /* ✅ 클릭 / 터치 이벤트 */
  renderer.domElement.addEventListener("pointerdown", onPointerSelect, true);
  
  window.addEventListener("resize", onResize);
}

/* =====================
   단일 타일 생성 (클릭 가능 대상)
===================== */
function createTile(x, y, color, height, type) {
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, height, 1),
    new THREE.MeshStandardMaterial({ color })
  );

  // ✅ 엑셀 좌표계 보정
  mesh.position.set(x, height / 2, -y);

  // ✅ 클릭 시 표시할 메타데이터
  mesh.userData = { x, y, type };

  scene.add(mesh);

  // ✅ Raycaster 대상에만 등록
  tileMeshes.push(mesh);
}

/* =====================
   footprint 계산
===================== */
function getFootprint(x, y, kind) {
  const tiles = [];

  if (kind === "mine" || kind === "column") {
    tiles.push(
      [x, y], [x + 1, y],
      [x, y + 1], [x + 1, y + 1]
    );
  }

  if (kind === "trap") {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tiles.push([x + dx, y + dy]);
      }
    }
  }

  return tiles;
}

/* =====================
   오브젝트 단위 생성
===================== */
function createObjectAt(x, y, rawType) {
  let color = 0xcccccc;
  let height = 1;
  let tiles = [[x, y]];
  let dedupKey = null;

  if (rawType.includes("산맥")) {
    color = 0x8b4513;
    height = 3;

  } else if (rawType.includes("웅덩이")) {
    color = 0x1e90ff;
    height = 0.5;

  } else if (rawType.includes("탄광")) {
    color = 0x666666;
    dedupKey = "mine";
    tiles = getFootprint(x, y, "mine");

  } else if (rawType.includes("Trap")) {
    color = 0x800080;
    dedupKey = "trap";
    tiles = getFootprint(x, y, "trap");

 
} else if (
  rawType.includes("1열") ||
  rawType.includes("2열") ||
  rawType.includes("3열") ||
  rawType.includes("4열")
) {
  // ✅ 열은 TXT 그대로 1x1 타일만 생성
  if (rawType.includes("1열")) color = 0x00ff00;
  if (rawType.includes("2열")) color = 0xaaff00;
  if (rawType.includes("3열")) color = 0xff8800;
  if (rawType.includes("4열")) color = 0xcc0000;

  tiles = [[x, y]];     // ✅ 자동 확장 없음
  dedupKey = null;      // ✅ 중복 제거 없음
}

  /* ✅ 같은 타입끼리만 중복 제거 */
  if (dedupKey) {
    const occupied = occupiedTilesByType[dedupKey];
    const overlap = tiles.some(([tx, ty]) =>
      occupied.has(`${tx},${ty}`)
    );
    if (overlap) return;

    tiles.forEach(([tx, ty]) =>
      occupied.add(`${tx},${ty}`)
    );
  }

  tiles.forEach(([tx, ty]) => {
    createTile(tx, ty, color, height, rawType);
  });
}

/* =====================
   TXT 파싱
===================== */
function parseTXT(text) {
  text.split(/\r?\n/).forEach(line => {
    const row = line.trim();

    // ✅ 1. 빈 줄 무시
    if (!row) return;

    // ✅ 2. 주석(#) 무시
    if (row.startsWith("#")) return;

    const parts = row.split(/\s+/);

    // ✅ 3. 최소한 x y type 이 있어야 함
    if (parts.length < 3) return;

    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const type = parts.slice(2).join(" ");

    // ✅ 4. 숫자 검증
    if (Number.isNaN(x) || Number.isNaN(y)) return;

    createObjectAt(x, y, type);
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
   🔥 클릭 / 터치 인터랙션 (핵심)
===================== */
function onPointerSelect(event) {
  let cx, cy;

  if (event.touches && event.touches.length > 0) {
    cx = event.touches[0].clientX;
    cy = event.touches[0].clientY;
  } else {
    cx = event.clientX;
    cy = event.clientY;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  // ✅ Grid/Light 제외, 타일만 검사
  const hits = raycaster.intersectObjects(tileMeshes, false);

  if (hits.length > 0) {
    const d = hits[0].object.userData;
    hud.innerText = `좌표: (${d.x}, ${d.y})\n오브젝트: ${d.type}`;
  }
}

/* =====================
   파일 / Issue 로드
===================== */
function loadFile() {
  const f = fileInput.files[0];
  if (!f) return;

  resetScene();
  const r = new FileReader();
  r.onload = e => { parseTXT(e.target.result); updateGrid(); };
  r.readAsText(f);
}

/* ✅ Issue 로딩 */
async function loadFromIssue() {
  const input = document.getElementById("issueNumber");
  if (!input || !input.value) {
    alert("Issue 번호를 입력하세요");
    return;
  }

  try {
    resetScene();
    const url = `https://api.github.com/repos/seollock0/xy-3d-viewer/issues/${input.value}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Issue 불러오기 실패");

    const data = await res.json();
    parseTXT(data.body || "");
    updateGrid();

  } catch (e) {
    alert(e.message);
  }
}

/* =====================
   기타
===================== */
function resetScene() {
  minX = Infinity; maxX = -Infinity;
  minY = Infinity; maxY = -Infinity;

  Object.values(occupiedTilesByType).forEach(s => s.clear());
  tileMeshes.length = 0; // ✅ 중요

  scene.children = scene.children.filter(o => o.type.includes("Light"));

  if (hud) hud.innerText = "타일을 클릭하세요";
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
