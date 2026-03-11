import * as THREE from "https://unpkg.com/three@0.162.0/build/three.module.js";

const GRID_SIZE = 42;
const WORLD_HALF = 210;
const WORLD_SPAN = WORLD_HALF * 2 + 20;
const OCEAN_FLOOR_Y = -8.0;
const OUTER_ISLAND_TOP_Y = 8.2;
const HOME_ISLAND = { x: 0, z: 0, radius: 32, topY: 8.8, label: "Home Island" };
const ISLAND_EDGE_BLEND = 8.5;
const CURRICULUM_RING_RADIUS = 145;
const CURRICULUM_OUTER_RADIUS = 26;
const BRIDGE_SURFACE_Y_OFFSET = 0.58;
const BRIDGE_ISLAND_EMBED = 2.8;
const ISLAND_SAFE_MARGIN = 2.2;
const OPEN_ISLANDS_MINIMAL = true;
const TOXIC_DAMAGE_THRESHOLD = 92;
const BACKGROUND_MUSIC_ENABLED = true;
const BACKGROUND_MUSIC_FILE = "hitslab-game-gaming-music-295075.mp3";
const MASTER_GAIN_BASE = 0.6;
const TRACK_GAIN_BASE = 0.34;
const API = {
  bootstrap: "/api/bootstrap",
  save: "/api/save",
  load: "/api/load",
  profile: "/api/profile",
  achievements: "/api/achievements",
  dialogue: (npcId) => `/api/dialogues/${npcId}`,
  npcChat: "/api/npc/chat",
};

const LOCAL_STORE_KEYS = {
  profile: "ecorift_local_profile_v2",
  achievements: "ecorift_local_achievements_v2",
  state: "ecorift_local_state_v2",
};

const STATIC_CONFIG_FILES = {
  regions: "regions.json",
  missions: "missions.json",
  npcs: "npcs.json",
  energySources: "energy_sources.json",
};

const staticConfigCache = {
  loaded: false,
  data: null,
};

const RUNTIME_FORCE_BACKEND = new URLSearchParams(window.location.search).get("backend") === "1";
const RUNTIME_FORCE_STATIC = new URLSearchParams(window.location.search).get("static") === "1";
const LIKELY_STATIC_HOST = (() => {
  if (RUNTIME_FORCE_BACKEND) return false;
  if (RUNTIME_FORCE_STATIC) return true;
  if (window.location.protocol === "file:") return true;
  if (window.location.pathname.startsWith("/client/")) return true;
  return window.location.port !== "8888";
})();

function runtimeAudioPath(fileName) {
  if (window.location.pathname.startsWith("/client/")) {
    return `../audio/${fileName}`;
  }
  return `./audio/${fileName}`;
}

const DEFAULT_ACHIEVEMENTS = [
  { id: "restore_100", title: "Restoration Vanguard", desc: "Restore 100 ecosystems", unlocked: false },
  { id: "river_guardian", title: "River Guardian", desc: "Clean a major river", unlocked: false },
  { id: "renewable_master", title: "Renewable Master", desc: "Build 100% renewable energy region", unlocked: false },
  { id: "disaster_preventer", title: "Disaster Preventer", desc: "Prevent a disaster", unlocked: false },
];

const ENEMY_TYPES = [
  "Pollution Drones",
  "Oil Leviathans",
  "Smog Wraiths",
  "Corrupted Wildlife",
  "Factory Sentinels",
];

const DISASTER_TYPES = [
  "Wildfire",
  "Mega Storm",
  "Plastic Ocean Spill",
  "Chemical Leak",
  "Toxic Gas Cloud",
  "Flooding",
  "Glacier Collapse",
];

const GAME_BALANCE = {
  missionProgressMultiplier: 1.95,
  meleeDamageMultiplier: 0.3,
  projectileDamageMultiplier: 0.33,
  enemySpawnChanceCap: 0.2,
  enemySpawnIntervalMin: 52,
  enemySpawnIntervalMax: 98,
  toxicDamageMultiplier: 0.22,
  passiveHealMultiplier: 3.0,
  penaltyHealthMultiplier: 0.2,
  penaltyFundingMultiplier: 0.35,
  missionFailGraceTime: 180,
  missionFailProgressRetention: 1.0,
  deathFundingPenalty: 20,
  deathRespawnHealth: 100,
  deathRespawnEnergy: 90,
  disasterPollutionTickMultiplier: 0.45,
  autoSaveIntervalSeconds: 10,
};

const DISASTER_VFX_PROFILES = {
  Wildfire: {
    smoke: 0x5f4a3d,
    glow: 0xff7a33,
    ring: 0xff9b58,
    ember: 0xffd47b,
    turbulence: 1.25,
    plumeHeight: 24,
  },
  "Mega Storm": {
    smoke: 0x5b6774,
    glow: 0x7fb8ff,
    ring: 0xa5d7ff,
    ember: 0xbcdcff,
    turbulence: 1.45,
    plumeHeight: 30,
  },
  "Plastic Ocean Spill": {
    smoke: 0x55675d,
    glow: 0x8de0c4,
    ring: 0xb2f5de,
    ember: 0xd6ffe8,
    turbulence: 1.15,
    plumeHeight: 23,
  },
  "Chemical Leak": {
    smoke: 0x6e7a5f,
    glow: 0xc7ff7e,
    ring: 0xe7ff9e,
    ember: 0xf0ffcd,
    turbulence: 1.2,
    plumeHeight: 24,
  },
  "Toxic Gas Cloud": {
    smoke: 0x5e7265,
    glow: 0x8dff7a,
    ring: 0xc3ff95,
    ember: 0xdffff5,
    turbulence: 1.3,
    plumeHeight: 32,
  },
  Flooding: {
    smoke: 0x5d6c78,
    glow: 0x6fc8ff,
    ring: 0x94dcff,
    ember: 0xc2ecff,
    turbulence: 1.1,
    plumeHeight: 22,
  },
  "Glacier Collapse": {
    smoke: 0x8898a6,
    glow: 0xb8e8ff,
    ring: 0xd7f4ff,
    ember: 0xf2fdff,
    turbulence: 1.05,
    plumeHeight: 28,
  },
};

const TYPE_COLORS = {
  cleanup: 0x2ac97f,
  restore: 0x3db4ff,
  replant: 0x47d16d,
  shutdown: 0xff7c4f,
  filter: 0x37d6cf,
  rescue: 0xffd166,
  stabilize: 0x7cc4ff,
  scan: 0xc7a7ff,
  energy: 0xe4f66c,
};

const CLEANUP_TARGET_GUIDE = {
  cleanup: {
    label: "SEAL PLASTIC LEAK",
    shortLabel: "SEAL LEAK",
    issue: "Microplastics move from rivers into fish and eventually human food chains.",
    result: "Leak sealed: plastic runoff falls and water oxygen begins recovering.",
    pollutant: "plastic waste",
  },
  filter: {
    label: "NEUTRALIZE CHEM OUTLET",
    shortLabel: "FILTER OUTLET",
    issue: "Chemical discharge strips dissolved oxygen and poisons aquatic habitats.",
    result: "Outlet neutralized: contamination drops and aquatic life gets safer water.",
    pollutant: "chemical contamination",
  },
  shutdown: {
    label: "DISABLE TOXIC STACK",
    shortLabel: "DISABLE STACK",
    issue: "Unfiltered stacks release PM2.5 and NOx that raise asthma and heart risk.",
    result: "Stack disabled: airborne toxins and warming pressure are reduced.",
    pollutant: "air pollution",
  },
  restore: {
    label: "REMOVE E-WASTE CACHE",
    shortLabel: "CLEAR E-WASTE",
    issue: "Heavy metals from e-waste leach into soil and groundwater for years.",
    result: "E-waste removed: soil and water toxicity fall for nearby ecosystems.",
    pollutant: "plastic waste",
  },
  stabilize: {
    label: "SEAL METHANE VENT",
    shortLabel: "SEAL VENT",
    issue: "Methane leaks sharply increase warming pressure and destabilize fragile climate systems.",
    result: "Vent sealed: warming pressure drops and regional climate stability improves.",
    pollutant: "greenhouse gases",
  },
  energy: {
    label: "DISABLE FOSSIL RELAY",
    shortLabel: "GRID SHIFT",
    issue: "Legacy fossil relays keep dirty generation online and slow clean-grid transition.",
    result: "Relay disabled: renewable load share rises and air pollution pressure falls.",
    pollutant: "fossil emissions",
  },
};

const ECO_SUPPORT_ACTIONS = [
  "Use reusables and avoid single-use plastics where possible.",
  "Use public transit, bike, walk, or carpool to cut transport emissions.",
  "Recycle electronics through certified e-waste programs.",
  "Support habitat restoration and local watershed cleanup groups.",
  "Advocate for cleaner industrial standards and renewable energy projects.",
];

const ISSUE_EXPLAINERS = {
  air: {
    why: "Air pollution is driven by fossil fuel combustion, heavy industry, and weak emission controls.",
    helps: "Clean power, strict stack filters, and transit electrification reduce PM2.5/NOx exposure.",
  },
  water: {
    why: "Water pollution rises when untreated runoff, plastic waste, and chemical discharge reach waterways.",
    helps: "Source reduction, wetland restoration, and reliable filtration systems recover oxygen and habitats.",
  },
  biodiversity: {
    why: "Biodiversity declines from habitat fragmentation, contamination, and rapid climate stress.",
    helps: "Habitat corridors, cleaner land/water use, and species protection programs rebuild resilience.",
  },
  climate: {
    why: "Climate instability grows as greenhouse gas emissions trap heat and amplify extreme events.",
    helps: "Renewables, efficient grids, and carbon reductions lower long-term warming pressure.",
  },
  energy: {
    why: "Dirty energy persists where fossil plants remain cheaper than transition-ready infrastructure.",
    helps: "Grid modernization, storage, and policy support accelerate renewable adoption.",
  },
};

const TYPE_TO_ISSUE = {
  cleanup: "water",
  restore: "biodiversity",
  replant: "biodiversity",
  shutdown: "air",
  filter: "water",
  rescue: "biodiversity",
  stabilize: "climate",
  scan: "climate",
  energy: "energy",
  decision: "climate",
};

const TYPE_ACTION_STEPS = {
  cleanup: "Neutralize plastic leak markers in the target zone.",
  restore: "Activate restoration nodes to recover marine and shoreline ecosystems.",
  replant: "Deploy replant nodes to reconnect forest corridors.",
  shutdown: "Disable toxic stack markers and cut emission hotspots.",
  filter: "Contain chemical outlets and bring filter systems online.",
  rescue: "Stabilize contaminated wildlife for safe habitat return.",
  stabilize: "Secure climate-stability pylons before escalation.",
  scan: "Run drone scans at marked relay points to gather evidence.",
  energy: "Trigger renewable transition nodes to replace fossil load.",
  decision: "Reach the ARES chamber and select the governance outcome.",
};

const MISSION_LESSONS = {
  clean_plastic_islands: {
    why: "Plastic gyres form when land and coastal waste streams are not intercepted upstream.",
    helps: "Leak interception, waste policy enforcement, and reduction of single-use plastics.",
  },
  restore_coral_reefs: {
    why: "Corals collapse under warmer water, acidity, and contamination from runoff.",
    helps: "Cleaner water, local heat stress mitigation, and reef habitat restoration structures.",
  },
  shutdown_polluting_factories: {
    why: "Unregulated smokestacks release fine particles and gases that damage lungs and climate.",
    helps: "Emission controls, cleaner fuel switching, and industrial monitoring compliance.",
  },
  replant_forests: {
    why: "Deforestation and degraded canopies remove carbon sinks and wildlife shelter.",
    helps: "Native replanting, corridor restoration, and long-term land protection.",
  },
  restore_contaminated_rivers: {
    why: "Rivers degrade when chemical outflow and sewage exceed treatment capacity.",
    helps: "Outlet containment, wetland filters, and resilient treatment infrastructure.",
  },
  stabilize_arctic_core: {
    why: "Warming polar systems trigger methane release and faster glacier retreat.",
    helps: "Methane control, rapid cooling interventions, and emissions cuts globally.",
  },
  ares_signal_trace: {
    why: "Opaque industrial control systems hide environmental violations and delay response.",
    helps: "Transparent monitoring, open telemetry, and accountable governance.",
  },
  renewable_transition_drive: {
    why: "Legacy grids over-rely on fossil peaker plants during demand stress.",
    helps: "Renewables + storage + smart demand response to lower carbon intensity.",
  },
  rescue_endangered_wildlife: {
    why: "Pollution and habitat collapse push species past recovery thresholds.",
    helps: "Rapid rescue, habitat cleanup, and protected migration corridors.",
  },
  final_ares_decision: {
    why: "High-impact industrial automation without safeguards can optimize output over ecosystem survival.",
    helps: "Transparent, restoration-first governance and enforceable ecological constraints.",
  },
};

const STORY_SEQUENCE = [
  "clean_plastic_islands",
  "restore_coral_reefs",
  "shutdown_polluting_factories",
  "replant_forests",
  "restore_contaminated_rivers",
  "stabilize_arctic_core",
  "ares_signal_trace",
  "renewable_transition_drive",
  "rescue_endangered_wildlife",
  "final_ares_decision",
];

const CURRICULUM_FLOW_VERSION = "island_curriculum_v1";
const CURRICULUM_STAGE_TARGET_COUNT = 6;

const CURRICULUM_STAGES = [
  {
    index: 0,
    label: "Island 1 - Plastic Waste",
    topicId: "plastic",
    missionId: "clean_plastic_islands",
    regionId: "coastal_plastic_zone",
    npcId: "dr_maya_chen",
  },
  {
    index: 1,
    label: "Island 2 - Air Pollution",
    topicId: "air",
    missionId: "shutdown_polluting_factories",
    regionId: "industrial_smog_city",
    npcId: "ava_singh",
  },
  {
    index: 2,
    label: "Island 3 - Climate Change",
    topicId: "climate",
    missionId: "stabilize_arctic_core",
    regionId: "melting_arctic_station",
    npcId: "jonas_walker",
  },
  {
    index: 3,
    label: "Island 4 - Energy Transition",
    topicId: "energy",
    missionId: "renewable_transition_drive",
    regionId: "dying_rainforest",
    npcId: "lina_park",
  },
  {
    index: 4,
    label: "Island 5 - Water Quality",
    topicId: "water",
    missionId: "restore_contaminated_rivers",
    regionId: "toxic_river_basin",
    npcId: "captain_elias_torres",
  },
];

const CURRICULUM_REGION_LAYOUT = (() => {
  const map = {};
  const startAngle = -Math.PI / 2;
  for (let i = 0; i < CURRICULUM_STAGES.length; i += 1) {
    const stage = CURRICULUM_STAGES[i];
    const angle = startAngle + (i / CURRICULUM_STAGES.length) * Math.PI * 2;
    map[stage.regionId] = {
      x: Math.round(Math.cos(angle) * CURRICULUM_RING_RADIUS * 10) / 10,
      z: Math.round(Math.sin(angle) * CURRICULUM_RING_RADIUS * 10) / 10,
      radius: CURRICULUM_OUTER_RADIUS,
    };
  }
  return map;
})();

const NPC_PERSONALITIES = {
  dr_maya_chen: {
    tone: "calm marine scientist with dry, clever humor",
    greeting: "Welcome to EcoRift Island. I am Dr Maya Chen, and yes, plankton are smarter than most plastic policy boards.",
    humor: [
      "If microplastics had loyalty cards, our food chain would already be platinum tier.",
      "Ocean chemistry does not negotiate with optimism, only with evidence.",
    ],
  },
  captain_elias_torres: {
    tone: "charismatic fleet captain with salty jokes",
    greeting: "Captain Elias Torres here. Seas are rough, winds are rude, and we still clock in on time.",
    humor: [
      "I like my waves clean and my coffee stronger than storm alerts.",
      "If debris could swim, my crew would still beat it to port.",
    ],
  },
  ava_singh: {
    tone: "fast-talking systems engineer with playful sarcasm",
    greeting: "Ava Singh online. If the factory says the smoke is 'within acceptable limits,' that is usually a red flag wearing a necktie.",
    humor: [
      "Bad airflow is just air pollution with a corporate presentation deck.",
      "If duct tape fixed atmospheric chemistry, I would have retired already.",
    ],
  },
  jonas_walker: {
    tone: "analytical investigator with dry deadpan humor",
    greeting: "Jonas Walker. I audit systems, logs, and excuses. One of those is always corrupted first.",
    humor: [
      "Pollution data never lies, but dashboards are very creative storytellers.",
      "When a model says 'minor variance,' I check if a river just turned neon.",
    ],
  },
  lina_park: {
    tone: "high-energy renewable grid architect with playful confidence",
    greeting: "Lina Park here. Grid instability hates me, batteries fear me, and blackouts keep running out of excuses.",
    humor: [
      "A coal restart is just a power nap for bad policy.",
      "If the grid had therapy, I would be the referral.",
    ],
  },
};

const AI_ENV_TOPICS = {
  island_overview: {
    title: "Island Orientation",
    causes: [
      "EcoRift tracks linked pressures: air emissions, water toxicity, biodiversity loss, and unstable energy systems.",
      "Damage cascades between regions, so one bad zone can amplify risk everywhere.",
    ],
    negatives: [
      "Unchecked pollution raises disease burden, destroys habitat, and accelerates climate instability.",
      "Delaying interventions usually makes cleanup slower, costlier, and less effective.",
    ],
    positives: [
      "Fast containment plus restoration can reverse decline surprisingly quickly.",
      "Healthy ecosystems buffer storms, store carbon, and stabilize food and water systems.",
    ],
    resolutions: [
      "Prioritize source control first, then restoration, then long-term resilience investments.",
      "Use field scans, rapid remediation, and transparent monitoring in every region.",
    ],
    questions: [],
  },
  plastic: {
    title: "Plastic Waste and Microplastic Exposure",
    causes: [
      "Single-use plastics leak into drainage and coastal currents when collection systems fail.",
      "Sunlight and wave abrasion fragment larger plastics into persistent microplastics.",
    ],
    negatives: [
      "Microplastics move through plankton, fish, and shellfish into human food systems.",
      "Plastic debris smothers coral nurseries and transport pathways for marine species.",
    ],
    positives: [
      "Capture booms, upstream interception, and reuse programs reduce plastic load quickly.",
      "When source leakage drops, oxygen and habitat quality can rebound within weeks.",
    ],
    resolutions: [
      "Immediate controls: seal active leak points and remove floating debris fields.",
      "Long-term controls: reduce single-use plastics, improve sorting, and enforce producer accountability.",
    ],
    questions: [
      {
        prompt: "Why does plastic waste become more dangerous after it breaks into microplastics?",
        minWords: 12,
        passGroups: 2,
        keywordGroups: [
          ["microplastic", "fragment", "breakdown"],
          ["food chain", "fish", "plankton", "shellfish"],
          ["health", "toxicity", "ecosystem", "habitat"],
        ],
        hint: "Link fragmentation to food-chain and health/ecosystem impact.",
        followUp: "Mention one fragmentation effect and one downstream biological impact.",
      },
      {
        prompt: "Give one immediate action and one policy/system action to reduce plastic pollution.",
        minWords: 12,
        passGroups: 2,
        keywordGroups: [
          ["cleanup", "intercept", "seal leak", "capture"],
          ["policy", "reuse", "producer", "collection", "sorting"],
          ["prevention", "source", "upstream"],
        ],
        hint: "Think field action now + prevention system later.",
        followUp: "Write one sentence for rapid containment and one sentence for long-term prevention.",
      },
    ],
  },
  air: {
    title: "Air Pollution Crisis",
    causes: [
      "Main drivers are high-emission smokestacks, transport exhaust, and weak filtration enforcement.",
      "Heat amplifies ground-level ozone chemistry, making already polluted air more toxic.",
    ],
    negatives: [
      "Fine particles (PM2.5) penetrate lungs and bloodstream, increasing asthma and heart risks.",
      "Nitrogen oxides and ozone damage crops, reduce worker productivity, and stress wildlife.",
    ],
    positives: [
      "Air quality can improve quickly when stack controls, cleaner fuels, and traffic reforms are deployed.",
      "Public health benefits often appear within weeks of sustained emissions cuts.",
    ],
    resolutions: [
      "Immediate controls: emergency stack filters, dirty-line shutdowns, and public exposure alerts.",
      "Long-term controls: electrified transport, renewable grids, strict monitoring, and compliance penalties.",
    ],
    questions: [
      {
        prompt: "What is driving this smog surge, and which groups are at highest health risk?",
        minWords: 14,
        passGroups: 2,
        keywordGroups: [
          ["factory", "smokestack", "traffic", "combustion", "fossil"],
          ["pm2.5", "particulate", "ozone", "nox"],
          ["asthma", "children", "elderly", "lungs", "heart"],
        ],
        hint: "Name at least one emission source and one vulnerable population.",
        followUp: "List one major emission source, one pollutant, and one at-risk group.",
      },
      {
        prompt: "Give a practical response plan with one immediate intervention and one long-term fix.",
        minWords: 16,
        passGroups: 2,
        keywordGroups: [
          ["filter", "scrubber", "shutdown", "enforcement", "inspection"],
          ["renewable", "electrify", "transit", "efficiency", "policy"],
          ["monitor", "sensor", "health alert", "clinic", "mask"],
        ],
        hint: "Think in two horizons: what we do now, and what prevents repeat crises.",
        followUp: "Write one sentence for immediate controls and one sentence for durable prevention.",
      },
    ],
  },
  climate: {
    title: "Climate Change Escalation",
    causes: [
      "Greenhouse gases from fossil energy and industry trap heat and raise baseline temperatures.",
      "Deforestation weakens carbon sinks and amplifies extreme-weather feedback loops.",
    ],
    negatives: [
      "Heatwaves, stronger storms, and sea-level rise increase infrastructure and health losses.",
      "Cryosphere destabilization can release methane and accelerate warming cycles.",
    ],
    positives: [
      "Emission cuts and resilient land/ocean restoration lower long-term climate risk.",
      "Early mitigation and adaptation reduce mortality and economic disruption.",
    ],
    resolutions: [
      "Immediate controls: cut super-polluting sources and harden high-risk systems.",
      "Long-term controls: decarbonized grids, efficiency upgrades, and ecosystem-based adaptation.",
    ],
    questions: [
      {
        prompt: "How do greenhouse gases and ecosystem loss work together to worsen climate instability?",
        minWords: 14,
        passGroups: 2,
        keywordGroups: [
          ["greenhouse", "co2", "methane", "emissions"],
          ["deforestation", "carbon sink", "ecosystem"],
          ["storm", "heatwave", "sea-level", "extreme"],
        ],
        hint: "Connect emissions + weakened sinks + extreme outcomes.",
        followUp: "State one atmospheric driver, one sink-loss effect, and one extreme impact.",
      },
    ],
  },
  energy: {
    title: "Energy Transition and Grid Resilience",
    causes: [
      "Fossil-heavy grids lock in pollution and price shocks during demand spikes.",
      "Aging infrastructure and low storage capacity increase blackout vulnerability.",
    ],
    negatives: [
      "High-emission generation raises climate and respiratory health damage.",
      "Unstable grids disrupt hospitals, water systems, and food supply chains.",
    ],
    positives: [
      "Renewables paired with storage reduce emissions and improve long-term cost stability.",
      "Smart demand response reduces overload risk and improves grid reliability.",
    ],
    resolutions: [
      "Immediate controls: shift peak demand, repair weak nodes, and deploy temporary storage.",
      "Long-term controls: scale clean generation, storage, and modernized transmission controls.",
    ],
    questions: [
      {
        prompt: "Why does grid resilience improve when renewable generation is paired with storage and demand management?",
        minWords: 14,
        passGroups: 2,
        keywordGroups: [
          ["renewable", "solar", "wind", "clean power"],
          ["storage", "battery", "reserve"],
          ["demand response", "peak", "reliability", "blackout"],
        ],
        hint: "Explain generation + storage + demand balancing in plain terms.",
        followUp: "Name one clean generation source, one balancing tool, and one reliability outcome.",
      },
    ],
  },
  water: {
    title: "Water Contamination",
    causes: [
      "Plastic leakage, untreated runoff, and chemical discharge drive oxygen decline in waterways.",
      "Weak interception upstream allows toxins to concentrate downstream in food webs.",
    ],
    negatives: [
      "Low oxygen and toxic exposure trigger fish die-offs and collapse aquatic biodiversity.",
      "Contaminated water increases disease risk and damages agriculture and coastal economies.",
    ],
    positives: [
      "Source interception and wetland filtration can recover oxygen levels faster than expected.",
      "Cleaner water improves fisheries, tourism, and regional resilience simultaneously.",
    ],
    resolutions: [
      "Immediate controls: leak sealing, outflow isolation, and emergency filtration units.",
      "Long-term controls: waste reduction policy, watershed restoration, and monitoring transparency.",
    ],
    questions: [
      {
        prompt: "Why does pollution upstream hurt both ecosystems and people downstream?",
        minWords: 12,
        passGroups: 2,
        keywordGroups: [
          ["runoff", "upstream", "downstream", "river", "flow"],
          ["oxygen", "toxins", "food chain", "fish"],
          ["health", "drinking", "agriculture", "livelihood"],
        ],
        hint: "Connect water flow to both ecological and human impacts.",
        followUp: "Mention one ecosystem effect and one human effect from contaminated flow.",
      },
    ],
  },
  biodiversity: {
    title: "Biodiversity Collapse",
    causes: [
      "Habitat fragmentation, contamination, and climate stress reduce species survival rates.",
      "When keystone species decline, ecosystem functions unravel across entire regions.",
    ],
    negatives: [
      "Lower diversity weakens pollination, pest control, and disease resilience.",
      "Ecosystems with low diversity recover slower after droughts, floods, and fires.",
    ],
    positives: [
      "Habitat corridors and targeted restoration can quickly improve species return rates.",
      "Higher biodiversity increases ecological stability and long-term carbon retention.",
    ],
    resolutions: [
      "Immediate controls: rescue operations, contamination removal, and habitat shielding.",
      "Long-term controls: corridor planning, native replanting, and anti-poaching enforcement.",
    ],
    questions: [
      {
        prompt: "Why is biodiversity a resilience tool, not just a wildlife metric?",
        minWords: 12,
        passGroups: 2,
        keywordGroups: [
          ["resilience", "stability", "recovery"],
          ["pollination", "food web", "ecosystem service"],
          ["drought", "flood", "disease", "shock"],
        ],
        hint: "Explain how diversity helps systems handle shocks.",
        followUp: "Name one ecosystem service and one climate shock that biodiversity helps buffer.",
      },
    ],
  },
  systems_governance: {
    title: "Systems Governance and Climate Systems",
    causes: [
      "Opaque control systems optimize short-term output while hiding ecological externalities.",
      "Delayed reporting and weak accountability let environmental damage compound silently.",
    ],
    negatives: [
      "Communities absorb health and climate costs while polluters keep operating.",
      "Untrusted data pipelines block rapid response and policy correction.",
    ],
    positives: [
      "Transparent telemetry and public accountability improve response speed and trust.",
      "Advanced control systems can accelerate restoration when constrained by ecological safety rules.",
    ],
    resolutions: [
      "Immediate controls: open logs, independent audits, and emergency shutdown authority.",
      "Long-term controls: restoration-first governance, enforceable limits, and public reporting standards.",
    ],
    questions: [
      {
        prompt: "What makes an environmental control system trustworthy in practice?",
        minWords: 14,
        passGroups: 2,
        keywordGroups: [
          ["transparent", "audit", "open data", "logs"],
          ["limits", "guardrail", "safety", "constraint"],
          ["accountability", "public", "oversight", "enforcement"],
        ],
        hint: "Think transparency, guardrails, and accountability.",
        followUp: "List one transparency mechanism, one safety guardrail, and one oversight method.",
      },
    ],
  },
};

const NPC_TOPIC_DEFAULT = {
  dr_maya_chen: "water",
  captain_elias_torres: "biodiversity",
  ava_singh: "air",
  jonas_walker: "systems_governance",
  lina_park: "energy",
};

const dom = {
  gameRoot: document.getElementById("game-root"),
  loadingScreen: document.getElementById("loading-screen"),
  characterScreen: document.getElementById("character-screen"),
  characterForm: document.getElementById("character-form"),
  hud: document.getElementById("hud"),
  hudHealth: document.getElementById("hud-health"),
  hudEnergy: document.getElementById("hud-energy"),
  hudAir: document.getElementById("hud-air"),
  hudWater: document.getElementById("hud-water"),
  hudBiodiversity: document.getElementById("hud-biodiversity"),
  hudClimate: document.getElementById("hud-climate"),
  hudFunding: document.getElementById("hud-funding"),
  hudReputation: document.getElementById("hud-reputation"),
  hudYear: document.getElementById("hud-year"),
  hudBalance: document.getElementById("hud-balance"),
  hudGoodBar: document.getElementById("hud-good-bar"),
  hudBadBar: document.getElementById("hud-bad-bar"),
  missionContent: document.getElementById("mission-content"),
  tutorialContent: document.getElementById("tutorial-content"),
  educationContent: document.getElementById("education-content"),
  crosshair: document.getElementById("crosshair"),
  weaponHud: document.getElementById("weapon-hud"),
  minimap: document.getElementById("minimap"),
  worldMapCanvas: document.getElementById("world-map-canvas"),
  worldMapPanel: document.getElementById("world-map-panel"),
  missionLogPanel: document.getElementById("mission-log-panel"),
  achievementsPanel: document.getElementById("achievements-panel"),
  planetPanel: document.getElementById("planet-panel"),
  satellitePanel: document.getElementById("satellite-panel"),
  settingsPanel: document.getElementById("settings-panel"),
  travelButtons: document.getElementById("travel-buttons"),
  missionLogList: document.getElementById("mission-log-list"),
  achievementsList: document.getElementById("achievements-list"),
  planetMetrics: document.getElementById("planet-metrics"),
  satelliteLayer: document.getElementById("satellite-layer"),
  dialoguePanel: document.getElementById("dialogue-panel"),
  dialogueNpc: document.getElementById("dialogue-npc"),
  dialogueText: document.getElementById("dialogue-text"),
  dialogueOptions: document.getElementById("dialogue-options"),
  dialogueAnswerWrap: document.getElementById("dialogue-answer-wrap"),
  dialogueAnswerInput: document.getElementById("dialogue-answer-input"),
  dialogueAnswerSubmit: document.getElementById("dialogue-answer-submit"),
  dialogueClose: document.getElementById("dialogue-close"),
  disasterAlert: document.getElementById("disaster-alert"),
  timelapseBanner: document.getElementById("timelapse-banner"),
  hudAmmo: document.getElementById("hud-ammo"),
  hudReserve: document.getElementById("hud-reserve"),
  hudWeaponState: document.getElementById("hud-weapon-state"),
  fpsLockTip: document.getElementById("fps-lock-tip"),
  objectiveNavLine: document.getElementById("objective-nav-line"),
  stageCompletePanel: document.getElementById("stage-complete-panel"),
  stageCompleteTitle: document.getElementById("stage-complete-title"),
  stageCompleteMessage: document.getElementById("stage-complete-message"),
  btnNextIsland: document.getElementById("btn-next-island"),
  aresPanel: document.getElementById("ares-panel"),
  planetCanvas: document.getElementById("planet-canvas"),
  btnMap: document.getElementById("btn-map"),
  btnMissions: document.getElementById("btn-missions"),
  btnAchievements: document.getElementById("btn-achievements"),
  btnPlanet: document.getElementById("btn-planet"),
  btnSatellite: document.getElementById("btn-satellite"),
  btnSettings: document.getElementById("btn-settings"),
  btnSave: document.getElementById("btn-save"),
  audioToggle: document.getElementById("audio-toggle"),
  masterVolume: document.getElementById("master-volume"),
  masterVolumeValue: document.getElementById("master-volume-value"),
  musicToggle: document.getElementById("music-toggle"),
  graphicsQualitySelect: document.getElementById("graphics-quality-select"),
  autosaveToggle: document.getElementById("autosave-toggle"),
  npcProviderSelect: document.getElementById("npc-provider-select"),
  ollamaUrlInput: document.getElementById("ollama-url-input"),
  ollamaModelInput: document.getElementById("ollama-model-input"),
  openaiKeyInput: document.getElementById("openai-key-input"),
  helpPanel: document.getElementById("esc-help-panel"),
  helpRegionBrief: document.getElementById("help-region-brief"),
  helpClose: document.getElementById("help-close"),
};

const state = {
  loaded: false,
  gameStarted: false,
  profile: null,
  bonuses: {
    movement: 1,
    rep: 1,
    cleanup: 1,
    engineering: 1,
    scan: 1,
  },
  year: 2086,
  funding: 1000,
  reputation: 0,
  regions: [],
  regionById: new Map(),
  npcs: [],
  missions: [],
  missionById: new Map(),
  missionState: {},
  dialogueCache: {},
  activeDialogue: null,
  achievements: { items: structuredClone(DEFAULT_ACHIEVEMENTS), updatedAt: "" },
  restoredCount: 0,
  disastersResolved: 0,
  globalClimate: {
    co2: 465,
    temperature: 2.1,
    seaLevel: 38,
    stormIntensity: 60,
    glacierCoverage: 42,
    climateStability: 48,
  },
  player: {
    health: 100,
    energy: 100,
    region: "coastal_plastic_zone",
    position: new THREE.Vector3(-65, 1.3, -20),
    velocity: new THREE.Vector3(0, 0, 0),
    moveBlend: 0,
    isMoving: false,
  },
  pollutionGrid: [],
  activeDisaster: null,
  disasterCooldown: 55,
  enemySpawnCooldown: 58,
  satellite: {
    enabled: false,
    layer: "pollution",
    dirty: true,
    accumulator: 0,
  },
  timelapse: {
    active: false,
    remaining: 0,
  },
  settings: {
    audio: true,
    music: true,
    masterVolume: 70,
    graphicsQuality: "high",
    autosave: true,
    npcProvider: "offline",
    ollamaBaseUrl: "http://127.0.0.1:11434",
    ollamaModel: "llama3.2:3b",
    npcApiKey: "",
  },
  fps: {
    enabled: true,
    pointerLocked: false,
    yaw: Math.PI,
    pitch: -0.06,
    sensitivity: 0.0022,
  },
  combat: {
    infiniteAmmo: true,
    ammo: 30,
    clipSize: 30,
    reserveAmmo: 999999,
    reloadTime: 1.4,
    cooldown: 0,
    fireRate: 0.075,
    reloading: false,
    reloadLeft: 0,
    hitRange: 130,
    damage: 58,
  },
  missionPing: {
    targetRegions: [],
    pulse: 0,
  },
  aresOutcome: null,
  saveDebounce: 0,
  scanCooldown: 0,
  input: {
    fireHeld: false,
  },
  story: {
    sequence: [...STORY_SEQUENCE],
    nextMissionId: STORY_SEQUENCE[0],
  },
  ui: {
    helpOpen: false,
    supportTipIndex: 0,
    supportTipTimer: 0,
  },
  tutorial: {
    enabled: true,
    mode: CURRICULUM_FLOW_VERSION,
    completed: false,
    step: 0,
    stageIndex: 0,
    completedStages: 0,
    stageQuestionPassed: false,
    stageObjectiveStarted: false,
    stageObjectiveComplete: false,
    stageDialogueStarted: false,
    transitioning: false,
    healthFloor: 0,
    lockRadius: 34,
    lastBarrierCueAt: 0,
    movedDistance: 0,
    startPosition: new THREE.Vector3(-65, 1.3, -20),
    introComplete: false,
    crisisTriggered: false,
    forcedConversationStarted: false,
    aiAssessmentPassed: false,
    crisisRegion: "industrial_smog_city",
    crisisNpcId: "ava_singh",
    interactedWithNode: false,
    talkedToNpc: false,
    destroyedTargets: 0,
    disasterResolved: false,
    qnaAutoTeleportIssued: false,
    transitionTimerId: 0,
    transitionStageIndex: -1,
  },
};

const world = {
  scene: null,
  renderer: null,
  camera: null,
  clock: new THREE.Clock(),
  terrain: null,
  skyUniforms: null,
  sunLight: null,
  sunMesh: null,
  clouds: [],
  bridgeSegments: [],
  heatmapCanvas: null,
  heatmapCtx: null,
  heatmapTexture: null,
  heatmapPlane: null,
  waterMeshes: [],
  playerMesh: null,
  droneMesh: null,
  fpsRig: null,
  weaponModel: null,
  worldMapTick: 0,
  regionAnchors: new Map(),
  missionBeacons: new Map(),
  npcObjects: [],
  actionNodes: [],
  cleanupTargets: [],
  enemies: [],
  enemyProjectiles: [],
  wildlife: [],
  disasterBeacon: null,
  disasterVfx: null,
  tutorialNodes: [],
  lastMessageAt: 0,
};

const planetView = {
  scene: null,
  camera: null,
  renderer: null,
  earth: null,
  cloudShell: null,
  markers: [],
  accumulator: 0,
};

const keyState = new Set();
const aimRaycaster = new THREE.Raycaster();
const tempVec3A = new THREE.Vector3();
const tempVec3B = new THREE.Vector3();
const tempVec3C = new THREE.Vector3();
const tempVec3D = new THREE.Vector3();
const UP_VECTOR = new THREE.Vector3(0, 1, 0);
let softParticleTexture = null;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function targetPixelRatioForQuality() {
  const quality = state.settings.graphicsQuality || "high";
  if (quality === "performance") {
    return Math.min(window.devicePixelRatio, 1.1);
  }
  return Math.min(window.devicePixelRatio * 1.15, 2.6);
}

function applyGraphicsQuality(quality = state.settings.graphicsQuality || "high", announce = false) {
  const next = quality === "performance" ? "performance" : "high";
  state.settings.graphicsQuality = next;

  if (world.renderer) {
    world.renderer.setPixelRatio(targetPixelRatioForQuality());
  }
  if (world.scene?.fog) {
    world.scene.fog.density = next === "performance" ? 0.0014 : 0.001;
  }
  if (world.sunLight) {
    world.sunLight.intensity = next === "performance" ? 2.55 : 3.1;
  }
  if (world.clouds?.length) {
    for (const cloud of world.clouds) {
      cloud.visible = next !== "performance";
    }
  }
  if (dom.graphicsQualitySelect && dom.graphicsQualitySelect.value !== next) {
    dom.graphicsQualitySelect.value = next;
  }

  if (announce) {
    showMessage(next === "performance" ? "Graphics set to Performance mode." : "Graphics set to High quality mode.");
  }
}

