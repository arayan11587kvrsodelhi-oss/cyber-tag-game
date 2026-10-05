import { WeaponConfig, WeaponType } from '../types/game';

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  pulse: {
    id: 'pulse',
    name: 'Vortex Pulse Blaster',
    category: 'Standard Assault',
    damage: 34, // 3 shots kill full 100 shield + 100 health takes ~6 shots
    fireInterval: 175, // ~5.7 shots per sec
    heatPerShot: 12,
    heatDissipation: 35,
    maxHeat: 100,
    range: 120,
    projectileSpeed: 95,
    spread: 0.015,
    color: '#06b6d4', // Cyan neon
    description: 'Precision balanced repeating plasma carbine with rapid cycling.'
  },
  rail: {
    id: 'rail',
    name: 'Nova Rail Lance',
    category: 'High-Impact Sniper',
    damage: 95, // Near 1-shot (headshot is lethal)
    fireInterval: 850,
    heatPerShot: 48,
    heatDissipation: 30,
    maxHeat: 100,
    range: 250,
    projectileSpeed: 0, // Hitscan instantaneous beam
    spread: 0.002,
    color: '#ec4899', // Magenta beam
    description: 'Instantaneous high-voltage particle beam that vaporizes shields on contact.'
  },
  scatter: {
    id: 'scatter',
    name: 'Phasic Spread Cannon',
    category: 'CQB Disperser',
    damage: 18, // 8 pellets = 144 max point blank
    pelletCount: 8,
    fireInterval: 500,
    heatPerShot: 26,
    heatDissipation: 32,
    maxHeat: 100,
    range: 60,
    projectileSpeed: 80,
    spread: 0.07,
    color: '#eab308', // Amber laser
    description: 'Fires an eight-beam cluster spread tuned for devastating close-quarters room clearing.'
  },
  rapid: {
    id: 'rapid',
    name: 'Quantum Hyper-SMG',
    category: 'Rapid Fire',
    damage: 16,
    fireInterval: 95, // ~10 shots/sec
    heatPerShot: 7,
    heatDissipation: 42,
    maxHeat: 100,
    range: 90,
    projectileSpeed: 105,
    spread: 0.035,
    color: '#22c55e', // Emerald neon
    description: 'Ultra high rate-of-fire subatomic tracer storm with accelerated venting.'
  }
};

export const HIT_MULTIPLIERS = {
  head: 1.75, // Head sensor bonus
  chest: 1.0,  // Standard torso sensor
  back: 1.35,  // Flanking back sensor bonus
  limb: 0.8    // Arm/Leg sensor glancing tag
};

export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.6;
export const PLAYER_RADIUS = 0.5;
export const MOVE_SPEED = 9.0;
export const SPRINT_MULTIPLIER = 1.45;
export const JUMP_VELOCITY = 8.5;
export const GRAVITY = 24.0;
