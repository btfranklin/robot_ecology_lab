const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chart");
const chartCtx = chartCanvas.getContext("2d");

const cycleOut = document.getElementById("cycle");
const populationOut = document.getElementById("population");
const avgFitnessOut = document.getElementById("avgFitness");
const peakFitnessOut = document.getElementById("peakFitness");
const masterPos = document.getElementById("masterPos");
const popMeter = document.getElementById("popMeter");
const fitnessMeter = document.getElementById("fitnessMeter");
const robotDetails = document.getElementById("robotDetails");
const logList = document.getElementById("log");
const ariaStatus = document.getElementById("ariaStatus");

const speedInput = document.getElementById("speed");
const speedOut = document.getElementById("speedOut");
const maxAgeInput = document.getElementById("maxAge");
const maxAgeOut = document.getElementById("maxAgeOut");
const densityInput = document.getElementById("density");
const densityOut = document.getElementById("densityOut");
const seedInput = document.getElementById("seed");

const showGridInput = document.getElementById("showGrid");
const showTrailsInput = document.getElementById("showTrails");
const showSignalsInput = document.getElementById("showSignals");

const toggleRunBtn = document.getElementById("toggleRun");
const stepBtn = document.getElementById("step");
const resetBtn = document.getElementById("reset");
const randomizeBtn = document.getElementById("randomize");
const applySeedBtn = document.getElementById("applySeed");
const helpBtn = document.getElementById("helpBtn");
const closeHelpBtn = document.getElementById("closeHelp");
const centerViewBtn = document.getElementById("centerView");

const helpDialog = document.getElementById("help");
const botPopover = document.getElementById("botPopover");
const botPopoverTitle = document.getElementById("botPopoverTitle");
const botPopoverSub = document.getElementById("botPopoverSub");

const config = {
  width: 50,
  height: 50,
  speed: 12,
  maxAge: 100,
  density: 5,
};

const state = {
  running: false,
  cycle: 0,
  rng: Math.random,
  seed: "",
  world: [],
  master: { x: 0, y: 0 },
  stats: { population: 0, avgFitness: 0, peakFitness: 0 },
  history: { population: [], avg: [], peak: [] },
  historyLimit: 220,
  visual: { grid: true, trails: true, signals: true },
  selected: null,
  events: [],
  log: [],
};

const colors = {
  field: "#1a3b2f",
  hill: "#3a2f15",
  building: "#262626",
  master: "#143a48",
  grid: "rgba(255,255,255,0.08)",
  trail: "rgba(61, 218, 215, 0.35)",
};

const directions = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

let robotIdCounter = 1;
let lastTime = 0;
let accumulator = 0;

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(max) {
  return Math.floor(state.rng() * max);
}

function randomChoice(arr) {
  return arr[randInt(arr.length)];
}

function randomDirection() {
  return randomChoice(directions);
}