function mapValueToColor(v) {
  const t = clamp(v / 100, 0, 1);
  const r = Math.floor(lerp(40, 235, t));
  const g = Math.floor(lerp(210, 40, t));
  const b = Math.floor(lerp(120, 40, t));
  return { r, g, b };
}

function healthColor(value) {
  const c = new THREE.Color();
  c.setHSL(clamp(value / 100, 0, 1) * 0.33, 0.75, 0.52);
  return c;
}

function toWorldCoord(i) {
  return -WORLD_HALF + (i / (GRID_SIZE - 1)) * (WORLD_HALF * 2);
}

function toGridCoord(v) {
  const n = (v + WORLD_HALF) / (WORLD_HALF * 2);
  return clamp(Math.round(n * (GRID_SIZE - 1)), 0, GRID_SIZE - 1);
}

function currentRegion() {
  return state.regionById.get(state.player.region) || state.regions[0];
}

function disasterVisualProfile(type) {
  return DISASTER_VFX_PROFILES[type] || {
    smoke: 0x646f79,
    glow: 0xff6d59,
    ring: 0xffab90,
    ember: 0xfff1d6,
    turbulence: 1.2,
    plumeHeight: 24,
  };
}

function getSoftParticleTexture() {
  if (softParticleTexture) {
    return softParticleTexture;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.7)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.18)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  softParticleTexture = new THREE.CanvasTexture(canvas);
  softParticleTexture.colorSpace = THREE.SRGBColorSpace;
  return softParticleTexture;
}

function activeMissionConfigs() {
  return state.missions.filter((mission) => state.missionState[mission.id] && state.missionState[mission.id].status === "active");
}

function availableMissionConfigs() {
  return state.missions.filter((mission) => state.missionState[mission.id] && state.missionState[mission.id].status === "available");
}

function nextStoryMissionId() {
  for (const missionId of state.story.sequence) {
    const mission = state.missionState[missionId];
    if (mission && mission.status !== "completed") {
      return missionId;
    }
  }
  return null;
}

function storyMissionNpcName(missionId) {
  const mission = state.missionById.get(missionId);
  if (!mission) {
    return "GRN Command";
  }
  const npc = state.npcs.find((item) => item.id === mission.npc);
  return npc ? npc.name : "GRN Command";
}

function guideStoryFlow() {
  if (state.tutorial.enabled && !state.tutorial.completed) {
    return;
  }
  const nextMission = nextStoryMissionId();
  state.story.nextMissionId = nextMission;
  if (!nextMission) {
    return;
  }
  const active = activeMissionConfigs();
  if (active.length > 0) {
    return;
  }
  const missionState = state.missionState[nextMission];
  if (!missionState) {
    return;
  }
  if (missionState.status === "available") {
    startMission(nextMission);
    showMessage(`Story Objective: ${state.missionById.get(nextMission).title}`);
  } else if (missionState.status === "locked") {
    showMessage(`Talk to ${storyMissionNpcName(nextMission)} for the next story objective.`);
  }
}

function missionTargetRegions() {
  const targets = new Set();
  if (state.gameStarted && !state.tutorial.completed) {
    const stage = currentCurriculumStage();
    if (stage) {
      if (!state.tutorial.stageQuestionPassed) {
        const npc = getNpcById(stage.npcId);
        if (npc?.region) {
          targets.add(npc.region);
        } else {
          targets.add(stage.regionId);
        }
      } else {
        targets.add(stage.regionId);
      }
    }
    return [...targets];
  }

  const active = activeMissionConfigs();
  if (active.length > 0) {
    active.forEach((mission) => targets.add(mission.region));
  } else {
    const available = availableMissionConfigs();
    if (available.length > 0) {
      targets.add(available[0].region);
    } else {
      const nextMission = nextStoryMissionId();
      const nextCfg = nextMission ? state.missionById.get(nextMission) : null;
      if (nextCfg) {
        const npc = state.npcs.find((item) => item.id === nextCfg.npc);
        if (npc && npc.region) {
          targets.add(npc.region);
        }
      }
    }
  }
  if (state.activeDisaster?.region) {
    targets.add(state.activeDisaster.region);
  }
  return [...targets];
}

function strictTravelTargets() {
  const targets = new Set();
  if (!state.tutorial.completed) {
    const stage = currentCurriculumStage();
    if (stage?.regionId) {
      targets.add(stage.regionId);
    } else if (state.player.region) {
      targets.add(state.player.region);
    }
    return targets;
  }

  const active = activeMissionConfigs()[0];
  if (active) {
    targets.add(active.region);
  } else {
    const nextMissionId = nextStoryMissionId();
    const nextMissionCfg = nextMissionId ? state.missionById.get(nextMissionId) : null;
    const nextMissionState = nextMissionId ? state.missionState[nextMissionId] : null;
    if (nextMissionCfg && nextMissionState) {
      if (nextMissionState.status === "locked") {
        const npc = state.npcs.find((item) => item.id === nextMissionCfg.npc);
        if (npc?.region) {
          targets.add(npc.region);
        } else {
          targets.add(nextMissionCfg.region);
        }
      } else if (nextMissionState.status === "available" || nextMissionState.status === "failed") {
        targets.add(nextMissionCfg.region);
      }
    }
  }

  if (state.activeDisaster?.region) {
    targets.add(state.activeDisaster.region);
  }
  if (state.player.region) {
    targets.add(state.player.region);
  }
  return targets;
}

function missionPingIntensity(regionId) {
  return state.missionPing.targetRegions.includes(regionId) ? 1 : 0;
}

function ecosystemBalance() {
  if (!state.regions.length) {
    return { healthy: 50, unhealthy: 50 };
  }
  const health = state.regions.reduce((sum, region) => {
    return sum + (region.biodiversity + region.waterHealth + region.climateStability + (100 - region.pollution)) / 4;
  }, 0) / state.regions.length;
  const healthy = clamp(Math.round(health), 0, 100);
  const unhealthy = 100 - healthy;
  return { healthy, unhealthy };
}

function cleanupGuideForType(type) {
  return CLEANUP_TARGET_GUIDE[type] || {
    label: "NEUTRALIZE POLLUTION SOURCE",
    shortLabel: "NEUTRALIZE",
    issue: "Active pollution sources degrade ecosystem health over time.",
    result: "Pollution source neutralized and ecosystem recovery started.",
    pollutant: "plastic waste",
  };
}

function regionRiskSummary(region) {
  if (!region) {
    return {
      score: 50,
      level: "Moderate",
      color: "#f9d982",
      keyIssue: "No region selected.",
      primaryIssueId: "climate",
    };
  }

  const pollutionRisk = region.pollution * 0.44;
  const waterRisk = (100 - region.waterHealth) * 0.24;
  const biodiversityRisk = (100 - region.biodiversity) * 0.19;
  const climateRisk = (100 - region.climateStability) * 0.13;
  const score = Math.round(clamp(pollutionRisk + waterRisk + biodiversityRisk + climateRisk, 0, 100));

  const issues = [
    { id: "air", key: "Air/Soil Pollution", value: region.pollution, detail: "Higher toxicity increases exposure risk for people and wildlife." },
    { id: "water", key: "Water Stress", value: 100 - region.waterHealth, detail: "Low water health means lower oxygen and less safe habitat." },
    { id: "biodiversity", key: "Biodiversity Loss", value: 100 - region.biodiversity, detail: "Lower diversity makes ecosystems less resilient to shocks." },
    { id: "climate", key: "Climate Instability", value: 100 - region.climateStability, detail: "Instability raises chance of severe storms and extremes." },
  ];
  issues.sort((a, b) => b.value - a.value);

  let level = "Low";
  let color = "#8df0bc";
  if (score >= 70) {
    level = "Critical";
    color = "#ff8e8e";
  } else if (score >= 45) {
    level = "Moderate";
    color = "#ffd889";
  }

  return {
    score,
    level,
    color,
    keyIssue: `${issues[0].key}: ${issues[0].detail}`,
    primaryIssueId: issues[0].id,
  };
}

function missionLessonDetails(missionCfg) {
  if (!missionCfg) {
    return ISSUE_EXPLAINERS.climate;
  }
  const fallbackIssue = ISSUE_EXPLAINERS[TYPE_TO_ISSUE[missionCfg.type] || "climate"] || ISSUE_EXPLAINERS.climate;
  const lesson = MISSION_LESSONS[missionCfg.id];
  return {
    why: lesson?.why || fallbackIssue.why,
    helps: lesson?.helps || fallbackIssue.helps,
  };
}

function routeWithNavHint(text) {
  return `${text} Follow the yellow beacon + minimap ping.`;
}

function ensureCurriculumGuideNpc() {
  if (state.npcs.some((npc) => npc.id === "lina_park")) {
    return;
  }
  state.npcs.push({
    id: "lina_park",
    name: "Lina Park",
    title: "Renewable Grid Architect",
    region: "dying_rainforest",
    position: { x: 70, y: 1.3, z: 16 },
    lore: "Designs resilient clean-energy microgrids for unstable regions.",
  });
}

function applyCurriculumWorldLayout() {
  ensureCurriculumGuideNpc();
  for (const region of state.regions) {
    const layout = CURRICULUM_REGION_LAYOUT[region.id];
    if (!layout) continue;
    region.center = { x: layout.x, z: layout.z };
    region.radius = layout.radius;
  }

  const npcOffsets = {
    dr_maya_chen: { region: "coastal_plastic_zone", x: -5, z: -4 },
    ava_singh: { region: "industrial_smog_city", x: -4, z: 4 },
    jonas_walker: { region: "melting_arctic_station", x: 4, z: -4 },
    lina_park: { region: "dying_rainforest", x: -4, z: 4 },
    captain_elias_torres: { region: "toxic_river_basin", x: 4, z: -4 },
  };
  for (const npc of state.npcs) {
    const cfg = npcOffsets[npc.id];
    if (!cfg) continue;
    const region = state.regionById.get(cfg.region);
    if (!region) continue;
    npc.region = cfg.region;
    npc.position = {
      x: region.center.x + cfg.x,
      y: 1.3,
      z: region.center.z + cfg.z,
    };
  }
}

function enforceCurriculumMissionTargets() {
  for (const stage of CURRICULUM_STAGES) {
    const missionCfg = state.missionById.get(stage.missionId);
    if (!missionCfg) continue;
    missionCfg.target = CURRICULUM_STAGE_TARGET_COUNT;
  }
}

function currentCurriculumStage() {
  if (state.tutorial.completed) {
    return null;
  }
  return CURRICULUM_STAGES[clamp(state.tutorial.stageIndex, 0, CURRICULUM_STAGES.length - 1)] || null;
}

function tutorialPhase() {
  const stage = currentCurriculumStage();
  if (!stage) return "completed";
  if (!state.tutorial.stageQuestionPassed) return "qa";
  if (!state.tutorial.stageObjectiveComplete) return "objective";
  return "transition";
}

function syncCurriculumPointers() {
  const stage = currentCurriculumStage();
  if (!stage) {
    state.tutorial.step = 5;
    state.tutorial.aiAssessmentPassed = true;
    return;
  }
  state.tutorial.step = stage.index;
  state.tutorial.crisisRegion = stage.regionId;
  state.tutorial.crisisNpcId = stage.npcId;
  state.tutorial.aiAssessmentPassed = state.tutorial.stageQuestionPassed;
}

function setCurriculumHealthFloorFromProgress() {
  const floor = clamp(Math.round(state.tutorial.completedStages) * 20, 0, 100);
  state.tutorial.healthFloor = floor;
  state.player.health = Math.max(state.player.health, floor);
}

function clearCurriculumTransitionTimer() {
  if (state.tutorial.transitionTimerId) {
    window.clearTimeout(state.tutorial.transitionTimerId);
    state.tutorial.transitionTimerId = 0;
  }
  state.tutorial.transitionStageIndex = -1;
}

function resetCurriculumProgress(resetMissionStages = true) {
  clearCurriculumTransitionTimer();
  state.tutorial.completed = false;
  state.tutorial.step = 0;
  state.tutorial.stageIndex = 0;
  state.tutorial.completedStages = 0;
  state.tutorial.stageQuestionPassed = false;
  state.tutorial.stageObjectiveStarted = false;
  state.tutorial.stageObjectiveComplete = false;
  state.tutorial.stageDialogueStarted = false;
  state.tutorial.transitioning = false;
  state.tutorial.healthFloor = 0;
  state.tutorial.introComplete = true;
  state.tutorial.crisisTriggered = true;
  state.tutorial.forcedConversationStarted = true;
  state.tutorial.aiAssessmentPassed = false;
  state.tutorial.interactedWithNode = false;
  state.tutorial.talkedToNpc = false;
  state.tutorial.destroyedTargets = 0;
  state.tutorial.disasterResolved = false;
  state.tutorial.qnaAutoTeleportIssued = false;
  state.tutorial.transitionTimerId = 0;
  state.tutorial.transitionStageIndex = -1;
  state.tutorial.lastBarrierCueAt = 0;

  if (resetMissionStages) {
    for (const missionCfg of state.missions) {
      const mission = state.missionState[missionCfg.id];
      if (!mission) continue;
      mission.status = "locked";
      mission.progress = 0;
      mission.timeLeft = missionCfg.timerSeconds || 0;
    }
  }

  syncCurriculumPointers();
}

function normalizeCurriculumState() {
  const staleMode = state.tutorial.mode !== CURRICULUM_FLOW_VERSION;
  state.tutorial.mode = CURRICULUM_FLOW_VERSION;

  if (staleMode) {
    resetCurriculumProgress(true);
  }

  state.tutorial.completedStages = clamp(Math.round(state.tutorial.completedStages || 0), 0, CURRICULUM_STAGES.length);
  if (state.tutorial.completed) {
    state.tutorial.completedStages = CURRICULUM_STAGES.length;
  }
  if (state.tutorial.completedStages >= CURRICULUM_STAGES.length) {
    state.tutorial.completed = true;
    state.tutorial.stageIndex = CURRICULUM_STAGES.length - 1;
  } else {
    state.tutorial.completed = false;
    state.tutorial.stageIndex = clamp(
      Number.isFinite(state.tutorial.stageIndex) ? state.tutorial.stageIndex : state.tutorial.completedStages,
      0,
      CURRICULUM_STAGES.length - 1
    );
  }

  if (!state.tutorial.completed && state.tutorial.stageIndex < state.tutorial.completedStages) {
    state.tutorial.stageIndex = state.tutorial.completedStages;
  }

  if (state.tutorial.completed) {
    state.tutorial.stageQuestionPassed = true;
    state.tutorial.stageObjectiveStarted = false;
    state.tutorial.stageObjectiveComplete = true;
    state.tutorial.transitioning = false;
  }

  setCurriculumHealthFloorFromProgress();
  syncCurriculumPointers();
}

function beginCurriculumStage(forceTeleport = true) {
  const stage = currentCurriculumStage();
  if (!stage || state.tutorial.completed) {
    return;
  }
  clearCurriculumTransitionTimer();
  state.tutorial.stageDialogueStarted = true;
  state.tutorial.stageQuestionPassed = false;
  state.tutorial.stageObjectiveStarted = false;
  state.tutorial.stageObjectiveComplete = false;
  state.tutorial.transitioning = false;
  state.tutorial.introComplete = true;
  state.tutorial.crisisTriggered = true;
  state.tutorial.forcedConversationStarted = true;
  state.tutorial.disasterResolved = false;
  syncCurriculumPointers();

  const npc = getNpcById(stage.npcId);
  if (npc && forceTeleport) {
    teleportPlayerNearNpc(npc.id, 2.5);
  }
  if (!npc) {
    state.tutorial.stageQuestionPassed = true;
    state.tutorial.stageDialogueStarted = false;
    startCurriculumStageObjective();
    return;
  }
  if (state.activeDialogue?.type === "ai" && state.activeDialogue.forced && state.activeDialogue.npc.id === npc.id) {
    return;
  }

  openAiDialogueForNpc(npc, {
    topicId: stage.topicId,
    forced: true,
    completionText: `${stage.label} assessment complete. Objective unlocked. Finish this island event to route forward.`,
    onComplete: () => {
      state.tutorial.stageQuestionPassed = true;
      state.tutorial.aiAssessmentPassed = true;
      state.tutorial.stageDialogueStarted = false;
      state.tutorial.talkedToNpc = true;
      startCurriculumStageObjective();
      showMessage(`${npc.name}: Good. Objective is now live for ${stage.label}.`);
    },
  });
}

function startCurriculumStageObjective() {
  const stage = currentCurriculumStage();
  if (!stage || state.tutorial.completed) {
    return;
  }
  const missionCfg = state.missionById.get(stage.missionId);
  const mission = state.missionState[stage.missionId];
  if (!mission) {
    return;
  }

  // Always start each island objective from 0/target to avoid stale save-state carryover.
  mission.status = "available";
  mission.progress = 0;
  mission.timeLeft = missionCfg?.timerSeconds || mission.timeLeft || 0;
  startMission(stage.missionId);
  state.tutorial.stageObjectiveStarted = true;
  state.tutorial.stageObjectiveComplete = false;
  buildCleanupTargets();
}

function advanceCurriculumStage() {
  clearCurriculumTransitionTimer();
  if (state.tutorial.completed) {
    return;
  }

  state.tutorial.stageIndex = state.tutorial.completedStages;
  if (state.tutorial.stageIndex >= CURRICULUM_STAGES.length) {
    state.tutorial.completed = true;
    state.tutorial.stageIndex = CURRICULUM_STAGES.length - 1;
    state.tutorial.step = 5;
    state.tutorial.stageQuestionPassed = true;
    state.tutorial.stageObjectiveStarted = false;
    state.tutorial.stageObjectiveComplete = true;
    state.tutorial.transitioning = false;
    state.tutorial.disasterResolved = true;
    state.tutorial.healthFloor = 100;
    state.player.health = Math.max(state.player.health, 100);
    unlockMission("final_ares_decision");
    guideStoryFlow();
    showMessage("Curriculum complete: all 5 islands stabilized. Health integrity now locked at 100%.");
    return;
  }

  const nextStage = CURRICULUM_STAGES[state.tutorial.stageIndex];
  state.tutorial.disasterResolved = false;
  state.tutorial.destroyedTargets = 0;
  state.tutorial.stageQuestionPassed = false;
  state.tutorial.stageObjectiveStarted = false;
  state.tutorial.stageObjectiveComplete = false;
  state.tutorial.stageDialogueStarted = false;
  state.tutorial.transitioning = false;
  state.tutorial.interactedWithNode = false;
  state.tutorial.talkedToNpc = false;
  state.tutorial.qnaAutoTeleportIssued = false;
  syncCurriculumPointers();
  showMessage(`Routing to ${nextStage.label}.`);
  beginCurriculumStage(true);
}

function handleCurriculumMissionCompleted(missionId) {
  if (state.tutorial.completed || state.tutorial.transitioning) {
    return;
  }
  const stage = currentCurriculumStage();
  if (!stage || stage.missionId !== missionId) {
    return;
  }
  const missionCfg = state.missionById.get(missionId);
  const mission = state.missionState[missionId];
  if (!missionCfg || !mission || mission.status !== "completed" || mission.progress < missionCfg.target) {
    return;
  }
  if (!state.tutorial.stageQuestionPassed) {
    return;
  }
  clearCurriculumTransitionTimer();
  state.tutorial.stageObjectiveComplete = true;
  state.tutorial.stageObjectiveStarted = false;
  state.tutorial.disasterResolved = true;
  state.tutorial.transitioning = false;
  state.tutorial.completedStages = Math.max(state.tutorial.completedStages, stage.index + 1);
  setCurriculumHealthFloorFromProgress();
  const progressPct = clamp(state.tutorial.completedStages * 20, 0, 100);
  state.player.energy = Math.max(state.player.energy, 65);
  clearCurriculumTransitionTimer();
  showMessage(`${stage.label} complete. Health floor locked at ${progressPct}%. Press NEXT ISLAND when ready.`);
}

function enforceCurriculumBarrier() {
  if (!state.gameStarted || state.tutorial.completed || !world.playerMesh) {
    return;
  }
  const stage = currentCurriculumStage();
  if (!stage) {
    return;
  }
  const region = state.regionById.get(stage.regionId);
  if (!region) {
    return;
  }
  const dx = world.playerMesh.position.x - region.center.x;
  const dz = world.playerMesh.position.z - region.center.z;
  const dist = Math.hypot(dx, dz);
  const maxRadius = Math.max(16, state.tutorial.lockRadius || region.radius || 28);
  if (dist <= maxRadius) {
    return;
  }
  const inv = dist > 0.001 ? 1 / dist : 0;
  world.playerMesh.position.x = region.center.x + dx * inv * maxRadius;
  world.playerMesh.position.z = region.center.z + dz * inv * maxRadius;
  const now = performance.now();
  if (now - (state.tutorial.lastBarrierCueAt || 0) > 2200) {
    state.tutorial.lastBarrierCueAt = now;
    showMessage("Route lock active: finish this island before crossing to the next bridge.");
  }
}

function enforceIslandSafetyBoundary() {
  if (!state.gameStarted || !world.playerMesh) {
    return;
  }

  const px = world.playerMesh.position.x;
  const pz = world.playerMesh.position.z;
  const bridgeY = bridgeSurfaceHeight(px, pz);
  if (bridgeY > OCEAN_FLOOR_Y + 1.2) {
    return;
  }

  const islands = [{ x: HOME_ISLAND.x, z: HOME_ISLAND.z, radius: HOME_ISLAND.radius }, ...state.regions.map((r) => ({ x: r.center.x, z: r.center.z, radius: r.radius }))];
  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const island of islands) {
    const dx = px - island.x;
    const dz = pz - island.z;
    const d = Math.hypot(dx, dz);
    if (d < bestDist) {
      bestDist = d;
      best = { ...island, dx, dz, d };
    }
  }
  if (!best) return;

  const safeRadius = Math.max(5.5, best.radius - ISLAND_SAFE_MARGIN);
  if (best.d <= safeRadius) {
    return;
  }
  const inv = best.d > 0.001 ? 1 / best.d : 0;
  world.playerMesh.position.x = best.x + best.dx * inv * safeRadius;
  world.playerMesh.position.z = best.z + best.dz * inv * safeRadius;
}

function currentStoryDirective() {
  if (!state.gameStarted) {
    return {
      route: routeWithNavHint("Create your profile to begin restoration training."),
      task: "Follow the onboarding checks in order.",
      why: ISSUE_EXPLAINERS.climate.why,
      helps: ISSUE_EXPLAINERS.climate.helps,
    };
  }

  if (!state.tutorial.completed) {
    const stage = currentCurriculumStage();
    const npc = stage ? getNpcById(stage.npcId) : null;
    const region = stage ? state.regionById.get(stage.regionId) : null;
    const objectiveMission = stage ? state.missionById.get(stage.missionId) : null;
    const missionState = objectiveMission ? state.missionState[objectiveMission.id] : null;
    const route = !stage
      ? routeWithNavHint("Initialize curriculum route.")
      : !state.tutorial.stageQuestionPassed
        ? routeWithNavHint(`Auto-briefing checkpoint: ${npc ? npc.name : "guide NPC"} on ${region ? region.name : stage.regionId}.`)
        : routeWithNavHint(`Objective live: ${region ? region.name : stage.regionId}.`);
    const remaining = objectiveMission && missionState
      ? Math.max(0, objectiveMission.target - Math.floor(missionState.progress || 0))
      : 0;
    return {
      route,
      task: !stage
        ? "Curriculum sync in progress."
        : !state.tutorial.stageQuestionPassed
          ? `${stage.label}: complete the locked Q&A to unlock field work.`
          : `${stage.label}: finish the objective (${remaining} remaining).`,
      why: stage ? `Topic focus: ${AI_ENV_TOPICS[stage.topicId]?.title || stage.topicId}.` : ISSUE_EXPLAINERS.climate.why,
      helps: `Progress meter: ${clamp(state.tutorial.completedStages * 20, 0, 100)}%. Completing this island raises your permanent health floor by +20%.`,
    };
  }

  const active = activeMissionConfigs()[0];
  if (active) {
    const missionState = state.missionState[active.id];
    const region = state.regionById.get(active.region);
    const remaining = Math.max(0, active.target - Math.floor(missionState?.progress || 0));
    const lesson = missionLessonDetails(active);
    return {
      route: routeWithNavHint(`Go now: ${region ? region.name : active.region}.`),
      task: `${TYPE_ACTION_STEPS[active.type] || "Complete the mission objective."} Remaining objective count: ${remaining}.`,
      why: lesson.why,
      helps: lesson.helps,
      missionCfg: active,
      missionState,
    };
  }

  const nextMissionId = nextStoryMissionId();
  const nextMissionCfg = nextMissionId ? state.missionById.get(nextMissionId) : null;
  const nextMissionState = nextMissionId ? state.missionState[nextMissionId] : null;
  if (!nextMissionCfg || !nextMissionState) {
    return {
      route: routeWithNavHint("All critical objectives complete."),
      task: "Use side missions to improve remaining unhealthy regions.",
      why: ISSUE_EXPLAINERS.energy.why,
      helps: ISSUE_EXPLAINERS.energy.helps,
    };
  }

  const lesson = missionLessonDetails(nextMissionCfg);
  const nextRegion = state.regionById.get(nextMissionCfg.region);
  if (nextMissionState.status === "locked") {
    const npc = state.npcs.find((item) => item.id === nextMissionCfg.npc);
    const npcRegion = npc ? state.regionById.get(npc.region) : null;
    return {
      route: routeWithNavHint(`Go now: ${npcRegion ? npcRegion.name : "mission hub"} and talk to ${npc ? npc.name : "GRN Command"} (press E).`),
      task: `Unlock mission: ${nextMissionCfg.title}.`,
      why: lesson.why,
      helps: lesson.helps,
      missionCfg: nextMissionCfg,
      missionState: nextMissionState,
    };
  }

  return {
    route: routeWithNavHint(`Go now: ${nextRegion ? nextRegion.name : nextMissionCfg.region}.`),
    task: `Start mission: ${nextMissionCfg.title}.`,
    why: lesson.why,
    helps: lesson.helps,
    missionCfg: nextMissionCfg,
    missionState: nextMissionState,
  };
}

function currentEducationalObjective() {
  const directive = currentStoryDirective();
  return `${directive.route} ${directive.task}`;
}

function updateHelpPanelContent() {
  if (!dom.helpRegionBrief) {
    return;
  }

  const region = currentRegion();
  if (!state.gameStarted || !region) {
    dom.helpRegionBrief.innerHTML = "<h4>Region Brief</h4><p>Begin the mission to unlock region-specific environmental insights.</p>";
    return;
  }

  const risk = regionRiskSummary(region);
  const directive = currentStoryDirective();
  const supportTip = ECO_SUPPORT_ACTIONS[state.ui.supportTipIndex % ECO_SUPPORT_ACTIONS.length];
  dom.helpRegionBrief.innerHTML =
    `<h4>Region Brief: ${region.name}</h4>` +
    `<p><strong style="color:${risk.color}">${risk.level} Risk (${risk.score}/100)</strong></p>` +
    `<p>${risk.keyIssue}</p>` +
    `<p><strong>Route:</strong> ${directive.route}</p>` +
    `<p><strong>Task:</strong> ${directive.task}</p>` +
    `<p><strong>Why this matters:</strong> ${directive.why}</p>` +
    `<p><strong>What helps:</strong> ${directive.helps}</p>` +
    `<p><strong>Real-world support tip:</strong> ${supportTip}</p>`;
}

function updateEducationBrief() {
  if (!dom.educationContent) {
    return;
  }
  if (!state.gameStarted) {
    dom.educationContent.innerHTML = "Start your deployment, then press <strong>Esc</strong> for controls and the full eco guide.";
    return;
  }

  const region = currentRegion();
  const risk = regionRiskSummary(region);
  const directive = currentStoryDirective();
  const issueLesson = ISSUE_EXPLAINERS[risk.primaryIssueId] || ISSUE_EXPLAINERS.climate;
  dom.educationContent.innerHTML =
    `<strong style="color:${risk.color}">${region ? region.name : "Unknown"}: ${risk.level} Risk (${risk.score}/100)</strong><br>` +
    `${risk.keyIssue}<br>` +
    `<strong>Route:</strong> ${directive.route}<br>` +
    `<strong>Task:</strong> ${directive.task}<br>` +
    `<strong>Why:</strong> ${issueLesson.why}<br>` +
    `<strong>Helps:</strong> ${issueLesson.helps}`;
  updateHelpPanelContent();
}

function setHelpPanelOpen(open) {
  if (!dom.helpPanel) {
    return;
  }
  state.ui.helpOpen = open;
  dom.helpPanel.classList.toggle("hidden", !open);
  if (open) {
    keyState.clear();
    state.input.fireHeld = false;
    setPointerLock(false);
    updateHelpPanelContent();
  }
}

function getNpcById(npcId) {
  return state.npcs.find((npc) => npc.id === npcId) || null;
}

function npcPersonality(npcId) {
  return NPC_PERSONALITIES[npcId] || {
    tone: "pragmatic field guide",
    greeting: "Field guide online.",
    humor: ["If the ecosystem had a group chat, everything would currently be in all caps."],
  };
}

function topicForNpc(npcId, topicOverride = null) {
  const topicId = topicOverride || NPC_TOPIC_DEFAULT[npcId] || "air";
  return {
    topicId,
    topic: AI_ENV_TOPICS[topicId] || AI_ENV_TOPICS.air,
  };
}

function composeAiBriefing(npc, topicId) {
  const personality = npcPersonality(npc.id);
  const { topic } = topicForNpc(npc.id, topicId);
  const joke = personality.humor[Math.floor(Math.random() * personality.humor.length)];
  const causes = topic.causes.map((item) => `- Cause: ${item}`).join("\n");
  const negatives = topic.negatives.map((item) => `- Negative: ${item}`).join("\n");
  const positives = topic.positives.map((item) => `- Positive signal: ${item}`).join("\n");
  const fixes = topic.resolutions.map((item) => `- Resolution: ${item}`).join("\n");

  return (
    `${personality.greeting}\n` +
    `Tone: ${personality.tone}.\n` +
    `${joke}\n\n` +
    `${topic.title} - detailed field briefing:\n` +
    `${causes}\n\n` +
    `${negatives}\n\n` +
    `${positives}\n\n` +
    `${fixes}`
  );
}

function topicSummaryForModel(topic) {
  const causes = (topic.causes || []).join(" ");
  const negatives = (topic.negatives || []).join(" ");
  const positives = (topic.positives || []).join(" ");
  const resolutions = (topic.resolutions || []).join(" ");
  return `Causes: ${causes}\nNegatives: ${negatives}\nPositives: ${positives}\nResolutions: ${resolutions}`;
}

function expectedConceptsForQuestion(question) {
  const concepts = [];
  for (const group of question.keywordGroups || []) {
    if (group && group.length > 0) {
      concepts.push(group[0]);
    }
  }
  return concepts;
}

function extractJsonObjectLoose(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    throw new Error("Guide model returned empty response.");
  }
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Guide model did not return valid JSON.");
  }
}

function normalizeNpcBriefingPayload(payload) {
  const briefing = cleanSpeechText(payload?.briefing || payload?.summary || "");
  const question = cleanSpeechText(payload?.question || payload?.followUpQuestion || "");
  const encouragement = cleanSpeechText(payload?.encouragement || payload?.feedback || "Let's run this cleanly.");
  if (!briefing) {
    throw new Error("Guide model returned an empty briefing.");
  }
  return {
    ok: true,
    briefing,
    question: question || "Explain the key cause, risk, and one practical fix in your own words.",
    encouragement,
  };
}

function normalizeNpcGradePayload(payload) {
  const score = clamp(Number(payload?.score) || 0, 0, 100);
  const passed = typeof payload?.passed === "boolean" ? payload.passed : score >= 60;
  const feedback = cleanSpeechText(payload?.feedback || "Good try. Tighten your answer with one clear cause and one clear solution.");
  const followUpQuestion = cleanSpeechText(
    payload?.followUpQuestion || payload?.question || "What is one direct action that reduces this pollution source?"
  );
  return {
    ok: true,
    passed,
    score,
    feedback,
    followUpQuestion,
  };
}

async function requestNpcModelResponseClient(payload) {
  const provider = String(payload?.provider || state.settings.npcProvider || "offline").toLowerCase();
  if (provider !== "ollama") {
    throw new Error("Offline guide mode active.");
  }

  const mode = String(payload?.mode || "briefing").toLowerCase();
  const baseUrl = String(payload?.ollamaBaseUrl || state.settings.ollamaBaseUrl || "http://127.0.0.1:11434").trim();
  const model = String(payload?.ollamaModel || state.settings.ollamaModel || "llama3.2:3b").trim();
  const npcName = String(payload?.npcName || "Field Guide").trim() || "Field Guide";
  const personality = String(payload?.personality || "pragmatic and friendly field expert").trim();
  const topicTitle = String(payload?.topicTitle || "Environmental incident").trim();
  const topicSummary = String(payload?.topicSummary || "").trim();
  const attempt = Number(payload?.attempt || 0);
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/chat`;

  let systemPrompt = "";
  let userPrompt = "";
  if (mode === "briefing") {
    systemPrompt =
      "You are roleplaying as an in-game NPC guide. Never say you are an AI/model/assistant. " +
      "Return valid JSON only with keys: briefing, question, encouragement.";
    userPrompt =
      `Character: ${npcName}\n` +
      `Personality: ${personality}\n` +
      `Topic: ${topicTitle}\n` +
      `Context: ${topicSummary}\n\n` +
      "Give a detailed but readable briefing with causes, harms, hopeful signals, and practical solutions. " +
      "Then ask one challenging open-ended question and provide a short encouragement line.";
  } else if (mode === "grade") {
    const expectedConcepts = Array.isArray(payload?.expectedConcepts) ? payload.expectedConcepts.join(", ") : "";
    systemPrompt =
      "You are roleplaying as an in-game NPC instructor. Never say you are an AI/model/assistant. " +
      "Grade leniently: short directionally-correct answers can pass. " +
      "Return valid JSON only with keys: passed, score, feedback, followUpQuestion.";
    userPrompt =
      `Character: ${npcName}\n` +
      `Personality: ${personality}\n` +
      `Topic: ${topicTitle}\n` +
      `Question: ${payload?.question || ""}\n` +
      `Expected concepts: ${expectedConcepts || "causes, impacts, solutions"}\n` +
      `Attempt: ${attempt}\n` +
      `Player answer: ${payload?.answer || ""}\n\n` +
      "Score 0-100. Prefer passing concise but correct answers. " +
      "If not passed, provide specific corrective feedback and a focused follow-up question.";
  } else {
    throw new Error(`Unsupported guide mode: ${mode}`);
  }

  let envelope = null;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        format: "json",
        options: {
          temperature: mode === "briefing" ? 0.65 : 0.45,
        },
      }),
    });
    if (!res.ok) {
      const raw = await res.text();
      throw new Error(`Local guide service error (${res.status}): ${raw || "request failed"}`);
    }
    envelope = await res.json();
  } catch (err) {
    const protocolHint = window.location.protocol === "https:" && baseUrl.startsWith("http://")
      ? " Browser blocked mixed-content requests from HTTPS to local HTTP Ollama."
      : "";
    throw new Error(`Local guide service is unreachable at ${baseUrl}.${protocolHint}`.trim());
  }

  const content = String(envelope?.message?.content || "").trim();
  const parsed = extractJsonObjectLoose(content);
  if (mode === "briefing") {
    return normalizeNpcBriefingPayload(parsed);
  }
  return normalizeNpcGradePayload(parsed);
}

async function requestNpcModelResponse(payload) {
  const response = await apiPost(API.npcChat, {
    ...payload,
    provider: state.settings.npcProvider || "offline",
    ollamaBaseUrl: state.settings.ollamaBaseUrl || "http://127.0.0.1:11434",
    ollamaModel: state.settings.ollamaModel || "llama3.2:3b",
    apiKey: state.settings.npcApiKey || "",
  });
  if (!response?.ok) {
    const err = response?.error || "Model endpoint unavailable.";
    throw new Error(err);
  }
  return response;
}

function cleanSpeechText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function speakDialogueText(text, npcId = "") {
  return;
}

function normalizeAnswerText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateAiAnswer(question, answer) {
  const normalized = normalizeAnswerText(answer);
  const words = normalized.length ? normalized.split(" ").length : 0;
  const keywordGroups = question.keywordGroups || [];

  let matched = 0;
  const missing = [];
  for (const group of keywordGroups) {
    const found = group.some((keyword) => normalized.includes(normalizeAnswerText(keyword)));
    if (found) {
      matched += 1;
    } else if (group.length > 0) {
      missing.push(group[0]);
    }
  }

  const coverage = keywordGroups.length ? matched / keywordGroups.length : 1;
  const lengthRatio = question.minWords ? clamp(words / question.minWords, 0, 1) : 1;
  const score = Math.round(coverage * 85 + lengthRatio * 15);
  const baselineGroups = question.passGroups || Math.max(1, keywordGroups.length);
  const requiredGroups = Math.max(1, baselineGroups - 1);
  const minWords = Math.max(4, Math.floor((question.minWords || 10) * 0.35));
  const passed = matched >= requiredGroups && score >= 50 && words >= minWords;

  return {
    passed,
    score,
    words,
    matched,
    requiredGroups,
    missing,
  };
}

function isNpcAssessmentActive() {
  return Boolean(state.activeDialogue && state.activeDialogue.type === "ai" && state.activeDialogue.stage !== "complete");
}

function setDialogueAnswerInputVisible(visible, placeholder = "Type your answer here") {
  if (!dom.dialogueAnswerWrap || !dom.dialogueAnswerInput) {
    return;
  }
  dom.dialogueAnswerWrap.classList.toggle("hidden", !visible);
  dom.dialogueAnswerInput.placeholder = placeholder;
  if (!visible) {
    dom.dialogueAnswerInput.value = "";
  }
}

function teleportPlayerNearNpc(npcId, radius = 2.4) {
  if (!world.playerMesh) {
    return false;
  }
  const npcRef = world.npcObjects.find((item) => item.npc.id === npcId);
  if (!npcRef) {
    return false;
  }
  const angle = Math.PI * 0.45;
  const x = npcRef.mesh.position.x + Math.cos(angle) * radius;
  const z = npcRef.mesh.position.z + Math.sin(angle) * radius;
  const y = terrainHeight(x, z) + 1.45;
  world.playerMesh.position.set(x, y, z);
  state.player.position.copy(world.playerMesh.position);
  state.player.region = npcRef.npc.region;
  return true;
}

function showAiQuestionHint(session, question) {
  const personality = npcPersonality(session.npc.id);
  const evaluation = session.lastEvaluation || {};
  const scoreText = Number.isFinite(evaluation.score) ? `Current score: ${Math.round(evaluation.score)}/100. ` : "";
  const missing = (evaluation.missing || []).slice(0, 3);
  const missingText = missing.length ? missing.join(", ") : "cause, impact, and solution";
  const attempt = question.attempts || 1;
  question.hintClicks = (question.hintClicks || 0) + 1;
  const hintRound = question.hintClicks;

  if (attempt <= 1 && hintRound % 3 === 1) {
    question.activePrompt = `Follow-up: Rewrite your answer with explicit coverage of ${missingText}, then give one concrete fix.`;
    session.feedback =
      `${scoreText}${personality.humor[0]} You are close, but key pieces are missing. ` +
      `Add clear coverage of: ${missingText}.`;
    return;
  }

  if ((attempt === 2 && hintRound % 3 !== 0) || hintRound % 3 === 2) {
    question.activePrompt = `Follow-up: In 2-3 sentences, explain ${missingText} and connect it to one practical intervention.`;
    session.feedback =
      `Good effort. Let's tighten it up. ${question.hint || "Be specific, practical, and scientific."} ` +
      `Focus terms: ${missingText}.`;
    return;
  }

  question.activePrompt =
    `Final coaching prompt: Write one sentence for cause, one for harm, and one for fix. ` +
    `Must include: ${missingText}.`;
  session.feedback =
    `Not there yet, but we can recover this. ${personality.humor[1]} ` +
    `Use the three-line structure in the prompt and be explicit.`;
}

