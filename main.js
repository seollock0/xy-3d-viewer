let scene, camera, renderer, controls;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let gridHelper = null;

/* ✅ 같은 타입끼리만 중복 제거하기 위한 점유 정보 */
const occupiedTilesByType = {
  mine: new Set(),
  trap: new Set(),
  column: new Set()
};

/* ✅ Raycaster */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* ✅ HUD DOM */
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

  scene.add(new THREE.DirectionalLight(0xffffff, 1));
  scene.add(new THREE.AmbientLight(0x404040));

  /* ✅ HUD 생성 */
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

  /* ✅ 클릭/터치 이벤트 */
  renderer.domElement.addEventListener("mousedown", onPointerSelect);
  renderer.domElement.addEventListener("touchstart", onPointerSelect);

  window.addEventListener("resize", onResize);
}

/* =====================
   단일 타일 생성
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

  mesh.position.set(x, height / 2, -y);

  /* ✅ HUD 표시용 메타데이터 */
  mesh.userData = { x, y, type };

  scene.add(mesh);
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
   오브젝트 생성
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
    dedupKey = "column";
    if (rawType.includes("1열")) color = 0x00ff00;
    if (rawType.includes("2열")) color = 0xaaff00;
    if (rawType.includes("3열")) color = 0xff8800;
    if (rawType.includes("4열")) color = 0xcc0000;

    tiles = getFootprint(x, y, "column");
  }

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
   클릭 HUD 처리
===================== */
function onPointerSelect(event) {
  let x, y;

  if (event.touches) {
    x = event.touches[0].clientX;
    y = event.touches[0].clientY;
  } else {
    x = event.clientX;
    y = event.clientY;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((y - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(scene.children);

  if (hits.length > 0 && hits[0].object.userData) {
    const data = hits[0].object.userData;
    hud.innerText = `좌표: (${data.x}, ${data.y})\n오브젝트: ${data.type}`;
  }
}

/* =====================
   Grid & 기타
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
}

function resetScene() {
  minX = Infinity; maxX = -Infinity;
  minY = Infinity; maxY = -Infinity;
  Object.values(occupiedTilesByType).forEach(s => s.clear());
  scene.children = scene.children.filter(o => o.type.includes("Light"));
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