function setSeed(value) {
  state.seed = value || String(Date.now());
  seedInput.value = state.seed;
  state.rng = mulberry32(hashString(state.seed));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeStats(robot) {
  const g = robot.gene;
  const half = (n) => Math.floor(n / 2);
  const third = (n) => Math.floor(n / 3);

  const quickthinking = Math.floor((g[5] + g[6]) / 2);
  const observantness = third(g[7] + g[8] + g[13]) + half(g[6]) + g[10];
  const visibility = 255 - g[14];
  const audibility = 255 - g[15] + third(g[4]);
  const range = g[9] * 2 - half(g[4]) - half(g[11]);
  const maneuverability = g[3] + half(g[4]) - third(g[1]);
  const dexterity = g[2] - half(g[1]) + quickthinking + half(observantness);
  const armorclass = dexterity + g[0] + third(g[7] + g[8]) + maneuverability;
  const fightskill = dexterity + observantness + quickthinking;
  const miningskill = observantness + dexterity + g[12] + g[11];
  const interfaceSkill = quickthinking + observantness + g[6] * 2;

  robot.stats = {
    quickthinking,
    observantness,
    visibility,
    audibility,
    range,
    maneuverability,
    dexterity,
    armorclass,
    fightskill,
    miningskill,
    interface: interfaceSkill,
  };
}

function randomGene() {
  return randInt(256);
}

function randomName() {
  const letters = [
    String.fromCharCode(65 + randInt(26)),
    String.fromCharCode(65 + randInt(26)),
    String.fromCharCode(65 + randInt(26)),
  ];
  return letters.join("");
}

function buildNewRobot() {
  const gene = Array.from({ length: 16 }, () => randomGene());
  const robot = {
    id: robotIdCounter++,
    name: randomName(),
    number: randInt(256),
    mark: 1,
    gene,
    age: 0,
    fitness: 0,
    stats: {},
  };
  computeStats(robot);
  return robot;
}

function buildChildRobot(parentA, parentB) {
  const gene = Array.from({ length: 16 }, (_, i) => {
    const roll = randInt(1100);
    if (roll < 500) return parentA.gene[i];
    if (roll > 1000) return randomGene();
    return parentB.gene[i];
  });

  const robot = {
    id: robotIdCounter++,
    name: randomName(),
    number: randInt(256),
    mark: Math.max(parentA.mark, parentB.mark) + 1,
    gene,
    age: 0,
    fitness: 0,
    stats: {},
  };
  computeStats(robot);
  return robot;
}

function createWorld() {
  const world = [];
  for (let y = 0; y < config.height; y += 1) {
    const row = [];
    for (let x = 0; x < config.width; x += 1) {
      const terrainRoll = randInt(100);
      let type = "field";
      if (terrainRoll < 50) type = "field";
      else if (terrainRoll < 80) type = "hill";
      else type = "building";

      const cell = {
        type,
        robot: null,
        coolData: 0,
        visits: 0,
      };

      if (randInt(100) < config.density) {
        cell.robot = buildNewRobot();
        cell.visits += 1;
      }

      row.push(cell);
    }
    world.push(row);
  }

  const masterX = randInt(config.width);
  const masterY = randInt(config.height);
  world[masterY][masterX].type = "master";
  world[masterY][masterX].coolData = 0;
  state.master = { x: masterX, y: masterY };
  masterPos.textContent = `${masterX},${masterY}`;

  return world;
}

function resetSimulation() {
  state.cycle = 0;
  state.stats = { population: 0, avgFitness: 0, peakFitness: 0 };
  state.history = { population: [], avg: [], peak: [] };
  state.events = [];
  state.log = [];
  state.selected = null;
  robotIdCounter = 1;
  state.world = createWorld();
  popMeter.max = config.width * config.height;
  updateOutputs();
  updateLog();
  renderRobotDetails();
  renderChart();
}

function startSimulation() {
  state.running = true;
  toggleRunBtn.textContent = "Pause";
  ariaStatus.textContent = "Simulation started.";
}

function stopSimulation() {
  state.running = false;
  toggleRunBtn.textContent = "Start";
  ariaStatus.textContent = "Simulation paused.";
}

function toggleSimulation() {
  if (state.running) stopSimulation();
  else startSimulation();
}

function stepSimulation() {
  state.cycle += 1;

  let population = 0;
  let sumFitness = 0;
  let peakFitness = 0;

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const cell = state.world[y][x];
      if (!cell.robot) continue;

      cell.robot.age += 1;
      if (cell.robot.age > config.maxAge) {
        addLog(`${cell.robot.name}-${cell.robot.number} shut down (age).`);
        cell.robot = null;
        continue;
      }

      population += 1;
      sumFitness += cell.robot.fitness;
      if (cell.robot.fitness > peakFitness) peakFitness = cell.robot.fitness;
    }
  }

  if (population <= 1) {
    stopSimulation();
    addLog("Population collapsed.");
    ariaStatus.textContent = "Population collapsed.";
  }

  const positions = [];
  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const robot = state.world[y][x].robot;
      if (robot) positions.push({ x, y, id: robot.id });
    }
  }

  shuffleArray(positions);

  for (const pos of positions) {
    const cell = state.world[pos.y][pos.x];
    if (!cell.robot || cell.robot.id !== pos.id) continue;

    const robot = cell.robot;

    if (cell.type === "hill") {
      if (robot.stats.miningskill > randInt(20000)) {
        robot.fitness += 50;
        if (robot.fitness > peakFitness) peakFitness = robot.fitness;
        addLog(`${robot.name}-${robot.number} mined ore (+50).`);
        addSignal(pos.x, pos.y, "rgba(212,108,78,0.85)");
      }
    }

    if (cell.type === "master") {
      const survived = confrontMaster(robot, pos.x, pos.y);
      if (!survived) {
        addSignal(pos.x, pos.y, "rgba(255,80,80,0.8)");
        continue;
      }
      addSignal(pos.x, pos.y, "rgba(61,218,215,0.9)");
    }

    const [dx, dy] = randomDirection();
    const tx = pos.x + dx;
    const ty = pos.y + dy;
    if (tx < 0 || ty < 0 || tx >= config.width || ty >= config.height) {
      continue;
    }

    const targetCell = state.world[ty][tx];

    if (!targetCell.robot) {
      moveRobot(pos.x, pos.y, tx, ty);
      continue;
    }

    const desire = randInt(2); // 0 mate, 1 attack
    if (desire === 0) {
      const spot = findEmptyCell();
      if (spot) {
        const child = buildChildRobot(robot, targetCell.robot);
        state.world[spot.y][spot.x].robot = child;
        state.world[spot.y][spot.x].visits += 1;
        addLog(`${child.name}-${child.number} born (Mark ${child.mark}).`);
        addSignal(spot.x, spot.y, "rgba(124,159,124,0.8)");
      }
    } else {
      const outcome = combat(robot, targetCell.robot);
      if (outcome === "attacker") {
        addLog(`${robot.name}-${robot.number} wins combat.`);
        if (robot.fitness > peakFitness) peakFitness = robot.fitness;
        targetCell.robot = robot;
        state.world[pos.y][pos.x].robot = null;
        targetCell.visits += 1;
        addSignal(tx, ty, "rgba(255,120,120,0.85)");
      } else if (outcome === "defender") {
        addLog(`${targetCell.robot.name}-${targetCell.robot.number} defends.`);
        if (targetCell.robot.fitness > peakFitness) peakFitness = targetCell.robot.fitness;
        state.world[pos.y][pos.x].robot = null;
        addSignal(tx, ty, "rgba(255,160,80,0.7)");
      }
    }
  }

  state.stats = {
    population,
    avgFitness: population ? Math.floor(sumFitness / population) : 0,
    peakFitness,
  };

  state.history.population.push(population);
  state.history.avg.push(state.stats.avgFitness);
  state.history.peak.push(peakFitness);

  trimHistory();
  syncSelectedRobot();
  updateOutputs();
  renderChart();
}