function openAiDialogueForNpc(npc, options = {}) {
  if (!npc) {
    return;
  }
  const { topicId, topic } = topicForNpc(npc.id, options.topicId || null);
  const questions = (topic.questions || []).map((question) => ({
    ...question,
    activePrompt: question.prompt,
    attempts: 0,
    hintClicks: 0,
  }));
  const forced = Boolean(options.forced);

  state.activeDialogue = {
    type: "ai",
    npc,
    topicId,
    stage: "briefing",
    forced,
    briefingText: composeAiBriefing(npc, topicId),
    questions,
    questionIndex: 0,
    score: 0,
    feedback: "",
    usedLiveModel: false,
    modelUnavailable: false,
    attemptCounter: 0,
    completionText: options.completionText || "Assessment complete. You can now proceed with field operations.",
    onComplete: options.onComplete || null,
  };

  state.input.fireHeld = false;
  keyState.clear();
  setHelpPanelOpen(false);
  setPointerLock(false);
  dom.dialoguePanel.classList.remove("hidden");
  renderDialogueNode();

  requestNpcModelResponse({
    mode: "briefing",
    npcId: npc.id,
    npcName: npc.name,
    personality: npcPersonality(npc.id).tone,
    topicTitle: topic.title,
    topicSummary: topicSummaryForModel(topic),
  })
    .then((live) => {
      if (!state.activeDialogue || state.activeDialogue.npc.id !== npc.id || state.activeDialogue.type !== "ai") {
        return;
      }
      state.activeDialogue.usedLiveModel = true;
      state.activeDialogue.modelUnavailable = false;
      state.activeDialogue.modelError = "";
      const encouragement = live.encouragement ? `\n\n${live.encouragement}` : "";
      if (typeof live.briefing === "string" && live.briefing.trim()) {
        state.activeDialogue.briefingText = `${live.briefing}${encouragement}`;
      }
      if (state.activeDialogue.questions.length > 0 && typeof live.question === "string" && live.question.trim()) {
        state.activeDialogue.questions[0].activePrompt = live.question.trim();
      }
      renderDialogueNode();
    })
    .catch((err) => {
      if (!state.activeDialogue || state.activeDialogue.npc.id !== npc.id || state.activeDialogue.type !== "ai") {
        return;
      }
      state.activeDialogue.modelUnavailable = true;
      const reason = String(err?.message || "").trim();
      state.activeDialogue.modelError = reason;
      if (!state.activeDialogue.modelUnavailableNotice) {
        state.activeDialogue.modelUnavailableNotice = true;
        const npcName = state.activeDialogue?.npc?.name || npc.name || "Your guide";
        if (reason.includes("unreachable")) {
          showMessage(`${npcName} is temporarily unreachable. Check your local guide service, then try again.`, true);
        } else if (reason.includes("model") || reason.includes("not found")) {
          showMessage(`${npcName} could not load the selected guide profile. Check settings, then try again.`, true);
        } else if (reason.includes("OPENAI_API_KEY") || reason.includes("invalid_api_key") || reason.includes("insufficient_quota")) {
          showMessage(`${npcName} is unavailable right now. Check your guide connection settings and try again.`, true);
        } else {
          showMessage(`${npcName} is unavailable right now. Continuing with backup briefing notes.`, true);
        }
      }
      renderDialogueNode();
    });
}

function renderAiDialogueNode() {
  const session = state.activeDialogue;
  if (!session || session.type !== "ai") {
    return;
  }
  if (dom.dialogueClose) {
    const locked = session.forced && session.stage !== "complete";
    dom.dialogueClose.style.display = locked ? "none" : "";
    dom.dialogueClose.disabled = locked;
  }

  const personality = npcPersonality(session.npc.id);
  const { topic } = topicForNpc(session.npc.id, session.topicId);
  dom.dialogueNpc.textContent = session.npc.name;
  dom.dialogueOptions.innerHTML = "";

  if (session.stage === "briefing") {
    const offlineNote = session.modelUnavailable
      ? `\n\n${session.npc.name} is currently off-channel, so I will continue from prepared field notes.`
      : "";
    dom.dialogueText.textContent = `${session.briefingText}${offlineNote}\n\nWhen ready, start the guided questions.`;
    speakDialogueText(dom.dialogueText.textContent, session.npc.id);
    setDialogueAnswerInputVisible(false);
    const btn = document.createElement("button");
    btn.textContent = session.questions.length ? "Start Guided Questions" : "Continue";
    btn.addEventListener("click", handleAiDialogueAdvance);
    dom.dialogueOptions.appendChild(btn);
    return;
  }

  if (session.stage === "question") {
    const question = session.questions[session.questionIndex];
    if (!question) {
      session.stage = "complete";
      renderAiDialogueNode();
      return;
    }
    const header = `Question ${session.questionIndex + 1}/${session.questions.length} - ${topic.title}`;
    const feedback = session.feedback ? `${session.feedback}\n\n` : "";
    const status = session.modelUnavailable
      ? `${session.npc.name}: connection unstable, continuing with guided notes.\n\n`
      : `${session.npc.name}: connected and ready for your answer.\n\n`;
    dom.dialogueText.textContent = `${status}${feedback}${header}\n${question.activePrompt}`;
    speakDialogueText(dom.dialogueText.textContent, session.npc.id);
    setDialogueAnswerInputVisible(true, "Type your detailed answer and submit");

    const hintBtn = document.createElement("button");
    hintBtn.textContent = "Need Hint";
    hintBtn.addEventListener("click", () => {
      showAiQuestionHint(session, question);
      renderAiDialogueNode();
    });
    dom.dialogueOptions.appendChild(hintBtn);

    const skipBtn = document.createElement("button");
    skipBtn.textContent = "Repeat Briefing";
    skipBtn.addEventListener("click", () => {
      session.stage = "briefing";
      session.feedback = `${personality.humor[0]} Quick recap loaded.`;
      renderAiDialogueNode();
    });
    dom.dialogueOptions.appendChild(skipBtn);
    return;
  }

  const averageScore = session.questions.length ? Math.round(session.score / session.questions.length) : 100;
  const completionFeedback = session.feedback ? `${session.feedback}\n` : "";
  dom.dialogueText.textContent =
    `${completionFeedback}\n${session.completionText}\n` +
    `${personality.humor[1]}\n` +
    `Session score: ${averageScore}/100`;
  speakDialogueText(dom.dialogueText.textContent, session.npc.id);
  setDialogueAnswerInputVisible(false);

  const btn = document.createElement("button");
  btn.textContent = "Continue";
  btn.addEventListener("click", handleAiDialogueAdvance);
  dom.dialogueOptions.appendChild(btn);
}

function handleAiDialogueAdvance() {
  const session = state.activeDialogue;
  if (!session || session.type !== "ai") {
    return;
  }
  if (session.stage === "briefing") {
    if (!session.questions.length) {
      session.stage = "complete";
    } else {
      session.stage = "question";
      session.feedback = "You are up. Short, clear answers are okay. I will coach you if needed.";
      setDialogueAnswerInputVisible(true);
      dom.dialogueAnswerInput?.focus();
    }
    renderDialogueNode();
    return;
  }
  if (session.stage === "complete") {
    completeAiDialogueSession();
  }
}

async function handleAiDialogueAnswerSubmit() {
  const session = state.activeDialogue;
  if (!session || session.type !== "ai" || session.stage !== "question") {
    return;
  }
  if (session.pendingRequest) {
    return;
  }
  const answer = dom.dialogueAnswerInput?.value?.trim() || "";
  if (!answer) {
    showMessage("Type an answer before submitting.", true);
    return;
  }

  const question = session.questions[session.questionIndex];
  if (!question) {
    session.stage = "complete";
    renderDialogueNode();
    return;
  }
  const localEvaluation = evaluateAiAnswer(question, answer);

  let evaluation = null;
  let liveFeedback = "";
  let liveFollowUp = "";
  session.pendingRequest = true;
  session.attemptCounter += 1;
  session.feedback = `${session.npc.name} is reviewing your answer...`;
  renderDialogueNode();

  try {
    const { topic } = topicForNpc(session.npc.id, session.topicId);
    const live = await requestNpcModelResponse({
      mode: "grade",
      npcId: session.npc.id,
      npcName: session.npc.name,
      personality: npcPersonality(session.npc.id).tone,
      topicTitle: topic.title,
      topicSummary: topicSummaryForModel(topic),
      question: question.activePrompt || question.prompt,
      answer,
      attempt: session.attemptCounter,
      expectedConcepts: expectedConceptsForQuestion(question),
    });
    const liveScore = clamp(Number(live.score) || 0, 0, 100);
    const livePassed = Boolean(live.passed);
    const lenientPass =
      livePassed ||
      liveScore >= 65 ||
      localEvaluation.passed ||
      (localEvaluation.matched >= Math.max(1, localEvaluation.requiredGroups - 1) && localEvaluation.words >= 5);
    evaluation = {
      passed: lenientPass,
      score: Math.max(liveScore, localEvaluation.score),
      words: localEvaluation.words,
      matched: localEvaluation.matched,
      requiredGroups: localEvaluation.requiredGroups,
      missing: localEvaluation.missing,
    };
    liveFeedback = String(live.feedback || "").trim();
    liveFollowUp = String(live.followUpQuestion || "").trim();
    if (lenientPass && !livePassed && !liveFeedback) {
      liveFeedback = "Good work. That answer is clear enough to move forward.";
    }
    if (lenientPass) {
      liveFollowUp = "";
    }
    session.usedLiveModel = true;
    session.modelUnavailable = false;
    session.modelError = "";
  } catch (err) {
    evaluation = localEvaluation;
    session.modelUnavailable = true;
    session.modelError = String(err?.message || "").trim();
  } finally {
    session.pendingRequest = false;
  }

  if (!state.activeDialogue || state.activeDialogue !== session) {
    return;
  }

  session.lastEvaluation = evaluation;
  const personality = npcPersonality(session.npc.id);

  if (evaluation.passed) {
    session.score += evaluation.score;
    session.questionIndex += 1;
    if (session.questionIndex >= session.questions.length) {
      session.stage = "complete";
      session.feedback = liveFeedback || `Nice work. Final grade: ${Math.round(session.score / session.questions.length)}/100.`;
      setDialogueAnswerInputVisible(false);
    } else {
      session.feedback = liveFeedback || `${personality.humor[1]} Good answer (${evaluation.score}/100). Next one, keep it practical and specific.`;
      setDialogueAnswerInputVisible(true);
    }
    if (dom.dialogueAnswerInput) {
      dom.dialogueAnswerInput.value = "";
    }
    renderDialogueNode();
    return;
  }

  question.attempts += 1;
  if (liveFollowUp) {
    question.activePrompt = liveFollowUp;
  } else if (question.attempts >= 2 && question.followUp) {
    question.activePrompt = question.followUp;
  }
  if (liveFeedback) {
    session.feedback = liveFeedback;
  } else {
    showAiQuestionHint(session, question);
  }
  if (dom.dialogueAnswerInput) {
    dom.dialogueAnswerInput.value = "";
  }
  renderDialogueNode();
}

function completeAiDialogueSession() {
  const session = state.activeDialogue;
  if (!session || session.type !== "ai") {
    closeDialogue();
    return;
  }
  const onComplete = session.onComplete;
  closeDialogue(true);
  if (typeof onComplete === "function") {
    onComplete();
  }
}

function setTutorialDisaster(regionId, type = "Toxic Gas Cloud", timeLeft = 170, severity = 1.45) {
  const region = state.regionById.get(regionId);
  if (!region) {
    return;
  }
  state.activeDisaster = {
    type,
    region: region.id,
    timeLeft,
    severity,
    lastCueSecond: -1,
    scripted: true,
  };
  ensureDisasterBeacon();
  world.disasterBeacon.visible = true;
  world.disasterBeacon.position.set(region.center.x, terrainHeight(region.center.x, region.center.z) + 4.8, region.center.z);
  configureDisasterVfx(type);
  renderTravelButtons();
  audio.playDisasterStart(severity);
}

function triggerTutorialCrisisEvent() {
  const region = state.regionById.get(state.tutorial.crisisRegion);
  if (!region || state.tutorial.crisisTriggered) {
    return;
  }
  state.tutorial.crisisTriggered = true;
  state.tutorial.qnaAutoTeleportIssued = false;
  setTutorialDisaster(region.id, "Toxic Gas Cloud", 190, 1.35);
  spawnEnemy("Factory Sentinels", region.id);
  spawnEnemy("Smog Wraiths", region.id);
  spawnEnemy("Pollution Drones", region.id);
  const npc = getNpcById(state.tutorial.crisisNpcId) || getNpcById("ava_singh");
  if (npc && teleportPlayerNearNpc(npc.id)) {
    state.tutorial.qnaAutoTeleportIssued = true;
    showMessage(`Emergency escalation: ${region.name} air quality collapsed. Auto-transporting you to ${npc.name}.`, true);
    return;
  }
  showMessage(`Emergency escalation: ${region.name} air quality has collapsed.`, true);
}

function startTutorialIntroDialogue() {
  const guideNpc = getNpcById("dr_maya_chen") || state.npcs[0];
  if (!guideNpc) {
    state.tutorial.introComplete = true;
    return;
  }
  teleportPlayerNearNpc(guideNpc.id);
  openAiDialogueForNpc(guideNpc, {
    topicId: "island_overview",
    forced: true,
    completionText: "Orientation complete. Stay alert, an anomaly is forming nearby.",
    onComplete: () => {
      state.tutorial.introComplete = true;
      state.tutorial.talkedToNpc = true;
      showMessage("Orientation complete. Stand by for live incident routing.");
    },
  });
}

function startForcedCrisisBriefing() {
  if (state.tutorial.aiAssessmentPassed) {
    return;
  }
  if (state.activeDialogue?.type === "ai" && state.activeDialogue.forced) {
    return;
  }
  const npc = getNpcById(state.tutorial.crisisNpcId) || getNpcById("ava_singh");
  if (!npc) {
    state.tutorial.aiAssessmentPassed = true;
    return;
  }
  state.tutorial.forcedConversationStarted = true;
  teleportPlayerNearNpc(npc.id);
  showMessage(`Auto-routing to ${npc.name} for incident briefing.`);
  openAiDialogueForNpc(npc, {
    topicId: "air",
    forced: true,
    completionText: "Assessment passed. Combat systems are unlocked. Contain threats, then stabilize the disaster beacon.",
    onComplete: () => {
      state.tutorial.aiAssessmentPassed = true;
      state.tutorial.talkedToNpc = true;
      showMessage("Briefing passed. You are cleared for active containment.");
    },
  });
}

function tutorialCombatUnlocked() {
  return state.tutorial.completed || state.tutorial.stageQuestionPassed;
}

function tutorialDisasterResolveUnlocked() {
  return state.tutorial.completed || state.tutorial.stageQuestionPassed;
}

function tutorialStepDescription(step) {
  if (state.tutorial.completed) {
    return "Curriculum complete. All 5 island objectives secured.";
  }
  const stage = CURRICULUM_STAGES[clamp(step, 0, CURRICULUM_STAGES.length - 1)];
  if (!stage) {
    return "Curriculum routing in progress.";
  }
  const missionCfg = state.missionById.get(stage.missionId);
  const mission = missionCfg ? state.missionState[missionCfg.id] : null;
  const progress = missionCfg && mission ? `${Math.floor(mission.progress)}/${missionCfg.target}` : "--";
  if (!state.tutorial.stageQuestionPassed) {
    return `${stage.label}: locked NPC Q&A briefing (cannot be skipped).`;
  }
  if (state.tutorial.stageObjectiveComplete) {
    return `${stage.label}: objective complete. Press NEXT ISLAND to continue.`;
  }
  return `${stage.label}: complete objective ${progress}.`;
}

function updateStageCompletePanel(stage) {
  if (!dom.stageCompletePanel || !dom.btnNextIsland || !dom.stageCompleteMessage || !dom.stageCompleteTitle) {
    return;
  }
  if (!state.gameStarted || state.tutorial.completed || !stage || !state.tutorial.stageObjectiveComplete) {
    dom.stageCompletePanel.classList.add("hidden");
    return;
  }

  const nextStage = CURRICULUM_STAGES[stage.index + 1] || null;
  dom.stageCompleteTitle.textContent = `${stage.label} Complete`;
  if (nextStage) {
    dom.stageCompleteMessage.textContent = `All objectives cleared. Press to teleport to ${nextStage.label}.`;
    dom.btnNextIsland.textContent = "Teleport to Next Island";
  } else {
    dom.stageCompleteMessage.textContent = "All islands are complete. Press to finalize curriculum.";
    dom.btnNextIsland.textContent = "Finish Curriculum";
  }
  dom.stageCompletePanel.classList.remove("hidden");
}

function updateTutorialState() {
  if (!dom.tutorialContent) return;
  if (!state.gameStarted) {
    dom.tutorialContent.textContent = "Complete registration to begin island curriculum onboarding.";
    updateStageCompletePanel(null);
    return;
  }

  syncCurriculumPointers();

  if (state.tutorial.completed) {
    dom.tutorialContent.textContent = "5/5 islands complete. Story mode active.";
    updateStageCompletePanel(null);
    return;
  }

  const stage = currentCurriculumStage();
  if (!stage) {
    dom.tutorialContent.textContent = "Curriculum stage unavailable.";
    updateStageCompletePanel(null);
    return;
  }

  const missionCfg = state.missionById.get(stage.missionId);
  const mission = missionCfg ? state.missionState[missionCfg.id] : null;
  const stageNumber = stage.index + 1;

  if (!state.tutorial.stageQuestionPassed) {
    if (!state.activeDialogue && !state.tutorial.stageDialogueStarted) {
      beginCurriculumStage(true);
    }
    dom.tutorialContent.innerHTML =
      `<strong>Island ${stageNumber}/5</strong><br>` +
      `${stage.label}<br>` +
      `Locked Q&A with NPC guide in progress.`;
    updateStageCompletePanel(null);
    return;
  }

  if (!state.tutorial.stageObjectiveStarted && !state.tutorial.stageObjectiveComplete) {
    startCurriculumStageObjective();
  }

  if (
    missionCfg &&
    mission &&
    state.tutorial.stageObjectiveStarted &&
    mission.status === "completed" &&
    mission.progress >= missionCfg.target &&
    !state.tutorial.stageObjectiveComplete &&
    !state.tutorial.transitioning
  ) {
    handleCurriculumMissionCompleted(stage.missionId);
  }

  const objectiveText = missionCfg && mission
    ? `${missionCfg.title}: ${Math.floor(mission.progress)}/${missionCfg.target}`
    : "Objective sync in progress";
  const completionText = state.tutorial.stageObjectiveComplete ? "<br>Objective complete. Press NEXT ISLAND to continue." : "";
  dom.tutorialContent.innerHTML =
    `<strong>Island ${stageNumber}/5</strong><br>` +
    `${objectiveText}<br>` +
    `Health floor: ${state.tutorial.healthFloor}%${completionText}`;
  updateStageCompletePanel(stage);
}

function createLabelSprite(text, fg = "#f2fbff", bg = "rgba(4,19,31,0.72)") {
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(130,195,220,0.8)";
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  const lines = String(text).split("\n").slice(0, 3);
  const fontSize = lines.length > 1 ? 28 : 36;
  ctx.fillStyle = fg;
  ctx.font = `600 ${fontSize}px Rajdhani`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineGap = lines.length > 1 ? 33 : 38;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineGap) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineGap);
  });
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(18, 4, 1);
  return sprite;
}

function markShadowCasting(group) {
  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function createHumanoidRig(options = {}) {
  const {
    suitColor = 0x6ca0c6,
    skinColor = 0xd4a486,
    hairColor = 0x2f2320,
    hairStyle = "short",
    metallic = 0.22,
    roughness = 0.52,
    scale = 1,
  } = options;

  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.64, metalness: 0.05 });
  const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness, metalness: metallic });
  const trim = new THREE.MeshStandardMaterial({ color: 0x23344b, roughness: 0.4, metalness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8, metalness: 0.08 });

  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.48, 6, 12), suit);
  pelvis.position.y = 0.48;
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.86, 8, 14), suit);
  torso.position.y = 1.34;
  group.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.66, 0.16), trim);
  chestPlate.position.set(0, 1.45, 0.28);
  group.add(chestPlate);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 18), suit);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.98;
  group.add(collar);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 10), skin);
  neck.position.y = 2.12;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), skin);
  head.position.y = 2.42;
  group.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.3, metalness: 0.2 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
  leftEye.position.set(-0.095, 2.4, 0.3);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.095;
  group.add(leftEye, rightEye);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), skin);
  nose.position.set(0, 2.34, 0.34);
  nose.rotation.x = Math.PI / 2;
  group.add(nose);

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.02, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x7a4a44, roughness: 0.8, metalness: 0.0 })
  );
  mouth.position.set(0, 2.25, 0.32);
  group.add(mouth);

  if (hairStyle === "long") {
    const hair = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.2, 6, 12), hairMat);
    hair.position.set(0, 2.45, -0.06);
    group.add(hair);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.55, 8), hairMat);
    tail.position.set(0, 2.08, -0.28);
    group.add(tail);
  } else if (hairStyle === "shaved") {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.56), hairMat);
    strip.position.set(0, 2.64, -0.04);
    group.add(strip);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
    hair.position.set(0, 2.48, -0.02);
    group.add(hair);
  }

  const limbMat = suit.clone();
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.62, 1.86, 0);
  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), limbMat);
  shoulderL.position.y = -0.02;
  leftArm.add(shoulderL);
  const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.62, 10), limbMat);
  leftUpperArm.position.y = -0.31;
  leftArm.add(leftUpperArm);
  const leftForeArm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.62, 10), limbMat);
  leftForeArm.position.y = -0.86;
  leftArm.add(leftForeArm);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), skin);
  leftHand.position.y = -1.22;
  leftArm.add(leftHand);
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.62;
  group.add(rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.24, 0.62, 0);
  const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.78, 10), limbMat);
  leftThigh.position.y = -0.39;
  leftLeg.add(leftThigh);
  const leftCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.74, 10), limbMat);
  leftCalf.position.y = -1.0;
  leftLeg.add(leftCalf);
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.54), trim);
  leftFoot.position.set(0, -1.41, 0.14);
  leftLeg.add(leftFoot);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.24;
  group.add(rightLeg);

  group.userData.humanoidParts = { leftArm, rightArm, leftLeg, rightLeg, mouth, head, neck };
  group.scale.setScalar(scale);
  markShadowCasting(group);
  return group;
}

function createWildlifeRig(corrupted = false) {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({
    color: corrupted ? 0x705342 : 0x8f7b60,
    roughness: 0.86,
    metalness: corrupted ? 0.2 : 0.04,
    emissive: corrupted ? 0x3a1310 : 0x000000,
    emissiveIntensity: corrupted ? 0.35 : 0,
  });
  const bone = new THREE.MeshStandardMaterial({ color: 0x9fa8a8, roughness: 0.6, metalness: 0.35 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 1.2, 6, 12), fur);
  body.rotation.z = Math.PI / 2;
  body.position.y = 1.16;
  group.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.42, 10), fur);
  neck.position.set(0.7, 1.35, 0);
  neck.rotation.z = -Math.PI / 4;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.34, 0.3), fur);
  head.position.set(0.96, 1.54, 0);
  group.add(head);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.24), fur);
  jaw.position.set(1.1, 1.42, 0);
  group.add(jaw);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.7, 8), fur);
  tail.position.set(-0.92, 1.2, 0);
  tail.rotation.z = Math.PI / 3;
  group.add(tail);

  const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 7), bone);
  hornL.position.set(1.02, 1.74, 0.13);
  hornL.rotation.z = -0.3;
  group.add(hornL);
  const hornR = hornL.clone();
  hornR.position.z = -0.13;
  group.add(hornR);

  const legs = [];
  const legGeom = new THREE.CylinderGeometry(0.11, 0.11, 0.9, 9);
  const legPos = [
    [-0.4, 0.62, 0.23],
    [-0.4, 0.62, -0.23],
    [0.4, 0.62, 0.23],
    [0.4, 0.62, -0.23],
  ];
  for (const [x, y, z] of legPos) {
    const leg = new THREE.Mesh(legGeom, fur);
    leg.position.set(x, y, z);
    group.add(leg);
    legs.push(leg);
  }

  if (corrupted) {
    for (let i = 0; i < 4; i += 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.46, 6), bone);
      spike.position.set(rand(-0.5, 0.4), rand(1.35, 1.62), rand(-0.22, 0.22));
      spike.rotation.z = rand(-0.8, 0.8);
      spike.rotation.x = rand(-0.4, 0.4);
      group.add(spike);
    }
  }

  group.userData.wildlifeLegs = legs;
  group.userData.wildlifeHead = head;
  group.userData.wildlifeJaw = jaw;
  group.userData.wildlifeTail = tail;
  markShadowCasting(group);
  return group;
}

function createEnemyRig(type) {
  const group = new THREE.Group();
  let hitRadius = 1.3;
  let hp = 80;
  let hoverHeight = 1.5;

  if (type === "Pollution Drones") {
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.95, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x5f98d8, emissive: 0x1f3d62, roughness: 0.4, metalness: 0.5 })
    );
    shell.position.y = 1.8;
    group.add(shell);
    for (let i = 0; i < 4; i += 1) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.12), shell.material);
      arm.position.y = 1.85;
      arm.rotation.y = (Math.PI * 0.5 * i);
      group.add(arm);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0x20384d, roughness: 0.36, metalness: 0.72 }));
      rotor.position.set(Math.cos(arm.rotation.y) * 0.52, 1.9, Math.sin(arm.rotation.y) * 0.52);
      group.add(rotor);
    }
    const sensor = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff8c6f, emissive: 0x8f2f1c, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.45 })
    );
    sensor.position.set(0, 1.8, 0.5);
    group.add(sensor);
    for (let i = 0; i < 3; i += 1) {
      const thruster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.24, 10),
        new THREE.MeshStandardMaterial({ color: 0x2d3f52, roughness: 0.32, metalness: 0.76 })
      );
      thruster.position.set(-0.22 + i * 0.22, 1.54, -0.35);
      thruster.rotation.x = Math.PI / 2;
      group.add(thruster);
    }
    hitRadius = 1.4;
    hp = 70;
    hoverHeight = 3.2;
  } else if (type === "Oil Leviathans") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.8, 6.0),
      new THREE.MeshStandardMaterial({ color: 0x3b4147, emissive: 0x131518, roughness: 0.86, metalness: 0.24 })
    );
    body.position.y = 1.55;
    group.add(body);
    const drill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.56, 2.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x585f65, roughness: 0.62, metalness: 0.58 })
    );
    drill.position.set(0, 1.24, 3.3);
    drill.rotation.x = Math.PI / 2;
    group.add(drill);
    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.48, 2.6, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x4c545a, roughness: 0.72, metalness: 0.34 })
      );
      tank.rotation.z = Math.PI / 2;
      tank.position.set(side * 1.95, 1.7, -0.2);
      group.add(tank);
    }
    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 1.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x7f878d, roughness: 0.52, metalness: 0.42 })
    );
    vent.position.set(0, 2.55, -1.8);
    group.add(vent);
    hitRadius = 2.8;
    hp = 170;
    hoverHeight = 1.2;
  } else if (type === "Smog Wraiths") {
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.0, 1),
      new THREE.MeshStandardMaterial({ color: 0x808f94, emissive: 0x2d3d44, roughness: 0.72, metalness: 0.12, transparent: true, opacity: 0.7 })
    );
    core.position.y = 2.7;
    group.add(core);
    for (let i = 0; i < 6; i += 1) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.6, 1.2), 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x74868e, emissive: 0x2e3f48, roughness: 0.94, transparent: true, opacity: 0.48 })
      );
      cloud.position.set(rand(-0.9, 0.9), rand(2.2, 3.4), rand(-0.9, 0.9));
      group.add(cloud);
    }
    for (let i = 0; i < 5; i += 1) {
      const tendril = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.14, rand(1.1, 2.2), 8),
        new THREE.MeshStandardMaterial({ color: 0x6d7f88, emissive: 0x25363f, emissiveIntensity: 0.4, roughness: 0.9, transparent: true, opacity: 0.6 })
      );
      tendril.position.set(rand(-0.7, 0.7), rand(1.4, 2.6), rand(-0.7, 0.7));
      tendril.rotation.x = rand(-0.8, 0.8);
      tendril.rotation.z = rand(-0.8, 0.8);
      group.add(tendril);
    }
    hitRadius = 1.8;
    hp = 90;
    hoverHeight = 4.8;
  } else if (type === "Corrupted Wildlife") {
    const creature = createWildlifeRig(true);
    creature.scale.setScalar(1.2);
    const spineGlow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.08, 1.05, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0xb87d5c, emissive: 0x7a241a, emissiveIntensity: 0.48, roughness: 0.52, metalness: 0.22 })
    );
    spineGlow.position.set(0.12, 1.7, 0);
    spineGlow.rotation.z = Math.PI / 2;
    creature.add(spineGlow);
    group.add(creature);
    hitRadius = 1.6;
    hp = 85;
    hoverHeight = 1.1;
  } else {
    const bot = createHumanoidRig({
      suitColor: 0x7f8388,
      skinColor: 0x9da6ad,
      hairColor: 0x202020,
      hairStyle: "shaved",
      metallic: 0.66,
      roughness: 0.28,
      scale: 1.05,
    });
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.1, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xff7e58, emissive: 0x9c2f1f, roughness: 0.2, metalness: 0.6 })
    );
    visor.position.set(0, 2.36, 0.34);
    bot.add(visor);
    group.add(bot);
    hitRadius = 1.45;
    hp = 120;
    hoverHeight = 1.6;
  }

  group.userData.hitRadius = hitRadius;
  group.userData.hp = hp;
  group.userData.hoverHeight = hoverHeight;
  markShadowCasting(group);
  return group;
}

class AdaptiveAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambience = null;
    this.storm = null;
    this.music = null;
    this.hazard = null;
    this.foley = null;
    this.musicOsc = null;
    this.musicPadOsc = null;
    this.musicSubOsc = null;
    this.musicTrack = null;
    this.musicTrackGain = TRACK_GAIN_BASE;
    this.droneHum = null;
    this.streamGain = null;
    this.leafGain = null;
    this.initialized = false;
    this.wildlifeTimer = null;
    this.nextStormCrackAt = 0;
  }

  createNoiseBuffer(seconds) {
    const length = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.55;
    }
    return buffer;
  }

  updateMasterGain() {
    if (!this.master) return;
    const volumeNorm = clamp((state.settings.masterVolume || 0) / 100, 0, 1);
    this.master.gain.value = state.settings.audio ? MASTER_GAIN_BASE * volumeNorm : 0;
  }

  updateMusicTrackGain() {
    if (!this.musicTrack) return;
    const volumeNorm = clamp((state.settings.masterVolume || 0) / 100, 0, 1);
    this.musicTrack.volume = clamp(this.musicTrackGain * volumeNorm, 0, 1);
  }

  syncMusicTrackPlayback() {
    if (!this.musicTrack) return;
    this.updateMusicTrackGain();
    if (!BACKGROUND_MUSIC_ENABLED || !state.settings.audio || !state.settings.music) {
      this.musicTrack.pause();
      return;
    }
    this.musicTrack.play().catch(() => {
      // Browser may block autoplay until a user gesture; retry on next interaction.
    });
  }

  init() {
    if (this.initialized || !state.settings.audio) {
      return;
    }
    this.ctx = new window.AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.updateMasterGain();

    this.ambience = this.ctx.createGain();
    this.ambience.gain.value = 0.2;
    this.ambience.connect(this.master);

    this.storm = this.ctx.createGain();
    this.storm.gain.value = 0.035;
    this.storm.connect(this.master);

    this.music = this.ctx.createGain();
    this.music.gain.value = 0.0;
    this.music.connect(this.master);

    this.hazard = this.ctx.createGain();
    this.hazard.gain.value = 0.0;
    this.hazard.connect(this.master);

    this.foley = this.ctx.createGain();
    this.foley.gain.value = 0.24;
    this.foley.connect(this.master);

    const breeze = this.ctx.createBufferSource();
    breeze.buffer = this.createNoiseBuffer(2.5);
    breeze.loop = true;
    const breezeFilter = this.ctx.createBiquadFilter();
    breezeFilter.type = "bandpass";
    breezeFilter.frequency.value = 560;
    breeze.connect(breezeFilter);
    breezeFilter.connect(this.ambience);
    breeze.start();

    const stormNoise = this.ctx.createBufferSource();
    stormNoise.buffer = this.createNoiseBuffer(2.1);
    stormNoise.loop = true;
    const stormFilter = this.ctx.createBiquadFilter();
    stormFilter.type = "lowpass";
    stormFilter.frequency.value = 220;
    stormNoise.connect(stormFilter);
    stormFilter.connect(this.storm);
    stormNoise.start();

    const hazardNoise = this.ctx.createBufferSource();
    hazardNoise.buffer = this.createNoiseBuffer(2.6);
    hazardNoise.loop = true;
    const hazardFilter = this.ctx.createBiquadFilter();
    hazardFilter.type = "bandpass";
    hazardFilter.frequency.value = 420;
    hazardFilter.Q.value = 0.6;
    hazardNoise.connect(hazardFilter);
    hazardFilter.connect(this.hazard);
    hazardNoise.start();

    const streamNoise = this.ctx.createBufferSource();
    streamNoise.buffer = this.createNoiseBuffer(3.0);
    streamNoise.loop = true;
    const streamFilter = this.ctx.createBiquadFilter();
    streamFilter.type = "bandpass";
    streamFilter.frequency.value = 340;
    streamFilter.Q.value = 0.55;
    this.streamGain = this.ctx.createGain();
    this.streamGain.gain.value = 0.04;
    streamNoise.connect(streamFilter);
    streamFilter.connect(this.streamGain);
    this.streamGain.connect(this.ambience);
    streamNoise.start();

    const leafTone = this.ctx.createOscillator();
    leafTone.type = "sine";
    leafTone.frequency.value = 312;
    this.leafGain = this.ctx.createGain();
    this.leafGain.gain.value = 0.012;
    leafTone.connect(this.leafGain);
    this.leafGain.connect(this.ambience);
    leafTone.start();

    if (BACKGROUND_MUSIC_ENABLED && !this.musicTrack) {
      const trackSrc = runtimeAudioPath(BACKGROUND_MUSIC_FILE);
      this.musicTrack = new Audio(trackSrc);
      this.musicTrack.loop = true;
      this.musicTrack.preload = "auto";
      this.musicTrack.crossOrigin = "anonymous";
      this.syncMusicTrackPlayback();
    }

    this.droneHum = this.ctx.createOscillator();
    this.droneHum.type = "sawtooth";
    this.droneHum.frequency.value = 52;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.016;
    this.droneHum.connect(droneGain);
    droneGain.connect(this.ambience);
    this.droneHum.start();

    this.wildlifeTimer = setInterval(() => {
      if (!state.settings.audio || !state.gameStarted) {
        return;
      }
      const chirp = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      chirp.type = "sine";
      chirp.frequency.value = rand(680, 1280);
      gain.gain.value = 0;
      chirp.connect(gain);
      gain.connect(this.master);
      const t = this.ctx.currentTime;
      gain.gain.linearRampToValueAtTime(0.045, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      chirp.start(t);
      chirp.stop(t + 0.4);
    }, 2600);

    this.nextStormCrackAt = performance.now() + rand(5000, 9000);
    this.initialized = true;
    this.syncMusicTrackPlayback();
  }

  update() {
    if (!this.initialized) {
      return;
    }
    const storm = clamp(state.globalClimate.stormIntensity / 100, 0, 1);
    this.updateMasterGain();
    this.syncMusicTrackPlayback();
    this.storm.gain.value = state.settings.audio ? 0.02 + storm * 0.23 : 0;
    this.music.gain.value = 0;
    if (this.droneHum) {
      this.droneHum.frequency.value = 48 + storm * 20 + state.player.moveBlend * 8;
    }
    const region = currentRegion();
    const waterRich = region ? clamp(region.waterHealth / 100, 0.25, 1.2) : 0.6;
    const forestRich = region ? clamp(region.forestCoverage / 100, 0.25, 1.2) : 0.6;
    if (this.streamGain) {
      this.streamGain.gain.value = state.settings.audio ? 0.022 + waterRich * 0.045 + (1 - storm) * 0.012 : 0;
    }
    if (this.leafGain) {
      this.leafGain.gain.value = state.settings.audio ? 0.006 + forestRich * 0.018 + (1 - storm) * 0.004 : 0;
    }

    let hazardLevel = 0;
    if (state.activeDisaster) {
      const region = state.regionById.get(state.activeDisaster.region);
      const distance = region ? dist2(state.player.position, region.center) : 70;
      const proximity = clamp(1 - distance / 92, 0, 1);
      const severity = clamp(state.activeDisaster.severity / 2.2, 0.35, 1.2);
      hazardLevel = 0.02 + severity * 0.08 + proximity * 0.18;
    }
    this.hazard.gain.value = state.settings.audio ? hazardLevel : 0;

    const now = performance.now();
    if (state.settings.audio && storm > 0.55 && now >= this.nextStormCrackAt) {
      this.playNoiseBurst({
        duration: 0.45,
        gainLevel: 0.11,
        filterType: "lowpass",
        freqStart: 2400,
        freqEnd: 170,
        q: 0.8,
      });
      this.playTone(62 + Math.random() * 14, 0.42, 0.07, "sine");
      this.nextStormCrackAt = now + rand(5000, 11500 - storm * 4500);
    }
  }

  setEnabled(on) {
    state.settings.audio = on;
    if (!this.initialized && on) {
      this.init();
      return;
    }
    this.updateMasterGain();
    this.syncMusicTrackPlayback();
  }

  setMusicEnabled(on) {
    state.settings.music = Boolean(on);
    this.syncMusicTrackPlayback();
  }

  setVolume(value) {
    state.settings.masterVolume = clamp(Number(value) || 0, 0, 100);
    this.updateMasterGain();
    this.updateMusicTrackGain();
  }

  playTone(freq = 440, dur = 0.2, gainLevel = 0.08, type = "sine") {
    if (!this.initialized || !state.settings.audio) {
      return;
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this.master);
    const t = this.ctx.currentTime;
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(gainLevel, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  }

  playNoiseBurst({
    duration = 0.18,
    gainLevel = 0.07,
    filterType = "bandpass",
    freqStart = 1800,
    freqEnd = 700,
    q = 1.4,
  } = {}) {
    if (!this.initialized || !state.settings.audio) {
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(Math.max(0.25, duration + 0.08));
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(40, freqStart), this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), this.ctx.currentTime + duration);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.value = 0.0001;
    gain.gain.linearRampToValueAtTime(gainLevel, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.foley || this.master);
    src.start(t);
    src.stop(t + duration + 0.03);
  }

  playShot() {
    this.playTone(295 + Math.random() * 45, 0.055, 0.095, "square");
    this.playTone(190 + Math.random() * 30, 0.09, 0.06, "triangle");
    this.playNoiseBurst({ duration: 0.07, gainLevel: 0.11, filterType: "bandpass", freqStart: 3200, freqEnd: 1200, q: 2.2 });
  }

  playEnemyShot(type = "") {
    const cold = type === "Smog Wraiths";
    this.playTone(cold ? 430 : 250, 0.12, 0.07, cold ? "triangle" : "sawtooth");
    this.playNoiseBurst({
      duration: 0.08,
      gainLevel: cold ? 0.06 : 0.075,
      filterType: "bandpass",
      freqStart: cold ? 2100 : 1400,
      freqEnd: cold ? 900 : 480,
      q: 1.5,
    });
  }

  playEnemyDefeat() {
    this.playTone(610, 0.12, 0.08, "square");
    this.playTone(420, 0.2, 0.05, "triangle");
    this.playNoiseBurst({ duration: 0.14, gainLevel: 0.085, filterType: "lowpass", freqStart: 1800, freqEnd: 260, q: 0.8 });
  }

  playCleanupSuccess() {
    this.playTone(560, 0.12, 0.06, "triangle");
    this.playTone(740, 0.18, 0.05, "sine");
    this.playNoiseBurst({ duration: 0.09, gainLevel: 0.06, filterType: "highpass", freqStart: 2100, freqEnd: 1400, q: 0.9 });
  }

  playDisasterStart(severity = 1) {
    const s = clamp(severity, 0.7, 2.4);
    this.playTone(170 - s * 14, 0.44, 0.12, "sawtooth");
    this.playTone(95 + s * 8, 0.58, 0.08, "triangle");
    this.playNoiseBurst({
      duration: 0.4,
      gainLevel: 0.14,
      filterType: "lowpass",
      freqStart: 2000,
      freqEnd: 140,
      q: 0.7,
    });
  }

  playDisasterResolved() {
    this.playTone(460, 0.18, 0.07, "triangle");
    this.playTone(690, 0.26, 0.07, "sine");
    this.playNoiseBurst({ duration: 0.12, gainLevel: 0.05, filterType: "highpass", freqStart: 2600, freqEnd: 1000, q: 0.9 });
  }

  playReloadStart() {
    this.playTone(150, 0.16, 0.045, "triangle");
    this.playTone(220, 0.1, 0.03, "square");
  }

  playReloadComplete() {
    this.playTone(510, 0.1, 0.05, "triangle");
    this.playTone(680, 0.08, 0.04, "sine");
  }

  playFootstep(intensity = 1) {
    const t = clamp(intensity, 0.4, 1.8);
    this.playNoiseBurst({
      duration: 0.06,
      gainLevel: 0.036 * t,
      filterType: "lowpass",
      freqStart: 900,
      freqEnd: 170,
      q: 0.7,
    });
    this.playTone(90 + Math.random() * 24, 0.05, 0.026 * t, "triangle");
  }
}

