let scene, camera, renderer, controls;

// 오브젝트 좌표 범위 추적
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;

// Grid 참조
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
    1000
  );
  camera.position.set(20, 25, 20);

  // ✅ PNG 저장을 위한 핵심 옵션 포함
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight * 0.85);
  document.getElementById("scene").appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // 조명
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(20, 30, 20);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  window.addEventListener("resize", onWindowResize);
}

/* =====================
   오브젝트 생성
===================== */
function createCubeAt(x, y, type) {

  // 좌표 범위 기록 (Grid 확장용)
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);

  let color = 0x00aa00;
  let height = 1;

  // 지형 / 특수 오브젝트
  if (type.includes("산맥")) {
    color = 0x8b4513;
    height = 3;

  } else if (type.includes("탄광")) {
    color = 0x666666;
    height = 1; // ✅ 요청대로 탄광 높이 1

  } else if (type.includes("웅덩이")) {
    color = 0x1e90ff;
    height = 0.5;

  } else if (type.includes("Trap")) {
    color = 0x8a2be2;
    height = 1;

  // 1~4열 색상 구분
  } else if (type.includes("1열")) {
    color = 0x7cfc00;

  } else if (type.includes("2열")) {
    color = 0x00aa00;

  } else if (type.includes("3열")) {
    color = 0xffa500;

  } else if (type.includes("4열")) {
    color = 0xdc143c;
  }

  const geometry = new THREE.BoxGeometry(1, height, 1);
  const material = new THREE.MeshStandardMaterial({ color });
  const cube = new THREE.Mesh(geometry, material);

  cube.position.set(x, height / 2, y);
  scene.add(cube);
}

/* =====================
   TXT 파일 로드
===================== */
function loadFile() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) {
    alert("파일을 선택하세요");
    return;
  }

  // 초기화
  minX = Infinity; maxX = -Infinity;
  minY = Infinity; maxY = -Infinity;

  if (gridHelper) {
    scene.remove(gridHelper);
    gridHelper = null;
  }

  const reader = new FileReader();
  reader.onload = e => {
    parseTXT(e.target.result);
    updateGrid();
  };
  reader.readAsText(file);
}

/* =====================
   TXT 파싱
===================== */
function parseTXT(text) {
  const lines = text.split(/\r?\n/);

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const type = parts.slice(2).join(" ");

    if (!isNaN(x) && !isNaN(y) && type) {
      createCubeAt(x, y, type);
    }
  });
}

/* =====================
   Grid 자동 확장
===================== */
function updateGrid() {
  const width = maxX - minX + 1;
  const depth = maxY - minY + 1;

  const padding = 2;
  const size = Math.max(width, depth) + padding;

  if (gridHelper) {
    scene.remove(gridHelper);
  }

  gridHelper = new THREE.GridHelper(size, size);
  gridHelper.position.set(
    (minX + maxX) / 2,
    0,
    (minY + maxY) / 2
  );

  scene.add(gridHelper);

  // 카메라 중심 보정
  controls.target.set(
    (minX + maxX) / 2,
    0,
    (minY + maxY) / 2
  );
  controls.update();
}

/* =====================
   PNG 저장 (전역)
===================== */
function savePNG() {
  if (!renderer) {
    alert("렌더러가 초기화되지 않았습니다.");
    return;
  }

  const link = document.createElement("a");
  link.download = "map_capture.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
}

/* =====================
   렌더 루프
===================== */
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

/* =====================
   리사이즈 대응
===================== */
function onWindowResize() {
  camera.aspect = window.innerWidth / (window.innerHeight * 0.85);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight * 0.85);
}
