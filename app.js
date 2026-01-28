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
  field: "#2f6b4f",
  hill: "#8a6b3d",
  building: "#4c4c4c",
  master: "#1f6f8b",
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

const geneLabels = [
  "Frame density",
  "Actuators",
  "Articulation",
  "Mobility tech",
  "Power core",
  "Processors",
  "Software",
  "Optics",
  "Acoustics",
  "Battery",
  "Head module",
  "Cargo bay",
  "Tools",
  "Thermal sensors",
  "Efficiency",
  "Quietness",
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
  const processing = Math.floor((g[5] + g[6]) / 2);
  const sensors = Math.floor((g[7] + g[8] + g[13]) / 3) + Math.floor(g[10] / 2);
  const efficiency = clamp(0.6 + g[6] / 600 + g[14] / 700, 0.6, 1.6);
  const mass = g[0] * 0.7 + g[11] * 0.4 + g[1] * 0.2;

  const mobility = clamp(g[3] + g[4] / 2 - g[0] / 3 - g[11] / 4, 0, 600);
  const dexterity = clamp(g[2] + g[12] / 2 + processing / 3 - g[0] / 6, 0, 600);
  const armor = clamp(g[0] + g[12] / 3 - mobility / 5, 0, 600);
  const combat = clamp(dexterity + processing / 2 + g[12] / 2 + g[0] / 3 - g[11] / 4, 0, 900);
  const mining = clamp(dexterity + g[11] / 2 + g[12] + sensors / 4 - g[4] / 5, 0, 900);
  const interfaceSkill = clamp(processing + sensors + g[6] / 2 - g[0] / 5, 0, 1200);
  const stealth = clamp(g[15] + g[14] / 2 - g[4] / 3 - g[1] / 4, 0, 600);
  const range = clamp(g[9] + g[4] / 2 - g[11] / 3, 0, 600);

  const maxEnergy = Math.floor(40 + g[9] * 0.6 + g[4] * 0.3);
  const regen = 1.5 + g[9] / 120 + g[14] / 180;
  const upkeep = 1.2 + mass / 140 + g[5] / 200 + g[4] / 220;
  const moveCost = 0.9 + mass / 180 + (255 - g[3]) / 260;
  const combatCost = 2.4 + g[12] / 160 + g[0] / 240;
  const mineCost = 2.0 + g[12] / 200 + g[11] / 220;
  const mateCost = 1.6 + processing / 200;

  robot.stats = {
    processing,
    sensors,
    efficiency,
    mass,
    mobility,
    dexterity,
    armor,
    combat,
    mining,
    interface: interfaceSkill,
    stealth,
    range,
    maxEnergy,
    regen,
    upkeep,
    moveCost,
    combatCost,
    mineCost,
    mateCost,
  };

  if (typeof robot.energy === "number") {
    robot.energy = clamp(robot.energy, 0, robot.stats.maxEnergy);
  }
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
    energy: 0,
  };
  computeStats(robot);
  robot.energy = robot.stats.maxEnergy;
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
    energy: 0,
  };
  computeStats(robot);
  robot.energy = robot.stats.maxEnergy;
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
        ore: type === "hill" ? 50 + randInt(150) : 0,
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
  world[masterY][masterX].ore = 0;
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

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const cell = state.world[y][x];
      if (!cell.robot) continue;

      const robot = cell.robot;
      robot.age += 1;

      robot.energy = clamp(robot.energy + robot.stats.regen, 0, robot.stats.maxEnergy);
      robot.energy -= robot.stats.upkeep / robot.stats.efficiency;

      if (robot.age > config.maxAge) {
        addLog(`${robot.name}-${robot.number} shut down (age).`);
        cell.robot = null;
        continue;
      }

      if (robot.energy <= 0) {
        addLog(`${robot.name}-${robot.number} shut down (power).`);
        cell.robot = null;
        continue;
      }

      robot.fitness += 1;
    }
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

    if (robot.energy < 2) {
      robot.energy = clamp(robot.energy + robot.stats.regen * 0.6, 0, robot.stats.maxEnergy);
      continue;
    }

    if (cell.type === "hill" && cell.ore > 0) {
      const chance = clamp(robot.stats.mining / 1100, 0, 0.75);
      if (state.rng() < chance) {
        const yieldAmt = Math.min(cell.ore, 8 + Math.floor(robot.stats.mining / 90));
        cell.ore -= yieldAmt;
        robot.fitness += 10 + yieldAmt;
        robot.energy = clamp(robot.energy + yieldAmt * 0.2, 0, robot.stats.maxEnergy);
        robot.energy -= robot.stats.mineCost / robot.stats.efficiency;
        addLog(`${robot.name}-${robot.number} mined ore (+${10 + yieldAmt}).`);
        addSignal(pos.x, pos.y, "rgba(212,108,78,0.85)");
      }
    }

    if (cell.type === "master") {
      robot.energy -= robot.stats.mateCost / robot.stats.efficiency;
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
      robot.energy -= robot.stats.moveCost / robot.stats.efficiency;
      if (robot.energy <= 0) {
        addLog(`${robot.name}-${robot.number} shut down (power).`);
        cell.robot = null;
        continue;
      }
      moveRobot(pos.x, pos.y, tx, ty, robot);
      continue;
    }

    const desire = randInt(2); // 0 mate, 1 attack
    if (desire === 0) {
      if (robot.energy < robot.stats.mateCost || targetCell.robot.energy < targetCell.robot.stats.mateCost) continue;
      const spot = findEmptyCell();
      if (spot) {
        robot.energy -= robot.stats.mateCost / robot.stats.efficiency;
        targetCell.robot.energy -= targetCell.robot.stats.mateCost / targetCell.robot.stats.efficiency;
        if (robot.energy <= 0) {
          addLog(`${robot.name}-${robot.number} shut down (power).`);
          cell.robot = null;
          continue;
        }
        if (targetCell.robot.energy <= 0) {
          addLog(`${targetCell.robot.name}-${targetCell.robot.number} shut down (power).`);
          targetCell.robot = null;
          continue;
        }
        const child = buildChildRobot(robot, targetCell.robot);
        state.world[spot.y][spot.x].robot = child;
        state.world[spot.y][spot.x].visits += 1;
        addLog(`${child.name}-${child.number} born (Mark ${child.mark}).`);
        addSignal(spot.x, spot.y, "rgba(124,159,124,0.8)");
      }
    } else {
      if (robot.energy < robot.stats.combatCost) continue;
      const outcome = combat(robot, targetCell.robot);
      robot.energy -= robot.stats.combatCost / robot.stats.efficiency;
      targetCell.robot.energy -= targetCell.robot.stats.combatCost * 0.6 / targetCell.robot.stats.efficiency;

      if (robot.energy <= 0) {
        addLog(`${robot.name}-${robot.number} shut down (power).`);
        cell.robot = null;
        continue;
      }
      if (targetCell.robot.energy <= 0) {
        addLog(`${targetCell.robot.name}-${targetCell.robot.number} shut down (power).`);
        targetCell.robot = null;
        continue;
      }

      if (outcome === "attacker") {
        addLog(`${robot.name}-${robot.number} wins combat.`);
        targetCell.robot = robot;
        state.world[pos.y][pos.x].robot = null;
        targetCell.visits += 1;
        addSignal(tx, ty, "rgba(255,120,120,0.85)");
      } else if (outcome === "defender") {
        addLog(`${targetCell.robot.name}-${targetCell.robot.number} defends.`);
        state.world[pos.y][pos.x].robot = null;
        addSignal(tx, ty, "rgba(255,160,80,0.7)");
      }
    }
  }

  let population = 0;
  let sumFitness = 0;
  let peakFitness = 0;

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const robot = state.world[y][x].robot;
      if (!robot) continue;
      population += 1;
      sumFitness += robot.fitness;
      if (robot.fitness > peakFitness) peakFitness = robot.fitness;
    }
  }

  if (population <= 1) {
    stopSimulation();
    addLog("Population collapsed.");
    ariaStatus.textContent = "Population collapsed.";
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
    robot.energy = clamp(robot.energy + 8, 0, robot.stats.maxEnergy);
    robot.age = 0;
    robot.fitness += 12;
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

  const sneak = defender.stats.sensors + attacker.stats.stealth - randInt(1000);
  if (sneak > 0) {
    dfavor += 20;
  } else {
    afavor += 100;
  }

  afavor += attacker.stats.combat - defender.stats.armor;
  dfavor += defender.stats.combat - attacker.stats.armor;

  if (afavor > dfavor && randInt(100) < 40) {
    const attackerEscape = attacker.stats.mobility + attacker.stats.range;
    const defenderEscape = defender.stats.mobility + defender.stats.range;
    if (attackerEscape <= defenderEscape) {
      dfavor = afavor;
    }
  }

  if (afavor > dfavor) {
    attacker.fitness += Math.max(1, Math.floor((afavor - dfavor) * 0.6));
    return "attacker";
  }

  if (dfavor > afavor) {
    defender.fitness += Math.max(1, Math.floor((dfavor - afavor) * 0.6));
    return "defender";
  }

  return "draw";
}

