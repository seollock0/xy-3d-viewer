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

  // 조명
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0x404040);
  scene.add(ambient);

  // 바닥 그리드
  const grid = new THREE.GridHelper(50, 50);
  scene.add(grid);

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
function createCubeAt(x, y, type = "일반") {
  let color = 0x00aa00; // 기본
  let height = 1;

  if (type === "탄광") {
    color = 0x000000;
    height = 2;
  } else if (type === "산맥") {
    color = 0x8b4513;
    height = 3;
  } else if (type === "Trap") {
    color = 0xff0000;
    height = 1;
  }

  const geometry = new THREE.BoxGeometry(1, height, 1);
