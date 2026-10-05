export type TeamId = 'neon' | 'plasma' | 'solo';

export type WeaponType = 'pulse' | 'rail' | 'scatter' | 'rapid';

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  category: string;
  damage: number;
  fireInterval: number; // ms
  heatPerShot: number;
  heatDissipation: number; // heat/sec
  maxHeat: number;
  range: number;
  projectileSpeed: number; // units/sec, 0 for hitscan beam
  pelletCount?: number;
  spread: number;
  color: string;
  description: string;
}

export interface Player {
  id: string;
  name: string;
  team: TeamId;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  score: number;
  kills: number;
  deaths: number;
  streak: number;
  bestStreak: number;
  activeWeapon: WeaponType;
  heat: number;
  isOverheated: boolean;
  isRespawning: boolean;
  respawnTimeRemaining: number;
  invulnerableTimeRemaining: number;
  powerups: {
    overcharge: number; // remaining seconds
    cloak: number;
    speed: number;
  };
  isBot?: boolean;
  ping?: number;
  shotsFired: number;
  shotsHit: number;
}

export type BlockType = 
  | 'wall' 
  | 'pillar' 
  | 'energy_barrier' 
  | 'jump_pad' 
  | 'crate' 
  | 'ramp'
  | 'tower';

export interface ArenaBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  type: BlockType;
  color?: string;
  opacity?: number;
}

export type PowerupType = 'overcharge' | 'cloak' | 'repair' | 'speed';

export interface ArenaPowerup {
  id: string;
  x: number;
  y: number;
  z: number;
  type: PowerupType;
  active: boolean;
  respawnCountdown: number;
}

export interface ArenaSpawnPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  team?: TeamId;
}

export interface ArenaLayout {
  id: string;
  name: string;
  creator: string;
  description: string;
  createdAt: number;
  gridSize: number; // e.g. 32
  cellSize: number; // e.g. 2 meters
  blocks: ArenaBlock[];
  powerups: ArenaPowerup[];
  spawnPoints: ArenaSpawnPoint[];
  theme: 'cyberpunk' | 'neon_matrix' | 'void_colosseum';
}

export interface LaserShotData {
  id: string;
  playerId: string;
  weaponType: WeaponType;
  color: string;
  startX: number;
  startY: number;
  startZ: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  timestamp: number;
  isHitscan: boolean;
}

export interface HitEventData {
  shooterId: string;
  targetId: string;
  damage: number;
  hitZone: 'head' | 'chest' | 'back' | 'limb';
  killed: boolean;
  weapon: WeaponType;
  timestamp: number;
}

export interface KillFeedItem {
  id: string;
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weapon: WeaponType;
  isHeadshot: boolean;
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  title: string;
  tags: number;
  deaths: number;
  kdRatio: number;
  accuracy: number;
  winRate: number;
  bestStreak: number;
  score: number;
  matchesPlayed: number;
  favoriteWeapon: WeaponType;
}

export interface RoomInfo {
  id: string;
  name: string;
  arenaId: string;
  arenaName: string;
  gameMode: 'ffa' | 'team';
  playerCount: number;
  maxPlayers: number;
  timeRemaining: number;
  state: 'waiting' | 'in_progress' | 'ended';
  scores: {
    neon: number;
    plasma: number;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderTeam: TeamId;
  text: string;
  isSystem?: boolean;
  timestamp: number;
}