function moveRobot(fromX, fromY, toX, toY, robot) {
  const fromCell = state.world[fromY][fromX];
  const toCell = state.world[toY][toX];
  const newcomer = robot || fromCell.robot;
  if (!newcomer) return;

  if (toCell.visits === 0) {
    newcomer.fitness += 3 + Math.floor(newcomer.stats.sensors / 120);
    addSignal(toX, toY, "rgba(61,218,215,0.6)");
  } else if (toCell.visits < 3) {
    newcomer.fitness += 1;
  }

  toCell.robot = newcomer;
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
  fitnessMeter.max = Math.max(200, state.stats.peakFitness);
  fitnessMeter.value = state.stats.avgFitness;
}

function formatStat(value) {
  return Math.max(0, Math.round(value));
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
    .map(
      (value, index) =>
        `<div class="gene-chip">${geneLabels[index]}<strong>${value}</strong></div>`
    )
    .join("");

  robotDetails.innerHTML = `
    <div class="robot-card">
      <div class="robot-portrait">
        <canvas id="robotSketch" class="robot-canvas" width="180" height="140" aria-label="Robot portrait"></canvas>
        <div>
          <h3>${robot.name}-${robot.number}</h3>
          <p class="muted">Mark ${robot.mark} - Age ${robot.age} - Fitness ${robot.fitness}</p>
          <p class="muted">Energy ${formatStat(robot.energy)} / ${formatStat(stats.maxEnergy)}</p>
          <p class="muted">Role: ${getArchetype(robot)}</p>
          <p class="muted">Location: ${pos.x},${pos.y}</p>
        </div>
      </div>
      <div class="stat-grid">
        <div><span>Mobility</span><strong>${formatStat(stats.mobility)}</strong></div>
        <div><span>Stealth</span><strong>${formatStat(stats.stealth)}</strong></div>
        <div><span>Sensors</span><strong>${formatStat(stats.sensors)}</strong></div>
        <div><span>Combat</span><strong>${formatStat(stats.combat)}</strong></div>
        <div><span>Armor</span><strong>${formatStat(stats.armor)}</strong></div>
        <div><span>Mining</span><strong>${formatStat(stats.mining)}</strong></div>
        <div><span>Interface</span><strong>${formatStat(stats.interface)}</strong></div>
        <div><span>Efficiency</span><strong>${stats.efficiency.toFixed(2)}</strong></div>
      </div>
      <div class="gene-grid">${geneHtml}</div>
    </div>
  `;

  const sketch = document.getElementById("robotSketch");
  if (sketch) drawRobotPortrait(sketch, robot);
}

