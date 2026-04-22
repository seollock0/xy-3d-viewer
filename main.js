function loadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("파일을 선택하세요");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    parseCoordinates(text, file.name);
  };
  reader.readAsText(file);
}

function parseCoordinates(text, filename) {
  const lines = text.split(/\r?\n/);

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    let x, y;

    // CSV
    if (filename.endsWith(".csv")) {
      const parts = line.split(",");
      if (parts[0] === "x") return; // 헤더 스킵
      x = Number(parts[0]);
      y = Number(parts[1]);
    }
    // TXT
    else {
      const parts = line.split(/\s+/);
      x = Number(parts[0]);
      y = Number(parts[1]);
    }

    if (!isNaN(x) && !isNaN(y)) {
      createCubeAt(x, y);
    }
  });
}

function createCubeAt(x, y) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
  const cube = new THREE.Mesh(geometry, material);

  cube.position.set(x, 0.5, y);
  scene.add(cube);
}
``
