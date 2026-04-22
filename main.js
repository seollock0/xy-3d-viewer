let scene, camera, renderer, controls;

// 좌표 범위
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;

// Grid
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
    window.innerWidth / (window.innerHeight * 0.85),
    0.1,
    2000
  );
  camera.position.set(20, 30, 20);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight * 0.85);
  document.getElementById("scene").appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  scene.add(new THREE.DirectionalLight(0xffffff, 1));
  scene.add(new THREE.AmbientLight(0x404040));

  window.addEventListener("resize", onWindowResize);
}

/* =====================
   오브젝트 생성
===================== */
function createCubeAt(x, y, type) {

  // 범위 기록
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);

  let color = 0xaaaaaa;
  let height = 1;

  if (type.includes("산맥")) {
    color = 0x8b4513;
    height = 3;

  } else if (type.includes("웅덩이")) {
    color = 0x1e90ff;
    height = 0.5;

  } else if (type.includes("탄광")) {
    color = 0x666666;
    height = 1;

  } else if (type.includes("Trap")) {
    color = 0x8a2be2;
    height = 1;

  } else if (type.includes("1열")) {
    color = 0x7cfc00;

  } else if (type.includes("2열")) {
    color = 0x00aa00;

  } else if (type.includes("3열")) {
    color = 0xffa500;

  } else if (type.includes("4열")) {
    color = 0xdc143c;
  }

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, height, 1),
    new THREE.MeshStandardMaterial({ color })
  );

  // ✅ Y축 반전 (엑셀 좌표계와 일치)
  mesh.position.set(x, height / 2, -y);
  scene.add(mesh);
}

/* =====================
   TXT 파싱
===================== */
function parseTXT(text) {
  const lines = text.split(/\r?\n/);

  lines.forEach(line => {
    const row = line.trim();
    if (!row) return;

    const parts = row.split(/\s+/);
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const type = parts.slice(2).join(" ");

    if (!isNaN(x) && !isNaN(y) && type) {
      createCubeAt(x, y, type);
    }
  });
}

/* =====================
   Grid 생성
===================== */
function updateGrid() {
  if (gridHelper) scene.remove(gridHelper);

  const width = maxX - minX + 2;
  const depth = maxY - minY + 2;
  const size = Math.max(width, depth) + 2;

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
   파일 업로드
===================== */
function loadFile() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("파일을 선택하세요");

  resetScene();

  const reader = new FileReader();
  reader.onload = e => {
    parseTXT(e.target.result);
    updateGrid();
  };
  reader.readAsText(file);
}

/* =====================
   ✅ GitHub Issue 로딩
===================== */
async function loadFromIssue() {
  const issueNo = document.getElementById("issueNumber").value;
  if (!issueNo) return alert("Issue 번호 입력");

  resetScene();

  const url = `https://api.github.com/repos/seollock0/xy-3d-viewer/issues/${issueNo}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Issue 불러오기 실패");

    const data = await res.json();
    if (!data.body) throw new Error("Issue 본문에 좌표 없음");

    parseTXT(data.body);
    updateGrid();
  } catch (e) {
    alert(e.message);
  }
}

/* =====================
   PNG 저장
===================== */
function savePNG() {
  const a = document.createElement("a");
  a.download = "map_capture.png";
  a.href = renderer.domElement.toDataURL("image/png");
  a.click();
}

/* =====================
   유틸
===================== */
function resetScene() {
  minX = Infinity; maxX = -Infinity;
  minY = Infinity; maxY = -Infinity;

  if (gridHelper) scene.remove(gridHelper);

  scene.children = scene.children.filter(
    o => o.type === "Light" || o.type === "AmbientLight"
  );
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / (window.innerHeight * 0.85);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight * 0.85);
}
