import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { PHONE_PARTS, PHONE_SPECS } from "./data.js";
import { buildPhoneModel } from "./model.js";

(function () {
  "use strict";

  const T = THREE;
  const app = document.getElementById("app");
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("scene");
  const loading = document.getElementById("loading");
  const parts = PHONE_PARTS;
  if (!T || !parts) {
    document.body.innerHTML = "<p style='padding:24px;color:#fff'>Three.js 或零件数据加载失败。</p>";
    return;
  }

  function partGroup(part) {
    const category = part.category || "";
    if (/FRONT|STRUCTURE|REAR|INTERFACE/.test(category)) return "structure";
    if (/CORE|SENSOR|CONNECTIVITY/.test(category)) return "core";
    if (/POWER|THERMAL/.test(category)) return "energy";
    if (/OPTICS/.test(category)) return "optics";
    return "interaction";
  }

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
  } catch (error) {
    document.body.innerHTML = "<p style='padding:24px;color:#fff'>当前浏览器不支持 WebGL 2。</p>";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  if ("outputColorSpace" in renderer && T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
  else renderer.outputEncoding = T.sRGBEncoding;

  const scene = new T.Scene();
  scene.background = new T.Color(0x05080b);
  scene.fog = new T.FogExp2(0x05080b, 0.032);

  const camera = new T.PerspectiveCamera(31, stage.clientWidth / stage.clientHeight, 0.1, 100);
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(stage.clientWidth, stage.clientHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new T.Vector2(stage.clientWidth, stage.clientHeight),
    0.1,
    0.36,
    0.97
  );
  composer.addPass(bloomPass);
  const cameraTarget = new T.Vector3(0, 0.06, 0);
  const orbit = {
    theta: 0.48,
    phi: 1.32,
    desiredTheta: 0.48,
    desiredPhi: 1.32,
    radius: 9.8,
    target: cameraTarget.clone(),
    desiredTarget: cameraTarget.clone(),
    desiredRadius: 9.8,
  };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let autoRotate = false;
  let bloomEnabled = true;
  let labelsVisible = false;
  let selectedId = null;
  let explode = 0;
  let explodeTarget = 0;
  let hovered = null;
  let dragging = false;
  let moved = 0;
  let pointerDownTime = 0;
  let lastPointer = { x: 0, y: 0 };
  let frame = 0;
  let fpsTime = 0;
  let fpsFrames = 0;
  let lastLabelUpdate = 0;
  let tourIndex = -1;
  let tourActive = false;
  let tourPlaying = false;
  let activeFilter = "all";
  let tourTimer = null;

  // ---- environment -------------------------------------------------------
  function makeEnvironment() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#010203");
    g.addColorStop(0.3, "#111619");
    g.addColorStop(0.46, "#3c4447");
    g.addColorStop(0.5, "#aeb6b7");
    g.addColorStop(0.54, "#1b2022");
    g.addColorStop(1, "#010203");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
    const warm = ctx.createRadialGradient(170, 180, 2, 170, 180, 210);
    warm.addColorStop(0, "rgba(255,218,185,.7)");
    warm.addColorStop(0.35, "rgba(255,175,120,.18)");
    warm.addColorStop(1, "rgba(255,175,120,0)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, 1024, 512);
    const cool = ctx.createRadialGradient(790, 210, 2, 790, 210, 260);
    cool.addColorStop(0, "rgba(190,235,255,.5)");
    cool.addColorStop(0.4, "rgba(100,170,195,.16)");
    cool.addColorStop(1, "rgba(100,170,195,0)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, 1024, 512);
    // softbox strips give the metal long, readable reflections
    ctx.globalAlpha = 0.16;
    [96, 248, 730, 860].forEach((x, i) => {
      const box = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
      box.addColorStop(0, "rgba(255,255,255,0)");
      box.addColorStop(0.5, i % 2 ? "rgba(210,255,255,1)" : "rgba(255,220,180,1)");
      box.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = box;
      ctx.fillRect(x - 18, 70 + i * 45, 36, 170);
    });
    ctx.globalAlpha = 1;
    const tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }
  scene.environment = makeEnvironment();

  const hemi = new T.HemisphereLight(0x82979d, 0x010203, 0.44);
  scene.add(hemi);
  const key = new T.DirectionalLight(0xffb06e, 4.4);
  key.position.set(-4.2, 5.6, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new T.DirectionalLight(0x4fdcff, 3.0);
  rim.position.set(4.5, 2.4, -4);
  scene.add(rim);
  const fill = new T.DirectionalLight(0x2f6f7a, 0.42);
  fill.position.set(0, -1, 4);
  scene.add(fill);
  const warmPoint = new T.PointLight(0xff9b58, 1.6, 9, 2);
  warmPoint.position.set(-2.4, 1.4, 2.6);
  scene.add(warmPoint);
  const coolPoint = new T.PointLight(0x43dfff, 1.2, 9, 2);
  coolPoint.position.set(2.8, 1.2, -1.8);
  scene.add(coolPoint);
  const front = new T.DirectionalLight(0xb9f7ff, 1.25);
  front.position.set(0.5, 1.4, 5.2);
  scene.add(front);

  const ground = new T.Mesh(new T.PlaneGeometry(24, 24), new T.ShadowMaterial({ color: 0x000000, opacity: 0.34 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.89;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new T.GridHelper(10, 20, 0x0f6575, 0x08313d);
  grid.position.y = -1.88;
  grid.material.transparent = true;
  grid.material.opacity = 0.42;
  scene.add(grid);

  const ringMat = new T.LineBasicMaterial({ color: 0x28a9bd, transparent: true, opacity: 0.42 });
  [1.55, 1.76].forEach((r) => {
    const points = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      points.push(new T.Vector3(Math.cos(a) * r, -1.87, Math.sin(a) * r));
    }
    scene.add(new T.Line(new T.BufferGeometry().setFromPoints(points), ringMat));
  });

  const particleGroup = new T.Group();
  const pGeo = new T.BufferGeometry();
  const pPos = new Float32Array(140 * 3);
  for (let i = 0; i < 140; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 9;
    pPos[i * 3 + 1] = (Math.random() - 0.3) * 6;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 7;
  }
  pGeo.setAttribute("position", new T.BufferAttribute(pPos, 3));
  const particles = new T.Points(pGeo, new T.PointsMaterial({ color: 0x4ed9e8, size: 0.012, transparent: true, opacity: 0.35, depthWrite: false }));
  particleGroup.add(particles);
  scene.add(particleGroup);

  // A soft, camera-facing glow behind the phone. This is deliberately a
  // sprite rather than a full bloom pass: the MVP stays fast on integrated GPUs.
  function makeGlowTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
    g.addColorStop(0, "rgba(93, 241, 255, .42)");
    g.addColorStop(0.32, "rgba(44, 174, 197, .18)");
    g.addColorStop(1, "rgba(10, 50, 65, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(c);
  }
  const glow = new T.Sprite(new T.SpriteMaterial({
    map: makeGlowTexture(), transparent: true, depthWrite: false,
    blending: T.AdditiveBlending, opacity: 0.22, color: 0x9ffcff,
  }));
  glow.scale.set(5.2, 5.5, 1);
  glow.position.set(0.4, 0.15, -1.1);
  scene.add(glow);

  // ---- model -------------------------------------------------------------
  const model = buildPhoneModel(parts);
  scene.add(model.root);
  model.root.rotation.y = -0.16;

  const selectionBox = new T.BoxHelper(new T.Object3D(), 0x61f4ff);
  selectionBox.visible = false;
  selectionBox.material.transparent = true;
  selectionBox.material.opacity = 0.48;
  scene.add(selectionBox);

  // ---- UI refs -----------------------------------------------------------
  const partList = document.getElementById("partList");
  const filterRow = document.getElementById("filterRow");
  const coreSpecs = document.getElementById("coreSpecs");
  const inspectorBody = document.getElementById("inspectorBody");
  const activePill = document.getElementById("activePill");
  const progress = document.getElementById("progress");
  const progressValue = document.getElementById("progressValue");
  const stageExplode = document.getElementById("stageExplode");
  const topExploded = document.getElementById("topExploded");
  const integrity = document.getElementById("integrity");
  const integrityBar = document.getElementById("integrityBar");
  const explodeBtn = document.getElementById("explodeBtn");
  const explodeLabel = document.getElementById("explodeLabel");
  const autoBtn = document.getElementById("autoBtn");
  const labelsBtn = document.getElementById("labelsBtn");
  const qualityBtn = document.getElementById("qualityBtn");
  const resetBtn = document.getElementById("resetBtn");
  const focusBtn = document.getElementById("focusBtn");
  const clearBtn = document.getElementById("clearBtn");
  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const closeHelp = document.getElementById("closeHelp");
  const labelsLayer = document.getElementById("labels");
  const leaderLayer = document.getElementById("leaderLayer");
  const fpsEl = document.getElementById("fps");
  const tourBtn = document.getElementById("tourBtn");
  const partsBtn = document.getElementById("partsBtn");
  const tourbar = document.getElementById("tourbar");
  const tourStep = document.getElementById("tourStep");
  const tourName = document.getElementById("tourName");
  const tourCaption = document.getElementById("tourCaption");
  const tourPlay = document.getElementById("tourPlay");
  const tourProgress = document.getElementById("tourProgress");
  const exportBtn = document.getElementById("exportBtn");
  const fsBtn = document.getElementById("fsBtn");
  const topParts = document.getElementById("topParts");
  const partCount = document.getElementById("partCount");
  topParts.textContent = String(parts.length).padStart(2, "0");
  partCount.textContent = `/ ${String(parts.length).padStart(2, "0")}`;
  const stageHint = document.getElementById("stageHint");

  const labelEls = new Map();
  const leaderEls = new Map();
  parts.forEach((part) => {
    const btn = document.createElement("button");
    btn.className = "part-item";
    btn.dataset.id = part.id;
    btn.dataset.group = partGroup(part);
    btn.innerHTML = `<span class="idx">${part.index}</span><span><span class="name">${part.name}</span><span class="en">${part.en}</span></span><span class="dot" style="background:${part.color}"></span>`;
    btn.addEventListener("click", () => selectPart(part.id, true));
    partList.appendChild(btn);

    const label = document.createElement("button");
    label.className = "label-card";
    label.dataset.id = part.id;
    label.dataset.side = part.side;
    label.innerHTML = `<span class="l-idx">${part.index} / ${part.en}</span><span class="l-name">${part.name}</span><span class="l-en">${part.category}</span><span class="l-line"></span>`;
    label.addEventListener("click", () => selectPart(part.id, true));
    labelsLayer.appendChild(label);
    labelEls.set(part.id, label);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "1.6");
    leaderLayer.appendChild(path);
    leaderLayer.appendChild(dot);
    leaderEls.set(part.id, { path, dot });
  });

  PHONE_SPECS.forEach(([label, value]) => {
    const cell = document.createElement("div");
    cell.className = "core-cell";
    cell.innerHTML = `<span>${label}</span><b>${value}</b>`;
    coreSpecs.appendChild(cell);
  });

  function renderOverview() {
    activePill.textContent = "● OVERVIEW";
    activePill.style.color = "var(--muted)";
    activePill.style.borderColor = "var(--line)";
    inspectorBody.innerHTML = `
      <div class="inspector-kicker">AURORA P1 / CONCEPT</div>
      <h3 class="overview-title">结构总览</h3>
      <p class="overview-sub">${parts.length} 个模块的程序化概念手机。点击左侧清单或 3D 模型，查看零件并触发分层拆解。</p>
      <div class="overview-big">${String(parts.length).padStart(2, "0")}</div>
      <div class="spec-grid">
        ${PHONE_SPECS.map(([k, v]) => `<div class="spec-cell"><span>${k}</span><b>${v}</b></div>`).join("")}
      </div>
      <div class="inspector-meta"><span>ASSEMBLY / P1-01</span><span>STATE / ASSEMBLED</span></div>`;
    focusBtn.disabled = true;
    focusBtn.style.opacity = ".4";
  }

  function renderInspector(part) {
    if (!part) return renderOverview();
    activePill.textContent = "● ACTIVE";
    activePill.style.color = "var(--green)";
    activePill.style.borderColor = "rgba(130,255,200,.28)";
    inspectorBody.innerHTML = `
      <div class="inspector-kicker">${part.category}</div>
      <h3 class="inspector-title">${part.name}</h3>
      <div class="inspector-en">${part.en}</div>
      <div class="inspector-rule"></div>
      <div class="spec-grid">
        ${part.specs.map(([k, v]) => `<div class="spec-cell"><span>${k}</span><b>${v}</b></div>`).join("")}
      </div>
      <p class="inspector-desc">${part.description}</p>
      <div class="tag-row">${part.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="inspector-meta"><span>ASSEMBLY / P1-${part.index}</span><span>STATE / ${explode > 0.5 ? "EXPLODED" : "NORMAL"}</span></div>`;
    focusBtn.disabled = false;
    focusBtn.style.opacity = "1";
  }

  function setFilter(group) {
    activeFilter = group;
    filterRow.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.filter === group));
    partList.querySelectorAll(".part-item").forEach((item) => {
      item.style.display = group === "all" || item.dataset.group === group ? "" : "none";
    });
  }

  function selectPart(id, shouldExplode) {
    selectedId = selectedId === id ? null : id;
    app.classList.toggle("has-selection", Boolean(selectedId));
    document.querySelectorAll(".part-item").forEach((el) => el.classList.toggle("active", el.dataset.id === selectedId));
    app.classList.remove("parts-open");
    partsBtn.classList.remove("active");
    if (selectedId) document.querySelector(`.part-item[data-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest" });
    labelEls.forEach((el, key) => el.classList.toggle("selected", key === selectedId));
    const part = parts.find((p) => p.id === selectedId);
    if (part) {
      if (activeFilter !== "all" && partGroup(part) !== activeFilter) setFilter("all");
      if (tourActive) {
        tourIndex = parts.findIndex((item) => item.id === selectedId);
        updateTourBar();
      }
      renderInspector(part);
      if (shouldExplode && explodeTarget < 0.5) setExplode(1);
      updateSelectionBox();
    } else {
      renderOverview();
      selectionBox.visible = false;
      if (tourActive) stopTour();
    }
    stage.classList.add("hint-hidden");
  }

  function updateSelectionBox() {
    if (!selectedId) {
      selectionBox.visible = false;
      return;
    }
    const group = model.partMap.get(selectedId);
    if (!group) return;
    selectionBox.setFromObject(group);
    selectionBox.visible = explode > 0.12;
  }

  function setExplode(value) {
    explodeTarget = Math.max(0, Math.min(1, value));
    explodeBtn.classList.toggle("is-open", explodeTarget > 0.5);
    explodeLabel.textContent = explodeTarget > 0.5 ? "组装复位" : "全部拆解";
    stage.classList.add("hint-hidden");
  }

  function applyExplode(dt) {
    const speed = 1 - Math.pow(0.001, dt);
    explode += (explodeTarget - explode) * speed;
    if (Math.abs(explodeTarget - explode) < 0.0004) explode = explodeTarget;
    let count = 0;
    parts.forEach((part) => {
      const group = model.partMap.get(part.id);
      if (!group) return;
      const raw = Math.max(0, Math.min(1, (explode - part.delay * 0.22) / (1 - part.delay * 0.22)));
      const eased = 1 - Math.pow(1 - raw, 3);
      const base = group.userData.base;
      const vector = group.userData.explode;
      group.position.set(base.x + vector.x * eased, base.y + vector.y * eased, base.z + vector.z * eased);
      const alwaysVisible = ["screen", "frame", "back", "camera"].includes(part.id);
      group.visible = explode > 0.018 || alwaysVisible || selectedId === part.id;
      if (raw > 0.52) count += 1;
    });
    const value = Math.round(explode * 100);
    progress.value = String(value);
    progress.style.setProperty("--fill", `${value}%`);
    progressValue.textContent = String(value).padStart(3, "0");
    stageExplode.textContent = String(value).padStart(3, "0");
    topExploded.textContent = String(count).padStart(2, "0");
    const integrityValue = Math.round(100 - Math.min(1, explode) * 100);
    integrity.textContent = `${integrityValue}%`;
    integrityBar.style.width = `${integrityValue}%`;
    updateSelectionBox();
  }

  // ---- labels ------------------------------------------------------------
  const tmp = new T.Vector3();
  const projected = new T.Vector3();
  function screenPoint(world) {
    projected.copy(world).project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * stage.clientWidth,
      y: (-projected.y * 0.5 + 0.5) * stage.clientHeight,
      visible: projected.z > -1 && projected.z < 1,
    };
  }

  function updateLabels() {
    const showAll = labelsVisible && explode > 0.08;
    const rect = stage.getBoundingClientRect();
    const placed = { left: [], right: [] };
    parts.forEach((part) => {
      const el = labelEls.get(part.id);
      const leader = leaderEls.get(part.id);
      const group = model.partMap.get(part.id);
      if (!group) return;
      const world = group.localToWorld(group.userData.anchor.clone());
      const point = screenPoint(world);
      const active = part.id === selectedId;
      const visible = point.visible && (showAll || active);
      el.classList.toggle("visible", visible);
      if (!visible) {
        leader.path.setAttribute("d", "");
        leader.dot.setAttribute("r", "0");
        return;
      }
      const side = part.side;
      const lane = placed[side];
      let x;
      let y;
      if (active) {
        x = point.x + (side === "left" ? -94 : 94);
        y = point.y;
      } else {
        // With 16 parts the anchor-adjacent layout collides. Keep the
        // unselected labels in two readable HUD columns instead.
        x = side === "left" ? 74 : stage.clientWidth - 74;
        y = 50 + lane.length * 43;
      }
      x = Math.max(72, Math.min(stage.clientWidth - 72, x));
      y = Math.max(42, Math.min(stage.clientHeight - 32, y));
      lane.push(y);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      const edgeX = side === "left" ? x + 64 : x - 64;
      const bendX = side === "left" ? edgeX + 22 : edgeX - 22;
      leader.path.setAttribute("d", `M ${point.x.toFixed(1)} ${point.y.toFixed(1)} L ${bendX.toFixed(1)} ${y.toFixed(1)} L ${edgeX.toFixed(1)} ${y.toFixed(1)}`);
      leader.dot.setAttribute("cx", point.x.toFixed(1));
      leader.dot.setAttribute("cy", point.y.toFixed(1));
      leader.dot.setAttribute("r", active ? "2.4" : "1.4");
    });
  }

  // ---- camera ------------------------------------------------------------
  function updateCamera(dt) {
    if (autoRotate && !dragging) orbit.desiredTheta += dt * 0.16;
    orbit.theta += (orbit.desiredTheta - orbit.theta) * Math.min(1, dt * 5.5);
    orbit.phi += (orbit.desiredPhi - orbit.phi) * Math.min(1, dt * 5.5);
    orbit.radius += (orbit.desiredRadius - orbit.radius) * Math.min(1, dt * 8);
    orbit.target.lerp(orbit.desiredTarget, Math.min(1, dt * 7));
    const sinPhi = Math.sin(orbit.phi);
    camera.position.set(
      orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * Math.cos(orbit.phi),
      orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }

  function focusSelected() {
    if (!selectedId) return;
    const group = model.partMap.get(selectedId);
    if (!group) return;
    const box = new T.Box3().setFromObject(group);
    const center = box.getCenter(new T.Vector3());
    const size = box.getSize(new T.Vector3());
    orbit.desiredTarget.copy(center);
    orbit.desiredRadius = Math.max(4.6, Math.max(size.x, size.y, size.z) * 2.15);
    const part = parts.find((item) => item.id === selectedId);
    if (part) {
      if (["camera", "back", "coil"].includes(part.id)) {
        orbit.desiredTheta = 2.36;
        orbit.desiredPhi = 1.22;
      } else if (["screen", "frontCamera", "earpiece"].includes(part.id)) {
        orbit.desiredTheta = 0.48;
        orbit.desiredPhi = 1.3;
      } else if (part.side === "left") {
        orbit.desiredTheta = 0.96;
        orbit.desiredPhi = 1.28;
      } else {
        orbit.desiredTheta = -0.44;
        orbit.desiredPhi = 1.28;
      }
    }
    setExplode(1);
  }

  function updateTourBar() {
    if (!tourActive || tourIndex < 0) {
      tourbar.classList.remove("open");
      tourbar.setAttribute("aria-hidden", "true");
      return;
    }
    const part = parts[tourIndex];
    tourbar.classList.add("open");
    tourbar.setAttribute("aria-hidden", "false");
    tourStep.textContent = `${String(tourIndex + 1).padStart(2, "0")} / ${String(parts.length).padStart(2, "0")}`;
    tourName.textContent = part.name;
    tourCaption.textContent = `${part.category} · ${part.tags.join(" / ")}`;
    tourProgress.style.width = `${((tourIndex + 1) / parts.length) * 100}%`;
  }

  function scheduleTour() {
    if (tourTimer) window.clearInterval(tourTimer);
    tourTimer = null;
    if (!tourActive || !tourPlaying) return;
    tourTimer = window.setInterval(() => showTour(tourIndex + 1), 3800);
  }

  function showTour(index) {
    tourActive = true;
    tourIndex = (index + parts.length) % parts.length;
    const part = parts[tourIndex];
    if (selectedId !== part.id) selectPart(part.id, true);
    else setExplode(1);
    updateTourBar();
    window.setTimeout(focusSelected, 120);
    tourBtn.classList.add("active");
    scheduleTour();
  }

  function startTour() {
    tourActive = true;
    tourPlaying = !reduceMotion;
    tourPlay.textContent = tourPlaying ? "Ⅱ" : "▶";
    showTour(selectedId ? Math.max(0, parts.findIndex((part) => part.id === selectedId)) : 0);
  }

  function toggleTourPlay() {
    if (!tourActive) { startTour(); return; }
    tourPlaying = !tourPlaying;
    tourPlay.textContent = tourPlaying ? "Ⅱ" : "▶";
    scheduleTour();
  }

  function stopTour() {
    tourActive = false;
    tourPlaying = false;
    if (tourTimer) window.clearInterval(tourTimer);
    tourTimer = null;
    tourIndex = -1;
    tourPlay.textContent = "▶";
    tourBtn.classList.remove("active");
    updateTourBar();
  }

  function resetView() {
    orbit.desiredTarget.set(0, 0.06, 0);
    orbit.desiredRadius = 9.8;
    orbit.desiredTheta = 0.48;
    orbit.desiredPhi = 1.32;
    setExplode(0);
    selectPart(null, false);
  }

  // ---- events ------------------------------------------------------------
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    moved = 0;
    pointerDownTime = performance.now();
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    moved += Math.abs(dx) + Math.abs(dy);
    orbit.desiredTheta -= dx * 0.007;
    orbit.desiredPhi = Math.max(0.55, Math.min(2.3, orbit.desiredPhi - dy * 0.005));
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    dragging = false;
    const elapsed = performance.now() - pointerDownTime;
    if (moved < 7 && elapsed < 500) {
      selectAt(event.clientX, event.clientY);
    }
  });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    orbit.desiredRadius = Math.max(3.5, Math.min(11, orbit.desiredRadius + event.deltaY * 0.004));
  }, { passive: false });

  const raycaster = new T.Raycaster();
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({ x, y }, camera);
    const hits = raycaster.intersectObjects(model.meshes, false);
    const hit = hits.find((h) => h.object.userData.partId);
    return hit ? hit.object.userData.partId : null;
  }
  function selectAt(clientX, clientY) {
    const id = pickAt(clientX, clientY);
    if (id) selectPart(id, true);
    else selectPart(null, false);
  }
  canvas.addEventListener("dblclick", (event) => {
    const id = pickAt(event.clientX, event.clientY);
    if (!id) return;
    selectPart(id, true);
    window.setTimeout(focusSelected, 60);
  });

  progress.addEventListener("input", () => {
    const value = Number(progress.value) / 100;
    explode = value;
    explodeTarget = value;
    explodeBtn.classList.toggle("is-open", value > 0.5);
    explodeLabel.textContent = value > 0.5 ? "组装复位" : "全部拆解";
  });
  explodeBtn.addEventListener("click", () => setExplode(explodeTarget > 0.5 ? 0 : 1));
  resetBtn.addEventListener("click", resetView);
  clearBtn.addEventListener("click", () => selectPart(null, false));
  focusBtn.addEventListener("click", focusSelected);
  tourBtn.addEventListener("click", () => {
    if (tourActive) stopTour();
    else startTour();
  });
  document.getElementById("tourPlay").addEventListener("click", toggleTourPlay);
  document.getElementById("tourPrev").addEventListener("click", () => showTour(tourIndex - 1));
  document.getElementById("tourNext").addEventListener("click", () => showTour(tourIndex + 1));
  document.getElementById("tourExit").addEventListener("click", stopTour);
  autoBtn.addEventListener("click", () => {
    autoRotate = !autoRotate;
    autoBtn.classList.toggle("active", autoRotate);
  });
  labelsBtn.addEventListener("click", () => {
    labelsVisible = !labelsVisible;
    labelsBtn.classList.toggle("active", labelsVisible);
  });
  filterRow.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });
  labelsBtn.classList.remove("active");
  partsBtn.addEventListener("click", () => {
    const open = app.classList.toggle("parts-open");
    partsBtn.classList.toggle("active", open);
  });
  qualityBtn.classList.add("active");
  qualityBtn.addEventListener("click", () => {
    bloomEnabled = !bloomEnabled;
    qualityBtn.classList.toggle("active", bloomEnabled);
    qualityBtn.querySelector("small").textContent = bloomEnabled ? "Bloom" : "Fast";
  });
  exportBtn.addEventListener("click", () => {
    if (bloomEnabled) composer.render();
    else renderer.render(scene, camera);
    const link = document.createElement("a");
    link.download = "aurora-p1-teardown.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
  fsBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) app.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  document.addEventListener("fullscreenchange", () => {
    fsBtn.textContent = document.fullscreenElement ? "⤡" : "⛶";
    fsBtn.title = document.fullscreenElement ? "退出全屏" : "全屏";
  });
  helpBtn.addEventListener("click", () => helpModal.classList.add("open"));
  closeHelp.addEventListener("click", () => helpModal.classList.remove("open"));
  helpModal.addEventListener("click", (event) => { if (event.target === helpModal) helpModal.classList.remove("open"); });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { helpModal.classList.remove("open"); stopTour(); selectPart(null, false); }
    if (event.key.toLowerCase() === "e") setExplode(explodeTarget > 0.5 ? 0 : 1);
    if (event.key.toLowerCase() === "r") resetView();
    if (event.key.toLowerCase() === "l") labelsBtn.click();
    if (event.key.toLowerCase() === "b") qualityBtn.click();
    if (event.key.toLowerCase() === "t") tourBtn.click();
    if (event.key.toLowerCase() === "f") focusSelected();
    if (event.key.toLowerCase() === "h") helpModal.classList.toggle("open");
    if (event.key.toLowerCase() === " ") { event.preventDefault(); autoBtn.click(); }
    const number = Number(event.key);
    if (number >= 1 && number <= parts.length) selectPart(parts[number - 1].id, true);
  });

  window.addEventListener("resize", () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  // ---- loop --------------------------------------------------------------
  let last = 0;
  function tick(now) {
    const dt = last ? Math.min(0.05, Math.max(0.001, (now - last) / 1000)) : 0.016;
    last = now;
    if (!Number.isFinite(explode)) explode = explodeTarget;
    applyExplode(dt);
    updateCamera(dt);
    particleGroup.rotation.y += dt * 0.01;
    particles.material.opacity = 0.24 + Math.sin(now * 0.0006) * 0.06;
    if (now - lastLabelUpdate > 40) {
      updateLabels();
      lastLabelUpdate = now;
    }
    if (bloomEnabled) composer.render();
    else renderer.render(scene, camera);
    frame++;
    if (now - fpsTime > 700) {
      const fps = Math.round((frame * 1000) / (now - fpsTime));
      fpsEl.textContent = fps < 20 ? "--" : String(fps).padStart(2, "0");
      frame = 0;
      fpsTime = now;
    }
    requestAnimationFrame(tick);
  }

  renderOverview();
  // start slightly exploded for the visual demo if requested
  const params = new URLSearchParams(location.search);
  if (params.get("exploded") === "1") {
    explode = 0.84;
    explodeTarget = 1;
    explodeLabel.textContent = "组装复位";
    explodeBtn.classList.add("is-open");
    stage.classList.add("hint-hidden");
  }
  if (params.get("view") === "back") {
    orbit.desiredTheta = 2.36;
    orbit.desiredPhi = 1.48;
    explodeTarget = 0;
  }
  if (params.get("tour") === "1") window.setTimeout(startTour, 700);
  const filterParam = params.get("filter");
  if (filterParam && ["all", "structure", "core", "energy", "optics", "interaction"].includes(filterParam)) {
    setFilter(filterParam);
  }
  if (params.get("parts") === "1") {
    app.classList.add("parts-open");
    partsBtn.classList.add("active");
  }
  if (params.get("labels") === "1") {
    labelsVisible = true;
    labelsBtn.classList.add("active");
  }
  const deepLinkPart = params.get("part");
  if (deepLinkPart && parts.some((part) => part.id === deepLinkPart)) {
    selectPart(deepLinkPart, true);
    if (params.get("focus") === "1") window.setTimeout(focusSelected, 120);
  }
  updateCamera(0.016);
  updateLabels();
  setTimeout(() => loading.classList.add("hidden"), 500);
  requestAnimationFrame(tick);
})();