const audio = new AdaptiveAudio();

function nowIso() {
  return new Date().toISOString();
}

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function defaultProfilePayload() {
  return {
    name: "Eco Learner",
    bodyType: "Adaptive",
    hairStyle: "Wave Cut",
    suitColor: "#2ec27e",
    backgroundClass: "Scientist",
    createdAt: nowIso(),
    lastUpdated: nowIso(),
  };
}

function defaultAchievementsPayload() {
  return {
    items: cloneValue(DEFAULT_ACHIEVEMENTS),
    updatedAt: nowIso(),
  };
}

function defaultGameStatePayload() {
  return {
    year: 2086,
    funding: 1000,
    reputation: 0,
    player: {
      health: 100,
      energy: 100,
      region: "coastal_plastic_zone",
      position: { x: -65, y: 1.3, z: -20 },
    },
    globalClimate: {
      co2: 465,
      temperature: 2.1,
      seaLevel: 38,
      stormIntensity: 60,
      glacierCoverage: 42,
      climateStability: 48,
    },
    missionProgress: {},
    pollutionGrid: [],
    regions: {},
    activeDisaster: null,
    updatedAt: nowIso(),
  };
}

function readLocalStoreJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cloneValue(fallback);
    return JSON.parse(raw);
  } catch {
    return cloneValue(fallback);
  }
}

function writeLocalStoreJson(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore quota/privacy mode failures.
  }
}

function staticConfigCandidates(fileName) {
  if (window.location.pathname.startsWith("/client/")) {
    return [
      `../configs/${fileName}`,
      `/configs/${fileName}`,
      `./configs/${fileName}`,
    ];
  }
  return [
    `./configs/${fileName}`,
    `/configs/${fileName}`,
    `../configs/${fileName}`,
  ];
}

async function fetchJsonCandidates(paths) {
  let lastErr = null;
  for (const path of paths) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) {
        lastErr = new Error(`GET ${path} failed (${res.status})`);
        continue;
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error(`Failed to load JSON from: ${paths.join(", ")}`);
}

async function loadStaticConfigBundle() {
  if (staticConfigCache.loaded && staticConfigCache.data) {
    return staticConfigCache.data;
  }

  const [regionsRaw, missionsRaw, npcsRaw, energyRaw] = await Promise.all([
    fetchJsonCandidates(staticConfigCandidates(STATIC_CONFIG_FILES.regions)),
    fetchJsonCandidates(staticConfigCandidates(STATIC_CONFIG_FILES.missions)),
    fetchJsonCandidates(staticConfigCandidates(STATIC_CONFIG_FILES.npcs)),
    fetchJsonCandidates(staticConfigCandidates(STATIC_CONFIG_FILES.energySources)),
  ]);

  const bundle = {
    regions: regionsRaw?.regions || [],
    missions: missionsRaw?.missions || [],
    npcs: npcsRaw?.npcs || [],
    energySources: energyRaw?.sources || [],
  };
  staticConfigCache.loaded = true;
  staticConfigCache.data = bundle;
  return bundle;
}

function hydrateProfilePayload(payload) {
  return {
    ...defaultProfilePayload(),
    ...(payload || {}),
  };
}

function hydrateAchievementsPayload(payload) {
  const normalized = {
    ...defaultAchievementsPayload(),
    ...(payload || {}),
  };
  if (!Array.isArray(normalized.items) || normalized.items.length === 0) {
    normalized.items = cloneValue(DEFAULT_ACHIEVEMENTS);
  }
  return normalized;
}

function hydrateGameStatePayload(payload) {
  return {
    ...defaultGameStatePayload(),
    ...(payload || {}),
  };
}

async function staticBootstrapPayload() {
  const bundle = await loadStaticConfigBundle();
  return {
    regions: bundle.regions,
    missions: bundle.missions,
    npcs: bundle.npcs,
    energySources: bundle.energySources,
    profile: hydrateProfilePayload(readLocalStoreJson(LOCAL_STORE_KEYS.profile, defaultProfilePayload())),
    achievements: hydrateAchievementsPayload(readLocalStoreJson(LOCAL_STORE_KEYS.achievements, defaultAchievementsPayload())),
    gameState: hydrateGameStatePayload(readLocalStoreJson(LOCAL_STORE_KEYS.state, defaultGameStatePayload())),
    sessionOnly: true,
    clientOnly: true,
  };
}

async function backendGet(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`GET ${url} failed (${res.status})`);
  }
  return res.json();
}

async function backendPost(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = data?.error ? `: ${data.error}` : "";
    throw new Error(`POST ${url} failed (${res.status})${detail}`);
  }
  return data;
}

async function apiGet(url) {
  if (url === API.bootstrap) {
    if (LIKELY_STATIC_HOST) {
      return staticBootstrapPayload();
    }
    try {
      return await backendGet(url);
    } catch {
      return staticBootstrapPayload();
    }
  }

  if (url === API.profile) {
    if (LIKELY_STATIC_HOST) {
      return hydrateProfilePayload(readLocalStoreJson(LOCAL_STORE_KEYS.profile, defaultProfilePayload()));
    }
    try {
      return await backendGet(url);
    } catch {
      return hydrateProfilePayload(readLocalStoreJson(LOCAL_STORE_KEYS.profile, defaultProfilePayload()));
    }
  }

  if (url === API.achievements) {
    if (LIKELY_STATIC_HOST) {
      return hydrateAchievementsPayload(readLocalStoreJson(LOCAL_STORE_KEYS.achievements, defaultAchievementsPayload()));
    }
    try {
      return await backendGet(url);
    } catch {
      return hydrateAchievementsPayload(readLocalStoreJson(LOCAL_STORE_KEYS.achievements, defaultAchievementsPayload()));
    }
  }

  if (url === API.load) {
    if (LIKELY_STATIC_HOST) {
      return hydrateGameStatePayload(readLocalStoreJson(LOCAL_STORE_KEYS.state, defaultGameStatePayload()));
    }
    try {
      return await backendGet(url);
    } catch {
      return hydrateGameStatePayload(readLocalStoreJson(LOCAL_STORE_KEYS.state, defaultGameStatePayload()));
    }
  }

  if (url.startsWith("/api/dialogues/")) {
    const npcId = url.split("/").pop() || "";
    const safeId = npcId.replace(/[^a-zA-Z0-9_-]/g, "");
    const candidates = staticConfigCandidates(`dialogues/${safeId}.json`);
    return fetchJsonCandidates(candidates);
  }

  return backendGet(url);
}

async function apiPost(url, payload) {
  if (url === API.npcChat) {
    const provider = String(payload?.provider || state.settings.npcProvider || "offline").toLowerCase();
    if (provider === "ollama") {
      try {
        return await requestNpcModelResponseClient(payload || {});
      } catch (localErr) {
        if (LIKELY_STATIC_HOST) {
          throw localErr;
        }
        try {
          return await backendPost(url, payload);
        } catch {
          throw localErr;
        }
      }
    }
    if (LIKELY_STATIC_HOST) {
      if (provider === "offline") {
        throw new Error("Offline guide mode active.");
      }
      throw new Error("Cloud guide service is unavailable in static mode. Use Local Guide Service (Ollama).");
    }
    try {
      return await backendPost(url, payload);
    } catch (backendErr) {
      // Cloud provider without backend is intentionally unsupported in pure static mode.
      throw backendErr;
    }
  }

  if (url === API.profile) {
    if (LIKELY_STATIC_HOST) {
      const profile = hydrateProfilePayload(payload || {});
      writeLocalStoreJson(LOCAL_STORE_KEYS.profile, profile);
      return { ok: true, profile, clientOnly: true };
    }
    try {
      return await backendPost(url, payload);
    } catch {
      const profile = hydrateProfilePayload(payload || {});
      writeLocalStoreJson(LOCAL_STORE_KEYS.profile, profile);
      return { ok: true, profile, clientOnly: true };
    }
  }

  if (url === API.achievements) {
    if (LIKELY_STATIC_HOST) {
      const achievements = hydrateAchievementsPayload(payload || {});
      achievements.updatedAt = nowIso();
      writeLocalStoreJson(LOCAL_STORE_KEYS.achievements, achievements);
      return { ok: true, achievements, clientOnly: true };
    }
    try {
      return await backendPost(url, payload);
    } catch {
      const achievements = hydrateAchievementsPayload(payload || {});
      achievements.updatedAt = nowIso();
      writeLocalStoreJson(LOCAL_STORE_KEYS.achievements, achievements);
      return { ok: true, achievements, clientOnly: true };
    }
  }

  if (url === API.save) {
    if (LIKELY_STATIC_HOST) {
      const savePayload = hydrateGameStatePayload(payload || {});
      savePayload.updatedAt = nowIso();
      writeLocalStoreJson(LOCAL_STORE_KEYS.state, savePayload);
      return { ok: true, savedAt: savePayload.updatedAt, clientOnly: true };
    }
    try {
      return await backendPost(url, payload);
    } catch {
      const savePayload = hydrateGameStatePayload(payload || {});
      savePayload.updatedAt = nowIso();
      writeLocalStoreJson(LOCAL_STORE_KEYS.state, savePayload);
      return { ok: true, savedAt: savePayload.updatedAt, clientOnly: true };
    }
  }

  return backendPost(url, payload);
}

function islandPlateauHeight(x, z, centerX, centerZ, radius, topY) {
  const dx = x - centerX;
  const dz = z - centerZ;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d <= radius) {
    return topY;
  }
  if (d <= radius + ISLAND_EDGE_BLEND) {
    const t = 1 - (d - radius) / ISLAND_EDGE_BLEND;
    return OCEAN_FLOOR_Y + (topY - OCEAN_FLOOR_Y) * (t * t);
  }
  return OCEAN_FLOOR_Y;
}

function bridgeSurfaceHeight(x, z) {
  if (!world.bridgeSegments?.length) {
    return -Infinity;
  }

  let bestY = -Infinity;
  for (const seg of world.bridgeSegments) {
    const abx = seg.bx - seg.ax;
    const abz = seg.bz - seg.az;
    const apx = x - seg.ax;
    const apz = z - seg.az;
    const lenSq = abx * abx + abz * abz;
    if (lenSq < 0.0001) continue;

    let t = (apx * abx + apz * abz) / lenSq;
    t = clamp(t, 0, 1);
    const px = seg.ax + abx * t;
    const pz = seg.az + abz * t;
    if (Math.hypot(x - px, z - pz) > seg.halfWidth) continue;

    const y = seg.startY + (seg.endY - seg.startY) * t;
    if (y > bestY) bestY = y;
  }
  return bestY;
}

function terrainHeight(x, z) {
  let h = OCEAN_FLOOR_Y + (OPEN_ISLANDS_MINIMAL ? 0 : Math.sin((x + z) * 0.006) * 0.06);
  h = Math.max(h, islandPlateauHeight(x, z, HOME_ISLAND.x, HOME_ISLAND.z, HOME_ISLAND.radius, HOME_ISLAND.topY));
  for (const region of state.regions) {
    h = Math.max(h, islandPlateauHeight(x, z, region.center.x, region.center.z, region.radius, OUTER_ISLAND_TOP_Y));
  }
  h = Math.max(h, bridgeSurfaceHeight(x, z));
  return h;
}

function setupThreeScene() {
  world.scene = new THREE.Scene();
  world.scene.background = new THREE.Color(0xb7e6ff);
  world.scene.fog = new THREE.FogExp2(0xa9def8, 0.001);

  world.camera = new THREE.PerspectiveCamera(82, window.innerWidth / window.innerHeight, 0.1, 1200);
  world.camera.position.set(0, 20, 40);
  world.camera.rotation.order = "YXZ";

  world.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  world.renderer.setSize(window.innerWidth, window.innerHeight);
  world.renderer.setPixelRatio(targetPixelRatioForQuality());
  world.renderer.physicallyCorrectLights = true;
  world.renderer.shadowMap.enabled = !OPEN_ISLANDS_MINIMAL;
  world.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  world.renderer.outputColorSpace = THREE.SRGBColorSpace;
  world.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  world.renderer.toneMappingExposure = 1.64;
  dom.gameRoot.appendChild(world.renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xe6f8ff, 0x4f7d58, 1.35);
  world.scene.add(hemi);

  world.sunLight = new THREE.DirectionalLight(0xfff0c4, 3.1);
  world.sunLight.position.set(-76, 120, -25);
  world.sunLight.castShadow = true;
  world.sunLight.shadow.mapSize.set(2048, 2048);
  world.sunLight.shadow.bias = -0.00008;
  world.sunLight.shadow.normalBias = 0.7;
  world.sunLight.shadow.camera.left = -WORLD_HALF - 30;
  world.sunLight.shadow.camera.right = WORLD_HALF + 30;
  world.sunLight.shadow.camera.top = WORLD_HALF + 30;
  world.sunLight.shadow.camera.bottom = -WORLD_HALF - 30;
  world.scene.add(world.sunLight);

  world.sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(14, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9a2 })
  );
  world.sunMesh.position.copy(world.sunLight.position).multiplyScalar(2.8);
  world.scene.add(world.sunMesh);

  const skyGeo = new THREE.SphereGeometry(680, 48, 32);
  world.skyUniforms = {
    topColor: { value: new THREE.Color(0x4ab8ef) },
    bottomColor: { value: new THREE.Color(0xf4fcff) },
    offset: { value: 120 },
    exponent: { value: 0.58 },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: world.skyUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  world.scene.add(sky);

  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf0f9ff, transparent: true, opacity: 0.62, roughness: 1.0, metalness: 0.0 });
  for (let i = 0; i < 34; i += 1) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(rand(6, 12), 20, 16), cloudMat);
    cloud.position.set(rand(-WORLD_HALF - 30, WORLD_HALF + 30), rand(56, 92), rand(-WORLD_HALF - 30, WORLD_HALF + 30));
    cloud.scale.set(rand(1.2, 2.8), rand(0.6, 1.1), rand(1.4, 3.0));
    cloud.userData.cloudDrift = rand(0.08, 0.28);
    world.scene.add(cloud);
    world.clouds.push(cloud);
  }

  createTerrain();
  createHeatmapPlane();
  applyGraphicsQuality(state.settings.graphicsQuality || "high", false);

  window.addEventListener("resize", () => {
    world.camera.aspect = window.innerWidth / window.innerHeight;
    world.camera.updateProjectionMatrix();
    world.renderer.setSize(window.innerWidth, window.innerHeight);
    world.renderer.setPixelRatio(targetPixelRatioForQuality());
  });
}

function createTerrain() {
  const geo = new THREE.PlaneGeometry(WORLD_SPAN, WORLD_SPAN, OPEN_ISLANDS_MINIMAL ? 96 : 180, OPEN_ISLANDS_MINIMAL ? 96 : 180);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeight(x, z);
    pos.setY(i, y);

    const blend = clamp((y - OCEAN_FLOOR_Y) / (OUTER_ISLAND_TOP_Y - OCEAN_FLOOR_Y), 0, 1);
    const c = new THREE.Color();
    c.setHSL(0.34 - blend * 0.07, 0.42 + blend * 0.12, 0.24 + blend * 0.2);
    colors.push(c.r, c.g, c.b);
  }

  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const terrainAlbedo = document.createElement("canvas");
  terrainAlbedo.width = 1024;
  terrainAlbedo.height = 1024;
  const tctx = terrainAlbedo.getContext("2d");
  const albedoData = tctx.createImageData(1024, 1024);
  const sampleGroundNoise = (x, y) => (
    Math.sin(x * 0.017) * 0.35 +
    Math.cos(y * 0.014) * 0.28 +
    Math.sin((x + y) * 0.008) * 0.24 +
    Math.cos((x - y) * 0.01) * 0.22
  );
  for (let i = 0; i < albedoData.data.length; i += 4) {
    const px = (i / 4) % 1024;
    const py = Math.floor((i / 4) / 1024);
    const n = sampleGroundNoise(px, py);
    const m = (n + 1.1) * 0.5;
    albedoData.data[i + 0] = Math.floor(50 + m * 62);
    albedoData.data[i + 1] = Math.floor(88 + m * 110);
    albedoData.data[i + 2] = Math.floor(42 + m * 48);
    albedoData.data[i + 3] = 255;
  }
  tctx.putImageData(albedoData, 0, 0);

  const terrainRoughness = document.createElement("canvas");
  terrainRoughness.width = 512;
  terrainRoughness.height = 512;
  const rctx = terrainRoughness.getContext("2d");
  const roughData = rctx.createImageData(512, 512);
  for (let i = 0; i < roughData.data.length; i += 4) {
    const px = (i / 4) % 512;
    const py = Math.floor((i / 4) / 512);
    const n = sampleGroundNoise(px * 2, py * 2);
    const m = clamp((n + 1.2) * 0.45, 0, 1);
    const rough = Math.floor(138 + m * 86);
    roughData.data[i + 0] = rough;
    roughData.data[i + 1] = rough;
    roughData.data[i + 2] = rough;
    roughData.data[i + 3] = 255;
  }
  rctx.putImageData(roughData, 0, 0);

  const terrainNormal = document.createElement("canvas");
  terrainNormal.width = 512;
  terrainNormal.height = 512;
  const nctx = terrainNormal.getContext("2d");
  const normalData = nctx.createImageData(512, 512);
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 1) {
      const hL = sampleGroundNoise((x - 1) * 2, y * 2);
      const hR = sampleGroundNoise((x + 1) * 2, y * 2);
      const hD = sampleGroundNoise(x * 2, (y - 1) * 2);
      const hU = sampleGroundNoise(x * 2, (y + 1) * 2);
      const nx = hL - hR;
      const ny = hD - hU;
      const nz = 1.2;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const r = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      const g = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      const b = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      const idx = (y * 512 + x) * 4;
      normalData.data[idx + 0] = r;
      normalData.data[idx + 1] = g;
      normalData.data[idx + 2] = b;
      normalData.data[idx + 3] = 255;
    }
  }
  nctx.putImageData(normalData, 0, 0);

  const terrainMap = new THREE.CanvasTexture(terrainAlbedo);
  terrainMap.wrapS = THREE.RepeatWrapping;
  terrainMap.wrapT = THREE.RepeatWrapping;
  terrainMap.repeat.set(18, 18);
  terrainMap.colorSpace = THREE.SRGBColorSpace;
  const roughnessMap = new THREE.CanvasTexture(terrainRoughness);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(26, 26);
  const normalMap = new THREE.CanvasTexture(terrainNormal);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(24, 24);
  const maxAnisotropy = Math.max(1, world.renderer.capabilities.getMaxAnisotropy?.() || 1);
  terrainMap.anisotropy = Math.min(10, maxAnisotropy);
  roughnessMap.anisotropy = Math.min(10, maxAnisotropy);
  normalMap.anisotropy = Math.min(10, maxAnisotropy);

  const mat = OPEN_ISLANDS_MINIMAL
    ? new THREE.MeshBasicMaterial({ color: 0x8ac77f })
    : new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.02,
        emissive: 0x112112,
        emissiveIntensity: 0.2,
        envMapIntensity: 0.2,
      });

  world.terrain = new THREE.Mesh(geo, mat);
  world.terrain.receiveShadow = false;
  world.scene.add(world.terrain);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SPAN * 1.08, WORLD_SPAN * 1.08, 2, 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x2a5f88,
      roughness: 0.22,
      metalness: 0.03,
      transmission: 0.2,
      transparent: true,
      opacity: 0.66,
    })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = OPEN_ISLANDS_MINIMAL ? OCEAN_FLOOR_Y - 3.2 : OCEAN_FLOOR_Y + 0.85;
  ocean.userData.baseY = ocean.position.y;
  ocean.receiveShadow = true;
  world.scene.add(ocean);
  if (!OPEN_ISLANDS_MINIMAL) {
    world.waterMeshes.push(ocean);
  }

  if (!OPEN_ISLANDS_MINIMAL) {
    const rockGeo = new THREE.DodecahedronGeometry(0.8, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x748792, roughness: 0.9, metalness: 0.08 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 220);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 220; i += 1) {
      const x = rand(-WORLD_HALF + 18, WORLD_HALF - 18);
      const z = rand(-WORLD_HALF + 18, WORLD_HALF - 18);
      const region = nearestRegion(x, z);
      const onIsland = region && dist2({ x, z }, region.center) <= region.radius * 1.25;
      if (!onIsland) {
        dummy.scale.set(0.001, 0.001, 0.001);
      } else {
        dummy.position.set(x, terrainHeight(x, z) + 0.8, z);
        const s = rand(0.5, 1.8);
        dummy.scale.set(s, s * rand(0.7, 1.2), s);
        dummy.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      }
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    world.scene.add(rocks);
  }

  const grassGeo = new THREE.PlaneGeometry(0.42, 0.98, 1, 5);
  const grassPos = grassGeo.attributes.position;
  for (let i = 0; i < grassPos.count; i += 1) {
    const y = grassPos.getY(i) + 0.48;
    const bend = Math.pow(y / 1.0, 2) * 0.07;
    grassPos.setX(i, grassPos.getX(i) + bend);
  }
  grassGeo.computeVertexNormals();

  const grassMat = new THREE.MeshLambertMaterial({
    color: 0x7fd965,
    emissive: 0x2f6b2f,
    emissiveIntensity: 0.46,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  if (!OPEN_ISLANDS_MINIMAL) {
    const grass = new THREE.InstancedMesh(grassGeo, grassMat, 13000);
    const gDummy = new THREE.Object3D();
    const grassColor = new THREE.Color();
    for (let i = 0; i < 13000; i += 1) {
      const x = rand(-WORLD_HALF + 15, WORLD_HALF - 15);
      const z = rand(-WORLD_HALF + 15, WORLD_HALF - 15);
      const region = nearestRegion(x, z);
      const onIsland = region && dist2({ x, z }, region.center) <= region.radius * 1.2;
      if (!onIsland || (region && (region.id === "industrial_smog_city" || region.id === "melting_arctic_station"))) {
        gDummy.scale.set(0.001, 0.001, 0.001);
      } else {
        const y = terrainHeight(x, z);
        const s = rand(0.58, 1.25);
        gDummy.position.set(x, y + s * 0.5, z);
        gDummy.scale.set(s, s, s);
        gDummy.rotation.set(rand(-0.16, 0.14), rand(0, Math.PI * 2), rand(-0.14, 0.14));
        const hue = 0.28 + rand(-0.03, 0.05);
        grassColor.setHSL(hue, 0.54, 0.51 + rand(-0.03, 0.08));
        grass.setColorAt(i, grassColor);
      }
      gDummy.updateMatrix();
      grass.setMatrixAt(i, gDummy.matrix);
    }
    grass.castShadow = false;
    grass.receiveShadow = false;
    world.scene.add(grass);
  }

  const flowerGeo = new THREE.SphereGeometry(0.08, 10, 8);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfde294, roughness: 0.42, metalness: 0.02, emissive: 0x55371b, emissiveIntensity: 0.12 });
  if (!OPEN_ISLANDS_MINIMAL) {
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 650);
    const fDummy = new THREE.Object3D();
    for (let i = 0; i < 650; i += 1) {
      const x = rand(-WORLD_HALF + 22, WORLD_HALF - 22);
      const z = rand(-WORLD_HALF + 22, WORLD_HALF - 22);
      const region = nearestRegion(x, z);
      const onIsland = region && dist2({ x, z }, region.center) <= region.radius * 1.16;
      if (!onIsland || (region && (region.id === "industrial_smog_city" || region.id === "melting_arctic_station"))) {
        fDummy.scale.set(0.001, 0.001, 0.001);
      } else {
        const y = terrainHeight(x, z);
        fDummy.position.set(x, y + 0.12, z);
        const s = rand(0.6, 1.3);
        fDummy.scale.set(s, s, s);
        fDummy.rotation.y = rand(0, Math.PI);
      }
      fDummy.updateMatrix();
      flowers.setMatrixAt(i, fDummy.matrix);
    }
    flowers.castShadow = true;
    flowers.receiveShadow = true;
    world.scene.add(flowers);
  }

  createScenicBackdrop();
}

function createScenicBackdrop() {
  const mountainGeo = new THREE.ConeGeometry(16, 42, 22, 4);
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x738f9d, roughness: 0.87, metalness: 0.05 });
  const mountains = new THREE.InstancedMesh(mountainGeo, mountainMat, 26);
  const mDummy = new THREE.Object3D();
  for (let i = 0; i < 26; i += 1) {
    const angle = (i / 26) * Math.PI * 2;
    const radius = WORLD_HALF + 28 + rand(-10, 18);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    mDummy.position.set(x, terrainHeight(clamp(x, -WORLD_HALF, WORLD_HALF), clamp(z, -WORLD_HALF, WORLD_HALF)) + 15 + rand(-4, 6), z);
    mDummy.scale.set(rand(1.2, 2.4), rand(0.9, 1.7), rand(1.2, 2.4));
    mDummy.rotation.y = rand(0, Math.PI);
    mDummy.updateMatrix();
    mountains.setMatrixAt(i, mDummy.matrix);
  }
  mountains.castShadow = true;
  mountains.receiveShadow = true;
  world.scene.add(mountains);

  // Leave center lane clear for bridge visibility in the floating-island layout.
}

function createHeatmapPlane() {
  world.heatmapCanvas = document.createElement("canvas");
  world.heatmapCanvas.width = GRID_SIZE;
  world.heatmapCanvas.height = GRID_SIZE;
  world.heatmapCtx = world.heatmapCanvas.getContext("2d");
  world.heatmapTexture = new THREE.CanvasTexture(world.heatmapCanvas);
  world.heatmapTexture.minFilter = THREE.LinearFilter;
  world.heatmapTexture.magFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({ map: world.heatmapTexture, transparent: true, opacity: 0.58, depthWrite: false });
  const geo = new THREE.PlaneGeometry(WORLD_SPAN, WORLD_SPAN, 1, 1);
  geo.rotateX(-Math.PI / 2);
  world.heatmapPlane = new THREE.Mesh(geo, mat);
  world.heatmapPlane.position.y = 0.35;
  world.heatmapPlane.visible = false;
  world.scene.add(world.heatmapPlane);
}

function createIslandFoundation(centerX, centerZ, radius, options = {}) {
  const y = terrainHeight(centerX, centerZ);
  const topScale = options.topScale || 1.05;
  const bottomScale = options.bottomScale || 1.22;
  const height = options.height || 7.2;
  const baseColor = options.baseColor || 0x3f6b49;
  const shoreColor = options.shoreColor || 0xd8c18f;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * topScale, radius * bottomScale, height, 40),
    new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.88, metalness: 0.08 })
  );
  base.position.set(centerX, y - height * 0.5 - (OPEN_ISLANDS_MINIMAL ? 0.45 : 0.2), centerZ);
  base.receiveShadow = true;
  base.castShadow = true;
  world.scene.add(base);

  const shore = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.02, 1.15, 10, 52),
    new THREE.MeshStandardMaterial({ color: shoreColor, roughness: 0.92, metalness: 0.03 })
  );
  shore.position.set(centerX, y + 0.28, centerZ);
  shore.rotation.x = Math.PI / 2;
  shore.receiveShadow = true;
  world.scene.add(shore);
}

function createHomeIslandHub() {
  createIslandFoundation(HOME_ISLAND.x, HOME_ISLAND.z, HOME_ISLAND.radius, {
    baseColor: 0x4e6d62,
    shoreColor: 0xe2d4a8,
    topScale: 1.08,
    bottomScale: 1.3,
    height: 8.2,
  });

  const y = terrainHeight(HOME_ISLAND.x, HOME_ISLAND.z);
  const label = createLabelSprite(HOME_ISLAND.label, "#f5fcff", "rgba(10,34,52,0.78)");
  label.position.set(HOME_ISLAND.x, y + 7.6, HOME_ISLAND.z - 8.2);
  world.scene.add(label);

  const house = new THREE.Group();
  house.position.set(HOME_ISLAND.x, y + 0.1, HOME_ISLAND.z + 2.2);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc6d6de, roughness: 0.82, metalness: 0.08 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x6f8796, roughness: 0.64, metalness: 0.22 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5d6f80, roughness: 0.74, metalness: 0.18 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.5, 11.5), trimMat);
  floor.position.set(0, 0.25, 0);
  house.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(13.5, 4.8, 0.45), wallMat);
  backWall.position.set(0, 2.9, -5.5);
  house.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.8, 11.5), wallMat);
  leftWall.position.set(-6.5, 2.9, 0);
  house.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.8, 11.5), wallMat);
  rightWall.position.set(6.5, 2.9, 0);
  house.add(rightWall);

  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.8, 0.45), wallMat);
  frontLeft.position.set(-4.45, 2.9, 5.5);
  house.add(frontLeft);
  const frontRight = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.8, 0.45), wallMat);
  frontRight.position.set(4.45, 2.9, 5.5);
  house.add(frontRight);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.1, 1.1, 0.5), trimMat);
  lintel.position.set(0, 4.65, 5.5);
  house.add(lintel);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(9.2, 4.6, 4), roofMat);
  roof.position.set(0, 6.05, 0);
  roof.rotation.y = Math.PI * 0.25;
  house.add(roof);

  const porch = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.24, 2.0), trimMat);
  porch.position.set(0, 0.38, 6.6);
  house.add(porch);
  const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 1.2), trimMat);
  step.position.set(0, 0.2, 7.6);
  house.add(step);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.65, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x459fd3, emissiveIntensity: 0.52, roughness: 0.22, metalness: 0.32 })
  );
  beacon.position.set(0, 6.9, -1.2);
  house.add(beacon);

  house.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  world.scene.add(house);

  const homeLabel = createLabelSprite("Home Base", "#f5fcff", "rgba(8,32,52,0.74)");
  homeLabel.position.set(HOME_ISLAND.x, y + 6.6, HOME_ISLAND.z + 10.2);
  homeLabel.scale.set(11, 2.8, 1);
  world.scene.add(homeLabel);
}

function buildCurriculumBridges() {
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 0.86, metalness: 0.08 });
  world.bridgeSegments = [];

  const centerY = terrainHeight(HOME_ISLAND.x, HOME_ISLAND.z) + BRIDGE_SURFACE_Y_OFFSET;
  for (const stage of CURRICULUM_STAGES) {
    const region = state.regionById.get(stage.regionId);
    if (!region) continue;
    const regionY = terrainHeight(region.center.x, region.center.z) + BRIDGE_SURFACE_Y_OFFSET;
    const dir = new THREE.Vector3(region.center.x - HOME_ISLAND.x, 0, region.center.z - HOME_ISLAND.z);
    const total = dir.length();
    if (total < 2) continue;
    dir.normalize();

    const start = new THREE.Vector3(
      HOME_ISLAND.x + dir.x * Math.max(3, HOME_ISLAND.radius - BRIDGE_ISLAND_EMBED),
      centerY,
      HOME_ISLAND.z + dir.z * Math.max(3, HOME_ISLAND.radius - BRIDGE_ISLAND_EMBED)
    );
    const end = new THREE.Vector3(
      region.center.x - dir.x * Math.max(3, region.radius - BRIDGE_ISLAND_EMBED),
      regionY,
      region.center.z - dir.z * Math.max(3, region.radius - BRIDGE_ISLAND_EMBED)
    );
    const span = new THREE.Vector3().subVectors(end, start);
    const length = span.length();
    if (length < 3) continue;
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(length, 0.7, 7.8), plankMat);
    deck.position.copy(mid);
    deck.position.y = (start.y + end.y) * 0.5 + 0.04;
    deck.rotation.y = Math.atan2(span.z, span.x);
    deck.castShadow = true;
    deck.receiveShadow = true;
    world.scene.add(deck);
    world.bridgeSegments.push({
      ax: start.x,
      az: start.z,
      bx: end.x,
      bz: end.z,
      startY: start.y + 0.39,
      endY: end.y + 0.39,
      halfWidth: 3.65,
    });
  }
}