function confrontMaster(robot, x, y) {
  const cell = state.world[y][x];
  const required = cell.coolData;
  if (robot.stats.interface >= required) {
    cell.coolData = robot.stats.interface;
    if (robot.gene[6] < 255) robot.gene[6] += 1;
    computeStats(robot);
    robot.age = 0;
    addLog(`${robot.name}-${robot.number} upgraded by Master.`);
    return true;
  }
  state.world[y][x].robot = null;
  addLog(`${robot.name}-${robot.number} rejected by Master.`);
  return false;
}

function combat(attacker, defender) {
  let afavor = 0;
  let dfavor = 0;

  const sneak = defender.stats.observantness + (attacker.stats.visibility + attacker.stats.audibility) - randInt(1000);
  if (sneak > 0) {
    dfavor += 20;
  } else {
    afavor += 100;
  }

  afavor += attacker.stats.fightskill - defender.stats.armorclass;
  dfavor += defender.stats.fightskill - attacker.stats.armorclass;

  if (afavor > dfavor && randInt(100) < 40) {
    if (attacker.stats.range <= defender.stats.range) {
      dfavor = afavor;
    }
  }

  if (afavor > dfavor) {
    attacker.fitness += afavor - dfavor;
    return "attacker";
  }

  if (dfavor > afavor) {
    defender.fitness += dfavor - afavor;
    return "defender";
  }

  return "draw";
}

