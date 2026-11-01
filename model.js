/* AURORA P1 — procedural concept phone. No external models or textures. */
import * as THREE from "three";

const T = THREE;

  function roundedRectShape(w, h, r) {
    const s = new T.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function roundedRectPath(w, h, r) {
    const p = new T.Path();
    const x = -w / 2;
    const y = -h / 2;
    p.moveTo(x + r, y);
    p.lineTo(x + w - r, y);
    p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + h - r);
    p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h);
    p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r);
    p.quadraticCurveTo(x, y, x + r, y);
    return p;
  }

  function extrudeRounded(w, h, depth, r, material, bevel) {
    const shape = roundedRectShape(w, h, r);
    const geometry = new T.ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      curveSegments: 18,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: bevel ?? 0.008,
      bevelThickness: bevel ?? 0.008,
    });
    geometry.translate(0, 0, -depth / 2);
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function flatRounded(w, h, r, material) {
    const geometry = new T.ShapeGeometry(roundedRectShape(w, h, r), 18);
    const mesh = new T.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  function canvasTexture(width, height, draw) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    draw(ctx, width, height);
    const texture = new T.CanvasTexture(canvas);
    if (T.SRGBColorSpace) texture.colorSpace = T.SRGBColorSpace;
    else texture.encoding = T.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
  }

  function screenTexture() {
    return canvasTexture(512, 1024, (ctx, w, h) => {
      ctx.fillStyle = "#02070b";
      ctx.fillRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w * 0.68, h * 0.24, 8, w * 0.68, h * 0.24, w * 0.72);
      bg.addColorStop(0, "#0b5265");
      bg.addColorStop(0.32, "#073241");
      bg.addColorStop(0.7, "#03151d");
      bg.addColorStop(1, "#010508");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // horizon glow
      const warm = ctx.createRadialGradient(w * 0.24, h * 0.48, 2, w * 0.24, h * 0.48, w * 0.52);
      warm.addColorStop(0, "rgba(255,176,102,.55)");
      warm.addColorStop(0.3, "rgba(255,120,70,.12)");
      warm.addColorStop(1, "rgba(255,120,70,0)");
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, w, h);

      // orbital rings
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(105,255,248,${0.12 - i * 0.02})`;
        ctx.beginPath();
        ctx.arc(w * 0.58, h * 0.47, 82 + i * 37, -0.3, Math.PI * 1.48);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(105,255,248,.34)";
      ctx.beginPath();
      ctx.arc(w * 0.58, h * 0.47, 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(105,255,248,.6)";
      ctx.beginPath();
      ctx.arc(w * 0.58 + 54 * Math.cos(-0.25), h * 0.47 + 54 * Math.sin(-0.25), 3, 0, Math.PI * 2);
      ctx.fill();

      // status bar
      ctx.fillStyle = "rgba(225,255,255,.8)";
      ctx.font = "500 15px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("09:41", 34, 42);
      ctx.fillStyle = "rgba(225,255,255,.6)";
      ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("5G", w - 96, 42);
      ctx.fillStyle = "rgba(225,255,255,.28)";
      ctx.fillRect(w - 60, 36, 26, 9);
      ctx.strokeStyle = "rgba(225,255,255,.4)";
      ctx.strokeRect(w - 60, 36, 26, 9);
      ctx.fillStyle = "rgba(160,255,240,.8)";
      ctx.fillRect(w - 57, 39, 19, 3);

      // clock
      ctx.fillStyle = "#eaffff";
      ctx.font = "600 92px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("09:41", 34, 162);
      ctx.fillStyle = "rgba(208,255,255,.6)";
      ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("MON 27 OCT  /  AURORA OS", 36, 196);

      // notification card
      const cardY = 238;
      ctx.fillStyle = "rgba(5,26,33,.66)";
      ctx.strokeStyle = "rgba(105,255,248,.16)";
      ctx.lineWidth = 1;
      ctx.fillRect(30, cardY, w - 60, 74);
      ctx.strokeRect(30, cardY, w - 60, 74);
      ctx.fillStyle = "rgba(105,255,248,.9)";
      ctx.font = "9px monospace";
      ctx.fillText("STRUCTURE OS / SYSTEM", 45, cardY + 22);
      ctx.fillStyle = "rgba(225,255,255,.82)";
      ctx.font = "500 15px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("8 个模块已就绪", 45, cardY + 46);
      ctx.fillStyle = "rgba(160,210,220,.5)";
      ctx.font = "10px monospace";
      ctx.fillText("TAP TO EXPLORE", 45, cardY + 64);

      // bottom dock
      const dockY = h - 130;
      ctx.fillStyle = "rgba(4,19,25,.72)";
      ctx.fillRect(34, dockY, w - 68, 62);
      ctx.strokeStyle = "rgba(105,255,248,.13)";
      ctx.strokeRect(34, dockY, w - 68, 62);
      ["◈", "⌁", "◇", "⊙"].forEach((icon, i) => {
        ctx.fillStyle = i === 1 ? "rgba(255,190,115,.95)" : "rgba(195,255,250,.68)";
        ctx.font = "21px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText(icon, 66 + i * 96, dockY + 38);
      });
      ctx.fillStyle = "rgba(150,220,225,.4)";
      ctx.font = "9px monospace";
      ctx.fillText("AURORA / P1", 35, h - 38);
      ctx.textAlign = "right";
      ctx.fillText("BUILD 01.26", w - 35, h - 38);
      ctx.textAlign = "left";

      // camera punch hole
      ctx.fillStyle = "#010407";
      ctx.beginPath();
      ctx.arc(w / 2, 28, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(80,190,205,.28)";
      ctx.beginPath();
      ctx.arc(w / 2, 28, 15, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function pcbTexture() {
    return canvasTexture(384, 512, (ctx, w, h) => {
      ctx.fillStyle = "#08251e";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(84,255,180,.34)";
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 34; i++) {
        const y = 22 + i * 14;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(80 + (i % 5) * 36, y);
        ctx.lineTo(108 + (i % 5) * 36, y + 16);
        ctx.lineTo(w - 24, y + 16);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(84,255,180,.18)";
      for (let i = 0; i < 11; i++) {
        ctx.beginPath();
        ctx.moveTo(38 + i * 30, 18);
        ctx.lineTo(38 + i * 30, h - 18);
        ctx.stroke();
      }
      const chips = [
        [132, 86, 118, 118, "#123b2d"],
        [276, 78, 76, 96, "#0d3026"],
        [66, 258, 92, 74, "#153c2e"],
        [190, 250, 132, 94, "#0a2b21"],
        [302, 292, 54, 76, "#173f32"],
      ];
      chips.forEach(([x, y, cw, ch, fill]) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = "rgba(112,255,194,.5)";
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, cw, ch);
        ctx.strokeRect(x, y, cw, ch);
        ctx.fillStyle = "rgba(140,255,206,.45)";
        for (let p = 0; p < 7; p++) ctx.fillRect(x + 8, y + 12 + p * 12, cw - 16, 2);
      });
      ctx.fillStyle = "rgba(150,255,210,.64)";
      ctx.font = "11px monospace";
      ctx.fillText("AURORA / P1 / MAIN LOGIC", 22, h - 22);
    });
  }

  function batteryTexture() {
    return canvasTexture(384, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1b2228");
      g.addColorStop(0.55, "#0d151b");
      g.addColorStop(1, "#1d2a31");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,190,90,.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 18, w - 36, h - 36);
      ctx.fillStyle = "#ffcf82";
      ctx.font = "700 30px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("5400", 36, 96);
      ctx.font = "500 15px monospace";
      ctx.fillText("mAh / Si-C", 38, 122);
      ctx.fillStyle = "rgba(255,220,160,.72)";
      ctx.font = "12px monospace";
      ctx.fillText("AURORA ENERGY CELL", 38, h - 86);
      ctx.fillText("P1 / 3.89V / 21.0Wh", 38, h - 64);
      ctx.strokeStyle = "rgba(255,205,125,.22)";
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(36, 170 + i * 36);
        ctx.lineTo(w - 36, 170 + i * 36);
        ctx.stroke();
      }
    });
  }

  function logoTexture() {
    return canvasTexture(256, 96, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(232,240,242,.72)";
      ctx.font = "600 26px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.letterSpacing = "5px";
      ctx.fillText("AURORA", 18, 58);
      ctx.fillStyle = "rgba(220,232,235,.42)";
      ctx.font = "10px monospace";
      ctx.fillText("CONCEPT / P1", 20, 80);
    });
  }

  function brushedTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#777777";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) {
      const y = Math.random() * 512;
      const a = 0.03 + Math.random() * 0.1;
      ctx.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.lineWidth = Math.random() > 0.82 ? 1.2 : 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }
    const texture = new T.CanvasTexture(c);
    texture.wrapS = T.RepeatWrapping;
    texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(2, 1);
    texture.anisotropy = 4;
    return texture;
  }

  function buildPhone(partsData) {
    const root = new T.Group();
    root.name = "AURORA_P1";
    const partMap = new Map();
    const meshes = [];

    const brushed = brushedTexture();
    const metal = new T.MeshPhysicalMaterial({
      color: 0x1b1e20,
      metalness: 0.99,
      roughness: 0.26,
      roughnessMap: brushed,
      clearcoat: 0.42,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.95,
    });
    const darkMetal = new T.MeshPhysicalMaterial({
      color: 0x050708,
      metalness: 0.92,
      roughness: 0.3,
      roughnessMap: brushed,
      envMapIntensity: 1.3,
    });
    const silver = new T.MeshPhysicalMaterial({
      color: 0xc2cacc,
      metalness: 1,
      roughness: 0.2,
      clearcoat: 0.25,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.85,
    });
    const glass = new T.MeshPhysicalMaterial({
      color: 0x050607,
      metalness: 0.18,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      transparent: false,
      opacity: 1,
      envMapIntensity: 0.75,
    });
    const screenMat = new T.MeshBasicMaterial({ map: screenTexture(), toneMapped: true, color: 0x688791 });
    const pcb = new T.MeshStandardMaterial({
      map: pcbTexture(), color: 0x638476, metalness: 0.46, roughness: 0.56,
    });
    const copper = new T.MeshPhysicalMaterial({
      color: 0x8d4a24, metalness: 0.97, roughness: 0.3, envMapIntensity: 1.1,
    });
    const batteryMat = new T.MeshStandardMaterial({
      map: batteryTexture(), color: 0xb9c2c2, metalness: 0.48, roughness: 0.46,
    });
    const accent = new T.MeshStandardMaterial({
      color: 0x59eaff,
      emissive: 0x1a9bb8,
      emissiveIntensity: 0.7,
      metalness: 0.6,
      roughness: 0.25,
    });
    const lensGlass = new T.MeshPhysicalMaterial({
      color: 0x061019,
      metalness: 0.5,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    });

    function register(group, id) {
      group.userData.partId = id;
      group.traverse((child) => {
        if (child.isMesh) {
          child.userData.partId = id;
          meshes.push(child);
        }
      });
      partMap.set(id, group);
      root.add(group);
    }

    function basePosition(id) {
      const data = partsData.find((p) => p.id === id);
      return new T.Vector3(...data.base || [0, 0, 0]);
    }

    // 01 screen
    const screen = new T.Group();
    screen.position.copy(basePosition("screen"));
    const bezel = flatRounded(1.5, 3.12, 0.19, new T.MeshBasicMaterial({ color: 0x010508 }));
    bezel.position.z = 0.126;
    screen.add(bezel);
    const screenPlate = flatRounded(1.43, 3.06, 0.18, screenMat);
    screenPlate.position.z = 0.132;
    screen.add(screenPlate);
    const screenGlass = flatRounded(1.43, 3.06, 0.18, new T.MeshPhysicalMaterial({
      color: 0x061019, metalness: 0.15, roughness: 0.02, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false,
    }));
    screenGlass.position.z = 0.139;
    screen.add(screenGlass);
    register(screen, "screen");

    // 02 frame
    const frame = new T.Group();
    frame.position.copy(basePosition("frame"));
    const outer = roundedRectShape(1.56, 3.2, 0.23);
    outer.holes.push(roundedRectPath(1.44, 3.08, 0.17));
    const frameGeo = new T.ExtrudeGeometry(outer, {
      depth: 0.24, steps: 1, curveSegments: 18, bevelEnabled: true,
      bevelSegments: 3, bevelSize: 0.012, bevelThickness: 0.012,
    });
    frameGeo.translate(0, 0, -0.12);
    const frameMesh = new T.Mesh(frameGeo, metal);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    frame.add(frameMesh);
    const frameEdges = new T.LineSegments(
      new T.EdgesGeometry(frameGeo, 24),
      new T.LineBasicMaterial({ color: 0xe1eaec, transparent: true, opacity: 0.28 })
    );
    frame.add(frameEdges);
    const antennaBand = new T.MeshStandardMaterial({ color: 0x4b5255, metalness: 0.8, roughness: 0.32 });
    [-1.56, 1.56].forEach((y) => {
      const band = new T.Mesh(new T.BoxGeometry(1.22, 0.022, 0.026), antennaBand);
      band.position.set(0, y, 0.125);
      frame.add(band);
    });
    register(frame, "frame");

    // 15 side buttons (separate module so they can be inspected)
    const buttons = new T.Group();
    const buttonMat = silver;
    const power = new T.Mesh(new T.BoxGeometry(0.04, 0.28, 0.1), buttonMat);
    power.position.set(0.79, 0.44, 0.02);
    buttons.add(power);
    const volume = new T.Mesh(new T.BoxGeometry(0.04, 0.44, 0.1), buttonMat);
    volume.position.set(0.79, 0.02, 0.02);
    buttons.add(volume);
    const action = new T.Mesh(new T.BoxGeometry(0.035, 0.16, 0.08), accent);
    action.position.set(-0.79, 0.58, 0.04);
    buttons.add(action);
    register(buttons, "buttons");

    // 03 back glass
    const back = new T.Group();
    back.position.copy(basePosition("back"));
    const backPlate = flatRounded(1.46, 3.08, 0.2, glass);
    backPlate.position.z = -0.132;
    backPlate.rotation.y = Math.PI;
    back.add(backPlate);
    const logo = new T.Mesh(
      new T.PlaneGeometry(0.58, 0.22),
      new T.MeshBasicMaterial({ map: logoTexture(), transparent: true, depthWrite: false })
    );
    logo.position.set(0, -1.05, -0.14);
    logo.rotation.y = Math.PI;
    back.add(logo);
    const cameraIsland = flatRounded(0.79, 0.79, 0.22, darkMetal);
    cameraIsland.position.set(-0.34, 1.06, -0.15);
    cameraIsland.rotation.y = Math.PI;
    back.add(cameraIsland);
    register(back, "back");

    // 04 board
    const board = new T.Group();
    board.position.copy(basePosition("board"));
    const boardPlate = extrudeRounded(1.18, 1.55, 0.036, 0.09, pcb, 0.004);
    boardPlate.position.set(0, 0.28, -0.018);
    board.add(boardPlate);
    const soc = new T.Mesh(new T.BoxGeometry(0.26, 0.26, 0.035), new T.MeshStandardMaterial({
      color: 0x17242a, metalness: 0.7, roughness: 0.28,
    }));
    soc.position.set(-0.12, 0.52, 0.012);
    board.add(soc);
    const socGlow = new T.Mesh(new T.PlaneGeometry(0.16, 0.16), new T.MeshBasicMaterial({
      color: 0x66ffe2, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false,
    }));
    socGlow.position.set(-0.12, 0.52, 0.032);
    board.add(socGlow);
    const shield = new T.Mesh(new T.BoxGeometry(0.32, 0.22, 0.025), metal);
    shield.position.set(0.34, 0.18, 0.012);
    board.add(shield);
    const ribbon = new T.Mesh(new T.BoxGeometry(0.1, 0.62, 0.012), copper);
    ribbon.position.set(0.43, -0.25, 0.018);
    board.add(ribbon);
    const chipMat = new T.MeshStandardMaterial({ color: 0x1a2c30, metalness: 0.55, roughness: 0.4 });
    const capMat = new T.MeshStandardMaterial({ color: 0x8d7754, metalness: 0.6, roughness: 0.45 });
    [
      [-0.4, 0.78, 0.11, 0.09], [0.02, 0.83, 0.08, 0.06], [0.32, 0.72, 0.12, 0.1],
      [-0.32, 0.03, 0.09, 0.08], [0.16, -0.18, 0.14, 0.07], [0.32, -0.36, 0.08, 0.12],
    ].forEach(([x, y, w, h]) => {
      const chip = new T.Mesh(new T.BoxGeometry(w, h, 0.026), chipMat);
      chip.position.set(x, y, 0.022);
      board.add(chip);
    });
    [[-0.5, 0.45], [-0.4, 0.35], [0.5, 0.6], [0.46, 0.05]].forEach(([x, y]) => {
      const cap = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.035, 10), capMat);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(x, y, 0.028);
      board.add(cap);
    });
    register(board, "board");

    // 05 battery
    const battery = new T.Group();
    battery.position.copy(basePosition("battery"));
    const batteryPlate = extrudeRounded(1.1, 1.4, 0.075, 0.08, batteryMat, 0.006);
    batteryPlate.position.set(0, -0.54, -0.03);
    battery.add(batteryPlate);
    const batteryTab = new T.Mesh(new T.BoxGeometry(0.24, 0.08, 0.05), copper);
    batteryTab.position.set(-0.34, -1.28, -0.02);
    battery.add(batteryTab);
    const bms = new T.Mesh(new T.BoxGeometry(0.3, 0.07, 0.018), new T.MeshStandardMaterial({
      color: 0x153f35, metalness: 0.35, roughness: 0.5,
    }));
    bms.position.set(0.3, -1.26, 0.035);
    battery.add(bms);
    const bmsCable = new T.Mesh(new T.BoxGeometry(0.05, 0.26, 0.012), copper);
    bmsCable.position.set(0.44, -1.05, 0.032);
    battery.add(bmsCable);
    register(battery, "battery");

    // 06 camera
    const camera = new T.Group();
    camera.position.copy(basePosition("camera"));
    const camBase = extrudeRounded(0.82, 0.82, 0.1, 0.2, darkMetal, 0.008);
    camBase.position.set(0, 1.05, -0.205);
    camera.add(camBase);
    const camGlass = flatRounded(0.76, 0.76, 0.18, glass);
    camGlass.position.set(0, 1.05, -0.258);
    camGlass.rotation.y = Math.PI;
    camera.add(camGlass);
    const lensPositions = [
      [-0.18, 1.22, -0.28, 0.18],
      [0.03, 0.94, -0.28, 0.145],
      [-0.18, 0.94, -0.28, 0.145],
    ];
    lensPositions.forEach(([x, y, z, r], i) => {
      const barrel = new T.Mesh(new T.CylinderGeometry(r * 1.08, r * 1.08, 0.085, 36), silver);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(x, y, z);
      camera.add(barrel);
      const ring = new T.Mesh(new T.TorusGeometry(r * 0.92, 0.012, 8, 36), silver);
      ring.position.set(x, y, z - 0.045);
      camera.add(ring);
      const glassLens = new T.Mesh(new T.CylinderGeometry(r * 0.78, r * 0.78, 0.012, 36), lensGlass);
      glassLens.rotation.x = Math.PI / 2;
      glassLens.position.set(x, y, z - 0.05);
      camera.add(glassLens);
      const inner = new T.Mesh(new T.CylinderGeometry(r * 0.34, r * 0.34, 0.014, 28), new T.MeshBasicMaterial({
        color: 0x07141b, transparent: true, opacity: 0.85,
      }));
      inner.rotation.x = Math.PI / 2;
      inner.position.set(x, y, z - 0.058);
      camera.add(inner);
      const glint = new T.Mesh(new T.CircleGeometry(r * 0.14, 18), new T.MeshBasicMaterial({
        color: 0xc7ffff, transparent: true, opacity: 0.7,
      }));
      glint.position.set(x - r * 0.22, y + r * 0.2, z - 0.064);
      camera.add(glint);
      if (i === 0) {
        const accentRing = new T.Mesh(new T.TorusGeometry(r * 1.18, 0.008, 8, 36), accent);
        accentRing.position.set(x, y, z - 0.054);
        camera.add(accentRing);
      }
    });
    const flash = new T.Mesh(new T.CylinderGeometry(0.042, 0.042, 0.014, 20), new T.MeshBasicMaterial({ color: 0xffe5ae }));
    flash.rotation.x = Math.PI / 2;
    flash.position.set(0.22, 1.2, -0.305);
    camera.add(flash);
    const lidar = new T.Mesh(new T.CylinderGeometry(0.036, 0.036, 0.012, 20), new T.MeshBasicMaterial({ color: 0x071a21 }));
    lidar.rotation.x = Math.PI / 2;
    lidar.position.set(0.2, 0.9, -0.305);
    camera.add(lidar);
    register(camera, "camera");

    // 07 coil
    const coil = new T.Group();
    coil.position.copy(basePosition("coil"));
    const coilRing = new T.Mesh(new T.TorusGeometry(0.34, 0.018, 10, 56), copper);
    coilRing.position.set(0, -0.52, -0.098);
    coil.add(coilRing);
    const coilInner = new T.Mesh(new T.TorusGeometry(0.23, 0.012, 8, 42), copper);
    coilInner.position.set(0, -0.52, -0.098);
    coil.add(coilInner);
    const magnet = new T.Mesh(new T.TorusGeometry(0.39, 0.012, 8, 64), new T.MeshStandardMaterial({
      color: 0x26323a, metalness: 0.85, roughness: 0.3,
    }));
    magnet.position.set(0, -0.52, -0.09);
    coil.add(magnet);
    register(coil, "coil");

    // 08 speaker + usb-c
    const speaker = new T.Group();
    speaker.position.copy(basePosition("speaker"));
    const speakerMesh = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.18, 28), darkMetal);
    speakerMesh.rotation.z = Math.PI / 2;
    speakerMesh.position.set(0.36, -1.35, -0.03);
    speaker.add(speakerMesh);
    const meshGrille = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.01, 28), new T.MeshStandardMaterial({
      color: 0x1b2c34, metalness: 0.4, roughness: 0.8,
    }));
    meshGrille.rotation.z = Math.PI / 2;
    meshGrille.position.set(0.36, -1.35, 0.07);
    speaker.add(meshGrille);
    register(speaker, "speaker");

    // 14 USB-C port
    const usbGroup = new T.Group();
    const usbShell = new T.Mesh(new T.BoxGeometry(0.22, 0.07, 0.08), darkMetal);
    usbShell.position.set(-0.06, -1.48, -0.01);
    usbGroup.add(usbShell);
    const usbInner = new T.Mesh(new T.BoxGeometry(0.16, 0.026, 0.02), new T.MeshBasicMaterial({ color: 0x2bd6ff }));
    usbInner.position.set(-0.06, -1.48, 0.045);
    usbGroup.add(usbInner);
    const usbRing = new T.Mesh(new T.BoxGeometry(0.2, 0.045, 0.012), copper);
    usbRing.position.set(-0.06, -1.48, 0.052);
    usbGroup.add(usbRing);
    register(usbGroup, "usb");

    // 09 front camera
    const frontCamera = new T.Group();
    const fcRing = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.035, 28), darkMetal);
    fcRing.rotation.x = Math.PI / 2;
    fcRing.position.set(0, 1.41, 0.1);
    frontCamera.add(fcRing);
    const fcGlass = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.012, 28), lensGlass);
    fcGlass.rotation.x = Math.PI / 2;
    fcGlass.position.set(0, 1.41, 0.122);
    frontCamera.add(fcGlass);
    register(frontCamera, "frontCamera");

    // 10 earpiece
    const earpiece = new T.Group();
    const earSlot = new T.Mesh(new T.BoxGeometry(0.44, 0.04, 0.035), darkMetal);
    earSlot.position.set(0, 1.535, 0.09);
    earpiece.add(earSlot);
    const earInner = new T.Mesh(new T.BoxGeometry(0.38, 0.012, 0.012), new T.MeshBasicMaterial({ color: 0x12252d }));
    earInner.position.set(0, 1.535, 0.11);
    earpiece.add(earInner);
    register(earpiece, "earpiece");

    // 11 linear motor
    const vibration = new T.Group();
    const motor = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, 0.13, 24), darkMetal);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(-0.46, -1.24, -0.02);
    vibration.add(motor);
    const motorCap = new T.Mesh(new T.CylinderGeometry(0.078, 0.078, 0.015, 24), copper);
    motorCap.rotation.z = Math.PI / 2;
    motorCap.position.set(-0.53, -1.24, -0.02);
    vibration.add(motorCap);
    register(vibration, "vibration");

    // 12 vapor chamber
    const vapor = new T.Group();
    const vaporPlate = extrudeRounded(1.16, 1.22, 0.026, 0.08, copper, 0.003);
    vaporPlate.position.set(0, 0.16, -0.07);
    vapor.add(vaporPlate);
    const vaporTrace = new T.Mesh(new T.PlaneGeometry(0.94, 0.95), new T.MeshBasicMaterial({
      color: 0x72f7dc, transparent: true, opacity: 0.16, wireframe: true,
    }));
    vaporTrace.position.set(0, 0.16, -0.055);
    vapor.add(vaporTrace);
    register(vapor, "vapor");

    // 13 SIM tray
    const simTray = new T.Group();
    const simBody = new T.Mesh(new T.BoxGeometry(0.055, 0.52, 0.14), metal);
    simBody.position.set(-0.795, -0.78, 0);
    simTray.add(simBody);
    const simPin = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.02, 12), darkMetal);
    simPin.rotation.z = Math.PI / 2;
    simPin.position.set(-0.82, -0.78, 0.02);
    simTray.add(simPin);
    register(simTray, "simTray");

    // 16 antenna module
    const antenna = new T.Group();
    const antBase = new T.Mesh(new T.BoxGeometry(0.55, 0.035, 0.06), new T.MeshStandardMaterial({ color: 0x1b3038, metalness: 0.6, roughness: 0.5 }));
    antBase.position.set(0.28, -1.4, -0.1);
    antenna.add(antBase);
    const antTrace = new T.Mesh(new T.BoxGeometry(0.42, 0.008, 0.02), accent);
    antTrace.position.set(0.28, -1.39, -0.065);
    antenna.add(antTrace);
    register(antenna, "antenna");

    // 17 / 18 microphones
    const micTop = new T.Group();
    const mt = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.035, 16), darkMetal);
    mt.rotation.x = Math.PI / 2;
    mt.position.set(0.52, 1.58, 0.02);
    micTop.add(mt);
    register(micTop, "micTop");

    const micBottom = new T.Group();
    const mb = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.035, 16), darkMetal);
    mb.rotation.x = Math.PI / 2;
    mb.position.set(0.52, -1.58, 0.02);
    micBottom.add(mb);
    register(micBottom, "micBottom");

    // 19 ambient light / proximity
    const als = new T.Group();
    const alsRing = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.018, 20), darkMetal);
    alsRing.rotation.x = Math.PI / 2;
    alsRing.position.set(0.3, 1.48, 0.105);
    als.add(alsRing);
    const alsGlass = new T.Mesh(new T.CircleGeometry(0.022, 16), new T.MeshBasicMaterial({ color: 0x6fffe0 }));
    alsGlass.position.set(0.3, 1.48, 0.116);
    als.add(alsGlass);
    register(als, "als");

    // 20 display flex
    const displayFlex = new T.Group();
    const flex = new T.Mesh(new T.BoxGeometry(0.12, 0.5, 0.012), copper);
    flex.position.set(-0.16, -1.05, 0.045);
    displayFlex.add(flex);
    const flexConn = new T.Mesh(new T.BoxGeometry(0.18, 0.04, 0.022), darkMetal);
    flexConn.position.set(-0.16, -0.78, 0.045);
    displayFlex.add(flexConn);
    register(displayFlex, "displayFlex");

    // 21 RF shield
    const shieldPart = new T.Group();
    const shieldCan = extrudeRounded(0.44, 0.44, 0.032, 0.08, metal, 0.004);
    shieldCan.position.set(-0.15, 0.55, 0.025);
    shieldPart.add(shieldCan);
    const shieldHole = new T.Mesh(new T.PlaneGeometry(0.1, 0.1), new T.MeshBasicMaterial({
      color: 0x0c1b22, transparent: true, opacity: 0.8,
    }));
    shieldHole.position.set(-0.15, 0.55, 0.044);
    shieldPart.add(shieldHole);
    register(shieldPart, "shield");

    // 22 NFC antenna
    const nfc = new T.Group();
    const nfcMat = new T.MeshStandardMaterial({ color: 0xb8733e, metalness: 0.55, roughness: 0.42, side: T.DoubleSide });
    const nfcPlate = flatRounded(0.92, 0.95, 0.16, nfcMat);
    nfcPlate.position.set(0, -0.28, -0.104);
    nfcPlate.rotation.y = Math.PI;
    nfc.add(nfcPlate);
    const nfcLoop = new T.Mesh(new T.TorusGeometry(0.3, 0.006, 6, 48), new T.MeshBasicMaterial({ color: 0xffc36b }));
    nfcLoop.position.set(0, -0.28, -0.11);
    nfcLoop.rotation.y = Math.PI;
    nfc.add(nfcLoop);
    register(nfc, "nfc");

    // 23 graphite sheet
    const graphite = new T.Group();
    const graphitePlate = flatRounded(1.24, 1.48, 0.12, new T.MeshBasicMaterial({
      color: 0x29363d, transparent: true, opacity: 0.58, side: T.DoubleSide,
    }));
    graphitePlate.position.set(0, -0.08, -0.101);
    graphite.add(graphitePlate);
    register(graphite, "graphite");

    // 24 camera bracket
    const bracket = new T.Group();
    const bracketMat = silver;
    const bracketTop = new T.Mesh(new T.BoxGeometry(0.95, 0.045, 0.06), bracketMat);
    bracketTop.position.set(-0.18, 1.47, -0.145);
    bracket.add(bracketTop);
    const bracketBottom = new T.Mesh(new T.BoxGeometry(0.95, 0.045, 0.06), bracketMat);
    bracketBottom.position.set(-0.18, 0.63, -0.145);
    bracket.add(bracketBottom);
    const bracketLeft = new T.Mesh(new T.BoxGeometry(0.045, 0.88, 0.06), bracketMat);
    bracketLeft.position.set(-0.64, 1.05, -0.145);
    bracket.add(bracketLeft);
    const bracketRight = new T.Mesh(new T.BoxGeometry(0.045, 0.88, 0.06), bracketMat);
    bracketRight.position.set(0.28, 1.05, -0.145);
    bracket.add(bracketRight);
    register(bracket, "bracket");

    // small alignment pins / screws for visual density
    const pinMat = new T.MeshStandardMaterial({ color: 0x4a626d, metalness: 0.8, roughness: 0.25 });
    [-0.55, 0.55].forEach((x) => {
      [1.25, -1.22].forEach((y) => {
        const pin = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.02, 12), pinMat);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(x, y, -0.11);
        back.add(pin);
      });
    });

    const anchors = {
      screen: new T.Vector3(0.02, 0.95, 0.22),
      frame: new T.Vector3(0.68, 1.2, 0.05),
      back: new T.Vector3(0.42, 1.35, -0.22),
      board: new T.Vector3(0.32, 0.72, 0.02),
      battery: new T.Vector3(-0.35, -0.7, 0.02),
      camera: new T.Vector3(-0.42, 1.42, -0.28),
      coil: new T.Vector3(0.42, -0.55, -0.16),
      speaker: new T.Vector3(0.34, -1.45, 0.06),
      frontCamera: new T.Vector3(-0.2, 1.42, 0.16),
      earpiece: new T.Vector3(0.24, 1.53, 0.12),
      vibration: new T.Vector3(-0.52, -1.24, 0.02),
      vapor: new T.Vector3(0.25, 0.2, -0.06),
      simTray: new T.Vector3(-0.82, -0.78, 0.08),
      usb: new T.Vector3(-0.06, -1.48, 0.08),
      buttons: new T.Vector3(0.82, 0.32, 0.1),
      antenna: new T.Vector3(0.28, -1.4, -0.05),
      micTop: new T.Vector3(0.58, 1.58, 0.05),
      micBottom: new T.Vector3(0.58, -1.58, 0.05),
      als: new T.Vector3(0.34, 1.48, 0.14),
      displayFlex: new T.Vector3(-0.12, -0.88, 0.08),
      shield: new T.Vector3(-0.12, 0.58, 0.07),
      nfc: new T.Vector3(0.3, -0.32, -0.16),
      graphite: new T.Vector3(0.3, 0.02, -0.14),
      bracket: new T.Vector3(-0.2, 1.08, -0.2),
    };

    partsData.forEach((data) => {
      const group = partMap.get(data.id);
      if (!group) return;
      group.userData.base = group.position.clone();
      group.userData.anchor = anchors[data.id] || new T.Vector3();
      group.userData.explode = new T.Vector3(...data.explode);
    });

    return { root, partMap, meshes };
  }

export { buildPhone as buildPhoneModel };