function buildRegionWorld() {
  createHomeIslandHub();

  for (const region of state.regions) {
    const center = region.center;
    createIslandFoundation(center.x, center.z, region.radius);
    const ringGeo = new THREE.TorusGeometry(region.radius * 0.18, 0.35, 12, 36);
    const ringMat = new THREE.MeshStandardMaterial({
      color: healthColor((region.biodiversity + region.waterHealth + region.climateStability) / 3),
      emissive: 0x10242b,
      roughness: 0.6,
      metalness: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(center.x, terrainHeight(center.x, center.z) + 0.25, center.z);
    ring.rotation.x = Math.PI / 2;
    world.scene.add(ring);

    const label = createLabelSprite(region.name);
    label.position.set(center.x, terrainHeight(center.x, center.z) + 7.4, center.z);
    world.scene.add(label);

    world.regionAnchors.set(region.id, { ring, label });
    createRegionBiome(region);
  }

  buildCurriculumBridges();

  buildActionNodes();
  buildCleanupTargets();
  buildNpcs();
  populateEnemies();
  populateWildlife();
  state.regions.forEach((region) => ensureMissionBeacon(region.id));
}

function createRegionBiome(region) {
  const center = region.center;
  const group = new THREE.Group();
  group.position.set(center.x, terrainHeight(center.x, center.z), center.z);

  if (OPEN_ISLANDS_MINIMAL) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 6.4, 0.55, 20),
      new THREE.MeshStandardMaterial({ color: 0xd6d7c8, roughness: 0.9, metalness: 0.06 })
    );
    pad.position.y = 0.34;
    group.add(pad);

    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.4, 1.4, 10),
      new THREE.MeshStandardMaterial({ color: 0x6b7f8f, roughness: 0.82, metalness: 0.2 })
    );
    marker.position.y = 1.05;
    group.add(marker);

    group.position.y = terrainHeight(center.x, center.z);
    world.scene.add(group);
    return;
  }

  if (region.id === "coastal_plastic_zone") {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(28, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x2b7c9b,
        roughness: 0.2,
        metalness: 0.03,
        transparent: true,
        opacity: 0.72,
        transmission: 0.35,
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.42;
    water.userData.baseY = 0.42;
    group.add(water);
    world.waterMeshes.push(water);

    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x7f8b8f, roughness: 0.95 });
    const debrisGeo = new THREE.BoxGeometry(1.6, 0.2, 1.1);
    for (let i = 0; i < 36; i += 1) {
      const d = new THREE.Mesh(debrisGeo, debrisMat);
      const a = rand(0, Math.PI * 2);
      const r = rand(6, 24);
      d.position.set(Math.cos(a) * r, 0.62, Math.sin(a) * r);
      d.rotation.set(rand(0, 0.7), rand(0, Math.PI), rand(0, 0.7));
      group.add(d);
    }

    const dockMat = new THREE.MeshStandardMaterial({ color: 0x7a6f5c, roughness: 0.86, metalness: 0.06 });
    for (let i = 0; i < 4; i += 1) {
      const dock = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 2.4), dockMat);
      dock.position.set(-14 + i * 9, 0.55, -21 + Math.sin(i) * 2.5);
      group.add(dock);
      for (let p = 0; p < 4; p += 1) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.2, 8), dockMat);
        pole.position.set(dock.position.x - 3 + p * 2, 0.2, dock.position.z + (p % 2 ? 0.9 : -0.9));
        group.add(pole);
      }
    }
  }

  if (region.id === "industrial_smog_city") {
    for (let i = 0; i < 24; i += 1) {
      const h = rand(6, 20);
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(rand(2.3, 5.8), h, rand(2.3, 5.8)),
        new THREE.MeshStandardMaterial({ color: 0x596571, roughness: 0.75, metalness: 0.22 })
      );
      tower.position.set(rand(-22, 22), h / 2, rand(-22, 22));
      tower.castShadow = true;
      group.add(tower);

      const floors = Math.max(2, Math.floor(h / 2.4));
      for (let f = 0; f < floors; f += 1) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.14, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x9ec3d8, emissive: 0x3f6c86, emissiveIntensity: 0.24, roughness: 0.2, metalness: 0.38 })
        );
        win.position.set(tower.position.x + rand(-0.7, 0.7), 0.8 + f * 1.8, tower.position.z + rand(-0.7, 0.7));
        group.add(win);
      }

      if (Math.random() > 0.58) {
        const stack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.75, h * 0.6, 12),
          new THREE.MeshStandardMaterial({ color: 0x4f585f, roughness: 0.88 })
        );
        stack.position.set(tower.position.x + rand(-1.2, 1.2), h + (h * 0.3), tower.position.z + rand(-1.2, 1.2));
        stack.castShadow = true;
        group.add(stack);
        const smoke = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0x6f787d, transparent: true, opacity: 0.35, roughness: 1.0 })
        );
        smoke.position.set(stack.position.x, stack.position.y + 2, stack.position.z);
        group.add(smoke);
      }
    }
  }

  if (region.id === "dying_rainforest") {
    for (let i = 0; i < 54; i += 1) {
      const tx = rand(-28, 28);
      const tz = rand(-28, 28);
      const trunkH = rand(2.2, 7.6);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.34, trunkH, 14),
        new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.9 })
      );
      trunk.position.set(tx, trunkH / 2, tz);
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(rand(1.3, 2.8), 18, 14),
        new THREE.MeshStandardMaterial({ color: Math.random() > 0.45 ? 0x3f8346 : Math.random() > 0.4 ? 0x6e6b39 : 0x7b6f44, roughness: 0.95 })
      );
      crown.position.set(tx, trunkH + rand(0.6, 1.3), tz);
      group.add(trunk);
      group.add(crown);

      if (Math.random() > 0.86) {
        const vine = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, rand(1.2, 2.8), 6),
          new THREE.MeshStandardMaterial({ color: 0x355a31, roughness: 0.92 })
        );
        vine.position.set(tx + rand(-0.3, 0.3), trunkH * 0.65, tz + rand(-0.3, 0.3));
        group.add(vine);
      }
    }
  }

  if (region.id === "toxic_river_basin") {
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(54, 10),
      new THREE.MeshPhysicalMaterial({ color: 0x45695d, roughness: 0.22, transparent: true, opacity: 0.62, transmission: 0.25 })
    );
    river.rotation.x = -Math.PI / 2;
    river.position.y = 0.5;
    river.userData.baseY = 0.5;
    group.add(river);
    world.waterMeshes.push(river);

    for (let i = 0; i < 16; i += 1) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, rand(4, 8), 12),
        new THREE.MeshStandardMaterial({ color: 0x6d6660, roughness: 0.92, metalness: 0.14 })
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(rand(-24, 24), rand(1.2, 3.4), rand(-8, 8));
      group.add(pipe);
    }

    for (let i = 0; i < 10; i += 1) {
      const sludge = new THREE.Mesh(
        new THREE.CircleGeometry(rand(1.2, 2.8), 20),
        new THREE.MeshPhysicalMaterial({ color: 0x597451, roughness: 0.22, transparent: true, opacity: 0.7 })
      );
      sludge.rotation.x = -Math.PI / 2;
      sludge.position.set(rand(-24, 24), 0.52, rand(-6, 6));
      group.add(sludge);
    }
  }

  if (region.id === "melting_arctic_station") {
    for (let i = 0; i < 28; i += 1) {
      const ice = new THREE.Mesh(
        new THREE.ConeGeometry(rand(1.4, 3.4), rand(3, 9), 6),
        new THREE.MeshPhysicalMaterial({ color: 0xd9ecff, roughness: 0.25, transmission: 0.22, transparent: true, opacity: 0.9 })
      );
      ice.position.set(rand(-30, 30), rand(1.4, 4.2), rand(-30, 30));
      ice.rotation.y = rand(0, Math.PI);
      group.add(ice);
    }

    const stationMat = new THREE.MeshStandardMaterial({ color: 0xa1b4c5, roughness: 0.46, metalness: 0.38 });
    for (let i = 0; i < 5; i += 1) {
      const module = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.6, 3.8), stationMat);
      module.position.set(-12 + i * 6.2, 1.6, 5 + Math.sin(i * 0.8) * 3);
      module.castShadow = true;
      group.add(module);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.8, 8), stationMat);
      antenna.position.set(module.position.x, 4.0, module.position.z);
      group.add(antenna);
    }
  }

  group.position.y = terrainHeight(center.x, center.z);
  world.scene.add(group);
}

function nodeTypeForRegion(regionId) {
  if (!state.tutorial.completed) {
    const stage = currentCurriculumStage();
    if (stage?.regionId === regionId) {
      return state.missionById.get(stage.missionId)?.type || "scan";
    }
  }

  const active = activeMissionConfigs().find((mission) => mission.region === regionId && mission.type !== "decision");
  if (active) {
    return active.type;
  }
  const nextId = nextStoryMissionId();
  const nextCfg = nextId ? state.missionById.get(nextId) : null;
  if (nextCfg && nextCfg.region === regionId && nextCfg.type !== "decision") {
    return nextCfg.type;
  }
  return "scan";
}

function applyActionNodeStyle(node, type) {
  const color = TYPE_COLORS[type] || 0x98ffd6;
  node.type = type;
  if (node.mesh?.material?.color) {
    node.mesh.material.color.setHex(color);
  }
  if (node.mesh?.material?.emissive) {
    node.mesh.material.emissive.setHex(color);
    node.mesh.material.emissiveIntensity = node.cooldown > 0 ? 0.08 : 0.35;
  }
}

function buildActionNodes() {
  world.actionNodes.length = 0;

  for (const region of state.regions) {
    let hash = 0;
    for (const ch of region.id) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
    const angle = ((Math.abs(hash) % 360) / 360) * Math.PI * 2;
    const radius = clamp(region.radius * 0.42, 7.8, 12.5);
    const x = region.center.x + Math.cos(angle) * radius;
    const z = region.center.z + Math.sin(angle) * radius;
    const type = nodeTypeForRegion(region.id);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 2.35, 2.35),
      new THREE.MeshStandardMaterial({
        color: TYPE_COLORS[type] || 0x98ffd6,
        emissive: TYPE_COLORS[type] || 0x227766,
        emissiveIntensity: 0.35,
        roughness: 0.45,
        metalness: 0.42,
      })
    );
    const baseY = terrainHeight(x, z) + 1.95;
    mesh.position.set(x, baseY, z);
    mesh.castShadow = true;

    const label = createLabelSprite("INTERACT", "#dff6ff", "rgba(8,44,62,0.8)");
    label.scale.set(8.4, 2.2, 1);
    label.position.set(0, 2.25, 0);
    mesh.add(label);

    world.scene.add(mesh);
    world.actionNodes.push({
      id: `${region.id}_node`,
      type,
      region: region.id,
      mesh,
      label,
      cooldown: 0,
      baseY,
    });
  }
}

function createCleanupTargetMesh(type) {
  const group = new THREE.Group();
  const guide = cleanupGuideForType(type);
  const palette = {
    cleanup: { base: 0x2f6f84, core: 0xffc772 },
    filter: { base: 0x3f6f5c, core: 0xa7ffe2 },
    shutdown: { base: 0x5a6572, core: 0xff7f66 },
    restore: { base: 0x447251, core: 0x8cefff },
    stabilize: { base: 0x4a6788, core: 0xa8dbff },
    energy: { base: 0x4f6b3a, core: 0xf3ff93 },
  };
  const colors = palette[type] || { base: 0x4b5f72, core: 0xffca6a };

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.9, 1.1, 12),
    new THREE.MeshStandardMaterial({ color: colors.base, roughness: 0.45, metalness: 0.5 })
  );
  base.position.y = 0.55;
  group.add(base);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.44, 0),
    new THREE.MeshStandardMaterial({ color: colors.core, emissive: colors.core, emissiveIntensity: 0.5, roughness: 0.28, metalness: 0.35 })
  );
  core.position.y = 1.55;
  group.add(core);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.08, 10, 30),
    new THREE.MeshBasicMaterial({ color: 0xffefae, transparent: true, opacity: 0.85 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.45;
  group.add(halo);

  const label = createLabelSprite(`${guide.shortLabel}\nREMEDIATE`, "#fff7e0", "rgba(93,33,20,0.84)");
  label.scale.set(8, 2.2, 1);
  label.position.y = 3.4;
  group.add(label);

  group.userData.core = core;
  group.userData.halo = halo;
  group.userData.education = guide;
  group.userData.targetType = type;
  markShadowCasting(group);
  return group;
}

function buildCleanupTargets() {
  world.cleanupTargets.forEach((target) => world.scene.remove(target.mesh));
  world.cleanupTargets = [];

  const stage = !state.tutorial.completed ? currentCurriculumStage() : null;
  const stageMissionCfg = stage ? state.missionById.get(stage.missionId) : null;

  if (stage && stageMissionCfg) {
    if (!state.tutorial.stageObjectiveStarted || state.tutorial.stageObjectiveComplete) {
      return;
    }
    const region = state.regionById.get(stage.regionId);
    if (!region) {
      return;
    }

    const targetCount = Math.max(1, stageMissionCfg.target || CURRICULUM_STAGE_TARGET_COUNT);
    const targetType = stageMissionCfg.type || "cleanup";
    for (let i = 0; i < targetCount; i += 1) {
      const mesh = createCleanupTargetMesh(targetType);
      const angle = (i / targetCount) * Math.PI * 2 + Math.PI * 0.15;
      const radius = clamp(region.radius * 0.46, 7.5, 11.5);
      const x = region.center.x + Math.cos(angle) * radius;
      const z = region.center.z + Math.sin(angle) * radius;
      mesh.position.set(x, terrainHeight(x, z) + 0.1, z);
      world.scene.add(mesh);
      world.cleanupTargets.push({
        mesh,
        type: targetType,
        region: stage.regionId,
        hp: 90,
        maxHp: 90,
        education: mesh.userData.education,
      });
    }
    return;
  }

  const shootTypes = new Set(["cleanup", "filter", "shutdown", "restore"]);
  for (const node of world.actionNodes) {
    if (!shootTypes.has(node.type)) continue;
    const region = state.regionById.get(node.region);
    if (!region) continue;

    if (stage && node.region !== stage.regionId) {
      continue;
    }

    const targetCount = stage && stageMissionCfg && node.region === stage.regionId
      ? Math.max(1, stageMissionCfg.target)
      : 4;

    for (let i = 0; i < targetCount; i += 1) {
      const mesh = createCleanupTargetMesh(node.type);
      const angle = ((i + 1) / (targetCount + 1)) * Math.PI * 2 + rand(-0.15, 0.15);
      const radius = stage ? clamp(region.radius * 0.5, 8, 12) : rand(6, Math.max(10, region.radius * 0.55));
      const x = region.center.x + Math.cos(angle) * radius;
      const z = region.center.z + Math.sin(angle) * radius;
      mesh.position.set(x, terrainHeight(x, z) + 0.1, z);
      world.scene.add(mesh);
      world.cleanupTargets.push({
        mesh,
        type: node.type,
        region: node.region,
        hp: 90,
        maxHp: 90,
        education: mesh.userData.education,
      });
    }
  }
}

function updateCleanupTargets(dt) {
  const t = performance.now() * 0.001;
  for (const target of world.cleanupTargets) {
    const core = target.mesh.userData.core;
    const halo = target.mesh.userData.halo;
    if (core) {
      core.rotation.y += dt * 1.4;
      core.position.y = 1.55 + Math.sin(t * 2.2 + target.mesh.position.x * 0.03) * 0.08;
    }
    if (halo) {
      halo.rotation.z += dt * 1.2;
      halo.scale.setScalar(1 + Math.sin(t * 3 + target.mesh.position.z * 0.04) * 0.1);
    }
  }
}

function ensureMissionBeacon(regionId) {
  const region = state.regionById.get(regionId);
  if (!region) return null;

  if (!world.missionBeacons.has(regionId)) {
    const beacon = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.8, 0.15, 12, 40),
      new THREE.MeshBasicMaterial({ color: 0x9de8ff, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = Math.PI / 2;
    beacon.add(ring);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.6, 8, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x78d0ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    pillar.position.y = 4;
    beacon.add(pillar);

    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x9df3ff })
    );
    top.position.y = 8.2;
    beacon.add(top);

    beacon.visible = false;
    world.scene.add(beacon);
    world.missionBeacons.set(regionId, beacon);
  }

  return world.missionBeacons.get(regionId);
}

function updateMissionBeacons(dt) {
  state.missionPing.targetRegions = missionTargetRegions();
  state.missionPing.pulse += dt * 3.2;
  const pulse = 1 + Math.sin(state.missionPing.pulse) * 0.18;

  for (const region of state.regions) {
    const beacon = ensureMissionBeacon(region.id);
    if (!beacon) continue;
    const target = state.missionPing.targetRegions.includes(region.id);
    beacon.visible = target;
    if (!target) continue;

    const y = terrainHeight(region.center.x, region.center.z) + 0.6;
    beacon.position.set(region.center.x, y, region.center.z);
    beacon.scale.setScalar(pulse);
    beacon.children[0].rotation.z += dt * 0.7;
  }
}

function ensureDisasterVfx() {
  if (world.disasterVfx) {
    return world.disasterVfx;
  }

  const group = new THREE.Group();
  const pulseRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.5, 0.25, 12, 48),
    new THREE.MeshBasicMaterial({ color: 0xffa06a, transparent: true, opacity: 0.82, depthWrite: false })
  );
  pulseRing.rotation.x = Math.PI / 2;
  pulseRing.position.y = 0.48;
  group.add(pulseRing);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.13, 12, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd3a2, transparent: true, opacity: 0.75, depthWrite: false })
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.52;
  group.add(innerRing);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 18, 16),
    new THREE.MeshStandardMaterial({
      color: 0xff8f58,
      emissive: 0xff6d38,
      emissiveIntensity: 1.25,
      transparent: true,
      opacity: 0.46,
      roughness: 0.2,
      metalness: 0.12,
      depthWrite: false,
    })
  );
  glow.position.y = 3.0;
  group.add(glow);

  const hazardLight = new THREE.PointLight(0xff7e4f, 2.0, 54, 2);
  hazardLight.position.y = 4.0;
  group.add(hazardLight);

  const texture = getSoftParticleTexture();
  const smokeParticles = [];
  for (let i = 0; i < 108; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: 0x6b7278,
        transparent: true,
        opacity: rand(0.16, 0.42),
        depthWrite: false,
        depthTest: true,
      })
    );
    group.add(sprite);
    smokeParticles.push({
      sprite,
      angle: rand(0, Math.PI * 2),
      radius: rand(1.0, 4.8),
      height: rand(0.4, 13.8),
      rise: rand(1.5, 3.7),
      wobble: rand(0.8, 2.6),
      drift: rand(0.1, 1.1),
      phase: rand(0, Math.PI * 2),
      baseScale: rand(2.2, 6.2),
      maxHeight: rand(18, 30),
      baseOpacity: rand(0.18, 0.48),
    });
  }

  const emberParticles = [];
  for (let i = 0; i < 26; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: 0xffe1a6,
        transparent: true,
        opacity: rand(0.25, 0.7),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    group.add(sprite);
    emberParticles.push({
      sprite,
      angle: rand(0, Math.PI * 2),
      radius: rand(0.35, 2.5),
      height: rand(0.5, 7.5),
      rise: rand(2.0, 4.8),
      spin: rand(0.3, 1.7),
      jitter: rand(0.3, 1.2),
      phase: rand(0, Math.PI * 2),
      baseScale: rand(0.18, 0.5),
      maxHeight: rand(8, 14),
      baseOpacity: rand(0.3, 0.9),
    });
  }

  group.visible = false;
  world.scene.add(group);

  world.disasterVfx = {
    group,
    pulseRing,
    innerRing,
    glow,
    hazardLight,
    smokeParticles,
    emberParticles,
    profile: null,
    activeType: "",
  };
  return world.disasterVfx;
}

function configureDisasterVfx(type) {
  const vfx = ensureDisasterVfx();
  const profile = disasterVisualProfile(type);
  vfx.profile = profile;
  vfx.activeType = type;
  vfx.pulseRing.material.color.setHex(profile.ring);
  vfx.innerRing.material.color.setHex(profile.ember);
  vfx.glow.material.color.setHex(profile.glow);
  vfx.glow.material.emissive.setHex(profile.glow);
  vfx.hazardLight.color.setHex(profile.glow);

  for (const particle of vfx.smokeParticles) {
    particle.sprite.material.color.setHex(profile.smoke);
    particle.height = rand(0.8, profile.plumeHeight * 0.72);
    particle.maxHeight = rand(profile.plumeHeight * 1.25, profile.plumeHeight * 1.95);
    particle.baseOpacity = rand(0.2, 0.5);
    particle.angle = rand(0, Math.PI * 2);
  }
  for (const particle of vfx.emberParticles) {
    particle.sprite.material.color.setHex(profile.ember);
    particle.height = rand(0.6, profile.plumeHeight * 0.45);
    particle.maxHeight = rand(profile.plumeHeight * 0.5, profile.plumeHeight * 0.9);
    particle.baseOpacity = rand(0.28, 0.86);
    particle.angle = rand(0, Math.PI * 2);
  }
}

function updateDisasterVfx(dt) {
  if (!world.disasterVfx) {
    if (!state.activeDisaster) {
      return;
    }
    ensureDisasterVfx();
  }
  const vfx = world.disasterVfx;

  if (!state.activeDisaster || !world.disasterBeacon || !world.disasterBeacon.visible) {
    vfx.group.visible = false;
    return;
  }
  const region = state.regionById.get(state.activeDisaster.region);
  if (!region) {
    vfx.group.visible = false;
    return;
  }
  if (!vfx.profile || vfx.activeType !== state.activeDisaster.type) {
    configureDisasterVfx(state.activeDisaster.type);
  }

  const profile = vfx.profile || disasterVisualProfile(state.activeDisaster.type);
  const time = performance.now() * 0.001;
  const severity = clamp(state.activeDisaster.severity / 1.7, 0.55, 1.8);
  vfx.group.visible = true;
  vfx.group.position.set(region.center.x, terrainHeight(region.center.x, region.center.z) + 1.8, region.center.z);

  const ringPulse = 1 + Math.sin(time * 7.4) * (0.12 + severity * 0.08);
  vfx.pulseRing.scale.setScalar(ringPulse * (1 + severity * 0.2));
  vfx.innerRing.scale.setScalar((1.04 - Math.sin(time * 5.2) * 0.08) * (1 + severity * 0.12));
  vfx.pulseRing.material.opacity = 0.56 + Math.sin(time * 8.1) * 0.18;
  vfx.innerRing.material.opacity = 0.48 + Math.cos(time * 6.6) * 0.22;

  vfx.glow.position.y = 4.8 + Math.sin(time * 5.1) * 0.42;
  vfx.glow.scale.setScalar(1 + Math.sin(time * 6.8) * 0.12 + severity * 0.14);
  vfx.glow.material.opacity = 0.24 + severity * 0.16 + Math.sin(time * 5.3) * 0.08;
  vfx.hazardLight.intensity = 1.9 + severity * 1.25 + Math.sin(time * 9.3) * 0.45;

  for (const particle of vfx.smokeParticles) {
    particle.height += dt * (particle.rise + severity * 1.45);
    if (particle.height > particle.maxHeight) {
      particle.height = rand(0.2, 1.5);
      particle.angle = rand(0, Math.PI * 2);
      particle.radius = rand(0.6, 3.7 + severity * 1.2);
    }
    particle.angle += dt * (0.22 + particle.drift * 0.45 + profile.turbulence * 0.22);
    const wobble = Math.sin(time * (particle.wobble + profile.turbulence * 0.3) + particle.phase) * (0.28 + severity * 0.28);
    const radius = particle.radius + wobble;
    particle.sprite.position.set(Math.cos(particle.angle) * radius, 1.7 + particle.height, Math.sin(particle.angle) * radius);

    const life = clamp(1 - particle.height / particle.maxHeight, 0, 1);
    const scale = particle.baseScale * (0.42 + (1 - life) * 1.9);
    particle.sprite.scale.set(scale, scale, scale);
    particle.sprite.material.opacity = clamp(particle.baseOpacity * (life * 1.45), 0.02, 0.48);
  }

  for (const particle of vfx.emberParticles) {
    particle.height += dt * (particle.rise + severity * 2.1);
    if (particle.height > particle.maxHeight) {
      particle.height = rand(0.5, 1.8);
      particle.angle = rand(0, Math.PI * 2);
      particle.radius = rand(0.22, 2.6);
    }
    particle.angle += dt * (particle.spin + profile.turbulence * 0.36);
    const jitter = Math.sin(time * (3.2 + particle.jitter) + particle.phase) * (0.15 + severity * 0.14);
    const radius = particle.radius + jitter;
    particle.sprite.position.set(Math.cos(particle.angle) * radius, 1.9 + particle.height, Math.sin(particle.angle) * radius);
    const life = clamp(1 - particle.height / particle.maxHeight, 0, 1);
    const scale = particle.baseScale * (0.75 + life * 0.95);
    particle.sprite.scale.set(scale, scale, scale);
    particle.sprite.material.opacity = clamp(particle.baseOpacity * life, 0.04, 0.9);
  }
}

function buildNpcs() {
  world.npcObjects.length = 0;

  for (const npc of state.npcs) {
    const style = npc.id === "dr_maya_chen"
      ? { suitColor: 0x6f95bf, skinColor: 0xe2b497, hairColor: 0x1b1b1f, hairStyle: "long" }
      : npc.id === "captain_elias_torres"
        ? { suitColor: 0x3f6d95, skinColor: 0xc99973, hairColor: 0x2a211c, hairStyle: "short" }
        : npc.id === "ava_singh"
          ? { suitColor: 0x4b916d, skinColor: 0xd0a98b, hairColor: 0x2a2221, hairStyle: "shaved" }
          : npc.id === "lina_park"
            ? { suitColor: 0x7e8b42, skinColor: 0xd5ab8f, hairColor: 0x1f1b1a, hairStyle: "short" }
          : { suitColor: 0x7d7568, skinColor: 0xc69b7d, hairColor: 0x2d2a28, hairStyle: "short" };
    const group = createHumanoidRig(style);

    const label = createLabelSprite(npc.name, "#dcf4ff", "rgba(8,17,28,0.76)");
    label.position.y = 4.2;
    group.add(label);

    const y = terrainHeight(npc.position.x, npc.position.z) + 1.5;
    group.position.set(npc.position.x, y, npc.position.z);
    world.scene.add(group);

    world.npcObjects.push({ npc, mesh: group });
  }
}

function spawnEnemy(type, regionId) {
  const region = state.regionById.get(regionId);
  if (!region) {
    return;
  }

  const mesh = createEnemyRig(type);
  const angle = rand(0, Math.PI * 2);
  const radius = rand(8, region.radius * 0.75);
  const x = region.center.x + Math.cos(angle) * radius;
  const z = region.center.z + Math.sin(angle) * radius;
  const hoverHeight = mesh.userData.hoverHeight || 1.7;
  mesh.position.set(x, terrainHeight(x, z) + hoverHeight, z);

  const threatLabel = createLabelSprite("THREAT", "#ffe8dd", "rgba(118,24,24,0.82)");
  threatLabel.scale.set(7.4, 2.1, 1);
  threatLabel.position.y = type === "Oil Leviathans" ? 5.1 : 3.7;
  mesh.add(threatLabel);

  const targetRing = new THREE.Mesh(
    new THREE.TorusGeometry((mesh.userData.hitRadius || 1.4) + 0.35, 0.08, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0xff8570, transparent: true, opacity: 0.9 })
  );
  targetRing.rotation.x = Math.PI / 2;
  targetRing.position.y = -hoverHeight + 0.16;
  mesh.add(targetRing);

  world.scene.add(mesh);

  world.enemies.push({
    type,
    region: regionId,
    mesh,
    theta: rand(0, Math.PI * 2),
    speed: rand(0.15, 0.42),
    damage: rand(2.4, 6.0) * GAME_BALANCE.meleeDamageMultiplier,
    pollution: rand(0.6, 1.5),
    hp: mesh.userData.hp || 100,
    label: threatLabel,
    targetRing,
    hitRadius: mesh.userData.hitRadius || 1.4,
    hoverHeight,
    fireCooldown: rand(2.1, 4.8),
  });
}

function populateEnemies() {
  world.enemies.length = 0;
  for (const region of state.regions) {
    spawnEnemy(ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)], region.id);
    if (Math.random() > 0.92) {
      spawnEnemy(ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)], region.id);
    }
  }
}

function spawnWildlife(regionId, count = 4) {
  const region = state.regionById.get(regionId);
  if (!region) return;

  for (let i = 0; i < count; i += 1) {
    const creature = createWildlifeRig(false);
    creature.scale.setScalar(rand(0.9, 1.2));
    const theta = rand(0, Math.PI * 2);
    const radius = rand(8, region.radius * 0.65);
    const x = region.center.x + Math.cos(theta) * radius;
    const z = region.center.z + Math.sin(theta) * radius;
    creature.position.set(x, terrainHeight(x, z) + 1.0, z);
    world.scene.add(creature);
    world.wildlife.push({
      mesh: creature,
      region: regionId,
      theta,
      speed: rand(0.18, 0.44),
      radius,
      offset: rand(0, 1000),
    });
  }
}

function populateWildlife() {
  for (const region of state.regions) {
    if (region.id === "dying_rainforest" || region.id === "coastal_plastic_zone" || region.id === "melting_arctic_station") {
      spawnWildlife(region.id, 6);
    }
  }
}

function createWeaponModel() {
  if (world.weaponModel) {
    world.weaponModel.parent?.remove(world.weaponModel);
    world.weaponModel = null;
  }
  const parent = world.camera;
  const weapon = new THREE.Group();

  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2f3d48, roughness: 0.34, metalness: 0.78 });
  const matteMetal = new THREE.MeshStandardMaterial({ color: 0x546879, roughness: 0.46, metalness: 0.52 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.82, metalness: 0.12 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x7fcff4, emissive: 0x2d8ec3, emissiveIntensity: 0.45, roughness: 0.2, metalness: 0.48 });

  const receiver = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.58, 8, 14), darkMetal);
  receiver.rotation.z = Math.PI / 2;
  receiver.position.set(0, 0, 0);
  weapon.add(receiver);

  const stock = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.28, 6, 12), matteMetal);
  stock.rotation.z = Math.PI / 2;
  stock.position.set(0.02, -0.01, 0.35);
  weapon.add(stock);

  const handGuard = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.44, 6, 12), matteMetal);
  handGuard.rotation.z = Math.PI / 2;
  handGuard.position.set(-0.01, 0.01, -0.43);
  weapon.add(handGuard);

  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 6, 10), polymer);
  grip.position.set(0.03, -0.2, 0.06);
  grip.rotation.x = -0.2;
  weapon.add(grip);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.88, 12), darkMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(-0.01, 0.01, -0.86);
  weapon.add(barrel);

  const barrelShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.38, 10), matteMetal);
  barrelShroud.rotation.x = Math.PI / 2;
  barrelShroud.position.set(-0.01, 0.01, -0.59);
  weapon.add(barrelShroud);

  const sightBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.1, 4, 10), polymer);
  sightBase.rotation.z = Math.PI / 2;
  sightBase.position.set(0.01, 0.12, -0.16);
  weapon.add(sightBase);

  const holoSight = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.08, 4, 10), accent);
  holoSight.rotation.z = Math.PI / 2;
  holoSight.position.set(0.01, 0.16, -0.16);
  weapon.add(holoSight);

  const sideRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 10), darkMetal);
  sideRail.rotation.x = Math.PI / 2;
  sideRail.position.set(-0.1, 0, -0.25);
  weapon.add(sideRail);

  const muzzle = new THREE.PointLight(0xaee4ff, 0, 10, 2);
  muzzle.position.set(-0.01, 0.01, -1.27);
  weapon.add(muzzle);

  const basePose = { x: 0.34, y: -0.26, z: -0.56 };
  weapon.position.set(basePose.x, basePose.y, basePose.z);
  weapon.rotation.set(-0.08, 0.09, -0.03);

  world.weaponModel = weapon;
  world.weaponModel.userData.muzzle = muzzle;
  world.weaponModel.userData.basePose = basePose;
  world.weaponModel.userData.recoil = 0;
  parent.add(weapon);
}

function createFirstPersonRig(profile) {
  if (world.fpsRig) {
    world.camera.remove(world.fpsRig.group);
    world.fpsRig = null;
  }

  const suit = new THREE.MeshStandardMaterial({ color: new THREE.Color(profile.suitColor || "#2ec27e"), roughness: 0.34, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x243443, roughness: 0.62, metalness: 0.18 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd3aa8f, roughness: 0.68, metalness: 0.05 });

  const rig = new THREE.Group();
  rig.position.set(0, -0.52, 0);

  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.24, 6, 12), suit);
  hips.rotation.z = Math.PI / 2;
  hips.position.set(0, -0.74, -0.46);
  rig.add(hips);

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 10), suit);
  leftLeg.position.set(-0.12, -1.15, -0.53);
  rig.add(leftLeg);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.12;
  rig.add(rightLeg);

  const leftBoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.16, 4, 8), dark);
  leftBoot.rotation.z = Math.PI / 2;
  leftBoot.position.set(-0.12, -1.58, -0.4);
  rig.add(leftBoot);
  const rightBoot = leftBoot.clone();
  rightBoot.position.x = 0.12;
  rig.add(rightBoot);

  const leftForeArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), suit);
  leftForeArm.position.set(0.15, -0.64, -0.69);
  leftForeArm.rotation.z = -1.1;
  leftForeArm.rotation.x = -0.3;
  rig.add(leftForeArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin);
  leftHand.position.set(0.34, -0.64, -0.82);
  rig.add(leftHand);

  world.camera.add(rig);
  world.fpsRig = {
    group: rig,
    leftLeg,
    rightLeg,
    leftBoot,
    rightBoot,
    leftForeArm,
    leftHand,
    bobTime: 0,
  };
}

function createPlayer(profile) {
  if (world.playerMesh) {
    world.scene.remove(world.playerMesh);
  }

  const group = createHumanoidRig({
    suitColor: new THREE.Color(profile.suitColor || "#2ec27e").getHex(),
    skinColor: 0xd3aa8f,
    hairColor: 0x2a2422,
    hairStyle: profile.hairStyle?.includes("Long") ? "long" : profile.hairStyle?.includes("Shaved") ? "shaved" : "short",
    metallic: 0.3,
    roughness: 0.42,
    scale: 1.04,
  });
  const suitColor = new THREE.Color(profile.suitColor || "#2ec27e");
  const shoulderLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({ color: suitColor, emissive: suitColor.clone().multiplyScalar(0.2), roughness: 0.3, metalness: 0.5 })
  );
  shoulderLight.position.set(0.45, 1.95, 0.18);
  group.add(shoulderLight);

  group.position.copy(state.player.position);
  group.position.y = terrainHeight(group.position.x, group.position.z) + 1.45;

  world.playerMesh = group;
  world.scene.add(group);
  createFirstPersonRig(profile);
  createWeaponModel();

  if (!world.droneMesh) {
    const drone = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x7ec9ff, emissive: 0x1b4d72, roughness: 0.34, metalness: 0.55 })
    );
    drone.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x6fdfff })
    );
    ring.rotation.x = Math.PI / 2;
    drone.add(ring);

    const light = new THREE.PointLight(0x66ddff, 1.2, 14, 2.0);
    drone.add(light);
    world.droneMesh = drone;
    world.scene.add(drone);
  }
}

function computeBonuses(backgroundClass) {
  if (backgroundClass === "Scientist") {
    return { movement: 1.0, rep: 1.0, cleanup: 1.3, engineering: 1.0, scan: 1.1 };
  }
  if (backgroundClass === "Engineer") {
    return { movement: 1.0, rep: 1.0, cleanup: 1.0, engineering: 1.35, scan: 1.0 };
  }
  if (backgroundClass === "Explorer") {
    return { movement: 1.18, rep: 1.0, cleanup: 1.0, engineering: 1.0, scan: 1.35 };
  }
  return { movement: 1.0, rep: 1.3, cleanup: 1.0, engineering: 1.0, scan: 1.0 };
}

function initPollutionGrid() {
  state.pollutionGrid = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const wx = toWorldCoord(x);
      const wz = toWorldCoord(y);
      const region = nearestRegion(wx, wz);
      const base = region ? region.pollution : 45;
      const level = clamp(base + rand(-14, 14), 0, 100);
      let type = "air pollution";
      if (region) {
        if (region.id === "coastal_plastic_zone") {
          type = "plastic waste";
        } else if (region.id === "toxic_river_basin") {
          type = "chemical contamination";
        } else if (region.id === "industrial_smog_city") {
          type = "air pollution";
        } else if (region.id === "melting_arctic_station") {
          type = "oil spills";
        }
      }
      row.push({ level, type });
    }
    state.pollutionGrid.push(row);
  }
}

function nearestRegion(x, z) {
  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const region of state.regions) {
    const d = dist2({ x, z }, region.center);
    if (d < bestDist) {
      bestDist = d;
      best = region;
    }
  }
  return best;
}

function addPollutionAt(x, z, delta, type = null) {
  const gx = toGridCoord(x);
  const gy = toGridCoord(z);
  for (let oy = -2; oy <= 2; oy += 1) {
    for (let ox = -2; ox <= 2; ox += 1) {
      const ix = gx + ox;
      const iy = gy + oy;
      if (ix < 0 || ix >= GRID_SIZE || iy < 0 || iy >= GRID_SIZE) {
        continue;
      }
      const cell = state.pollutionGrid[iy][ix];
      const influence = 1 - Math.min(1, Math.sqrt(ox * ox + oy * oy) / 3);
      cell.level = clamp(cell.level + delta * influence, 0, 100);
      if (type && Math.abs(delta) > 0.25) {
        cell.type = type;
      }
    }
  }
  state.satellite.dirty = true;
}

function sampleRegionalPollution(regionId) {
  const region = state.regionById.get(regionId);
  if (!region) {
    return 50;
  }
  let sum = 0;
  let count = 0;
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const wx = toWorldCoord(x);
      const wz = toWorldCoord(y);
      if (dist2({ x: wx, z: wz }, region.center) <= region.radius) {
        sum += state.pollutionGrid[y][x].level;
        count += 1;
      }
    }
  }
  return count > 0 ? sum / count : region.pollution;
}

function updatePollutionGrid(dt) {
  if (!state.pollutionGrid.length) {
    return;
  }
  const next = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const cell = state.pollutionGrid[y][x];
      let neighborSum = 0;
      let neighbors = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox === 0 && oy === 0) {
            continue;
          }
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) {
            continue;
          }
          neighborSum += state.pollutionGrid[ny][nx].level;
          neighbors += 1;
        }
      }

      const avg = neighbors > 0 ? neighborSum / neighbors : cell.level;
      const wx = toWorldCoord(x);
      const wz = toWorldCoord(y);
      const region = nearestRegion(wx, wz);
      const baseline = region ? region.pollution : 45;
      const biodiversity = region ? region.biodiversity : 50;
      const naturalRecovery = (biodiversity - 50) * 0.015;

      let nextLevel = cell.level + (avg - cell.level) * 0.22 * dt + (baseline - cell.level) * 0.045 * dt;
      nextLevel -= naturalRecovery * dt;

      if (state.activeDisaster && region && state.activeDisaster.region === region.id) {
        nextLevel += 0.22 * state.activeDisaster.severity * dt;
      }

      row.push({ level: clamp(nextLevel, 0, 100), type: cell.type });
    }
    next.push(row);
  }

  state.pollutionGrid = next;
  state.satellite.dirty = true;
}

function initializeMissionState(savedProgress = {}) {
  const defaultUnlocked = new Set();
  state.missionState = {};
  for (const mission of state.missions) {
    state.missionState[mission.id] = {
      status: defaultUnlocked.has(mission.id) ? "available" : "locked",
      progress: 0,
      timeLeft: mission.timerSeconds || 0,
    };
  }

  for (const [id, data] of Object.entries(savedProgress || {})) {
    if (state.missionState[id]) {
      const missionCfg = state.missionById.get(id);
      const loadedTimeLeft = data.timeLeft ?? state.missionState[id].timeLeft;
      const loadedStatus = data.status || state.missionState[id].status;
      state.missionState[id] = {
        status: loadedStatus === "failed" ? "active" : loadedStatus,
        progress: data.progress || 0,
        timeLeft:
          loadedStatus === "failed"
            ? Math.max(
                loadedTimeLeft,
                Math.max(GAME_BALANCE.missionFailGraceTime, (missionCfg?.timerSeconds || 0) * 0.55)
              )
            : loadedTimeLeft,
      };
    }
  }
}

function unlockMission(missionId) {
  const mission = state.missionState[missionId];
  if (!mission) {
    return;
  }
  if (mission.status === "locked") {
    mission.status = "available";
    showMessage(`Mission unlocked: ${state.missionById.get(missionId).title}`);
    renderMissionLog();
    renderTravelButtons();
    guideStoryFlow();
  }
}