function moveRobot(fromX, fromY, toX, toY) {
  const fromCell = state.world[fromY][fromX];
  const toCell = state.world[toY][toX];
  toCell.robot = fromCell.robot;
  fromCell.robot = null;
  toCell.visits += 1;
}

function findEmptyCell() {
  for (let i = 0; i < 40; i += 1) {
    const x = randInt(config.width);
    const y = randInt(config.height);
    if (!state.world[y][x].robot) return { x, y };
  }

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      if (!state.world[y][x].robot) return { x, y };
    }
  }

  return null;
}

function shuffleArray(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = randInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function trimHistory() {
  while (state.history.population.length > state.historyLimit) {
    state.history.population.shift();
    state.history.avg.shift();
    state.history.peak.shift();
  }
}

function addSignal(x, y, color) {
  if (!state.visual.signals) return;
  state.events.push({ x, y, ttl: 24, color });
}

function addLog(message) {
  state.log.unshift({ message, cycle: state.cycle });
  if (state.log.length > 9) state.log.pop();
  updateLog();
}

function updateLog() {
  logList.innerHTML = "";
  for (const entry of state.log) {
    const li = document.createElement("li");
    li.textContent = `[${entry.cycle}] ${entry.message}`;
    logList.appendChild(li);
  }
}

function updateOutputs() {
  cycleOut.textContent = state.cycle;
  populationOut.textContent = state.stats.population;
  avgFitnessOut.textContent = state.stats.avgFitness;
  peakFitnessOut.textContent = state.stats.peakFitness;
  popMeter.value = state.stats.population;
  fitnessMeter.value = state.stats.avgFitness;
}

function renderRobotDetails() {
  if (!state.selected) {
    robotDetails.innerHTML = '<p class="muted">Click a robot in the world to inspect its build.</p>';
    return;
  }

  const robot = state.selected.robot;
  const pos = state.selected.pos;
  const stats = robot.stats;

  const geneHtml = robot.gene
    .map((value, index) => `<div class="gene-chip">g${index}: <strong>${value}</strong></div>`)
    .join("");

  robotDetails.innerHTML = `
    <div class="robot-card">
      <div>
        <h3>${robot.name}-${robot.number}</h3>
        <p class="muted">Mark ${robot.mark} - Age ${robot.age} - Fitness ${robot.fitness}</p>
        <p class="muted">Location: ${pos.x},${pos.y}</p>
      </div>
      <div class="stat-grid">
        <div><span>Quickthink</span><strong>${stats.quickthinking}</strong></div>
        <div><span>Observant</span><strong>${stats.observantness}</strong></div>
        <div><span>Dexterity</span><strong>${stats.dexterity}</strong></div>
        <div><span>Armor</span><strong>${stats.armorclass}</strong></div>
        <div><span>Fight</span><strong>${stats.fightskill}</strong></div>
        <div><span>Mining</span><strong>${stats.miningskill}</strong></div>
        <div><span>Interface</span><strong>${stats.interface}</strong></div>
        <div><span>Range</span><strong>${stats.range}</strong></div>
      </div>
      <div class="gene-grid">${geneHtml}</div>
    </div>
  `;
}

function syncSelectedRobot() {
  if (!state.selected) return;
  const id = state.selected.robot.id;
  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const robot = state.world[y][x].robot;
      if (robot && robot.id === id) {
        state.selected = { robot, pos: { x, y } };
        renderRobotDetails();
        return;
      }
    }
  }
  state.selected = null;
  renderRobotDetails();
  if (botPopover.hidePopover) botPopover.hidePopover();
}