function getArchetype(robot) {
  const s = robot.stats;
  const scout = s.mobility * 0.6 + s.sensors * 0.6 + s.stealth * 0.4;
  const miner = s.mining * 1.1 + robot.gene[11] * 0.4;
  const warrior = s.combat * 1.1 + s.armor * 0.6;
  const hacker = s.interface * 1.1 + s.processing * 0.6;

  const scores = [
    { label: "Scout", value: scout },
    { label: "Prospector", value: miner },
    { label: "Gladiator", value: warrior },
    { label: "Cipher", value: hacker },
  ];

  scores.sort((a, b) => b.value - a.value);
  return scores[0].label;
}

function drawRobotPortrait(target, robot) {
  const context = target.getContext("2d");
  const width = target.width;
  const height = target.height;
  context.clearRect(0, 0, width, height);

  const s = robot.stats;
  const hue = Math.floor((robot.gene[0] + robot.gene[6] + robot.gene[14]) / 3);
  const bodyColor = `hsl(${hue}, 38%, 55%)`;
  const accent = `hsl(${(hue + 140) % 360}, 55%, 50%)`;
  const panel = "#f1f5f2";

  context.fillStyle = panel;
  context.fillRect(0, 0, width, height);

  const bodyW = clamp(70 + s.armor * 0.08, 70, 120);
  const bodyH = clamp(48 + s.mass * 0.05, 48, 90);
  const bodyX = (width - bodyW) / 2;
  const bodyY = height * 0.45 - bodyH / 2;

  context.fillStyle = bodyColor;
  context.strokeStyle = "rgba(15,26,24,0.35)";
  context.lineWidth = 2;
  roundRect(context, bodyX, bodyY, bodyW, bodyH, 12);
  context.fill();
  context.stroke();

  const wheelCount = s.mobility > 260 ? 4 : 2;
  const wheelY = bodyY + bodyH + 8;
  const wheelSpacing = bodyW / (wheelCount + 1);
  for (let i = 1; i <= wheelCount; i += 1) {
    const wx = bodyX + wheelSpacing * i;
    context.beginPath();
    context.fillStyle = "#1b1f1e";
    context.arc(wx, wheelY, 8, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.2)";
    context.stroke();
  }

  const armCount = 1 + Math.floor(robot.gene[1] / 100);
  for (let i = 0; i < armCount; i += 1) {
    const offset = i - (armCount - 1) / 2;
    const armY = bodyY + bodyH * (0.25 + i * 0.25);
    context.strokeStyle = accent;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(bodyX - 6, armY);
    context.lineTo(bodyX - 24 - offset * 6, armY - 6);
    context.stroke();
    context.beginPath();
    context.moveTo(bodyX + bodyW + 6, armY);
    context.lineTo(bodyX + bodyW + 24 + offset * 6, armY - 6);
    context.stroke();
  }

  const eyeCount = s.sensors > 300 ? 3 : 2;
  const eyeY = bodyY + bodyH * 0.35;
  const eyeSpacing = bodyW / (eyeCount + 1);
  for (let i = 1; i <= eyeCount; i += 1) {
    const ex = bodyX + eyeSpacing * i;
    context.beginPath();
    context.fillStyle = "#0f1a18";
    context.arc(ex, eyeY, 6, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.fillStyle = accent;
    context.arc(ex, eyeY, 3, 0, Math.PI * 2);
    context.fill();
  }

  const antennaHeight = clamp(16 + s.interface * 0.06, 16, 48);
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(bodyX + bodyW / 2, bodyY);
  context.lineTo(bodyX + bodyW / 2, bodyY - antennaHeight);
  context.stroke();
  context.beginPath();
  context.fillStyle = accent;
  context.arc(bodyX + bodyW / 2, bodyY - antennaHeight, 4, 0, Math.PI * 2);
  context.fill();

  if (s.stealth > 260) {
    context.strokeStyle = "rgba(31,111,139,0.5)";
    context.beginPath();
    context.arc(bodyX + bodyW / 2, bodyY + bodyH / 2, bodyW * 0.6, 0, Math.PI * 2);
    context.stroke();
  }

  if (s.mining > 320) {
    context.strokeStyle = "rgba(212,108,78,0.8)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(bodyX + bodyW * 0.8, bodyY + bodyH * 0.7);
    context.lineTo(bodyX + bodyW + 22, bodyY + bodyH * 0.9);
    context.stroke();
  }

  context.fillStyle = "rgba(15,26,24,0.7)";
  context.font = "12px 'IBM Plex Mono', monospace";
  context.fillText(getArchetype(robot), 10, height - 12);
}

function roundRect(context, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
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
  botPopoverSub.textContent = `Mark ${robot.mark} | Fit ${robot.fitness} | E ${formatStat(robot.energy)}`;
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
