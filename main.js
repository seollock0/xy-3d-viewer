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
  camera.position.set(30, 35, 30);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });

  /* ✅ 모바일 GPU 보호 */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.getElementById("scene").appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  /* ✅ 터치 UX 튜닝 */
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
   큐브 생성
===================== */
function createCubeAt(x, y, type) {
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);

  let color = 0xcccccc;
  let height = 1;

  if (type.includes("산맥")) {
    color = 0x8b4513; height = 3;
  } else if (type.includes("웅덩이")) {
    color = 0x1e90ff; height = 0.5;
  } else if (type.includes("탄광")) {
    color = 0x666666;
  } else if (type.includes("Trap")) {
    color = 0x800080;
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

  /* ✅ 엑셀 좌표계와 일치 */
  mesh.position.set(x, height / 2, -y);
  scene.add(mesh);
}

/* =====================
   TXT 파싱
===================== */
function parseTXT(text) {
  text.split(/\r?\n/).forEach(line => {
    const row = line.trim();
    if (!row) return;

    const [x, y, ...rest] = row.split(/\s+/);
    createCubeAt(Number(x), Number(y), rest.join(" "));
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
  minX = Infinity; maxX = -Infinity;
  minY = Infinity; maxY = -Infinity;
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