function resizeCanvas(target, context) {
  const rect = target.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  target.width = Math.round(rect.width * dpr);
  target.height = Math.round(rect.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderWorld() {
  const { width, height } = canvas.getBoundingClientRect();
  const cellSize = width / config.width;

  ctx.clearRect(0, 0, width, height);

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const cell = state.world[y][x];
      ctx.fillStyle = colors[cell.type];
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      if (cell.type === "master") {
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.beginPath();
        ctx.moveTo(x * cellSize + cellSize * 0.2, y * cellSize + cellSize * 0.2);
        ctx.lineTo(x * cellSize + cellSize * 0.8, y * cellSize + cellSize * 0.8);
        ctx.moveTo(x * cellSize + cellSize * 0.8, y * cellSize + cellSize * 0.2);
        ctx.lineTo(x * cellSize + cellSize * 0.2, y * cellSize + cellSize * 0.8);
        ctx.stroke();
      }
    }
  }

  if (state.visual.trails) {
    const maxVisits = Math.max(1, ...state.world.flat().map((cell) => cell.visits));
    for (let y = 0; y < config.height; y += 1) {
      for (let x = 0; x < config.width; x += 1) {
        const visits = state.world[y][x].visits;
        if (visits <= 1) continue;
        const intensity = clamp(visits / maxVisits, 0, 1);
        ctx.fillStyle = `rgba(61, 218, 215, ${0.1 + intensity * 0.35})`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  if (state.visual.grid) {
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= config.width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, height);
      ctx.stroke();
    }
    for (let y = 0; y <= config.height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(width, y * cellSize);
      ctx.stroke();
    }
  }

  const maxFitness = Math.max(1, state.stats.peakFitness);

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const robot = state.world[y][x].robot;
      if (!robot) continue;

      const fitnessNorm = clamp(robot.fitness / maxFitness, 0, 1);
      const hue = 190 - fitnessNorm * 150;
      const fill = `hsl(${hue}, 70%, 55%)`;

      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;
      const radius = cellSize * 0.32;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (state.selected && state.selected.robot.id === robot.id) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  for (const burst of state.events) {
    const cx = burst.x * cellSize + cellSize / 2;
    const cy = burst.y * cellSize + cellSize / 2;
    const scale = burst.ttl / 24;
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * (0.6 + (1 - scale)), 0, Math.PI * 2);
    ctx.save();
    ctx.globalAlpha = 0.2 + scale * 0.6;
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    burst.ttl -= 1;
  }
  state.events = state.events.filter((burst) => burst.ttl > 0);
}

function renderChart() {
  resizeCanvas(chartCanvas, chartCtx);
  const { width, height } = chartCanvas.getBoundingClientRect();

  chartCtx.clearRect(0, 0, width, height);

  const dataLength = state.history.population.length;
  if (!dataLength) return;

  const maxPop = Math.max(1, ...state.history.population);
  const maxFitness = Math.max(1, ...state.history.avg);
  const stepX = width / Math.max(1, dataLength - 1);

  chartCtx.lineWidth = 2;
  chartCtx.strokeStyle = "rgba(31,111,139,0.9)";
  chartCtx.beginPath();
  state.history.population.forEach((value, index) => {
    const x = index * stepX;
    const y = height - (value / maxPop) * (height - 12) - 6;
    if (index === 0) chartCtx.moveTo(x, y);
    else chartCtx.lineTo(x, y);
  });
  chartCtx.stroke();

  chartCtx.strokeStyle = "rgba(212,108,78,0.9)";
  chartCtx.beginPath();
  state.history.avg.forEach((value, index) => {
    const x = index * stepX;
    const y = height - (value / maxFitness) * (height - 12) - 6;
    if (index === 0) chartCtx.moveTo(x, y);
    else chartCtx.lineTo(x, y);
  });
  chartCtx.stroke();
}

