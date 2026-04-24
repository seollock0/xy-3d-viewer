let scene, camera, renderer, controls;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let gridHelper = null;

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
  scene.add(mesh);
}

/* =====================
   TXT / Issue 파서 (주석 처리 가능)
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