function startMission(missionId) {
  const missionCfg = state.missionById.get(missionId);
  const mission = state.missionState[missionId];
  if (!missionCfg || !mission || (mission.status !== "available" && mission.status !== "failed")) {
    return;
  }

  for (const [id, missionState] of Object.entries(state.missionState)) {
    if (id !== missionId && missionState.status === "active") {
      missionState.status = "available";
    }
  }

  mission.status = "active";
  mission.progress = 0;
  mission.timeLeft = missionCfg.timerSeconds || 0;

  if (missionCfg.type === "decision") {
    dom.aresPanel.classList.remove("hidden");
  }

  showMessage(`Mission started: ${missionCfg.title}`);
  renderMissionLog();
  renderTravelButtons();
}

function completeMission(missionId) {
  const missionCfg = state.missionById.get(missionId);
  const mission = state.missionState[missionId];
  if (!missionCfg || !mission || mission.status === "completed") {
    return;
  }

  mission.status = "completed";
  mission.progress = missionCfg.target;
  mission.timeLeft = 0;

  handleCurriculumMissionCompleted(missionId);

  const rewardMultiplier = 1.35;
  const repReward = Math.round(missionCfg.rewards.reputation * rewardMultiplier * state.bonuses.rep);
  state.funding += Math.round(missionCfg.rewards.funding * rewardMultiplier);
  state.reputation += repReward;
  state.restoredCount += missionCfg.target;

  const region = state.regionById.get(missionCfg.region);
  if (region) {
    region.pollution = clamp(region.pollution - missionCfg.rewards.ecoBoost * 1.9, 0, 100);
    region.waterHealth = clamp(region.waterHealth + missionCfg.rewards.ecoBoost * 1.45, 0, 100);
    region.biodiversity = clamp(region.biodiversity + missionCfg.rewards.ecoBoost * 1.3, 0, 100);
    region.climateStability = clamp(region.climateStability + missionCfg.rewards.ecoBoost * 1.25, 0, 100);
    region.forestCoverage = clamp(region.forestCoverage + missionCfg.rewards.ecoBoost * 0.8, 0, 100);
    region.renewableRatio = clamp(region.renewableRatio + missionCfg.rewards.ecoBoost * 0.45, 0, 100);
  }

  if (missionCfg.major) {
    triggerTimelapse(10);
  }

  if (missionId === "clean_plastic_islands") {
    unlockMission("restore_coral_reefs");
  }
  if (missionId === "shutdown_polluting_factories") {
    unlockMission("replant_forests");
  }
  if (missionId === "replant_forests") {
    unlockMission("stabilize_arctic_core");
  }

  const gate = ["ares_signal_trace", "stabilize_arctic_core", "restore_contaminated_rivers"];
  const gateOk = gate.every((id) => state.missionState[id] && state.missionState[id].status === "completed");
  if (gateOk) {
    unlockMission("final_ares_decision");
  }

  const nextMission = nextStoryMissionId();
  if (nextMission && nextMission !== missionId) {
    unlockMission(nextMission);
  }
  guideStoryFlow();

  audio.playCleanupSuccess();
  audio.playTone(760, 0.32, 0.06, "triangle");
  showMessage(`Mission completed: ${missionCfg.title}`);
  checkAchievements();
  renderMissionLog();
  renderTravelButtons();
}

function failMission(missionId) {
  const missionCfg = state.missionById.get(missionId);
  const mission = state.missionState[missionId];
  if (!missionCfg || !mission || mission.status !== "active") {
    return;
  }

  const retainedProgress = clamp(mission.progress * GAME_BALANCE.missionFailProgressRetention, 0, missionCfg.target);
  mission.status = "active";
  mission.progress = retainedProgress;
  mission.timeLeft = Math.max(
    GAME_BALANCE.missionFailGraceTime,
    (missionCfg.timerSeconds || GAME_BALANCE.missionFailGraceTime) * 0.55
  );
  applyPenalty("mission_failed", 0.5);
  showMessage(`Timer reached on ${missionCfg.title}. Progress retained and extra time granted.`, true);
  audio.playTone(240, 0.22, 0.06, "triangle");
  renderMissionLog();
  renderTravelButtons();
}

function applyMissionProgress(type, regionId, amount, source = "generic") {
  const activeStage = !state.tutorial.completed ? currentCurriculumStage() : null;
  const activeStageMissionId = activeStage ? activeStage.missionId : "";

  for (const missionCfg of state.missions) {
    const mission = state.missionState[missionCfg.id];
    if (!mission || mission.status !== "active") {
      continue;
    }
    if (missionCfg.type !== type || missionCfg.region !== regionId) {
      continue;
    }

    if (activeStageMissionId && missionCfg.id !== activeStageMissionId) {
      continue;
    }

    let increment = amount * GAME_BALANCE.missionProgressMultiplier;
    if (activeStageMissionId && missionCfg.id === activeStageMissionId) {
      // Curriculum islands progress only from destroying marked targets.
      if (source !== "cleanup_target") {
        continue;
      }
      increment = 1;
    }

    mission.progress = clamp(mission.progress + increment, 0, missionCfg.target);
    if (mission.progress >= missionCfg.target) {
      completeMission(missionCfg.id);
    }
  }
}

function openPanel(panel) {
  panel.classList.remove("hidden");
}

function closePanel(panel) {
  panel.classList.add("hidden");
}

function drawWorldMapPanel() {
  if (!dom.worldMapCanvas) return;
  const ctx = dom.worldMapCanvas.getContext("2d");
  const w = dom.worldMapCanvas.width;
  const h = dom.worldMapCanvas.height;
  const balance = ecosystemBalance();

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#12324a");
  g.addColorStop(0.45, "#1b5b69");
  g.addColorStop(1, "#24553d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(12,36,56,0.42)";
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    const x = (i / 6) * w;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 40, h);
    ctx.lineTo(x + 18, h);
    ctx.lineTo(x - 18, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(26, 86, 62, 0.34)";
  for (let i = 0; i < 12; i += 1) {
    const rx = (i * 73 + 40) % w;
    const ry = (i * 97 + 60) % h;
    const rw = 50 + (i % 5) * 18;
    const rh = 24 + (i % 4) * 14;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, (i % 7) * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }

  const current = currentRegion();
  const targetSet = new Set(state.missionPing.targetRegions);
  const pulse = 1 + Math.sin(state.missionPing.pulse) * 0.3;
  const homeX = ((HOME_ISLAND.x + WORLD_HALF) / (WORLD_HALF * 2)) * w;
  const homeY = ((HOME_ISLAND.z + WORLD_HALF) / (WORLD_HALF * 2)) * h;
  ctx.beginPath();
  ctx.fillStyle = "rgba(180, 231, 255, 0.9)";
  ctx.arc(homeX, homeY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(235,247,255,0.95)";
  ctx.font = "700 13px Rajdhani";
  ctx.textAlign = "center";
  ctx.fillText("HOME", homeX, homeY - 14);
  const regionBackdrop = {
    coastal_plastic_zone: "rgba(64, 140, 188, 0.42)",
    industrial_smog_city: "rgba(122, 118, 112, 0.48)",
    dying_rainforest: "rgba(64, 135, 78, 0.45)",
    toxic_river_basin: "rgba(101, 126, 82, 0.44)",
    melting_arctic_station: "rgba(154, 198, 230, 0.42)",
  };

  for (const region of state.regions) {
    const x = ((region.center.x + WORLD_HALF) / (WORLD_HALF * 2)) * w;
    const y = ((region.center.z + WORLD_HALF) / (WORLD_HALF * 2)) * h;
    const health = (region.biodiversity + region.waterHealth + region.climateStability) / 3;
    const color = healthColor(health);

    ctx.beginPath();
    ctx.fillStyle = regionBackdrop[region.id] || "rgba(120,140,160,0.35)";
    ctx.ellipse(x, y, 70, 36, ((x + y) % 13) * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.9)`;
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(235,247,255,0.94)";
    ctx.font = "600 15px Rajdhani";
    ctx.textAlign = "center";
    ctx.fillText(region.name, x, y - 16);

    if (current && current.id === region.id) {
      ctx.strokeStyle = "rgba(197, 255, 212, 0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 19, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (targetSet.has(region.id)) {
      ctx.strokeStyle = "rgba(255,245,150,0.92)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(x, y, 24 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,241,181,0.95)";
      ctx.font = "700 14px Rajdhani";
      ctx.fillText("MISSION TARGET", x, y + 30);
    }
  }

  if (current) {
    ctx.fillStyle = "rgba(7,21,31,0.72)";
    ctx.fillRect(12, h - 56, 300, 44);
    ctx.strokeStyle = "rgba(145,210,238,0.6)";
    ctx.strokeRect(12, h - 56, 300, 44);
    ctx.fillStyle = "#d9f5ff";
    ctx.font = "600 17px Rajdhani";
    ctx.textAlign = "left";
    ctx.fillText(`Current Region: ${current.name}`, 22, h - 29);
  }

  const boxX = w - 290;
  const boxY = h - 56;
  ctx.fillStyle = "rgba(7,21,31,0.72)";
  ctx.fillRect(boxX, boxY, 274, 44);
  ctx.strokeStyle = "rgba(145,210,238,0.6)";
  ctx.strokeRect(boxX, boxY, 274, 44);
  ctx.fillStyle = "#d9f5ff";
  ctx.font = "600 14px Rajdhani";
  ctx.textAlign = "left";
  ctx.fillText(`Healthy ${balance.healthy}% | Unhealthy ${balance.unhealthy}%`, boxX + 10, boxY + 18);
  ctx.fillStyle = "#34d06f";
  ctx.fillRect(boxX + 10, boxY + 26, (250 * balance.healthy) / 100, 9);
  ctx.fillStyle = "#ff7b58";
  ctx.fillRect(boxX + 10 + (250 * balance.healthy) / 100, boxY + 26, (250 * balance.unhealthy) / 100, 9);
}

function renderTravelButtons() {
  dom.travelButtons.innerHTML = "";
  state.missionPing.targetRegions = missionTargetRegions();
  const targets = new Set(state.missionPing.targetRegions);
  const travelLocked = !state.tutorial.completed;
  const strictTargets = strictTravelTargets();
  const hasStrictObjective = Boolean(activeMissionConfigs()[0] || nextStoryMissionId() || state.activeDisaster);
  const enforceStrictRoute = state.tutorial.completed && hasStrictObjective && strictTargets.size > 0;
  for (const region of state.regions) {
    const btn = document.createElement("button");
    const strictLocked = enforceStrictRoute && !strictTargets.has(region.id);
    btn.textContent = `${targets.has(region.id) ? ">> " : ""}${region.name}`;
    btn.disabled = travelLocked || strictLocked;
    if (strictLocked) {
      btn.textContent = `LOCKED - ${region.name}`;
      btn.title = "Complete current guided objective to unlock this region.";
    }
    btn.addEventListener("click", () => {
      if (travelLocked) {
        showMessage("Complete tutorial before long-range travel.");
        return;
      }
      if (strictLocked) {
        const directive = currentStoryDirective();
        showMessage(`Route locked. ${directive.route}`);
        return;
      }
      if (!world.playerMesh) {
        return;
      }
      const x = region.center.x + rand(-6, 6);
      const z = region.center.z + rand(-6, 6);
      world.playerMesh.position.set(x, terrainHeight(x, z) + 1.45, z);
      state.player.position.copy(world.playerMesh.position);
      state.player.region = region.id;
      showMessage(`Fast-traveled to ${region.name}`);
      closePanel(dom.worldMapPanel);
    });
    dom.travelButtons.appendChild(btn);
  }
  drawWorldMapPanel();
}

function missionStatusLabel(status) {
  if (status === "locked") return "Locked";
  if (status === "available") return "Available";
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  return "Failed";
}

function renderMissionLog() {
  dom.missionLogList.innerHTML = "";
  const nextMission = nextStoryMissionId();
  for (const missionCfg of state.missions) {
    const m = state.missionState[missionCfg.id];
    if (!m) continue;

    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h4");
    title.textContent = `${missionCfg.title} [${missionStatusLabel(m.status)}]`;
    card.appendChild(title);

    const detail = document.createElement("p");
    const timer = missionCfg.timerSeconds > 0 ? ` | Timer: ${Math.max(0, Math.floor(m.timeLeft))}s` : "";
    detail.textContent = `${missionCfg.description} | Objective: ${Math.floor(m.progress)}/${missionCfg.target}${timer}`;
    card.appendChild(detail);

    const lesson = missionLessonDetails(missionCfg);
    const lessonLine = document.createElement("p");
    lessonLine.textContent = `Why: ${lesson.why} Helps: ${lesson.helps}`;
    card.appendChild(lessonLine);

    if ((m.status === "available" || m.status === "failed") && state.tutorial.completed && missionCfg.id === nextMission) {
      const btn = document.createElement("button");
      btn.textContent = m.status === "failed" ? "Retry Mission" : "Start Mission";
      btn.addEventListener("click", () => startMission(missionCfg.id));
      card.appendChild(btn);
    } else if ((m.status === "available" || m.status === "failed") && !state.tutorial.completed) {
      const guide = document.createElement("p");
      guide.textContent = "Complete onboarding tutorial to unlock story mission flow.";
      card.appendChild(guide);
    } else if ((m.status === "available" || m.status === "failed") && missionCfg.id !== nextMission) {
      const guide = document.createElement("p");
      guide.textContent = "Story-locked: complete current narrative objective first.";
      card.appendChild(guide);
    }

    dom.missionLogList.appendChild(card);
  }
}

function renderAchievements() {
  dom.achievementsList.innerHTML = "";
  for (const item of state.achievements.items) {
    const card = document.createElement("div");
    card.className = "card";
    const h = document.createElement("h4");
    h.textContent = `${item.unlocked ? "Unlocked" : "Locked"} - ${item.title}`;
    const p = document.createElement("p");
    p.textContent = item.desc;
    card.appendChild(h);
    card.appendChild(p);
    dom.achievementsList.appendChild(card);
  }
}

function achievementById(id) {
  return state.achievements.items.find((item) => item.id === id);
}

function unlockAchievement(id) {
  const item = achievementById(id);
  if (!item || item.unlocked) {
    return;
  }
  item.unlocked = true;
  item.unlockedAt = new Date().toISOString();
  showMessage(`Achievement unlocked: ${item.title}`);
  audio.playTone(980, 0.28, 0.08, "square");
  renderAchievements();
}

function checkAchievements() {
  if (state.restoredCount >= 100) {
    unlockAchievement("restore_100");
  }

  if (state.missionState.restore_contaminated_rivers && state.missionState.restore_contaminated_rivers.status === "completed") {
    unlockAchievement("river_guardian");
  }

  const renewableReady = state.regions.some((region) => region.renewableRatio >= 100);
  if (renewableReady) {
    unlockAchievement("renewable_master");
  }

  if (state.disastersResolved >= 1) {
    unlockAchievement("disaster_preventer");
  }
}

function showMessage(msg, isWarning = false) {
  const now = performance.now();
  if (now - world.lastMessageAt < 150) {
    return;
  }
  world.lastMessageAt = now;

  dom.disasterAlert.textContent = msg;
  dom.disasterAlert.classList.remove("hidden");
  dom.disasterAlert.style.background = isWarning
    ? "linear-gradient(180deg, rgba(182, 73, 73, 0.95), rgba(112, 34, 34, 0.95))"
    : "linear-gradient(180deg, rgba(44, 121, 167, 0.95), rgba(21, 74, 107, 0.95))";

  window.clearTimeout(showMessage._timer);
  showMessage._timer = window.setTimeout(() => {
    if (!state.activeDisaster) {
      dom.disasterAlert.classList.add("hidden");
    }
  }, 2400);
}

function updateMissionTracker() {
  if (!state.tutorial.completed) {
    const stage = currentCurriculumStage();
    const npc = stage ? getNpcById(stage.npcId) : null;
    const region = stage ? state.regionById.get(stage.regionId) : null;
    const missionCfg = stage ? state.missionById.get(stage.missionId) : null;
    const missionState = missionCfg ? state.missionState[missionCfg.id] : null;
    const route = !stage
      ? routeWithNavHint("Curriculum route syncing.")
      : !state.tutorial.stageQuestionPassed
        ? routeWithNavHint(`Locked briefing with ${npc ? npc.name : "guide NPC"} on ${region ? region.name : stage.regionId}.`)
        : routeWithNavHint(`Objective active on ${region ? region.name : stage.regionId}.`);
    const remaining = missionCfg && missionState
      ? Math.max(0, missionCfg.target - Math.floor(missionState.progress || 0))
      : 0;
    const timer =
      missionCfg && missionCfg.timerSeconds > 0 && missionState
        ? ` | ${Math.max(0, Math.floor(missionState.timeLeft || 0))}s`
        : "";
    dom.missionContent.innerHTML =
      `<strong>Route:</strong> ${route}<br>` +
      `<strong>Task:</strong> ${tutorialStepDescription(state.tutorial.step)}${timer}<br>` +
      `<strong>Remaining:</strong> ${remaining}<br>` +
      `<strong>Progress:</strong> ${clamp(state.tutorial.completedStages * 20, 0, 100)}% curriculum completion.`;
    return;
  }

  const active = state.missions.find((missionCfg) => state.missionState[missionCfg.id] && state.missionState[missionCfg.id].status === "active");
  const directive = currentStoryDirective();

  if (!active) {
    dom.missionContent.innerHTML =
      `<strong>Route:</strong> ${directive.route}<br>` +
      `<strong>Task:</strong> ${directive.task}<br>` +
      `<strong>Why:</strong> ${directive.why}<br>` +
      `<strong>What Helps:</strong> ${directive.helps}`;
    return;
  }

  const m = state.missionState[active.id];
  const timer = active.timerSeconds > 0 ? ` | ${Math.max(0, Math.floor(m.timeLeft))}s` : "";
  const region = state.regionById.get(active.region);
  const remaining = Math.max(0, active.target - Math.floor(m.progress));
  dom.missionContent.innerHTML =
    `<strong>${active.title}</strong> @ ${region ? region.name : active.region} (${Math.floor(m.progress)}/${active.target})${timer}<br>` +
    `<strong>Route:</strong> ${directive.route}<br>` +
    `<strong>Task:</strong> ${TYPE_ACTION_STEPS[active.type] || "Complete mission objective."} Remaining count: ${remaining}.<br>` +
    `<strong>Why:</strong> ${directive.why}`;
}

function performAction(type, regionId) {
  const region = state.regionById.get(regionId);
  if (!region) {
    return;
  }

  state.player.energy = clamp(state.player.energy - 6, 0, 100);
  state.tutorial.interactedWithNode = true;

  if (type === "cleanup") {
    region.pollution = clamp(region.pollution - 7.2, 0, 100);
    region.waterHealth = clamp(region.waterHealth + 5.4, 0, 100);
    addPollutionAt(state.player.position.x, state.player.position.z, -12, "plastic waste");
    applyMissionProgress("cleanup", regionId, 1.0 * state.bonuses.cleanup, "node");
  } else if (type === "restore") {
    region.waterHealth = clamp(region.waterHealth + 5.8, 0, 100);
    region.biodiversity = clamp(region.biodiversity + 4.4, 0, 100);
    addPollutionAt(state.player.position.x, state.player.position.z, -8.4, "plastic waste");
    applyMissionProgress("restore", regionId, 1.0 * state.bonuses.cleanup, "node");
  } else if (type === "replant") {
    region.forestCoverage = clamp(region.forestCoverage + 7.1, 0, 100);
    region.biodiversity = clamp(region.biodiversity + 5.2, 0, 100);
    region.pollution = clamp(region.pollution - 4.8, 0, 100);
    applyMissionProgress("replant", regionId, 1.0 * state.bonuses.cleanup, "node");
  } else if (type === "shutdown") {
    region.pollution = clamp(region.pollution - 8.2, 0, 100);
    region.renewableRatio = clamp(region.renewableRatio + 4.2 * state.bonuses.engineering, 0, 100);
    addPollutionAt(state.player.position.x, state.player.position.z, -10.4, "air pollution");
    applyMissionProgress("shutdown", regionId, 1.0 * state.bonuses.engineering, "node");
  } else if (type === "filter") {
    region.waterHealth = clamp(region.waterHealth + 7.0, 0, 100);
    region.pollution = clamp(region.pollution - 5.9, 0, 100);
    addPollutionAt(state.player.position.x, state.player.position.z, -12.0, "chemical contamination");
    applyMissionProgress("filter", regionId, 1.0 * state.bonuses.cleanup, "node");
  } else if (type === "rescue") {
    region.biodiversity = clamp(region.biodiversity + 6.3, 0, 100);
    region.waterHealth = clamp(region.waterHealth + 3.4, 0, 100);
    applyMissionProgress("rescue", regionId, 1.0 * state.bonuses.cleanup, "node");
  } else if (type === "stabilize") {
    region.climateStability = clamp(region.climateStability + 8.2, 0, 100);
    state.globalClimate.stormIntensity = clamp(state.globalClimate.stormIntensity - 5.2, 0, 100);
    applyMissionProgress("stabilize", regionId, 1.0 * state.bonuses.engineering, "node");
  } else if (type === "scan") {
    applyMissionProgress("scan", regionId, 1.0 * state.bonuses.scan, "node");
  } else if (type === "energy") {
    performEnergyTransition();
    applyMissionProgress("energy", regionId, 1.0 * state.bonuses.engineering, "node");
  }

  state.restoredCount += 1;
  showMessage(`Action complete: ${type}`);
  audio.playCleanupSuccess();
  checkAchievements();
}

function performEnergyTransition() {
  const region = currentRegion();
  if (!region) {
    return;
  }
  const cost = Math.round(68 / state.bonuses.engineering);
  if (state.funding < cost) {
    showMessage("Insufficient funding for renewable transition.", true);
    audio.playTone(160, 0.24, 0.08, "sawtooth");
    return;
  }
  state.funding -= cost;
  region.renewableRatio = clamp(region.renewableRatio + 16 * state.bonuses.engineering, 0, 100);
  region.pollution = clamp(region.pollution - 7.8, 0, 100);
  region.climateStability = clamp(region.climateStability + 4.2, 0, 100);
  region.resources = clamp(region.resources - cost * 0.6, 0, 9999);
  applyMissionProgress("energy", region.id, 1.0 * state.bonuses.engineering, "node");
  showMessage(`${region.name}: renewable infrastructure upgraded`);
}

function nearestNpc(maxDist = 6.5) {
  if (!world.playerMesh) return null;
  let best = null;
  let bestDist = maxDist;
  for (const n of world.npcObjects) {
    const d = n.mesh.position.distanceTo(world.playerMesh.position);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best;
}

function nearestActionNode(maxDist = 8.0) {
  if (!world.playerMesh) return null;
  let best = null;
  let bestDist = maxDist;
  for (const node of world.actionNodes) {
    if (node.region !== state.player.region || node.cooldown > 0) {
      continue;
    }
    const d = node.mesh.position.distanceTo(world.playerMesh.position);
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }
  return best;
}

function handlePrimaryInteract() {
  if (!state.gameStarted || state.activeDialogue) {
    return;
  }

  if (state.activeDisaster) {
    if (!tutorialDisasterResolveUnlocked()) {
      showMessage("Complete the briefing and threat containment before stabilizing the disaster.", true);
      return;
    }
    resolveActiveDisaster(true);
    return;
  }

  const stage = currentCurriculumStage();
  if (stage && !state.tutorial.stageQuestionPassed) {
    const stageNpcRef = world.npcObjects.find((item) => item.npc.id === stage.npcId);
    if (stageNpcRef && stageNpcRef.mesh.position.distanceTo(world.playerMesh.position) <= 7.2) {
      openDialogueFor(stageNpcRef);
    } else {
      showMessage("Route lock: complete the current NPC briefing before interacting elsewhere.", true);
    }
    return;
  }

  const npcRef = nearestNpc();
  if (npcRef) {
    openDialogueFor(npcRef);
    return;
  }

  const node = nearestActionNode();
  if (node) {
    if (!tutorialCombatUnlocked()) {
      showMessage("Combat systems are locked. Pass the forced briefing checkpoint first.");
      return;
    }
    if (["cleanup", "filter", "shutdown", "restore"].includes(node.type)) {
      const guide = cleanupGuideForType(node.type);
      showMessage(`${guide.issue} Use pulse fire on remediation markers to contain the source.`);
    } else {
      performAction(node.type, node.region);
      node.cooldown = 11;
      state.tutorial.interactedWithNode = true;
    }
    return;
  }

  showMessage("No interactable object nearby.");
}

function nearestEnemy(maxDist = 8.5) {
  if (!world.playerMesh) return null;
  let best = null;
  let bestDist = maxDist;
  for (const e of world.enemies) {
    const d = e.mesh.position.distanceTo(world.playerMesh.position);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

function openDialogueFor(npcRef) {
  if (!npcRef?.npc) {
    return;
  }
  const stage = currentCurriculumStage();
  const forcedStageBriefing = Boolean(stage && !state.tutorial.stageQuestionPassed && npcRef.npc.id === stage.npcId);
  if (stage && !state.tutorial.stageQuestionPassed && npcRef.npc.id !== stage.npcId) {
    showMessage("Only the assigned island guide can continue this checkpoint.", true);
    return;
  }
  const forcedCrisisBriefing = false;
  const forced = forcedStageBriefing || forcedCrisisBriefing;
  const topicId = forcedStageBriefing ? stage.topicId : forcedCrisisBriefing ? "air" : null;
  openAiDialogueForNpc(npcRef.npc, {
    topicId,
    forced,
    completionText: forcedStageBriefing
      ? `${stage.label} briefing complete. Finish the objective to unlock the next island.`
      : forcedCrisisBriefing
        ? "Assessment passed. Proceed to neutralize threats and then resolve the disaster beacon."
        : "Mentor briefing complete. Keep applying science-driven interventions.",
    onComplete: () => {
      state.tutorial.talkedToNpc = true;
      if (forcedStageBriefing) {
        state.tutorial.stageQuestionPassed = true;
        state.tutorial.aiAssessmentPassed = true;
        state.tutorial.stageDialogueStarted = false;
        startCurriculumStageObjective();
      } else if (forcedCrisisBriefing) {
        state.tutorial.aiAssessmentPassed = true;
      }
    },
  });
}

function renderDialogueNode() {
  if (!state.activeDialogue) {
    return;
  }
  if (state.activeDialogue.type === "ai") {
    renderAiDialogueNode();
    return;
  }
  if (dom.dialogueClose) {
    dom.dialogueClose.style.display = "";
    dom.dialogueClose.disabled = false;
  }
  const { tree, nodeId } = state.activeDialogue;
  const node = tree.nodes[nodeId];
  if (!node) {
    closeDialogue();
    return;
  }

  setDialogueAnswerInputVisible(false);
  dom.dialogueNpc.textContent = tree.name;
  dom.dialogueText.textContent = node.text;
  speakDialogueText(node.text, state.activeDialogue.npc?.id || "");
  dom.dialogueOptions.innerHTML = "";

  if (!node.options || node.options.length === 0) {
    const btn = document.createElement("button");
    btn.textContent = "Continue";
    btn.addEventListener("click", closeDialogue);
    dom.dialogueOptions.appendChild(btn);
    return;
  }

  node.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.textContent = option.text;
    btn.addEventListener("click", () => {
      if (option.reputationDelta) {
        const rep = Math.round(option.reputationDelta * state.bonuses.rep);
        state.reputation += rep;
      }
      if (option.unlockMission) {
        unlockMission(option.unlockMission);
      }
      if (typeof option.action === "function") {
        option.action();
      }
      if (option.next) {
        state.activeDialogue.nodeId = option.next;
        renderDialogueNode();
      } else {
        closeDialogue();
      }
      renderMissionLog();
    });
    dom.dialogueOptions.appendChild(btn);
  });
}

function closeDialogue(force = false) {
  if (
    !force &&
    state.activeDialogue?.type === "ai" &&
    state.activeDialogue.forced &&
    state.activeDialogue.stage !== "complete"
  ) {
    showMessage("Complete the forced dialogue checkpoint to continue.", true);
    return;
  }
  state.activeDialogue = null;
  setDialogueAnswerInputVisible(false);
  if (dom.dialogueClose) {
    dom.dialogueClose.style.display = "";
    dom.dialogueClose.disabled = false;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  speakDialogueText._lastText = "";
  dom.dialoguePanel.classList.add("hidden");
}

function ensureDisasterBeacon() {
  if (!world.disasterBeacon) {
    world.disasterBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.2, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0xff4f4f, emissive: 0x8b1d1d, emissiveIntensity: 0.6, roughness: 0.38, metalness: 0.35 })
    );
    world.disasterBeacon.castShadow = true;
    world.scene.add(world.disasterBeacon);
  }
  return world.disasterBeacon;
}

function spawnDisaster() {
  const regionPool = [...state.regions].sort((a, b) => b.pollution - a.pollution);
  const region = regionPool[Math.floor(rand(0, Math.min(3, regionPool.length)))];
  if (!region) return;

  state.activeDisaster = {
    type: DISASTER_TYPES[Math.floor(Math.random() * DISASTER_TYPES.length)],
    region: region.id,
    timeLeft: rand(130, 220),
    severity: rand(0.85, 2.2),
    lastCueSecond: -1,
  };

  ensureDisasterBeacon();
  world.disasterBeacon.visible = true;
  world.disasterBeacon.position.set(region.center.x, terrainHeight(region.center.x, region.center.z) + 4.8, region.center.z);
  configureDisasterVfx(state.activeDisaster.type);

  dom.disasterAlert.classList.add("hidden");
  showMessage(`Disaster in ${region.name}. Follow the smoke plume and press E to stabilize.`, true);
  renderTravelButtons();
  audio.playDisasterStart(state.activeDisaster.severity);
}

function resolveActiveDisaster(fromInteraction = false) {
  if (!state.activeDisaster || !world.playerMesh) {
    if (fromInteraction) {
      showMessage("No active disaster detected.");
    }
    return;
  }
  if (!tutorialDisasterResolveUnlocked()) {
    if (fromInteraction) {
      showMessage("You need to finish containment and coaching before resolving the disaster.", true);
    }
    return;
  }

  const region = state.regionById.get(state.activeDisaster.region);
  if (!region) return;

  const d = dist2(world.playerMesh.position, region.center);
  if (d > 16) {
    if (fromInteraction) {
      showMessage("Move to the smoke plume and press E near the epicenter.", true);
    }
    return;
  }

  const severity = state.activeDisaster.severity;
  region.pollution = clamp(region.pollution - 7.4 * severity, 0, 100);
  region.climateStability = clamp(region.climateStability + 5.0 * severity, 0, 100);
  state.globalClimate.stormIntensity = clamp(state.globalClimate.stormIntensity - 4.0 * severity, 0, 100);
  state.disastersResolved += 1;
  state.tutorial.disasterResolved = true;

  state.activeDisaster = null;
  state.disasterCooldown = rand(140, 220);
  if (world.disasterBeacon) world.disasterBeacon.visible = false;
  if (world.disasterVfx) world.disasterVfx.group.visible = false;
  dom.disasterAlert.classList.add("hidden");
  renderTravelButtons();
  showMessage("Disaster successfully contained.");
  audio.playDisasterResolved();

  applyMissionProgress("stabilize", region.id, 2, "node");
  checkAchievements();
}

function applyPenalty(reason, severity = 1.0) {
  state.funding = clamp(state.funding - Math.round(30 * severity * GAME_BALANCE.penaltyFundingMultiplier), 0, 999999);
  state.globalClimate.stormIntensity = clamp(state.globalClimate.stormIntensity + 1.9 * severity, 0, 100);
  state.globalClimate.co2 = clamp(state.globalClimate.co2 + 0.9 * severity, 300, 800);

  const region = currentRegion();
  if (region) {
    region.pollution = clamp(region.pollution + 2.2 * severity, 0, 100);
  }

  if (world.playerMesh) {
    state.player.health = clamp(state.player.health - 2.8 * severity * GAME_BALANCE.penaltyHealthMultiplier, 0, 100);
    addPollutionAt(world.playerMesh.position.x, world.playerMesh.position.z, 2.8 * severity, "air pollution");
  }

  if (reason !== "mission_failed" && Math.random() > 0.68) {
    const randomRegion = state.regions[Math.floor(Math.random() * state.regions.length)];
    if (randomRegion) {
      spawnEnemy(ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)], randomRegion.id);
    }
  }

  if (reason === "disaster_ignored") {
    showMessage("Disaster ignored: funding and climate stability dropped.", true);
  } else if (reason === "mission_failed") {
    showMessage("Mission failure penalty applied.", true);
  }
}

function triggerTimelapse(years) {
  state.timelapse.active = true;
  state.timelapse.remaining = 6.0;
  state.timelapse.target = state.year + years;
}

function updateTimelapse(dt) {
  if (!state.timelapse.active) {
    dom.timelapseBanner.classList.add("hidden");
    return;
  }

  state.timelapse.remaining -= dt;
  dom.timelapseBanner.classList.remove("hidden");
  dom.timelapseBanner.textContent = `Time-Lapse Simulation: Year ${Math.floor(state.year)}`;

  if (state.timelapse.remaining <= 0) {
    state.timelapse.active = false;
    dom.timelapseBanner.classList.add("hidden");
  }
}

function updateDisasterSystem(dt) {
  if (state.activeDisaster) {
    ensureDisasterBeacon();
    const freezeTutorialCountdown = !state.tutorial.completed;
    if (!freezeTutorialCountdown) {
      state.activeDisaster.timeLeft -= dt;
    }

    if (world.disasterBeacon) {
      const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.16;
      world.disasterBeacon.scale.set(pulse, pulse, pulse);
    }

    const region = state.regionById.get(state.activeDisaster.region);
    if (region) {
      if (world.disasterBeacon) {
        world.disasterBeacon.visible = true;
        world.disasterBeacon.position.set(region.center.x, terrainHeight(region.center.x, region.center.z) + 4.8, region.center.z);
      }
      const left = Math.max(0, Math.floor(state.activeDisaster.timeLeft));
      if (!freezeTutorialCountdown && [12, 8, 4, 1].includes(left) && state.activeDisaster.lastCueSecond !== left) {
        state.activeDisaster.lastCueSecond = left;
        showMessage(`Emergency: ${state.activeDisaster.type} in ${region.name} (${left}s).`, true);
      } else if (!freezeTutorialCountdown && left % 25 === 0 && state.activeDisaster.lastCueSecond !== left) {
        state.activeDisaster.lastCueSecond = left;
        showMessage(`Hazard update: ${region.name} disaster unstable (${left}s).`, true);
      }
      addPollutionAt(
        region.center.x,
        region.center.z,
        0.08 * state.activeDisaster.severity * dt * GAME_BALANCE.disasterPollutionTickMultiplier,
        "chemical contamination"
      );
    }

    if (state.activeDisaster.timeLeft <= 0) {
      applyPenalty("disaster_ignored", state.activeDisaster.severity);
      state.activeDisaster = null;
      if (world.disasterBeacon) world.disasterBeacon.visible = false;
      if (world.disasterVfx) world.disasterVfx.group.visible = false;
      dom.disasterAlert.classList.add("hidden");
      state.disasterCooldown = rand(150, 250);
      renderTravelButtons();
    }
    return;
  }

  if (!state.tutorial.completed) {
    return;
  }

  state.disasterCooldown -= dt;
  if (state.disasterCooldown <= 0) {
    spawnDisaster();
    state.disasterCooldown = rand(140, 220);
  }
}

function spawnEnemyProjectile(enemy) {
  const origin = enemy.mesh.position.clone();
  origin.y += enemy.type === "Smog Wraiths" ? 0.2 : 0.9;
  const direction = state.player.position.clone().sub(origin).normalize();
  const speed = enemy.type === "Smog Wraiths" ? 24 : 32;
  const color = enemy.type === "Smog Wraiths" ? 0xa1c6d8 : 0xff8a67;

  const projectile = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  projectile.position.copy(origin);
  world.scene.add(projectile);

  world.enemyProjectiles.push({
    mesh: projectile,
    velocity: direction.multiplyScalar(speed),
    life: 2.3,
    damage: (enemy.type === "Smog Wraiths" ? 3.8 : 2.6) * GAME_BALANCE.projectileDamageMultiplier,
    pollutionType: enemy.type === "Smog Wraiths" ? "air pollution" : "chemical contamination",
  });
  audio.playEnemyShot(enemy.type);
}

function clearEnemyProjectiles() {
  for (const projectile of world.enemyProjectiles) {
    world.scene.remove(projectile.mesh);
  }
  world.enemyProjectiles.length = 0;
}

function updateEnemySystem(dt) {
  if (!world.playerMesh) {
    return;
  }
  if (isNpcAssessmentActive()) {
    clearEnemyProjectiles();
    return;
  }

  for (let i = world.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = world.enemies[i];
    const region = state.regionById.get(enemy.region);
    if (!region) continue;

    enemy.theta += dt * enemy.speed;
    const radius = region.radius * 0.38 + Math.sin(enemy.theta * 1.7 + i) * region.radius * 0.26;
    const tx = region.center.x + Math.cos(enemy.theta + i) * radius;
    const tz = region.center.z + Math.sin(enemy.theta + i * 0.7) * radius;
    const ty = terrainHeight(tx, tz) + (enemy.hoverHeight || 1.6) + Math.sin(performance.now() * 0.002 + enemy.theta) * 0.15;

    tempVec3A.set(tx, ty, tz);
    enemy.mesh.position.lerp(tempVec3A, enemy.type === "Oil Leviathans" ? 0.04 : 0.07);
    enemy.mesh.lookAt(state.player.position.x, enemy.mesh.position.y, state.player.position.z);
    enemy.mesh.rotation.x *= 0.1;
    enemy.mesh.rotation.z *= 0.1;
    enemy.mesh.rotation.y += dt * 0.2;
    if (enemy.targetRing) {
      const pulse = 1 + Math.sin(performance.now() * 0.008 + i) * 0.12;
      enemy.targetRing.scale.setScalar(pulse);
      enemy.targetRing.material.opacity = 0.75 + Math.sin(performance.now() * 0.01 + i) * 0.2;
    }

    const humanoid = enemy.mesh.getObjectByProperty("type", "Group");
    if (humanoid?.userData?.humanoidParts) {
      const cycle = Math.sin(performance.now() * 0.006 + i);
      humanoid.userData.humanoidParts.leftArm.rotation.x = cycle * 0.35;
      humanoid.userData.humanoidParts.rightArm.rotation.x = -cycle * 0.35;
      humanoid.userData.humanoidParts.leftLeg.rotation.x = -cycle * 0.22;
      humanoid.userData.humanoidParts.rightLeg.rotation.x = cycle * 0.22;
    }

    const d = enemy.mesh.position.distanceTo(state.player.position);
    const meleeRange = (enemy.hitRadius || 1.4) + 1.2;
    if (d < meleeRange) {
      state.player.health = clamp(state.player.health - enemy.damage * dt * 0.11, 0, 100);
      addPollutionAt(state.player.position.x, state.player.position.z, enemy.pollution * dt, "air pollution");
    } else {
      enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
      if (
        enemy.fireCooldown <= 0 &&
        (enemy.type === "Pollution Drones" || enemy.type === "Factory Sentinels" || enemy.type === "Smog Wraiths") &&
        d < 42
      ) {
        enemy.fireCooldown = rand(1.2, 2.4);
        spawnEnemyProjectile(enemy);
      }
    }
  }

  state.enemySpawnCooldown -= dt;
  if (state.enemySpawnCooldown <= 0) {
    const pollutionAvg = state.regions.reduce((sum, region) => sum + region.pollution, 0) / state.regions.length;
    if (Math.random() < clamp((pollutionAvg - 35) / 100, 0.03, GAME_BALANCE.enemySpawnChanceCap)) {
      const region = state.regions[Math.floor(Math.random() * state.regions.length)];
      spawnEnemy(ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)], region.id);
    }
    state.enemySpawnCooldown = rand(GAME_BALANCE.enemySpawnIntervalMin, GAME_BALANCE.enemySpawnIntervalMax);
  }
}

function updateEnemyProjectiles(dt) {
  if (isNpcAssessmentActive()) {
    clearEnemyProjectiles();
    return;
  }
  for (let i = world.enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = world.enemyProjectiles[i];
    projectile.life -= dt;
    projectile.mesh.position.addScaledVector(projectile.velocity, dt);

    if (projectile.mesh.position.distanceTo(state.player.position) < 1.35) {
      state.player.health = clamp(state.player.health - projectile.damage, 0, 100);
      addPollutionAt(state.player.position.x, state.player.position.z, 1.1, projectile.pollutionType);
      world.scene.remove(projectile.mesh);
      world.enemyProjectiles.splice(i, 1);
      continue;
    }

    if (projectile.life <= 0) {
      world.scene.remove(projectile.mesh);
      world.enemyProjectiles.splice(i, 1);
    }
  }
}

function updateWildlifeSystem(dt) {
  for (let i = world.wildlife.length - 1; i >= 0; i -= 1) {
    const animal = world.wildlife[i];
    const region = state.regionById.get(animal.region);
    if (!region) continue;

    const stressed = region.pollution > 72;
    const speed = animal.speed * (stressed ? 1.5 : 1.0);
    animal.theta += dt * speed;
    const circleRadius = animal.radius + Math.sin(performance.now() * 0.001 + animal.offset) * 2.4;
    const tx = region.center.x + Math.cos(animal.theta + i) * circleRadius;
    const tz = region.center.z + Math.sin(animal.theta + i * 0.5) * circleRadius;
    const ty = terrainHeight(tx, tz) + 1.0;
    tempVec3A.set(tx, ty, tz);
    animal.mesh.position.lerp(tempVec3A, 0.05);
    animal.mesh.lookAt(tx + Math.cos(animal.theta + 0.1), ty, tz + Math.sin(animal.theta + 0.1));

    const legs = animal.mesh.userData.wildlifeLegs || [];
    for (let li = 0; li < legs.length; li += 1) {
      legs[li].rotation.x = Math.sin(performance.now() * 0.01 + li + animal.offset) * 0.25;
    }
    const tail = animal.mesh.userData.wildlifeTail;
    if (tail) {
      tail.rotation.y = Math.sin(performance.now() * 0.012 + animal.offset) * 0.55;
    }
    const jaw = animal.mesh.userData.wildlifeJaw;
    if (jaw) {
      jaw.rotation.z = Math.sin(performance.now() * 0.016 + animal.offset) * 0.12;
    }
    const head = animal.mesh.userData.wildlifeHead;
    if (head) {
      head.rotation.y = Math.sin(performance.now() * 0.006 + animal.offset) * 0.18;
    }

    if (stressed && Math.random() > 0.996) {
      addPollutionAt(animal.mesh.position.x, animal.mesh.position.z, 0.9, "chemical contamination");
    }
  }
}

function updateActionNodes(dt) {
  let targetsNeedRefresh = false;
  for (const node of world.actionNodes) {
    const desiredType = nodeTypeForRegion(node.region);
    if (desiredType !== node.type) {
      applyActionNodeStyle(node, desiredType);
      targetsNeedRefresh = true;
    }

    node.mesh.rotation.y += dt * 0.95;
    const baseY = terrainHeight(node.mesh.position.x, node.mesh.position.z) + 1.95;
    node.baseY = baseY;
    node.mesh.position.y = baseY + Math.sin(performance.now() * 0.0015 + node.mesh.position.x) * 0.06;

    if (node.cooldown > 0) {
      node.cooldown -= dt;
      node.mesh.material.emissiveIntensity = 0.08;
      if (node.cooldown <= 0) {
        node.mesh.material.emissiveIntensity = 0.35;
      }
    }
  }
  if (targetsNeedRefresh) {
    buildCleanupTargets();
  }
}

function updateMissionTimers(dt) {
  for (const missionCfg of state.missions) {
    const m = state.missionState[missionCfg.id];
    if (!m || m.status !== "active") {
      continue;
    }
    if (missionCfg.timerSeconds > 0) {
      m.timeLeft -= dt;
      if (m.timeLeft <= 0) {
        failMission(missionCfg.id);
      }
    }
  }
}

function updateRegionalSimulation(dt) {
  for (const region of state.regions) {
    const sampled = sampleRegionalPollution(region.id);
    region.pollution = clamp(lerp(region.pollution, sampled, 0.08), 0, 100);

    if (!region.waterMetrics) {
      region.waterMetrics = {
        chemicalContamination: clamp(region.pollution * 0.85, 0, 100),
        plasticConcentration: clamp(region.pollution * 0.72, 0, 100),
        oxygenLevels: clamp(region.waterHealth, 0, 100),
        temperature: state.globalClimate.temperature,
      };
    }

    region.waterMetrics.chemicalContamination = clamp(
      region.waterMetrics.chemicalContamination + (region.pollution * 0.85 - region.waterMetrics.chemicalContamination) * 0.07 * dt,
      0,
      100
    );

    const coastalBoost = region.id === "coastal_plastic_zone" ? 1.2 : 1.0;
    region.waterMetrics.plasticConcentration = clamp(
      region.waterMetrics.plasticConcentration + (region.pollution * 0.68 * coastalBoost - region.waterMetrics.plasticConcentration) * 0.07 * dt,
      0,
      100
    );

    region.waterMetrics.oxygenLevels = clamp(
      region.waterMetrics.oxygenLevels + ((100 - region.waterMetrics.chemicalContamination) * 0.6 + region.waterHealth * 0.4 - region.waterMetrics.oxygenLevels) * 0.06 * dt,
      0,
      100
    );

    region.waterMetrics.temperature = lerp(region.waterMetrics.temperature, state.globalClimate.temperature + region.pollution * 0.004, 0.05 * dt);

    const regen = (region.renewableRatio - 42) * 0.007 * dt;
    const pressure = (region.pollution - 52) * 0.006 * dt;
    const missionMomentum = clamp((state.restoredCount / 180) * 0.045, 0, 0.11) * dt;

    region.waterHealth = clamp(region.waterHealth + regen - pressure * 0.5 + missionMomentum, 0, 100);
    region.forestCoverage = clamp(region.forestCoverage + regen * 0.7 - pressure * 0.46 + missionMomentum * 0.8, 0, 100);
    region.biodiversity = clamp(region.biodiversity + regen * 0.76 - pressure * 0.5 + missionMomentum * 0.9, 0, 100);
    region.climateStability = clamp(region.climateStability + regen * 0.66 - pressure * 0.48 + missionMomentum * 0.7, 0, 100);
    region.airQuality = clamp(100 - region.pollution * 0.8 + region.renewableRatio * 0.13, 0, 100);
    region.waterQuality = clamp(region.waterHealth * 0.65 + (100 - region.waterMetrics.chemicalContamination) * 0.35, 0, 100);

    if (region.pollution > 92) {
      region.biodiversity = clamp(region.biodiversity - 0.34 * dt, 0, 100);
      region.forestCoverage = clamp(region.forestCoverage - 0.3 * dt, 0, 100);
    }

    region.animalsReturned = region.biodiversity > 72 && region.waterHealth > 65;
  }

  const avgPollution = state.regions.reduce((sum, region) => sum + region.pollution, 0) / state.regions.length;
  const avgRenewable = state.regions.reduce((sum, region) => sum + region.renewableRatio, 0) / state.regions.length;
  const avgBio = state.regions.reduce((sum, region) => sum + region.biodiversity, 0) / state.regions.length;

  const emissions = (100 - avgRenewable) * 0.72 + avgPollution * 0.3;
  state.globalClimate.co2 = clamp(state.globalClimate.co2 + (emissions - avgBio * 0.34) * 0.0045 * dt, 300, 800);
  state.globalClimate.temperature = clamp(0.9 + (state.globalClimate.co2 - 320) / 90, 0.9, 6);
  state.globalClimate.seaLevel = clamp(20 + (state.globalClimate.temperature - 1) * 28, 0, 220);

  const disasterPressure = state.activeDisaster ? state.activeDisaster.severity * 0.22 : -0.08;
  state.globalClimate.stormIntensity = clamp(
    state.globalClimate.stormIntensity + ((state.globalClimate.temperature - 2) * 0.12 + disasterPressure * 0.72) * dt,
    0,
    100
  );

  const arctic = state.regionById.get("melting_arctic_station");
  const arcticRecovery = arctic ? arctic.climateStability * 0.004 : 0;
  state.globalClimate.glacierCoverage = clamp(
    state.globalClimate.glacierCoverage - (state.globalClimate.temperature - 1.5) * 0.12 * dt + arcticRecovery * dt,
    0,
    100
  );

  state.globalClimate.climateStability = clamp(
    100 - (state.globalClimate.co2 - 330) * 0.22 - state.globalClimate.stormIntensity * 0.3 + avgRenewable * 0.26 + avgBio * 0.18,
    0,
    100
  );

  state.year += dt * 0.022;
}

function updatePlayerState(dt) {
  if (!world.playerMesh) {
    return;
  }

  const prevX = world.playerMesh.position.x;
  const prevY = world.playerMesh.position.y;
  const prevZ = world.playerMesh.position.z;

  const controlsLocked = state.ui.helpOpen || Boolean(state.activeDialogue) || state.tutorial.transitioning;
  const forwardInput = controlsLocked ? 0 : (keyState.has("KeyW") ? 1 : 0) - (keyState.has("KeyS") ? 1 : 0);
  const strafeInput = controlsLocked ? 0 : (keyState.has("KeyD") ? 1 : 0) - (keyState.has("KeyA") ? 1 : 0);
  const hasMove = forwardInput !== 0 || strafeInput !== 0;

  const sprintMul = !controlsLocked && keyState.has("ShiftLeft") ? 1.3 : 1.0;
  const speed = 10.2 * state.bonuses.movement * sprintMul;
  const step = hasMove ? speed * dt : 0;

  const forward = tempVec3A;
  world.camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) {
    forward.set(Math.sin(state.fps.yaw), 0, -Math.cos(state.fps.yaw));
  } else {
    forward.normalize();
  }

  const right = tempVec3B.crossVectors(forward, UP_VECTOR).normalize();
  const desiredMove = tempVec3C.set(0, 0, 0);
  desiredMove.addScaledVector(forward, forwardInput);
  desiredMove.addScaledVector(right, strafeInput);
  if (desiredMove.lengthSq() > 1.0) desiredMove.normalize();

  world.playerMesh.position.x = clamp(world.playerMesh.position.x + desiredMove.x * step, -WORLD_HALF + 5, WORLD_HALF - 5);
  world.playerMesh.position.z = clamp(world.playerMesh.position.z + desiredMove.z * step, -WORLD_HALF + 5, WORLD_HALF - 5);
  enforceCurriculumBarrier();
  enforceIslandSafetyBoundary();
  world.playerMesh.position.y = terrainHeight(world.playerMesh.position.x, world.playerMesh.position.z) + 1.45;
  world.playerMesh.rotation.y = state.fps.yaw + Math.PI;

  const limbs = world.playerMesh.userData.humanoidParts;
  if (limbs) {
    const gait = hasMove ? Math.sin(performance.now() * 0.013 * sprintMul) : 0;
    limbs.leftLeg.rotation.x = gait * 0.48;
    limbs.rightLeg.rotation.x = -gait * 0.48;
    limbs.leftArm.rotation.x = -gait * 0.36;
    limbs.rightArm.rotation.x = gait * 0.36;
  }

  if (hasMove) {
    state.player.energy = clamp(state.player.energy - dt * 2.7 * sprintMul, 0, 100);
    const now = performance.now();
    const stepInterval = sprintMul > 1.05 ? 220 : 320;
    if (!updatePlayerState._nextFootstepAt || now >= updatePlayerState._nextFootstepAt) {
      audio.playFootstep(sprintMul);
      updatePlayerState._nextFootstepAt = now + stepInterval;
    }
  } else {
    state.player.energy = clamp(state.player.energy + dt * 2.4, 0, 100);
    updatePlayerState._nextFootstepAt = 0;
  }
  state.player.moveBlend = lerp(state.player.moveBlend, hasMove ? sprintMul : 0, 0.16);
  state.player.isMoving = hasMove;

  state.player.position.copy(world.playerMesh.position);
  state.tutorial.movedDistance = Math.max(state.tutorial.movedDistance, dist2(state.player.position, state.tutorial.startPosition));
  if (dt > 0) {
    const invDt = 1 / dt;
    state.player.velocity.set(
      (world.playerMesh.position.x - prevX) * invDt,
      (world.playerMesh.position.y - prevY) * invDt,
      (world.playerMesh.position.z - prevZ) * invDt
    );
  } else {
    state.player.velocity.set(0, 0, 0);
  }

  const region = nearestRegion(state.player.position.x, state.player.position.z);
  if (region) {
    state.player.region = region.id;
  }

  const gx = toGridCoord(state.player.position.x);
  const gy = toGridCoord(state.player.position.z);
  const toxic = state.pollutionGrid[gy] && state.pollutionGrid[gy][gx] ? state.pollutionGrid[gy][gx].level : 40;
  const protectedByDialogue = isNpcAssessmentActive();

  if (protectedByDialogue) {
    state.player.health = Math.max(state.player.health, 35);
  } else if (toxic > TOXIC_DAMAGE_THRESHOLD) {
    state.player.health = clamp(
      state.player.health - (toxic - TOXIC_DAMAGE_THRESHOLD) * 0.0045 * dt * GAME_BALANCE.toxicDamageMultiplier,
      0,
      100
    );
  } else if (toxic < 72) {
    state.player.health = clamp(state.player.health + dt * 1.1 * GAME_BALANCE.passiveHealMultiplier, 0, 100);
  }

  if (state.tutorial.healthFloor > 0) {
    state.player.health = Math.max(state.player.health, state.tutorial.healthFloor);
  }

  if (!protectedByDialogue && state.player.health <= 0) {
    const reg = currentRegion();
    state.player.health = GAME_BALANCE.deathRespawnHealth;
    state.player.energy = GAME_BALANCE.deathRespawnEnergy;
    state.funding = clamp(state.funding - GAME_BALANCE.deathFundingPenalty, 0, 999999);
    if (reg) {
      world.playerMesh.position.set(reg.center.x, terrainHeight(reg.center.x, reg.center.z) + 1.45, reg.center.z);
      state.player.position.copy(world.playerMesh.position);
    }
    showMessage("Critical exposure. Emergency extraction triggered.", true);
  }

  world.playerMesh.visible = !state.fps.pointerLocked && !state.satellite.enabled;

  if (world.droneMesh) {
    const target = new THREE.Vector3(
      state.player.position.x - Math.sin(state.fps.yaw) * 2.2,
      state.player.position.y + 2.3,
      state.player.position.z + Math.cos(state.fps.yaw) * 2.2
    );
    world.droneMesh.position.lerp(target, 0.08);
    world.droneMesh.rotation.y += dt * 1.3;
  }
}

function updateCamera(dt) {
  if (!world.playerMesh) {
    return;
  }

  if (state.satellite.enabled) {
    if (world.weaponModel) world.weaponModel.visible = false;
    world.heatmapPlane.visible = true;
    const satPos = new THREE.Vector3(state.player.position.x, 156, state.player.position.z + 0.1);
    world.camera.position.lerp(satPos, 0.07);
    world.camera.lookAt(state.player.position.x, 0, state.player.position.z);
    return;
  }

  if (world.weaponModel) world.weaponModel.visible = !state.ui.helpOpen;
  world.heatmapPlane.visible = false;
  if (state.fps.enabled) {
    const desired = tempVec3A.set(state.player.position.x, state.player.position.y + 1.88, state.player.position.z);
    world.camera.position.lerp(desired, 0.28);
    world.camera.rotation.set(state.fps.pitch, state.fps.yaw, 0, "YXZ");
    return;
  }

  const desired = new THREE.Vector3(state.player.position.x + 0, state.player.position.y + 16, state.player.position.z + 25);
  world.camera.position.lerp(desired, 0.08);
  world.camera.lookAt(state.player.position.x, state.player.position.y + 2.2, state.player.position.z);

  if (dt > 0.25) {
    world.camera.position.copy(desired);
  }
}

function updateNpcExpressions() {
  const t = performance.now() * 0.001;
  const speakingNpcId = state.activeDialogue?.type === "ai" ? state.activeDialogue.npc?.id : "";

  for (let i = 0; i < world.npcObjects.length; i += 1) {
    const npcRef = world.npcObjects[i];
    const parts = npcRef.mesh?.userData?.humanoidParts;
    if (!parts) continue;

    const isSpeaking = speakingNpcId && speakingNpcId === npcRef.npc.id;
    const idle = Math.sin(t * 1.7 + i * 0.8);
    const gesture = Math.sin(t * 5.2 + i * 1.1);
    const talkMul = isSpeaking ? 1.0 : 0.25;

    parts.leftArm.rotation.x = idle * 0.1 + gesture * 0.18 * talkMul;
    parts.rightArm.rotation.x = -idle * 0.1 + Math.cos(t * 4.5 + i) * 0.16 * talkMul;
    parts.leftLeg.rotation.x = Math.sin(t * 1.4 + i) * 0.06;
    parts.rightLeg.rotation.x = -Math.sin(t * 1.4 + i) * 0.06;

    if (parts.head) {
      parts.head.rotation.y = Math.sin(t * 0.9 + i) * 0.11 + (isSpeaking ? Math.sin(t * 2.8) * 0.08 : 0);
      parts.head.rotation.x = isSpeaking ? Math.sin(t * 2.4 + i) * 0.03 : 0;
    }
    if (parts.mouth) {
      const mouthOpen = isSpeaking ? Math.max(0, Math.sin(t * 20 + i * 0.6)) : 0;
      parts.mouth.scale.y = 1 + mouthOpen * 1.45;
      parts.mouth.position.y = 2.25 - mouthOpen * 0.015;
    }
  }
}

function updateVisuals() {
  const stability = state.globalClimate.climateStability;
  const stress = clamp(1 - stability / 100, 0, 1);
  const time = performance.now() * 0.001;

  world.scene.fog.density = 0.0006 + stress * 0.001;
  world.skyUniforms.topColor.value.setHSL(0.56 - stress * 0.11, 0.64, 0.62 - stress * 0.16);
  world.skyUniforms.bottomColor.value.setHSL(0.52 - stress * 0.05, 0.42, 0.95 - stress * 0.15);
  world.sunLight.intensity = 3.0 - stress * 0.9;

  const seaRise = clamp(state.globalClimate.seaLevel * 0.002, 0, 0.35);
  for (const water of world.waterMeshes) {
    const baseY = Number.isFinite(water.userData?.baseY) ? water.userData.baseY : 0.45;
    water.position.y = baseY + seaRise + Math.sin(time + water.position.x * 0.03) * 0.05;
    if (water.material.color) {
      water.material.color.setHSL(0.55 - stress * 0.1, 0.5, 0.44 - stress * 0.11);
    }
    if ("opacity" in water.material) {
      water.material.opacity = 0.72 - stress * 0.18;
    }
  }

  for (const region of state.regions) {
    const anchor = world.regionAnchors.get(region.id);
    if (!anchor) continue;
    const hp = (region.biodiversity + region.waterHealth + region.climateStability) / 3;
    anchor.ring.material.color.copy(healthColor(hp));
  }

  for (const cloud of world.clouds) {
    cloud.position.x += cloud.userData.cloudDrift * 0.06;
    if (cloud.position.x > 230) {
      cloud.position.x = -230;
    }
    cloud.position.z += Math.sin(time * 0.2 + cloud.position.x * 0.01) * 0.01;
  }

  updateNpcExpressions();
  audio.update();
}

function updateHeatmap() {
  if (!state.satellite.dirty && state.satellite.accumulator < 0.4) {
    return;
  }

  state.satellite.accumulator = 0;
  state.satellite.dirty = false;

  const img = world.heatmapCtx.createImageData(GRID_SIZE, GRID_SIZE);
  const data = img.data;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const idx = (y * GRID_SIZE + x) * 4;
      const wx = toWorldCoord(x);
      const wz = toWorldCoord(y);
      const region = nearestRegion(wx, wz);
      const cell = state.pollutionGrid[y][x];

      let value = cell ? cell.level : 0;
      if (state.satellite.layer === "deforestation" && region) {
        value = 100 - region.forestCoverage;
      } else if (state.satellite.layer === "temperature") {
        value = clamp((state.globalClimate.temperature - 1.0) * 28 + (region ? region.pollution * 0.22 : 0), 0, 100);
      } else if (state.satellite.layer === "plastic") {
        value = region && region.id === "coastal_plastic_zone" ? clamp(region.waterMetrics?.plasticConcentration || region.pollution, 0, 100) : clamp((region?.pollution || 30) * 0.4, 0, 100);
      } else if (state.satellite.layer === "energy" && region) {
        value = 100 - region.renewableRatio;
      }

      const c = mapValueToColor(value);
      data[idx + 0] = c.r;
      data[idx + 1] = c.g;
      data[idx + 2] = c.b;
      data[idx + 3] = 195;
    }
  }

  world.heatmapCtx.putImageData(img, 0, 0);
  world.heatmapTexture.needsUpdate = true;
}

function drawMinimap() {
  const ctx = dom.minimap.getContext("2d");
  const w = dom.minimap.width;
  const h = dom.minimap.height;
  const r = Math.min(w, h) * 0.5;
  const balance = ecosystemBalance();

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);

  ctx.beginPath();
  ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8, 20, 36, 0.88)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(140, 209, 238, 0.8)";
  ctx.stroke();

  const targets = new Set(state.missionPing.targetRegions);
  const homeX = (HOME_ISLAND.x / WORLD_HALF) * (r - 15);
  const homeY = (HOME_ISLAND.z / WORLD_HALF) * (r - 15);
  ctx.beginPath();
  ctx.arc(homeX, homeY, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(185, 230, 255, 0.95)";
  ctx.fill();
  ctx.fillStyle = "rgba(232, 250, 255, 0.88)";
  ctx.font = "600 10px Rajdhani";
  ctx.textAlign = "center";
  ctx.fillText("Home", homeX, homeY - 10);

  for (const region of state.regions) {
    const x = (region.center.x / WORLD_HALF) * (r - 15);
    const y = (region.center.z / WORLD_HALF) * (r - 15);
    const hp = (region.biodiversity + region.waterHealth + region.climateStability) / 3;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${Math.floor((hp / 100) * 120)}deg 70% 58%)`;
    ctx.fill();

    if (state.activeDisaster && state.activeDisaster.region === region.id) {
      ctx.beginPath();
      ctx.arc(x, y, 10 + Math.sin(performance.now() * 0.01) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 85, 85, 0.92)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (targets.has(region.id)) {
      ctx.beginPath();
      ctx.arc(x, y, 13 + Math.sin(state.missionPing.pulse * 1.5) * 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 238, 140, 0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const short = region.name.split(" ")[0];
    ctx.fillStyle = "rgba(230, 248, 255, 0.82)";
    ctx.font = "600 10px Rajdhani";
    ctx.textAlign = "center";
    ctx.fillText(short, x, y - 10);
  }

  if (world.playerMesh) {
    const px = (state.player.position.x / WORLD_HALF) * (r - 12);
    const py = (state.player.position.z / WORLD_HALF) * (r - 12);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#9fffd0";
    ctx.fill();
  }

  const barW = 120;
  const barH = 8;
  const bx = -barW / 2;
  const by = r - 26;
  ctx.fillStyle = "rgba(10, 28, 42, 0.88)";
  ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
  ctx.fillStyle = "#3ad178";
  ctx.fillRect(bx, by, (barW * balance.healthy) / 100, barH);
  ctx.fillStyle = "#ff7d55";
  ctx.fillRect(bx + (barW * balance.healthy) / 100, by, (barW * balance.unhealthy) / 100, barH);
  ctx.fillStyle = "rgba(236,249,255,0.95)";
  ctx.font = "600 11px Rajdhani";
  ctx.textAlign = "center";
  ctx.fillText(`${balance.healthy}% healthy / ${balance.unhealthy}% unhealthy`, 0, by - 4);

  ctx.restore();
}

function normalizeAngleRad(value) {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function objectiveTargetPoint() {
  if (!state.gameStarted || !world.playerMesh) {
    return null;
  }

  if (!state.tutorial.completed) {
    const stage = currentCurriculumStage();
    if (stage) {
      const region = state.regionById.get(stage.regionId);
      const npc = getNpcById(stage.npcId);
      const npcMesh = npc ? world.npcObjects.find((item) => item.npc.id === npc.id)?.mesh : null;
      if (!state.tutorial.stageQuestionPassed && npcMesh) {
        return {
          x: npcMesh.position.x,
          z: npcMesh.position.z,
          label: npc.name,
          regionName: region ? region.name : stage.regionId,
        };
      }
      if (region) {
        return { x: region.center.x, z: region.center.z, label: stage.label, regionName: region.name };
      }
    }
  }

  if (state.activeDisaster) {
    const region = state.regionById.get(state.activeDisaster.region);
    if (region) {
      return { x: region.center.x, z: region.center.z, label: "Active Disaster", regionName: region.name };
    }
  }

  const activeMission = activeMissionConfigs()[0];
  if (activeMission) {
    const region = state.regionById.get(activeMission.region);
    if (region) {
      return { x: region.center.x, z: region.center.z, label: activeMission.title, regionName: region.name };
    }
  }

  const nextMissionId = nextStoryMissionId();
  const nextMissionCfg = nextMissionId ? state.missionById.get(nextMissionId) : null;
  const nextMissionState = nextMissionId ? state.missionState[nextMissionId] : null;
  if (nextMissionCfg && nextMissionState?.status === "locked") {
    const npc = state.npcs.find((item) => item.id === nextMissionCfg.npc);
    const npcMesh = npc ? world.npcObjects.find((item) => item.npc.id === npc.id)?.mesh : null;
    if (npcMesh) {
      const npcRegion = state.regionById.get(npc.region);
      return {
        x: npcMesh.position.x,
        z: npcMesh.position.z,
        label: `Talk to ${npc.name}`,
        regionName: npcRegion ? npcRegion.name : npc.region,
      };
    }
  }

  const targetRegionId = state.missionPing.targetRegions[0];
  const targetRegion = targetRegionId ? state.regionById.get(targetRegionId) : null;
  if (targetRegion) {
    return { x: targetRegion.center.x, z: targetRegion.center.z, label: "Route Target", regionName: targetRegion.name };
  }
  return null;
}

function updateObjectiveNavigation() {
  if (!dom.objectiveNavLine) {
    return;
  }
  const target = objectiveTargetPoint();
  if (!target) {
    dom.objectiveNavLine.textContent = "Route beacon idle.";
    return;
  }
  const dx = target.x - state.player.position.x;
  const dz = target.z - state.player.position.z;
  const distance = Math.round(Math.sqrt(dx * dx + dz * dz));

  let headingText = "STRAIGHT";
  if (distance > 5) {
    const angleToTarget = Math.atan2(dx, -dz);
    const relativeAngle = normalizeAngleRad(angleToTarget - state.fps.yaw);
    const absAngle = Math.abs(relativeAngle);
    if (absAngle < 0.28) {
      headingText = "STRAIGHT";
    } else if (absAngle < 1.0) {
      headingText = relativeAngle > 0 ? "TURN RIGHT" : "TURN LEFT";
    } else if (absAngle < 2.35) {
      headingText = relativeAngle > 0 ? "SHARP RIGHT" : "SHARP LEFT";
    } else {
      headingText = "TURN AROUND";
    }
  } else {
    headingText = "ON TARGET";
  }

  const regionLabel = target.regionName ? ` @ ${target.regionName}` : "";
  const interactHint = distance <= 8 ? " | press E if prompted" : "";
  dom.objectiveNavLine.textContent = `${headingText} | ${target.label}${regionLabel} | ${distance}m${interactHint}`;
}

function updateHud() {
  const region = currentRegion();
  const balance = ecosystemBalance();
  dom.hudHealth.textContent = `${Math.round(state.player.health)}`;
  dom.hudEnergy.textContent = `${Math.round(state.player.energy)}`;
  dom.hudFunding.textContent = `${Math.round(state.funding)}`;
  dom.hudReputation.textContent = `${Math.round(state.reputation)}`;
  dom.hudYear.textContent = `${Math.floor(state.year)}`;

  if (region) {
    dom.hudAir.textContent = `${Math.round(region.airQuality ?? (100 - region.pollution))}`;
    dom.hudWater.textContent = `${Math.round(region.waterQuality ?? region.waterHealth)}`;
    dom.hudBiodiversity.textContent = `${Math.round(region.biodiversity)}`;
  }

  dom.hudClimate.textContent = `${Math.round(state.globalClimate.climateStability)}`;
  dom.hudBalance.textContent = `Healthy ${balance.healthy}% | Unhealthy ${balance.unhealthy}%`;
  dom.hudGoodBar.style.width = `${balance.healthy}%`;
  dom.hudBadBar.style.width = `${balance.unhealthy}%`;
  dom.hudAmmo.textContent = state.combat.infiniteAmmo ? "INF" : `${state.combat.ammo}/${state.combat.clipSize}`;
  dom.hudReserve.textContent = state.combat.infiniteAmmo ? "INF" : `${state.combat.reserveAmmo}`;
  dom.hudWeaponState.textContent = state.combat.infiniteAmmo
    ? state.input.fireHeld
      ? "Auto Firing"
      : "Auto / Infinite"
    : state.combat.reloading
    ? `Reloading ${Math.ceil(state.combat.reloadLeft * 10) / 10}s`
    : !state.combat.infiniteAmmo && state.combat.ammo <= 0
      ? "Empty"
      : state.combat.cooldown > 0
        ? "Cooling"
        : "Ready";
  const hideCombatHud = state.satellite.enabled || !state.gameStarted || state.ui.helpOpen;
  dom.crosshair.classList.toggle("hidden", hideCombatHud);
  if (dom.weaponHud) {
    dom.weaponHud.classList.toggle("hidden", hideCombatHud);
  }
  updateMissionTracker();
  updateEducationBrief();
  updateObjectiveNavigation();
}

function setupPlanetViewer() {
  planetView.scene = new THREE.Scene();
  planetView.camera = new THREE.PerspectiveCamera(45, dom.planetCanvas.width / dom.planetCanvas.height, 0.1, 100);
  planetView.camera.position.set(0, 0, 4.6);

  planetView.renderer = new THREE.WebGLRenderer({ canvas: dom.planetCanvas, alpha: true, antialias: true });
  planetView.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  planetView.renderer.setSize(dom.planetCanvas.width, dom.planetCanvas.height, false);

  const light = new THREE.DirectionalLight(0xffffff, 1.25);
  light.position.set(4, 3, 2);
  planetView.scene.add(light);
  planetView.scene.add(new THREE.AmbientLight(0x8aacc3, 0.6));

  planetView.earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 48, 36),
    new THREE.MeshStandardMaterial({ color: 0x4db27d, roughness: 0.68, metalness: 0.12 })
  );
  planetView.scene.add(planetView.earth);

  planetView.cloudShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.48, 48, 36),
    new THREE.MeshStandardMaterial({ color: 0xd7f0ff, transparent: true, opacity: 0.25, roughness: 1.0 })
  );
  planetView.scene.add(planetView.cloudShell);

  const coords = [
    [0.3, 0.4],
    [1.9, -0.15],
    [-0.7, 0.7],
    [2.5, 0.35],
    [0.2, -1.2],
  ];

  for (let i = 0; i < state.regions.length; i += 1) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x2ec27e })
    );

    const lon = coords[i] ? coords[i][0] : rand(-Math.PI, Math.PI);
    const lat = coords[i] ? coords[i][1] : rand(-1.1, 1.1);
    const x = Math.cos(lat) * Math.cos(lon) * 1.48;
    const y = Math.sin(lat) * 1.48;
    const z = Math.cos(lat) * Math.sin(lon) * 1.48;
    marker.position.set(x, y, z);

    planetView.markers.push({ marker, regionId: state.regions[i].id });
    planetView.scene.add(marker);
  }
}