function tick(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = Math.min(100, timestamp - lastTime);
  lastTime = timestamp;

  if (state.running) {
    accumulator += delta;
    const interval = 1000 / config.speed;
    while (accumulator >= interval) {
      stepSimulation();
      accumulator -= interval;
    }
  }

  resizeCanvas(canvas, ctx);
  renderWorld();

  requestAnimationFrame(tick);
}

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * config.width);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * config.height);
  if (x < 0 || y < 0 || x >= config.width || y >= config.height) return;

  const cell = state.world[y][x];
  if (cell.robot) {
    state.selected = { robot: cell.robot, pos: { x, y } };
    renderRobotDetails();
    showRobotPopover(cell.robot, event.clientX, event.clientY);
  } else {
    state.selected = null;
    renderRobotDetails();
    if (botPopover.hidePopover) botPopover.hidePopover();
  }
}

function showRobotPopover(robot, clientX, clientY) {
  if (!botPopover.showPopover) return;
  botPopoverTitle.textContent = `${robot.name}-${robot.number}`;
  botPopoverSub.textContent = `Mark ${robot.mark} | Fitness ${robot.fitness}`;
  botPopover.style.left = `${clientX + 12}px`;
  botPopover.style.top = `${clientY + 12}px`;
  botPopover.showPopover();
}

function syncInputs() {
  speedInput.value = String(config.speed);
  speedOut.textContent = String(config.speed);
  maxAgeInput.value = String(config.maxAge);
  maxAgeOut.textContent = String(config.maxAge);
  densityInput.value = String(config.density);
  densityOut.textContent = String(config.density);
}

function wireEvents() {
  toggleRunBtn.addEventListener("click", toggleSimulation);
  stepBtn.addEventListener("click", () => {
    stopSimulation();
    stepSimulation();
  });
  resetBtn.addEventListener("click", () => {
    stopSimulation();
    resetSimulation();
  });
  randomizeBtn.addEventListener("click", () => {
    stopSimulation();
    setSeed(String(Date.now()));
    resetSimulation();
  });
  applySeedBtn.addEventListener("click", () => {
    stopSimulation();
    setSeed(seedInput.value.trim());
    resetSimulation();
  });

  speedInput.addEventListener("input", (event) => {
    config.speed = Number(event.target.value);
    speedOut.textContent = event.target.value;
  });

  maxAgeInput.addEventListener("input", (event) => {
    config.maxAge = Number(event.target.value);
    maxAgeOut.textContent = event.target.value;
  });

  densityInput.addEventListener("input", (event) => {
    config.density = Number(event.target.value);
    densityOut.textContent = event.target.value;
  });

  showGridInput.addEventListener("change", (event) => {
    state.visual.grid = event.target.checked;
  });
  showTrailsInput.addEventListener("change", (event) => {
    state.visual.trails = event.target.checked;
  });
  showSignalsInput.addEventListener("change", (event) => {
    state.visual.signals = event.target.checked;
  });

  helpBtn.addEventListener("click", () => helpDialog.showModal());
  closeHelpBtn.addEventListener("click", () => helpDialog.close());

  centerViewBtn.addEventListener("click", () => {
    canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  window.addEventListener("resize", () => {
    resizeCanvas(canvas, ctx);
    resizeCanvas(chartCanvas, chartCtx);
    renderChart();
  });

  canvas.addEventListener("click", handleCanvasClick);

  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea")) return;
    if (event.key === " ") {
      event.preventDefault();
      toggleSimulation();
    }
    if (event.key.toLowerCase() === "r") {
      stopSimulation();
      resetSimulation();
    }
    if (event.key.toLowerCase() === "n") {
      stopSimulation();
      stepSimulation();
    }
    if (event.key.toLowerCase() === "h") {
      helpDialog.showModal();
    }
  });
}

function init() {
  setSeed(String(Date.now()));
  syncInputs();
  resetSimulation();
  wireEvents();
  requestAnimationFrame(tick);
}

init();
