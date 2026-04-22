let scene, camera, renderer, controls;

init();
animate();

/* =====================
   기본 초기화
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
  camera.position.set(10, 10, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight * 0.85);
  document.getElementById("scene").appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);

  scene.add(new THREE.AmbientLight(0x404040));
  scene.add(new THREE.GridHelper(50, 50));

  window.addEventListener("resize", onWindowResize);
}

/* =====================
   수동 큐브 생성
===================== */
function addCube() {
  const x = Number(document.getElementById("xInput").value);
  const y = Number(document.getElementById("yInput").value);
  createCubeAt(x, y, "일반");
}

/* =====================
   타입 기반 큐브 생성
===================== */
function createCubeAt(x, y, type) {

  let color = 0x00aa00; // 기본
  let height = 1;

  // ===== 지형 / 특수 오브젝트 =====
  if (type.includes("산맥")) {
    color = 0x8b4513; // 갈색
    height = 3;

  } else if (type.includes("탄광")) {
    color = 0x666666; // 회색
    height = 1;       // ✅ 요청대로 탄광 z=1

  } else if (type.includes("웅덩이")) {
    color = 0x1e90ff; // 파랑
    height = 0.5;

  } else if (type.includes("Trap")) {
    color = 0x8a2be2; // 보라
    height = 1;

  // ===== 열 타입 (1~4열) =====
  } else if (type.includes("1열")) {
    color = 0x7cfc00; // 연두

  } else if (type.includes("2열")) {
    color = 0x00aa00; // 초록

  } else if (type.includes("3열")) {
    color = 0xffa500; // 주황

  } else if (type.includes("4열")) {
    color = 0xdc143c; // 빨강
  }

  const geometry = new THREE.BoxGeometry(1, height, 1);
  const material = new THREE.MeshStandardMaterial({ color });
  const cube = new THREE.Mesh(geometry, material);

  cube.position.set(x, height / 2, y);
  scene.add(cube);
}

/* =====================
   파일 업로드
===================== */
function loadFile() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("파일을 선택하세요");

  const reader = new FileReader();
  reader.onload = e => parseCoordinates(e.target.result, file.name);
  reader.readAsText(file);
}

function parseCoordinates(text, filename) {
  const lines = text.split(/\r?\n/);

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    let x, y, type = "일반";
    const p = filename.endsWith(".csv")
      ? line.split(",")
      : line.split(/\s+/);

    if (p[0] === "x") return;

    x = Number(p[0]);
    y = Number(p[1]);
    type = p[2]?.trim() || "일반";

    if (!isNaN(x) && !isNaN(y)) {
      createCubeAt(x, y, type);
    }
  });
}

/* =====================
   PNG 저장
===================== */
function savePNG() {
  const link = document.createElement("a");
  link.download = "3d_scene.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
}

/* =====================
   렌더 루프
===================== */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
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