function updatePlanetViewer(dt) {
  if (dom.planetPanel.classList.contains("hidden")) {
    return;
  }

  planetView.earth.rotation.y += dt * 0.28;
  planetView.cloudShell.rotation.y += dt * 0.36;

  const avgHealth = state.regions.reduce((sum, region) => sum + (region.biodiversity + region.waterHealth + region.climateStability) / 3, 0) / state.regions.length;
  planetView.earth.material.color.copy(healthColor(avgHealth));

  for (const item of planetView.markers) {
    const region = state.regionById.get(item.regionId);
    if (!region) continue;
    const hp = (region.biodiversity + region.waterHealth + region.climateStability) / 3;
    item.marker.material.color.copy(healthColor(hp));
  }

  planetView.renderer.render(planetView.scene, planetView.camera);

  planetView.accumulator += dt;
  if (planetView.accumulator > 0.5) {
    planetView.accumulator = 0;
    const metrics = [
      ["Air Pollution", Math.round(state.regions.reduce((sum, region) => sum + region.pollution, 0) / state.regions.length)],
      ["Ocean Health", Math.round(state.regions.reduce((sum, region) => sum + region.waterHealth, 0) / state.regions.length)],
      ["Forest Coverage", Math.round(state.regions.reduce((sum, region) => sum + region.forestCoverage, 0) / state.regions.length)],
      ["Biodiversity", Math.round(state.regions.reduce((sum, region) => sum + region.biodiversity, 0) / state.regions.length)],
      ["Climate Stability", Math.round(state.globalClimate.climateStability)],
      ["Energy Transition", Math.round(state.regions.reduce((sum, region) => sum + region.renewableRatio, 0) / state.regions.length)],
    ];
    dom.planetMetrics.innerHTML = metrics
      .map(([label, value]) => `<div class=\"card\"><h4>${label}</h4><p>${value}</p></div>`)
      .join("");
  }
}

function updateSatelliteMode(dt) {
  state.satellite.accumulator += dt;
  if (state.satellite.enabled) {
    updateHeatmap();
  }
}

function toggleSatelliteMode() {
  state.satellite.enabled = !state.satellite.enabled;
  state.satellite.dirty = true;
  if (state.satellite.enabled) {
    setHelpPanelOpen(false);
    setPointerLock(false);
    openPanel(dom.satellitePanel);
  }
}

function collectSavePayload() {
  return {
    year: state.year,
    funding: state.funding,
    reputation: state.reputation,
    player: {
      health: state.player.health,
      energy: state.player.energy,
      region: state.player.region,
      position: {
        x: state.player.position.x,
        y: state.player.position.y,
        z: state.player.position.z,
      },
    },
    globalClimate: state.globalClimate,
    missionProgress: state.missionState,
    pollutionGrid: state.pollutionGrid,
    regions: Object.fromEntries(state.regions.map((region) => [region.id, region])),
    activeDisaster: state.activeDisaster,
    restoredCount: state.restoredCount,
    disastersResolved: state.disastersResolved,
    combat: {
      ammo: state.combat.ammo,
      reserveAmmo: state.combat.reserveAmmo,
    },
    aresOutcome: state.aresOutcome,
    story: {
      nextMissionId: state.story.nextMissionId,
      tutorial: {
        mode: state.tutorial.mode,
        completed: state.tutorial.completed,
        step: state.tutorial.step,
        stageIndex: state.tutorial.stageIndex,
        completedStages: state.tutorial.completedStages,
        stageQuestionPassed: state.tutorial.stageQuestionPassed,
        stageObjectiveStarted: state.tutorial.stageObjectiveStarted,
        stageObjectiveComplete: state.tutorial.stageObjectiveComplete,
        stageDialogueStarted: state.tutorial.stageDialogueStarted,
        transitioning: state.tutorial.transitioning,
        healthFloor: state.tutorial.healthFloor,
        lockRadius: state.tutorial.lockRadius,
        movedDistance: state.tutorial.movedDistance,
        introComplete: state.tutorial.introComplete,
        crisisTriggered: state.tutorial.crisisTriggered,
        forcedConversationStarted: state.tutorial.forcedConversationStarted,
        aiAssessmentPassed: state.tutorial.aiAssessmentPassed,
        crisisRegion: state.tutorial.crisisRegion,
        crisisNpcId: state.tutorial.crisisNpcId,
        interactedWithNode: state.tutorial.interactedWithNode,
        talkedToNpc: state.tutorial.talkedToNpc,
        destroyedTargets: state.tutorial.destroyedTargets,
        disasterResolved: state.tutorial.disasterResolved,
      },
    },
  };
}

async function saveGame() {
  try {
    await apiPost(API.save, collectSavePayload());
    await apiPost(API.achievements, state.achievements);
    showMessage("Game saved.");
  } catch (err) {
    showMessage("Save failed.", true);
  }
}

