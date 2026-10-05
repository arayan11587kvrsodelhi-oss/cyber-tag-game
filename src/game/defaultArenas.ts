import { ArenaLayout } from '../types/game';

export const DEFAULT_ARENAS: ArenaLayout[] = [
  {
    id: 'neon-citadel',
    name: 'Neon Citadel',
    creator: 'Apex Systems',
    description: 'Premier competitive colosseum featuring a raised central energy spire, perimeter sniper towers, and quad jump pads.',
    createdAt: Date.now() - 86400000 * 10,
    gridSize: 32,
    cellSize: 2,
    theme: 'cyberpunk',
    blocks: [
      // Outer Boundary Walls
      { id: 'b_w_n', x: 0, y: 3, z: -32, width: 64, height: 6, depth: 1, type: 'wall', color: '#06b6d4' },
      { id: 'b_w_s', x: 0, y: 3, z: 32, width: 64, height: 6, depth: 1, type: 'wall', color: '#06b6d4' },
      { id: 'b_w_w', x: -32, y: 3, z: 0, width: 1, height: 6, depth: 64, type: 'wall', color: '#06b6d4' },
      { id: 'b_w_e', x: 32, y: 3, z: 0, width: 1, height: 6, depth: 64, type: 'wall', color: '#06b6d4' },

      // Central Elevated Spire Platform
      { id: 'b_spire_base', x: 0, y: 1.5, z: 0, width: 10, height: 3, depth: 10, type: 'tower', color: '#ec4899' },
      { id: 'b_spire_pillar1', x: -3.5, y: 5, z: -3.5, width: 1.2, height: 4, depth: 1.2, type: 'pillar', color: '#ec4899' },
      { id: 'b_spire_pillar2', x: 3.5, y: 5, z: -3.5, width: 1.2, height: 4, depth: 1.2, type: 'pillar', color: '#ec4899' },
      { id: 'b_spire_pillar3', x: -3.5, y: 5, z: 3.5, width: 1.2, height: 4, depth: 1.2, type: 'pillar', color: '#ec4899' },
      { id: 'b_spire_pillar4', x: 3.5, y: 5, z: 3.5, width: 1.2, height: 4, depth: 1.2, type: 'pillar', color: '#ec4899' },

      // Energy Shields on Mid
      { id: 'b_shield_n', x: 0, y: 2, z: -8, width: 6, height: 4, depth: 0.4, type: 'energy_barrier', color: '#38bdf8', opacity: 0.5 },
      { id: 'b_shield_s', x: 0, y: 2, z: 8, width: 6, height: 4, depth: 0.4, type: 'energy_barrier', color: '#38bdf8', opacity: 0.5 },

      // Tactical Cover Crates
      { id: 'b_crate_1', x: -12, y: 1, z: -10, width: 3, height: 2, depth: 3, type: 'crate', color: '#0ea5e9' },
      { id: 'b_crate_2', x: 12, y: 1, z: -10, width: 3, height: 2, depth: 3, type: 'crate', color: '#0ea5e9' },
      { id: 'b_crate_3', x: -12, y: 1, z: 10, width: 3, height: 2, depth: 3, type: 'crate', color: '#0ea5e9' },
      { id: 'b_crate_4', x: 12, y: 1, z: 10, width: 3, height: 2, depth: 3, type: 'crate', color: '#0ea5e9' },

      // Quad Jump Pads pointing inwards
      { id: 'b_jump_nw', x: -18, y: 0.2, z: -18, width: 3, height: 0.4, depth: 3, type: 'jump_pad', color: '#a855f7' },
      { id: 'b_jump_ne', x: 18, y: 0.2, z: -18, width: 3, height: 0.4, depth: 3, type: 'jump_pad', color: '#a855f7' },
      { id: 'b_jump_sw', x: -18, y: 0.2, z: 18, width: 3, height: 0.4, depth: 3, type: 'jump_pad', color: '#a855f7' },
      { id: 'b_jump_se', x: 18, y: 0.2, z: 18, width: 3, height: 0.4, depth: 3, type: 'jump_pad', color: '#a855f7' },

      // Flanking Corridors & Pillars
      { id: 'b_flank_w', x: -20, y: 2, z: 0, width: 2, height: 4, depth: 14, type: 'wall', color: '#06b6d4' },
      { id: 'b_flank_e', x: 20, y: 2, z: 0, width: 2, height: 4, depth: 14, type: 'wall', color: '#06b6d4' },
      { id: 'b_pil_w1', x: -24, y: 2.5, z: -8, width: 2, height: 5, depth: 2, type: 'pillar', color: '#ec4899' },
      { id: 'b_pil_w2', x: -24, y: 2.5, z: 8, width: 2, height: 5, depth: 2, type: 'pillar', color: '#ec4899' },
      { id: 'b_pil_e1', x: 24, y: 2.5, z: -8, width: 2, height: 5, depth: 2, type: 'pillar', color: '#ec4899' },
      { id: 'b_pil_e2', x: 24, y: 2.5, z: 8, width: 2, height: 5, depth: 2, type: 'pillar', color: '#ec4899' },
    ],
    powerups: [
      { id: 'p_mid_overcharge', x: 0, y: 3.8, z: 0, type: 'overcharge', active: true, respawnCountdown: 0 },
      { id: 'p_side_cloak', x: -26, y: 1.2, z: 0, type: 'cloak', active: true, respawnCountdown: 0 },
      { id: 'p_side_speed', x: 26, y: 1.2, z: 0, type: 'speed', active: true, respawnCountdown: 0 },
      { id: 'p_heal_n', x: 0, y: 1.2, z: -22, type: 'repair', active: true, respawnCountdown: 0 },
      { id: 'p_heal_s', x: 0, y: 1.2, z: 22, type: 'repair', active: true, respawnCountdown: 0 },
    ],
    spawnPoints: [
      { id: 'sp_1', x: -22, y: 1, z: -22, team: 'neon' },
      { id: 'sp_2', x: -14, y: 1, z: -26, team: 'neon' },
      { id: 'sp_3', x: 0, y: 1, z: -26, team: 'neon' },
      { id: 'sp_4', x: 14, y: 1, z: -26, team: 'neon' },
      { id: 'sp_5', x: 22, y: 1, z: 22, team: 'plasma' },
      { id: 'sp_6', x: 14, y: 1, z: 26, team: 'plasma' },
      { id: 'sp_7', x: 0, y: 1, z: 26, team: 'plasma' },
      { id: 'sp_8', x: -14, y: 1, z: 26, team: 'plasma' },
    ]
  },
  {
    id: 'cyber-matrix',
    name: 'Cyber Matrix',
    creator: 'HexaGrid Core',
    description: 'High-density grid maze with transparent energy walls, intense close-quarters angles, and tactical ambush zones.',
    createdAt: Date.now() - 86400000 * 5,
    gridSize: 32,
    cellSize: 2,
    theme: 'neon_matrix',
    blocks: [
      // Outer
      { id: 'cm_n', x: 0, y: 2.5, z: -28, width: 56, height: 5, depth: 1, type: 'wall', color: '#10b981' },
      { id: 'cm_s', x: 0, y: 2.5, z: 28, width: 56, height: 5, depth: 1, type: 'wall', color: '#10b981' },
      { id: 'cm_w', x: -28, y: 2.5, z: 0, width: 1, height: 5, depth: 56, type: 'wall', color: '#10b981' },
      { id: 'cm_e', x: 28, y: 2.5, z: 0, width: 1, height: 5, depth: 56, type: 'wall', color: '#10b981' },

      // Maze corridors
      { id: 'cm_w1', x: -12, y: 2, z: -14, width: 16, height: 4, depth: 1.5, type: 'wall', color: '#10b981' },
      { id: 'cm_w2', x: 12, y: 2, z: -14, width: 16, height: 4, depth: 1.5, type: 'wall', color: '#10b981' },
      { id: 'cm_w3', x: -12, y: 2, z: 14, width: 16, height: 4, depth: 1.5, type: 'wall', color: '#10b981' },
      { id: 'cm_w4', x: 12, y: 2, z: 14, width: 16, height: 4, depth: 1.5, type: 'wall', color: '#10b981' },

      // Glass Energy walls
      { id: 'cm_g1', x: 0, y: 2, z: 0, width: 1, height: 4, depth: 14, type: 'energy_barrier', color: '#06b6d4', opacity: 0.45 },
      { id: 'cm_g2', x: -14, y: 2, z: 0, width: 12, height: 4, depth: 1, type: 'energy_barrier', color: '#06b6d4', opacity: 0.45 },
      { id: 'cm_g3', x: 14, y: 2, z: 0, width: 12, height: 4, depth: 1, type: 'energy_barrier', color: '#06b6d4', opacity: 0.45 },

      // Center Spire & Jump Pads
      { id: 'cm_p1', x: 0, y: 1.5, z: 0, width: 3, height: 3, depth: 3, type: 'pillar', color: '#f59e0b' },
      { id: 'cm_j1', x: -8, y: 0.2, z: -6, width: 2.5, height: 0.4, depth: 2.5, type: 'jump_pad', color: '#a855f7' },
      { id: 'cm_j2', x: 8, y: 0.2, z: 6, width: 2.5, height: 0.4, depth: 2.5, type: 'jump_pad', color: '#a855f7' },
    ],
    powerups: [
      { id: 'p_cm_1', x: 0, y: 3.5, z: 0, type: 'overcharge', active: true, respawnCountdown: 0 },
      { id: 'p_cm_2', x: -20, y: 1.2, z: 20, type: 'cloak', active: true, respawnCountdown: 0 },
      { id: 'p_cm_3', x: 20, y: 1.2, z: -20, type: 'repair', active: true, respawnCountdown: 0 },
      { id: 'p_cm_4', x: 0, y: 1.2, z: -20, type: 'speed', active: true, respawnCountdown: 0 },
    ],
    spawnPoints: [
      { id: 'cm_sp1', x: -22, y: 1, z: -22, team: 'neon' },
      { id: 'cm_sp2', x: 22, y: 1, z: 22, team: 'plasma' },
      { id: 'cm_sp3', x: -22, y: 1, z: 22, team: 'solo' },
      { id: 'cm_sp4', x: 22, y: 1, z: -22, team: 'solo' },
    ]
  },
  {
    id: 'solaris-reactor',
    name: 'Solaris Reactor',
    creator: 'Helios Ordnance',
    description: 'Multi-deck industrial reactor facility with elevated catwalks, long sightlines for railguns, and high-velocity jump boosters.',
    createdAt: Date.now() - 86400000 * 2,
    gridSize: 32,
    cellSize: 2,
    theme: 'void_colosseum',
    blocks: [
      // Outer
      { id: 'sr_n', x: 0, y: 3, z: -30, width: 60, height: 6, depth: 1, type: 'wall', color: '#f43f5e' },
      { id: 'sr_s', x: 0, y: 3, z: 30, width: 60, height: 6, depth: 1, type: 'wall', color: '#f43f5e' },
      { id: 'sr_w', x: -30, y: 3, z: 0, width: 1, height: 6, depth: 60, type: 'wall', color: '#f43f5e' },
      { id: 'sr_e', x: 30, y: 3, z: 0, width: 1, height: 6, depth: 60, type: 'wall', color: '#f43f5e' },

      // Raised Catwalks
      { id: 'sr_cat_w', x: -16, y: 3, z: 0, width: 6, height: 0.6, depth: 32, type: 'tower', color: '#fb923c' },
      { id: 'sr_cat_e', x: 16, y: 3, z: 0, width: 6, height: 0.6, depth: 32, type: 'tower', color: '#fb923c' },
      { id: 'sr_bridge', x: 0, y: 3, z: 0, width: 26, height: 0.6, depth: 5, type: 'tower', color: '#fb923c' },

      // Jump Pads to Catwalks
      { id: 'sr_jp1', x: -16, y: 0.2, z: -20, width: 3, height: 0.4, depth: 3, type: 'jump_pad', color: '#8b5cf6' },
      { id: 'sr_jp2', x: -16, y: 0.2, z: 20, width: 3, height: 0.4, depth: 3, type: 'jump_pad', color: '#8b5cf6' },
      { id: 'sr_jp3', x: 16, y: 0.2, z: -20, width: 3, height: 0.4, depth: 3, type: 'jump_pad', color: '#8b5cf6' },
      { id: 'sr_jp4', x: 16, y: 0.2, z: 20, width: 3, height: 0.4, depth: 3, type: 'jump_pad', color: '#8b5cf6' },

      // Center Reactor Core
      { id: 'sr_core', x: 0, y: 4, z: 0, width: 3, height: 8, depth: 3, type: 'pillar', color: '#38bdf8' },
    ],
    powerups: [
      { id: 'p_sr_1', x: 0, y: 4.2, z: 0, type: 'overcharge', active: true, respawnCountdown: 0 },
      { id: 'p_sr_2', x: -16, y: 4.2, z: 0, type: 'cloak', active: true, respawnCountdown: 0 },
      { id: 'p_sr_3', x: 16, y: 4.2, z: 0, type: 'speed', active: true, respawnCountdown: 0 },
      { id: 'p_sr_4', x: 0, y: 1.2, z: -15, type: 'repair', active: true, respawnCountdown: 0 },
    ],
    spawnPoints: [
      { id: 'sr_sp1', x: -24, y: 1, z: 0, team: 'neon' },
      { id: 'sr_sp2', x: 24, y: 1, z: 0, team: 'plasma' },
      { id: 'sr_sp3', x: 0, y: 1, z: -24, team: 'solo' },
      { id: 'sr_sp4', x: 0, y: 1, z: 24, team: 'solo' },
    ]
  }
];