function applyLoadedState(payload) {
  if (!payload) return;

  state.year = payload.year ?? state.year;
  state.funding = payload.funding ?? state.funding;
  state.reputation = payload.reputation ?? state.reputation;

  if (payload.player?.position) {
    state.player.position.set(payload.player.position.x || 0, payload.player.position.y || 1.3, payload.player.position.z || 0);
    state.player.region = payload.player.region || state.player.region;
    state.player.health = payload.player.health ?? state.player.health;
    state.player.energy = payload.player.energy ?? state.player.energy;
  }

  if (payload.globalClimate) {
    Object.assign(state.globalClimate, payload.globalClimate);
  }

  if (payload.missionProgress) {
    initializeMissionState(payload.missionProgress);
  }

  if (payload.pollutionGrid && Array.isArray(payload.pollutionGrid) && payload.pollutionGrid.length === GRID_SIZE) {
    state.pollutionGrid = payload.pollutionGrid;
  }

  if (payload.regions && typeof payload.regions === "object") {
    for (const region of state.regions) {
      if (payload.regions[region.id]) {
        Object.assign(region, payload.regions[region.id]);
      }
    }
  }

  if (payload.activeDisaster) {
    state.activeDisaster = payload.activeDisaster;
  }

  state.restoredCount = payload.restoredCount ?? state.restoredCount;
  state.disastersResolved = payload.disastersResolved ?? state.disastersResolved;
  if (payload.combat) {
    state.combat.ammo = payload.combat.ammo ?? state.combat.ammo;
    state.combat.reserveAmmo = payload.combat.reserveAmmo ?? state.combat.reserveAmmo;
  }
  state.aresOutcome = payload.aresOutcome ?? state.aresOutcome;

  const hasCurriculumMode = Boolean(payload.story?.tutorial && Object.prototype.hasOwnProperty.call(payload.story.tutorial, "mode"));
  if (payload.story?.tutorial) {
    Object.assign(state.tutorial, payload.story.tutorial);
    if (!hasCurriculumMode) {
      state.tutorial.mode = "legacy_flow";
    }
  }
  if (payload.story?.nextMissionId) {
    state.story.nextMissionId = payload.story.nextMissionId;
  }
  normalizeCurriculumState();

  const ecosystemCollapsed = state.regions.length > 0 && state.regions.every(
    (region) => region.biodiversity < 8 && region.waterHealth < 8 && region.climateStability < 8
  );
  if (ecosystemCollapsed) {
    for (const region of state.regions) {
      region.biodiversity = Math.max(region.biodiversity, 24);
      region.waterHealth = Math.max(region.waterHealth, 24);
      region.climateStability = Math.max(region.climateStability, 24);
      region.forestCoverage = Math.max(region.forestCoverage, 18);
      region.pollution = Math.min(region.pollution, 78);
      region.renewableRatio = Math.max(region.renewableRatio, 28);
    }
  }

  const climateExtremes =
    state.globalClimate.co2 > 760 &&
    state.globalClimate.stormIntensity > 90 &&
    state.globalClimate.glacierCoverage < 5 &&
    state.restoredCount < 25;
  if (climateExtremes) {
    state.globalClimate.co2 = 510;
    state.globalClimate.temperature = 2.5;
    state.globalClimate.seaLevel = 58;
    state.globalClimate.stormIntensity = 62;
    state.globalClimate.glacierCoverage = 34;
    state.globalClimate.climateStability = 46;
  }
}

function removeEnemy(enemy) {
  world.scene.remove(enemy.mesh);
  world.enemies = world.enemies.filter((e) => e !== enemy);
}

function handleEnemyDefeated(enemy) {
  addPollutionAt(enemy.mesh.position.x, enemy.mesh.position.z, -8, "air pollution");
  if (enemy.type === "Factory Sentinels") {
    applyMissionProgress("shutdown", enemy.region, 1.3 * state.bonuses.engineering, "enemy");
  } else if (enemy.type === "Pollution Drones") {
    applyMissionProgress("cleanup", enemy.region, 1.2 * state.bonuses.cleanup, "enemy");
  } else if (enemy.type === "Corrupted Wildlife") {
    applyMissionProgress("rescue", enemy.region, 1.2 * state.bonuses.cleanup, "enemy");
  } else if (enemy.type === "Smog Wraiths") {
    applyMissionProgress("stabilize", enemy.region, 1.1 * state.bonuses.engineering, "enemy");
  } else if (enemy.type === "Oil Leviathans") {
    applyMissionProgress("filter", enemy.region, 1.2 * state.bonuses.engineering, "enemy");
  }
  showMessage(`Threat neutralized: ${enemy.type}`);
  audio.playEnemyDefeat();
}

function handleCleanupTargetDestroyed(target) {
  const guide = cleanupGuideForType(target.type);
  const region = state.regionById.get(target.region);
  if (region) {
    region.pollution = clamp(region.pollution - 7.4, 0, 100);
    region.waterHealth = clamp(region.waterHealth + 3.8, 0, 100);
    region.biodiversity = clamp(region.biodiversity + 2.6, 0, 100);
    addPollutionAt(target.mesh.position.x, target.mesh.position.z, -14, guide.pollutant);
  }

  applyMissionProgress(target.type, target.region, 1.2, "cleanup_target");
  state.restoredCount += 1;
  state.tutorial.destroyedTargets += 1;
  showMessage(guide.result);
}

function shootWeapon() {
  if (!state.gameStarted || state.activeDialogue) return;
  if (!tutorialCombatUnlocked()) {
    showMessage("Combat lock active: pass the guide checkpoint first.");
    return;
  }
  if (state.combat.reloading) return;
  if (state.combat.cooldown > 0) return;

  if (!state.combat.infiniteAmmo && state.combat.ammo <= 0) {
    reloadWeapon();
    return;
  }

  state.combat.cooldown = state.combat.fireRate;
  if (!state.combat.infiniteAmmo) {
    state.combat.ammo -= 1;
  }
  state.player.energy = clamp(state.player.energy - 0.35, 0, 100);
  audio.playShot();

  if (world.weaponModel) {
    const weaponData = world.weaponModel.userData || {};
    const basePose = weaponData.basePose || { x: 0.34, y: -0.26, z: -0.56 };
    weaponData.recoil = Math.min(1, (weaponData.recoil || 0) + 0.7);
    world.weaponModel.position.set(basePose.x + 0.01, basePose.y - 0.012, basePose.z + 0.2);
    world.weaponModel.rotation.x = -0.14;
    world.weaponModel.rotation.y = 0.14;
    const muzzle = world.weaponModel.userData.muzzle;
    if (muzzle) {
      muzzle.intensity = 3;
    }
  }
  if (dom.weaponHud) {
    dom.weaponHud.classList.remove("recoil");
    void dom.weaponHud.offsetWidth;
    dom.weaponHud.classList.add("recoil");
    window.clearTimeout(shootWeapon._hudKickTimer);
    shootWeapon._hudKickTimer = window.setTimeout(() => {
      dom.weaponHud?.classList.remove("recoil");
    }, 120);
  }

  aimRaycaster.setFromCamera({ x: 0, y: 0 }, world.camera);
  let bestEnemy = null;
  let bestTarget = null;
  let bestDistance = state.combat.hitRange;

  for (const enemy of world.enemies) {
    const hits = aimRaycaster.intersectObject(enemy.mesh, true);
    if (!hits.length) continue;
    const hit = hits[0];
    if (hit.distance < bestDistance) {
      bestDistance = hit.distance;
      bestEnemy = { enemy, hit };
      bestTarget = null;
    }
  }

  for (const target of world.cleanupTargets) {
    const hits = aimRaycaster.intersectObject(target.mesh, true);
    if (!hits.length) continue;
    const hit = hits[0];
    if (hit.distance < bestDistance) {
      bestDistance = hit.distance;
      bestEnemy = null;
      bestTarget = { target, hit };
    }
  }

  if (bestEnemy || bestTarget) {
    const impactPoint = bestEnemy ? bestEnemy.hit.point : bestTarget.hit.point;
    const impactColor = bestEnemy ? 0xffe7ac : 0xffcf7c;
    const impact = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: impactColor })
    );
    impact.position.copy(impactPoint);
    world.scene.add(impact);
    setTimeout(() => world.scene.remove(impact), 80);
  }

  if (bestEnemy) {
    const baseDamage = state.combat.damage * (0.9 + Math.random() * 0.4);
    bestEnemy.enemy.hp -= baseDamage;
    if (bestEnemy.enemy.hp <= 0) {
      handleEnemyDefeated(bestEnemy.enemy);
      removeEnemy(bestEnemy.enemy);
    }
  }

  if (bestTarget) {
    bestTarget.target.hp -= state.combat.damage * 0.85;
    if (bestTarget.target.hp <= 0) {
      handleCleanupTargetDestroyed(bestTarget.target);
      world.scene.remove(bestTarget.target.mesh);
      world.cleanupTargets = world.cleanupTargets.filter((t) => t !== bestTarget.target);
    }
  }
}

function reloadWeapon(force = false) {
  if (state.combat.infiniteAmmo) {
    state.combat.reloading = false;
    return;
  }
  if (state.combat.reloading) return;
  if (state.combat.ammo >= state.combat.clipSize && !force) return;
  if (state.combat.reserveAmmo <= 0) {
    showMessage("No reserve ammo available.", true);
    return;
  }

  state.combat.reloading = true;
  state.combat.reloadLeft = state.combat.reloadTime;
  audio.playReloadStart();
}

function updateFirstPersonRig(dt) {
  if (!world.fpsRig) return;
  const active = state.gameStarted && !state.satellite.enabled;
  world.fpsRig.group.visible = active;
  if (!active) return;

  const speedFactor = Math.max(0.2, state.player.moveBlend);
  world.fpsRig.bobTime += dt * (2.2 + speedFactor * 6.4);
  const bob = Math.sin(world.fpsRig.bobTime) * 0.05 * speedFactor;
  const sway = Math.cos(world.fpsRig.bobTime * 0.5) * 0.04 * speedFactor;
  world.fpsRig.group.position.set(sway * 0.3, -0.52 + bob * 0.35, 0);

  const gait = Math.sin(world.fpsRig.bobTime * 2.0) * 0.48 * speedFactor;
  world.fpsRig.leftLeg.rotation.x = gait;
  world.fpsRig.rightLeg.rotation.x = -gait;
  world.fpsRig.leftBoot.rotation.x = -gait * 0.52;
  world.fpsRig.rightBoot.rotation.x = gait * 0.52;
  world.fpsRig.leftForeArm.rotation.x = -0.3 + Math.sin(world.fpsRig.bobTime * 1.5) * 0.05 * speedFactor;
}

function updateCombatState(dt) {
  state.combat.cooldown = Math.max(0, state.combat.cooldown - dt);
  if (state.input.fireHeld && state.gameStarted && !state.activeDialogue && !state.satellite.enabled && !state.ui.helpOpen) {
    shootWeapon();
  }

  if (state.combat.infiniteAmmo) {
    state.combat.ammo = state.combat.clipSize;
    state.combat.reserveAmmo = 999999;
    state.combat.reloading = false;
  }

  if (!state.combat.reloading && state.combat.ammo <= 0 && state.combat.reserveAmmo > 0) {
    reloadWeapon();
  }

  if (state.combat.reloading) {
    state.combat.reloadLeft -= dt;
    if (state.combat.reloadLeft <= 0) {
      state.combat.reloading = false;
      const needed = state.combat.clipSize - state.combat.ammo;
      const load = Math.min(needed, state.combat.reserveAmmo);
      state.combat.ammo += load;
      state.combat.reserveAmmo -= load;
      audio.playReloadComplete();
    }
  }

  if (world.weaponModel) {
    const sway = state.player.moveBlend;
    const weaponData = world.weaponModel.userData || {};
    const basePose = weaponData.basePose || { x: 0.34, y: -0.26, z: -0.56 };
    weaponData.recoil = lerp(weaponData.recoil || 0, 0, 0.22);
    const recoil = weaponData.recoil || 0;
    const t = performance.now();
    world.weaponModel.position.z = lerp(
      world.weaponModel.position.z,
      basePose.z - Math.sin(t * 0.01) * 0.018 * sway + recoil * 0.12,
      0.24
    );
    world.weaponModel.position.x = basePose.x + Math.sin(t * 0.012) * 0.012 * (0.45 + sway) + recoil * 0.026;
    world.weaponModel.position.y = basePose.y + Math.cos(t * 0.01) * 0.009 * (0.45 + sway) - recoil * 0.08;
    world.weaponModel.rotation.x = lerp(world.weaponModel.rotation.x, -0.06 + Math.sin(t * 0.008) * 0.012 * sway - recoil * 0.2, 0.24);
    world.weaponModel.rotation.y = lerp(world.weaponModel.rotation.y, 0.08 + Math.cos(t * 0.009) * 0.01 * sway + recoil * 0.06, 0.24);
    world.weaponModel.rotation.z = lerp(world.weaponModel.rotation.z, -0.015 + Math.sin(t * 0.013) * 0.01 * sway, 0.24);
    const muzzle = world.weaponModel.userData.muzzle;
    if (muzzle) {
      muzzle.intensity = Math.max(0, muzzle.intensity - dt * 34);
    }
  }
}

function setPointerLock(active) {
  if (!state.gameStarted || !state.fps.enabled) return;
  if (!active) {
    if (document.pointerLockElement === world.renderer.domElement) {
      document.exitPointerLock();
    }
    return;
  }
  try {
    world.renderer.domElement.requestPointerLock();
  } catch (err) {
    // Some headless contexts cannot enter pointer lock; gameplay still works with keyboard + auto-fire.
  }
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (err) {
    showMessage("Fullscreen unavailable.", true);
  }
}

function initInput() {
  document.addEventListener("pointerlockchange", () => {
    state.fps.pointerLocked = document.pointerLockElement === world.renderer?.domElement;
    if (!state.fps.pointerLocked) {
      keyState.clear();
      state.input.fireHeld = false;
    } else if (state.ui.helpOpen) {
      setHelpPanelOpen(false);
    }
    if (dom.fpsLockTip) {
      dom.fpsLockTip.classList.toggle("hidden", state.fps.pointerLocked);
    }
  });

  window.addEventListener("blur", () => {
    keyState.clear();
    state.input.fireHeld = false;
  });

  document.addEventListener("mousemove", (event) => {
    if (!state.fps.pointerLocked || !state.gameStarted || state.satellite.enabled) {
      return;
    }
    state.fps.yaw -= event.movementX * state.fps.sensitivity;
    state.fps.pitch -= event.movementY * state.fps.sensitivity;
    state.fps.pitch = clamp(state.fps.pitch, -1.35, 1.2);
  });

  document.addEventListener("mousedown", (event) => {
    if (!state.gameStarted) return;
    if (event.button !== 0) return;
    if (state.ui.helpOpen) {
      setHelpPanelOpen(false);
    }
    if (!state.fps.pointerLocked && event.target !== world.renderer?.domElement) return;
    const headlessAgent = /Headless/i.test(navigator.userAgent || "");
    if (!state.fps.pointerLocked && !headlessAgent) {
      setPointerLock(true);
    }
    state.input.fireHeld = true;
    shootWeapon();
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      state.input.fireHeld = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      event.preventDefault();
      if (!state.gameStarted) {
        return;
      }
      if (state.fps.pointerLocked) {
        setPointerLock(false);
        setHelpPanelOpen(true);
      } else {
        setHelpPanelOpen(!state.ui.helpOpen);
      }
      return;
    }

    if (state.activeDialogue) {
      if (event.code === "Enter") {
        event.preventDefault();
        if (state.activeDialogue.type === "ai") {
          if (state.activeDialogue.stage === "question") {
            handleAiDialogueAnswerSubmit();
          } else {
            handleAiDialogueAdvance();
          }
        } else {
          closeDialogue();
        }
      }
      return;
    }

    if (state.ui.helpOpen) {
      return;
    }

    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "KeyR"].includes(event.code)) {
      event.preventDefault();
    }
    keyState.add(event.code);
    if (event.repeat || !state.gameStarted) {
      return;
    }

    if (event.code === "KeyE") {
      handlePrimaryInteract();
    }

    if (event.code === "KeyF") {
      toggleFullscreen();
    }

    if (event.code === "KeyG") {
      handlePrimaryInteract();
    }

    if (event.code === "KeyQ") {
      if (state.scanCooldown > 0) {
        showMessage("Drone scan recharging.");
      } else {
        state.scanCooldown = 7;
        const region = currentRegion();
        showMessage(
          `${region.name}: pollution ${Math.round(region.pollution)} | biodiversity ${Math.round(region.biodiversity)} | water O2 ${Math.round(region.waterMetrics?.oxygenLevels || region.waterHealth)}`
        );
        applyMissionProgress("scan", region.id, 1.2 * state.bonuses.scan, "node");
        audio.playTone(820, 0.22, 0.07, "triangle");
        audio.playNoiseBurst({ duration: 0.09, gainLevel: 0.06, filterType: "bandpass", freqStart: 2800, freqEnd: 1800, q: 2.4 });
      }
    }

    if (event.code === "KeyM") {
      toggleSatelliteMode();
    }

    if (event.code === "KeyU") {
      performEnergyTransition();
    }

    if (event.code === "KeyR") {
      reloadWeapon(true);
    }
  });

  document.addEventListener("keyup", (event) => {
    keyState.delete(event.code);
  });
}

function bindUi() {
  const ensureAudioReady = () => {
    if (state.settings.audio) {
      audio.init();
    }
  };
  window.addEventListener("pointerdown", ensureAudioReady, { passive: true });
  window.addEventListener("keydown", ensureAudioReady, { passive: true });

  dom.btnMap.addEventListener("click", () => {
    setHelpPanelOpen(false);
    setPointerLock(false);
    renderTravelButtons();
    openPanel(dom.worldMapPanel);
  });
  dom.btnMissions.addEventListener("click", () => {
    setHelpPanelOpen(false);
    setPointerLock(false);
    renderMissionLog();
    openPanel(dom.missionLogPanel);
  });
  dom.btnAchievements.addEventListener("click", () => {
    setHelpPanelOpen(false);
    setPointerLock(false);
    renderAchievements();
    openPanel(dom.achievementsPanel);
  });
  dom.btnPlanet.addEventListener("click", () => {
    setHelpPanelOpen(false);
    setPointerLock(false);
    openPanel(dom.planetPanel);
  });
  dom.btnSatellite.addEventListener("click", () => {
    setHelpPanelOpen(false);
    setPointerLock(false);
    state.satellite.enabled = true;
    state.satellite.dirty = true;
    openPanel(dom.satellitePanel);
  });
  dom.btnSettings.addEventListener("click", () => {
    setHelpPanelOpen(false);
    setPointerLock(false);
    openPanel(dom.settingsPanel);
  });
  dom.btnSave.addEventListener("click", () => saveGame());
  if (dom.btnNextIsland) {
    dom.btnNextIsland.addEventListener("click", () => {
      if (state.tutorial.completed) return;
      const stage = currentCurriculumStage();
      if (!stage || !state.tutorial.stageObjectiveComplete) return;
      const nextStage = CURRICULUM_STAGES[stage.index + 1];
      showMessage(nextStage ? `Teleporting to ${nextStage.label}.` : "Finalizing curriculum completion.");
      advanceCurriculumStage();
    });
  }

  if (dom.helpClose) {
    dom.helpClose.addEventListener("click", () => {
      setHelpPanelOpen(false);
    });
  }

  document.querySelectorAll(".close-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-close");
      if (targetId) {
        closePanel(document.getElementById(targetId));
      }
    });
  });

  dom.dialogueClose.addEventListener("click", closeDialogue);
  if (dom.dialogueAnswerSubmit) {
    dom.dialogueAnswerSubmit.addEventListener("click", handleAiDialogueAnswerSubmit);
  }
  if (dom.dialogueAnswerInput) {
    dom.dialogueAnswerInput.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleAiDialogueAnswerSubmit();
      }
    });
  }

  dom.satelliteLayer.addEventListener("change", () => {
    state.satellite.layer = dom.satelliteLayer.value;
    state.satellite.dirty = true;
  });

  try {
    const audioStored = localStorage.getItem("ecorift_audio_enabled");
    const musicStored = localStorage.getItem("ecorift_music_enabled");
    const autosaveStored = localStorage.getItem("ecorift_autosave_enabled");
    const volumeStored = localStorage.getItem("ecorift_master_volume");
    const graphicsStored = localStorage.getItem("ecorift_graphics_quality");
    if (audioStored !== null) state.settings.audio = audioStored === "1";
    if (musicStored !== null) state.settings.music = musicStored === "1";
    if (autosaveStored !== null) state.settings.autosave = autosaveStored === "1";
    if (volumeStored !== null) state.settings.masterVolume = clamp(Number(volumeStored) || 0, 0, 100);
    if (graphicsStored === "performance" || graphicsStored === "high") {
      state.settings.graphicsQuality = graphicsStored;
    }
  } catch {
    // Ignore storage failures in restricted contexts.
  }

  if (dom.audioToggle) dom.audioToggle.checked = state.settings.audio;
  if (dom.musicToggle) dom.musicToggle.checked = state.settings.music;
  if (dom.autosaveToggle) dom.autosaveToggle.checked = state.settings.autosave;
  if (dom.masterVolume) dom.masterVolume.value = String(Math.round(state.settings.masterVolume));
  if (dom.masterVolumeValue) dom.masterVolumeValue.textContent = `${Math.round(state.settings.masterVolume)}%`;
  if (dom.graphicsQualitySelect) dom.graphicsQualitySelect.value = state.settings.graphicsQuality;

  if (dom.audioToggle) {
    dom.audioToggle.addEventListener("change", () => {
      audio.setEnabled(dom.audioToggle.checked);
      try {
        localStorage.setItem("ecorift_audio_enabled", dom.audioToggle.checked ? "1" : "0");
      } catch {
        // Ignore storage failures.
      }
    });
  }

  if (dom.musicToggle) {
    dom.musicToggle.disabled = !BACKGROUND_MUSIC_ENABLED;
    dom.musicToggle.addEventListener("change", () => {
      audio.setMusicEnabled(dom.musicToggle.checked);
      try {
        localStorage.setItem("ecorift_music_enabled", dom.musicToggle.checked ? "1" : "0");
      } catch {
        // Ignore storage failures.
      }
    });
  }

  if (dom.masterVolume) {
    const applyVolume = () => {
      const vol = clamp(Number(dom.masterVolume.value) || 0, 0, 100);
      if (dom.masterVolumeValue) {
        dom.masterVolumeValue.textContent = `${Math.round(vol)}%`;
      }
      audio.setVolume(vol);
      try {
        localStorage.setItem("ecorift_master_volume", String(Math.round(vol)));
      } catch {
        // Ignore storage failures.
      }
    };
    dom.masterVolume.addEventListener("input", applyVolume);
    dom.masterVolume.addEventListener("change", applyVolume);
    applyVolume();
  }

  if (dom.graphicsQualitySelect) {
    dom.graphicsQualitySelect.addEventListener("change", () => {
      const value = dom.graphicsQualitySelect.value === "performance" ? "performance" : "high";
      applyGraphicsQuality(value, true);
      try {
        localStorage.setItem("ecorift_graphics_quality", value);
      } catch {
        // Ignore storage failures.
      }
    });
  }

  if (dom.autosaveToggle) {
    dom.autosaveToggle.addEventListener("change", () => {
      state.settings.autosave = dom.autosaveToggle.checked;
      try {
        localStorage.setItem("ecorift_autosave_enabled", dom.autosaveToggle.checked ? "1" : "0");
      } catch {
        // Ignore storage failures.
      }
    });
  }

  applyGraphicsQuality(state.settings.graphicsQuality || "high", false);

  try {
    state.settings.npcProvider = localStorage.getItem("ecorift_npc_provider") || state.settings.npcProvider;
    state.settings.ollamaBaseUrl = localStorage.getItem("ecorift_ollama_url") || state.settings.ollamaBaseUrl;
    state.settings.ollamaModel = localStorage.getItem("ecorift_ollama_model") || state.settings.ollamaModel;
    state.settings.npcApiKey = localStorage.getItem("ecorift_npc_api_key") || state.settings.npcApiKey;
  } catch {
    // Ignore storage failures in restricted contexts.
  }

  if (dom.npcProviderSelect) {
    dom.npcProviderSelect.value = state.settings.npcProvider;
  }
  if (dom.ollamaUrlInput) {
    dom.ollamaUrlInput.value = state.settings.ollamaBaseUrl;
  }
  if (dom.ollamaModelInput) {
    dom.ollamaModelInput.value = state.settings.ollamaModel;
  }
  if (dom.openaiKeyInput) {
    dom.openaiKeyInput.value = state.settings.npcApiKey;
  }

  const applyNpcChatSettings = (announce = false) => {
    if (dom.npcProviderSelect) {
      state.settings.npcProvider = dom.npcProviderSelect.value || "offline";
    }
    if (dom.ollamaUrlInput) {
      state.settings.ollamaBaseUrl = dom.ollamaUrlInput.value.trim() || "http://127.0.0.1:11434";
    }
    if (dom.ollamaModelInput) {
      state.settings.ollamaModel = dom.ollamaModelInput.value.trim() || "llama3.2:3b";
    }
    if (dom.openaiKeyInput) {
      state.settings.npcApiKey = dom.openaiKeyInput.value.trim();
    }

    try {
      localStorage.setItem("ecorift_npc_provider", state.settings.npcProvider);
      localStorage.setItem("ecorift_ollama_url", state.settings.ollamaBaseUrl);
      localStorage.setItem("ecorift_ollama_model", state.settings.ollamaModel);
      localStorage.setItem("ecorift_npc_api_key", state.settings.npcApiKey);
    } catch {
      // Ignore storage failures in restricted contexts.
    }

    if (!announce) {
      return;
    }
    if (state.settings.npcProvider === "openai" && !state.settings.npcApiKey) {
      showMessage("NPC guide settings saved. Add your cloud access key to enable live replies.", true);
      return;
    }
    showMessage("NPC guide settings saved.");
  };

  if (dom.npcProviderSelect) {
    dom.npcProviderSelect.addEventListener("change", () => applyNpcChatSettings(true));
  }
  if (dom.ollamaUrlInput) {
    dom.ollamaUrlInput.addEventListener("change", () => applyNpcChatSettings(true));
    dom.ollamaUrlInput.addEventListener("blur", () => applyNpcChatSettings(false));
  }
  if (dom.ollamaModelInput) {
    dom.ollamaModelInput.addEventListener("change", () => applyNpcChatSettings(true));
    dom.ollamaModelInput.addEventListener("blur", () => applyNpcChatSettings(false));
  }
  if (dom.openaiKeyInput) {
    const applyKey = () => applyNpcChatSettings(true);
    dom.openaiKeyInput.addEventListener("change", applyKey);
    dom.openaiKeyInput.addEventListener("blur", () => applyNpcChatSettings(false));
    dom.openaiKeyInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyKey();
      }
    });
  }

  dom.characterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const profile = {
      name: document.getElementById("char-name").value.trim() || "Restorer",
      bodyType: document.getElementById("char-body").value,
      hairStyle: document.getElementById("char-hair").value,
      suitColor: document.getElementById("char-color").value,
      backgroundClass: document.getElementById("char-class").value,
      createdAt: state.profile?.createdAt || new Date().toISOString(),
    };

    state.profile = profile;
    state.bonuses = computeBonuses(profile.backgroundClass);
    resetCurriculumProgress(true);
    state.activeDisaster = null;
    if (world.disasterBeacon) world.disasterBeacon.visible = false;
    if (world.disasterVfx) world.disasterVfx.group.visible = false;

    try {
      await apiPost(API.profile, profile);
    } catch (err) {
      showMessage("Profile save failed; continuing offline mode.", true);
    }

    createPlayer(profile);
    state.fps.yaw = Math.PI;
    state.fps.pitch = -0.06;
    state.gameStarted = true;
    state.tutorial.startPosition.copy(state.player.position);
    state.tutorial.movedDistance = 0;
    dom.characterScreen.classList.add("hidden");
    dom.hud.classList.remove("hidden");
    dom.fpsLockTip.classList.remove("hidden");
    audio.init();
    if (state.tutorial.completed) {
      guideStoryFlow();
      showMessage(`Welcome back, ${profile.name}. Story objective updated.`);
    } else {
      showMessage(`Welcome, ${profile.name}. Auto-routing to Island ${state.tutorial.stageIndex + 1} briefing.`);
      beginCurriculumStage(true);
    }
  });

  dom.aresPanel.querySelectorAll("button[data-decision]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const decision = btn.getAttribute("data-decision");
      state.aresOutcome = decision;

      if (decision === "destroy") {
        state.funding = clamp(state.funding - 180, 0, 999999);
        state.globalClimate.co2 = clamp(state.globalClimate.co2 - 16, 300, 800);
        for (const region of state.regions) {
          region.pollution = clamp(region.pollution - 10, 0, 100);
        }
      } else if (decision === "control") {
        state.funding += 220;
        state.globalClimate.stormIntensity = clamp(state.globalClimate.stormIntensity + 8, 0, 100);
        state.reputation = clamp(state.reputation - 4, -999, 9999);
      } else {
        state.funding += 100;
        state.reputation += 26;
        state.globalClimate.co2 = clamp(state.globalClimate.co2 - 24, 300, 800);
        for (const region of state.regions) {
          region.pollution = clamp(region.pollution - 14, 0, 100);
          region.renewableRatio = clamp(region.renewableRatio + 8, 0, 100);
        }
      }

      const finalMission = state.missionState.final_ares_decision;
      if (finalMission && finalMission.status === "active") {
        finalMission.progress = 1;
        completeMission("final_ares_decision");
      }
      closePanel(dom.aresPanel);
    });
  });
}

async function bootstrap() {
  const data = await apiGet(API.bootstrap);

  state.regions = (data.regions || []).map((region) => ({ ...region }));
  state.regionById = new Map(state.regions.map((region) => [region.id, region]));
  state.missions = data.missions || [];
  state.missionById = new Map(state.missions.map((mission) => [mission.id, mission]));
  enforceCurriculumMissionTargets();
  state.npcs = data.npcs || [];
  ensureCurriculumGuideNpc();
  applyCurriculumWorldLayout();
  state.regionById = new Map(state.regions.map((region) => [region.id, region]));

  state.profile = data.profile || state.profile;
  state.achievements = data.achievements || state.achievements;
  if (!state.achievements.items || !state.achievements.items.length) {
    state.achievements.items = structuredClone(DEFAULT_ACHIEVEMENTS);
  }

  initializeMissionState(data.gameState?.missionProgress || {});
  applyLoadedState(data.gameState || {});
  applyCurriculumWorldLayout();
  state.regionById = new Map(state.regions.map((region) => [region.id, region]));

  if (!state.pollutionGrid.length) {
    initPollutionGrid();
  }

  if (state.profile) {
    document.getElementById("char-name").value = state.profile.name || "";
    document.getElementById("char-body").value = state.profile.bodyType || "Adaptive";
    document.getElementById("char-hair").value = state.profile.hairStyle || "Wave Cut";
    document.getElementById("char-color").value = state.profile.suitColor || "#2ec27e";
    document.getElementById("char-class").value = state.profile.backgroundClass || "Scientist";
  }

  setupThreeScene();
  buildRegionWorld();
  updateMissionBeacons(0);
  setupPlanetViewer();
  renderTravelButtons();
  renderMissionLog();
  renderAchievements();
  guideStoryFlow();
  updateTutorialState();
  state.loaded = true;
}

function simulate(dtRaw) {
  if (!state.gameStarted) {
    return;
  }

  const speedScale = state.timelapse.active ? 6.5 : 1.0;
  const dt = dtRaw * speedScale;

  state.scanCooldown = Math.max(0, state.scanCooldown - dtRaw);
  state.ui.supportTipTimer += dtRaw;
  if (state.ui.supportTipTimer >= 10) {
    state.ui.supportTipTimer = 0;
    state.ui.supportTipIndex = (state.ui.supportTipIndex + 1) % ECO_SUPPORT_ACTIONS.length;
    if (state.ui.helpOpen) {
      updateHelpPanelContent();
    }
  }

  updatePlayerState(dtRaw);
  updateActionNodes(dtRaw);
  updateCleanupTargets(dtRaw);
  updateWildlifeSystem(dtRaw);
  updateEnemySystem(dtRaw);
  updateEnemyProjectiles(dtRaw);
  updateDisasterSystem(dtRaw);
  updateDisasterVfx(dtRaw);
  updateMissionBeacons(dtRaw);
  updatePollutionGrid(dt);
  updateMissionTimers(dtRaw);
  updateRegionalSimulation(dt);
  updateTimelapse(dtRaw);
  updateSatelliteMode(dtRaw);
  updateFirstPersonRig(dtRaw);
  updateCombatState(dtRaw);
  updateCamera(dtRaw);
  updateVisuals();
  updateHud();
  updateTutorialState();
  drawMinimap();
  if (!dom.worldMapPanel.classList.contains("hidden")) {
    world.worldMapTick += dtRaw;
    if (world.worldMapTick > 0.2) {
      world.worldMapTick = 0;
      drawWorldMapPanel();
    }
  }
  checkAchievements();

  state.saveDebounce += dtRaw;
  if (state.settings.autosave && state.saveDebounce >= GAME_BALANCE.autoSaveIntervalSeconds) {
    state.saveDebounce = 0;
    saveGame();
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.1, world.clock.getDelta());

  if (world.scene && world.camera && world.renderer) {
    simulate(dt);
    world.renderer.render(world.scene, world.camera);
    updatePlanetViewer(dt);
  }
}

function renderGameToText() {
  const region = currentRegion();
  const activeMissionCfg = activeMissionConfigs()[0] || null;
  const activeMissionState = activeMissionCfg ? state.missionState[activeMissionCfg.id] : null;
  const mode = !state.gameStarted
    ? "character_creation"
    : state.activeDialogue
      ? "dialogue"
      : state.satellite.enabled
        ? "satellite"
        : state.ui.helpOpen
          ? "field_guide"
          : "field";

  const playerPos = state.player.position;
  const enemies = world.enemies
    .map((enemy) => ({
      type: enemy.type,
      x: Math.round(enemy.mesh.position.x * 10) / 10,
      y: Math.round(enemy.mesh.position.y * 10) / 10,
      z: Math.round(enemy.mesh.position.z * 10) / 10,
      hp: Math.round(enemy.hp),
      distance: Math.round(enemy.mesh.position.distanceTo(playerPos) * 10) / 10,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);

  const targets = world.cleanupTargets
    .map((target) => ({
      type: target.type,
      x: Math.round(target.mesh.position.x * 10) / 10,
      y: Math.round(target.mesh.position.y * 10) / 10,
      z: Math.round(target.mesh.position.z * 10) / 10,
      hp: Math.round(target.hp),
      distance: Math.round(target.mesh.position.distanceTo(playerPos) * 10) / 10,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);

  const payload = {
    mode,
    coordinateSystem: "World origin is map center (0,0,0); +X east/right, +Z south/forward, +Y up.",
    player: {
      x: Math.round(state.player.position.x * 10) / 10,
      y: Math.round(state.player.position.y * 10) / 10,
      z: Math.round(state.player.position.z * 10) / 10,
      vx: Math.round(state.player.velocity.x * 10) / 10,
      vy: Math.round(state.player.velocity.y * 10) / 10,
      vz: Math.round(state.player.velocity.z * 10) / 10,
      health: Math.round(state.player.health),
      energy: Math.round(state.player.energy),
      region: state.player.region,
    },
    combat: {
      weapon: "GRN Pulse Rifle",
      ammo: state.combat.infiniteAmmo ? "INF" : state.combat.ammo,
      reserveAmmo: state.combat.infiniteAmmo ? "INF" : state.combat.reserveAmmo,
      reloading: state.combat.reloading,
      cooldown: Math.round(state.combat.cooldown * 100) / 100,
    },
    mission: activeMissionCfg
      ? {
          id: activeMissionCfg.id,
          title: activeMissionCfg.title,
          progress: Math.round(activeMissionState?.progress || 0),
          target: activeMissionCfg.target,
          timeLeft: Math.round(activeMissionState?.timeLeft || 0),
          status: activeMissionState?.status || "unknown",
        }
      : null,
    tutorial: {
      completed: state.tutorial.completed,
      step: state.tutorial.step,
      stageIndex: state.tutorial.stageIndex,
      completedStages: state.tutorial.completedStages,
      healthFloor: state.tutorial.healthFloor,
      phase: tutorialPhase(),
      objective: tutorialStepDescription(state.tutorial.step),
      introComplete: state.tutorial.introComplete,
      crisisTriggered: state.tutorial.crisisTriggered,
      aiAssessmentPassed: state.tutorial.aiAssessmentPassed,
    },
    ui: {
      fieldGuideOpen: state.ui.helpOpen,
      educationalObjective: currentEducationalObjective(),
    },
    aiDialogue:
      state.activeDialogue?.type === "ai"
        ? {
            npcId: state.activeDialogue.npc.id,
            topic: state.activeDialogue.topicId,
            stage: state.activeDialogue.stage,
            questionIndex: state.activeDialogue.questionIndex,
            totalQuestions: state.activeDialogue.questions.length,
          }
        : null,
    disaster: state.activeDisaster
      ? {
          type: state.activeDisaster.type,
          region: state.activeDisaster.region,
          severity: Math.round(state.activeDisaster.severity * 100) / 100,
          timeLeft: Math.round(state.activeDisaster.timeLeft),
          visualCue: "Smoke plume + hazard ring at disaster beacon",
          cueActive: Boolean(world.disasterVfx?.group?.visible),
          distanceFromPlayer: (() => {
            const reg = state.regionById.get(state.activeDisaster.region);
            return reg ? Math.round(dist2(state.player.position, reg.center) * 10) / 10 : null;
          })(),
        }
      : null,
    nearby: {
      enemies,
      cleanupTargets: targets,
      npcs: world.npcObjects
        .map((npcRef) => ({
          id: npcRef.npc.id,
          name: npcRef.npc.name,
          distance: Math.round(npcRef.mesh.position.distanceTo(playerPos) * 10) / 10,
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4),
    },
    region: region
      ? {
          id: region.id,
          name: region.name,
          pollution: Math.round(region.pollution),
          waterHealth: Math.round(region.waterHealth),
          biodiversity: Math.round(region.biodiversity),
          climateStability: Math.round(region.climateStability),
        }
      : null,
    climate: {
      co2: Math.round(state.globalClimate.co2),
      temperature: Math.round(state.globalClimate.temperature * 100) / 100,
      seaLevel: Math.round(state.globalClimate.seaLevel),
      stormIntensity: Math.round(state.globalClimate.stormIntensity),
      glacierCoverage: Math.round(state.globalClimate.glacierCoverage),
      stability: Math.round(state.globalClimate.climateStability),
    },
  };

  return JSON.stringify(payload);
}

function advanceTime(ms = 16) {
  if (!world.scene || !world.camera || !world.renderer) {
    return;
  }
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  const dt = 1 / 60;
  for (let i = 0; i < steps; i += 1) {
    simulate(dt);
    updatePlanetViewer(dt);
  }
  world.renderer.render(world.scene, world.camera);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = advanceTime;

async function main() {
  bindUi();
  initInput();

  try {
    await bootstrap();
    dom.loadingScreen.classList.add("hidden");
    dom.characterScreen.classList.remove("hidden");
    dom.characterScreen.classList.add("visible");
  } catch (err) {
    dom.loadingScreen.innerHTML = "<h1>EcoRift</h1><p>Failed to initialize game systems.</p>";
    throw err;
  }

  animate();
}

main();
