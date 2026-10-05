import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  Player, 
  ArenaLayout, 
  RoomInfo, 
  LeaderboardEntry, 
  LaserShotData, 
  HitEventData, 
  KillFeedItem,
  WeaponType,
  TeamId
} from './src/types/game.ts';
import { DEFAULT_ARENAS } from './src/game/defaultArenas.ts';
import { WEAPONS, HIT_MULTIPLIERS } from './src/game/constants.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

// --- GLOBAL STORAGE ---
const savedArenas: ArenaLayout[] = [...DEFAULT_ARENAS];

let globalLeaderboard: LeaderboardEntry[] = [
  { rank: 1, playerId: 'bot_legend_1', name: 'ApexPhantom', title: 'Cyber Overlord', tags: 1420, deaths: 310, kdRatio: 4.58, accuracy: 68, winRate: 84, bestStreak: 19, score: 142000, matchesPlayed: 112, favoriteWeapon: 'rail' },
  { rank: 2, playerId: 'bot_legend_2', name: 'ViperRay', title: 'Plasma Marshal', tags: 1290, deaths: 380, kdRatio: 3.39, accuracy: 61, winRate: 78, bestStreak: 16, score: 129000, matchesPlayed: 98, favoriteWeapon: 'pulse' },
  { rank: 3, playerId: 'bot_legend_3', name: 'QuantumGlitch', title: 'Neon Stalker', tags: 1140, deaths: 420, kdRatio: 2.71, accuracy: 55, winRate: 72, bestStreak: 14, score: 114000, matchesPlayed: 94, favoriteWeapon: 'rapid' },
  { rank: 4, playerId: 'bot_legend_4', name: 'SolarisVanguard', title: 'Grid Enforcer', tags: 980, deaths: 410, kdRatio: 2.39, accuracy: 52, winRate: 67, bestStreak: 11, score: 98000, matchesPlayed: 82, favoriteWeapon: 'scatter' },
  { rank: 5, playerId: 'bot_legend_5', name: 'ZeroKevlar', title: 'Void Infiltrator', tags: 890, deaths: 395, kdRatio: 2.25, accuracy: 49, winRate: 64, bestStreak: 10, score: 89000, matchesPlayed: 76, favoriteWeapon: 'pulse' },
  { rank: 6, playerId: 'bot_legend_6', name: 'HyperPulse', title: 'Sensor Assassin', tags: 760, deaths: 370, kdRatio: 2.05, accuracy: 47, winRate: 61, bestStreak: 9, score: 76000, matchesPlayed: 69, favoriteWeapon: 'rail' },
];

function sortLeaderboard() {
  globalLeaderboard.sort((a, b) => b.score - a.score);
  globalLeaderboard.forEach((e, idx) => {
    e.rank = idx + 1;
  });
}

// --- ROOM LOGIC ---

interface ServerRoom {
  id: string;
  name: string;
  arena: ArenaLayout;
  gameMode: 'ffa' | 'team';
  maxPlayers: number;
  timeRemaining: number;
  state: 'waiting' | 'in_progress' | 'ended';
  scores: { neon: number; plasma: number };
  players: Map<string, Player>;
  clients: Map<string, WebSocket>;
  killFeed: KillFeedItem[];
  botCount: number;
}

const rooms = new Map<string, ServerRoom>();

function createRoom(
  id: string,
  name: string,
  arenaId: string,
  gameMode: 'ffa' | 'team' = 'team',
  botCount: number = 5,
  matchDuration: number = 300
): ServerRoom {
  const arena = savedArenas.find((a) => a.id === arenaId) || DEFAULT_ARENAS[0];

  const room: ServerRoom = {
    id,
    name,
    arena: JSON.parse(JSON.stringify(arena)),
    gameMode,
    maxPlayers: 12,
    timeRemaining: matchDuration,
    state: 'in_progress',
    scores: { neon: 0, plasma: 0 },
    players: new Map(),
    clients: new Map(),
    killFeed: [],
    botCount,
  };

  // Spawn AI bots
  for (let i = 0; i < botCount; i++) {
    const botId = `bot_${id}_${i + 1}`;
    const botNames = ['NeonWolf', 'PlasmaFox', 'CyberViper', 'GhostRecon', 'HyperNova', 'TitanRogue', 'ApexStalker'];
    const botTeam: TeamId = gameMode === 'team' ? (i % 2 === 0 ? 'neon' : 'plasma') : 'solo';
    const spawn = getSpawnPoint(room.arena, botTeam);

    const botPlayer: Player = {
      id: botId,
      name: `[BOT] ${botNames[i % botNames.length]}`,
      team: botTeam,
      color: botTeam === 'neon' ? '#06b6d4' : '#ec4899',
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      yaw: Math.random() * Math.PI * 2,
      pitch: 0,
      health: 100,
      maxHealth: 100,
      shield: 100,
      maxShield: 100,
      score: 0,
      kills: 0,
      deaths: 0,
      streak: 0,
      bestStreak: 0,
      activeWeapon: (['pulse', 'rail', 'scatter', 'rapid'] as WeaponType[])[i % 4],
      heat: 0,
      isOverheated: false,
      isRespawning: false,
      respawnTimeRemaining: 0,
      invulnerableTimeRemaining: 0,
      powerups: { overcharge: 0, cloak: 0, speed: 0 },
      isBot: true,
      shotsFired: 0,
      shotsHit: 0,
    };
    room.players.set(botId, botPlayer);
  }

  rooms.set(id, room);
  return room;
}

function getSpawnPoint(arena: ArenaLayout, team: TeamId): { x: number; y: number; z: number } {
  const matches = arena.spawnPoints.filter((sp) => !sp.team || sp.team === team);
  if (matches.length > 0) {
    const pick = matches[Math.floor(Math.random() * matches.length)];
    return { x: pick.x + (Math.random() - 0.5) * 2, y: pick.y, z: pick.z + (Math.random() - 0.5) * 2 };
  }
  return { x: (Math.random() - 0.5) * 20, y: 1.5, z: (Math.random() - 0.5) * 20 };
}

// Initial quick-match room
createRoom('quick-match', 'Citadel Prime', 'neon-citadel', 'team', 5, 360);

// --- BROADCAST HELPERS ---

function broadcastToRoom(room: ServerRoom, data: unknown) {
  const message = JSON.stringify(data);
  room.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// --- SERVER TICK (30 Hz) ---
setInterval(() => {
  const delta = 1 / 30;

  rooms.forEach((room) => {
    if (room.state !== 'in_progress') return;

    // Match countdown
    room.timeRemaining -= delta;
    if (room.timeRemaining <= 0) {
      room.timeRemaining = 0;
      room.state = 'ended';

      // Update global leaderboard with human player stats
      room.players.forEach((p) => {
        if (!p.isBot) {
          updatePlayerInLeaderboard(p);
        }
      });

      broadcastToRoom(room, {
        type: 'match_ended',
        scores: room.scores,
        players: Array.from(room.players.values()),
      });
      return;
    }

    // Power-up countdowns
    room.arena.powerups.forEach((pu) => {
      if (!pu.active) {
        pu.respawnCountdown -= delta;
        if (pu.respawnCountdown <= 0) {
          pu.active = true;
          pu.respawnCountdown = 0;
          broadcastToRoom(room, {
            type: 'powerup_state',
            powerupId: pu.id,
            active: true,
          });
        }
      }
    });

    // Players & Bots loop
    room.players.forEach((player) => {
      // Respawn timer
      if (player.isRespawning) {
        player.respawnTimeRemaining -= delta;
        if (player.respawnTimeRemaining <= 0) {
          player.isRespawning = false;
          player.health = 100;
          player.shield = 100;
          player.heat = 0;
          player.invulnerableTimeRemaining = 2.5; // 2.5s shield

          const spawn = getSpawnPoint(room.arena, player.team);
          player.x = spawn.x;
          player.y = spawn.y;
          player.z = spawn.z;

          broadcastToRoom(room, {
            type: 'player_respawned',
            player,
          });
        }
      }

      // Invulnerability shield timer
      if (player.invulnerableTimeRemaining > 0) {
        player.invulnerableTimeRemaining = Math.max(0, player.invulnerableTimeRemaining - delta);
      }

      // Heat dissipation
      const wConfig = WEAPONS[player.activeWeapon];
      if (player.heat > 0) {
        player.heat = Math.max(0, player.heat - wConfig.heatDissipation * delta);
        if (player.heat === 0) {
          player.isOverheated = false;
        }
      }

      // Shield regeneration (if not damaged in last few seconds)
      if (!player.isRespawning && player.shield < player.maxShield) {
        player.shield = Math.min(player.maxShield, player.shield + 8 * delta);
      }

      // Powerups duration
      if (player.powerups.overcharge > 0) player.powerups.overcharge = Math.max(0, player.powerups.overcharge - delta);
      if (player.powerups.cloak > 0) player.powerups.cloak = Math.max(0, player.powerups.cloak - delta);
      if (player.powerups.speed > 0) player.powerups.speed = Math.max(0, player.powerups.speed - delta);

      // Bot AI Behavior
      if (player.isBot && !player.isRespawning) {
        updateBotAI(player, room, delta);
      }
    });

    // Broadcast world state every tick
    broadcastToRoom(room, {
      type: 'world_tick',
      players: Array.from(room.players.values()),
      timeRemaining: Math.ceil(room.timeRemaining),
      scores: room.scores,
    });
  });
}, 33);

function updateBotAI(bot: Player, room: ServerRoom, delta: number) {
  // Find closest opponent
  let closestOpp: Player | null = null;
  let closestDist = 999;

  for (const other of room.players.values()) {
    if (other.id === bot.id || other.isRespawning) continue;
    if (room.gameMode === 'team' && other.team === bot.team) continue;

    const d = Math.hypot(other.x - bot.x, other.z - bot.z);
    if (d < closestDist) {
      closestDist = d;
      closestOpp = other;
    }
  }

  const arenaRadius = (room.arena.gridSize * room.arena.cellSize) / 2 - 2;

  if (closestOpp && closestDist < 45) {
    // Face opponent
    const dx = closestOpp.x - bot.x;
    const dz = closestOpp.z - bot.z;
    bot.yaw = Math.atan2(-dx, -dz);

    // Strafe and advance/retreat
    const moveSpeed = 6.0;
    if (closestDist > 12) {
      bot.x += Math.sin(-bot.yaw) * moveSpeed * delta;
      bot.z += Math.cos(-bot.yaw) * moveSpeed * delta;
    } else if (closestDist < 6) {
      bot.x -= Math.sin(-bot.yaw) * moveSpeed * delta;
      bot.z -= Math.cos(-bot.yaw) * moveSpeed * delta;
    }

    // Strafe sideways
    const strafeSpeed = 4.0;
    const strafeDir = Math.sin(Date.now() / 800 + bot.id.length);
    bot.x += Math.cos(-bot.yaw) * strafeDir * strafeSpeed * delta;
    bot.z += -Math.sin(-bot.yaw) * strafeDir * strafeSpeed * delta;

    // Boundary clamp
    bot.x = Math.max(-arenaRadius, Math.min(arenaRadius, bot.x));
    bot.z = Math.max(-arenaRadius, Math.min(arenaRadius, bot.z));

    // Bot fire laser
    if (!bot.isOverheated && Math.random() < 0.08) {
      const wConfig = WEAPONS[bot.activeWeapon];
      bot.heat = Math.min(100, bot.heat + wConfig.heatPerShot);
      if (bot.heat >= 100) bot.isOverheated = true;

      const dirX = Math.sin(-bot.yaw);
      const dirZ = Math.cos(-bot.yaw);

      broadcastToRoom(room, {
        type: 'laser_shot',
        shot: {
          id: `shot_${Date.now()}_${bot.id}`,
          playerId: bot.id,
          weaponType: bot.activeWeapon,
          color: bot.color,
          startX: bot.x,
          startY: bot.y + 1.2,
          startZ: bot.z,
          dirX,
          dirY: 0,
          dirZ,
          timestamp: Date.now(),
          isHitscan: wConfig.projectileSpeed === 0,
        },
      });

      // Bot hit roll (based on difficulty/distance)
      if (Math.random() < 0.35 && closestOpp.invulnerableTimeRemaining <= 0) {
        applyDamage(room, bot.id, closestOpp.id, bot.activeWeapon, 'chest');
      }
    }
  } else {
    // Wander patrol
    const speed = 4.0;
    bot.yaw += (Math.random() - 0.5) * delta * 2;
    bot.x += Math.sin(-bot.yaw) * speed * delta;
    bot.z += Math.cos(-bot.yaw) * speed * delta;

    if (Math.abs(bot.x) >= arenaRadius || Math.abs(bot.z) >= arenaRadius) {
      bot.yaw += Math.PI * 0.8;
      bot.x = Math.max(-arenaRadius, Math.min(arenaRadius, bot.x));
      bot.z = Math.max(-arenaRadius, Math.min(arenaRadius, bot.z));
    }
  }
}

function applyDamage(
  room: ServerRoom,
  shooterId: string,
  targetId: string,
  weapon: WeaponType,
  hitZone: 'head' | 'chest' | 'back' | 'limb'
) {
  const shooter = room.players.get(shooterId);
  const target = room.players.get(targetId);
  if (!shooter || !target || target.isRespawning || target.invulnerableTimeRemaining > 0) return;

  const wConfig = WEAPONS[weapon];
  const mult = HIT_MULTIPLIERS[hitZone] || 1.0;
  const powerMult = shooter.powerups.overcharge > 0 ? 2.0 : 1.0;
  const totalDamage = Math.round(wConfig.damage * mult * powerMult);

  shooter.shotsHit++;

  // Apply to shield first, then health
  if (target.shield > 0) {
    if (target.shield >= totalDamage) {
      target.shield -= totalDamage;
    } else {
      const leftover = totalDamage - target.shield;
      target.shield = 0;
      target.health = Math.max(0, target.health - leftover);
    }
  } else {
    target.health = Math.max(0, target.health - totalDamage);
  }

  const isKilled = target.health <= 0;

  broadcastToRoom(room, {
    type: 'hit_event',
    hit: {
      shooterId,
      targetId,
      damage: totalDamage,
      hitZone,
      killed: isKilled,
      weapon,
      timestamp: Date.now(),
    },
  });

  if (isKilled) {
    target.health = 0;
    target.isRespawning = true;
    target.respawnTimeRemaining = 3.0; // 3s respawn
    target.deaths++;
    target.streak = 0;

    shooter.kills++;
    shooter.streak++;
    if (shooter.streak > shooter.bestStreak) {
      shooter.bestStreak = shooter.streak;
    }
    shooter.score += 100 + (hitZone === 'head' ? 50 : 0) + (shooter.streak > 1 ? shooter.streak * 20 : 0);

    // Update team scores
    if (room.gameMode === 'team') {
      if (shooter.team === 'neon') room.scores.neon++;
      if (shooter.team === 'plasma') room.scores.plasma++;
    }

    const killItem: KillFeedItem = {
      id: `kf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      killerId: shooter.id,
      killerName: shooter.name,
      victimId: target.id,
      victimName: target.name,
      weapon,
      isHeadshot: hitZone === 'head',
      timestamp: Date.now(),
    };
    room.killFeed.push(killItem);
    if (room.killFeed.length > 10) room.killFeed.shift();

    broadcastToRoom(room, {
      type: 'kill_confirmed',
      item: killItem,
      shooter,
      victim: target,
    });
  }
}

function updatePlayerInLeaderboard(player: Player) {
  let entry = globalLeaderboard.find((e) => e.playerId === player.id);
  const acc = player.shotsFired > 0 ? Math.round((player.shotsHit / player.shotsFired) * 100) : 50;

  if (entry) {
    entry.tags += player.kills;
    entry.deaths += player.deaths;
    entry.kdRatio = entry.deaths > 0 ? parseFloat((entry.tags / entry.deaths).toFixed(2)) : entry.tags;
    entry.score += player.score;
    entry.matchesPlayed += 1;
    entry.bestStreak = Math.max(entry.bestStreak, player.bestStreak);
    entry.accuracy = Math.round((entry.accuracy + acc) / 2);
    entry.favoriteWeapon = player.activeWeapon;
  } else {
    entry = {
      rank: globalLeaderboard.length + 1,
      playerId: player.id,
      name: player.name,
      title: 'Neon Cadet',
      tags: player.kills,
      deaths: player.deaths,
      kdRatio: player.deaths > 0 ? parseFloat((player.kills / player.deaths).toFixed(2)) : player.kills,
      accuracy: acc,
      winRate: 100,
      bestStreak: player.bestStreak || player.streak,
      score: player.score,
      matchesPlayed: 1,
      favoriteWeapon: player.activeWeapon,
    };
    globalLeaderboard.push(entry);
  }

  // Update title based on tags
  if (entry.tags >= 500) entry.title = 'Cyber Overlord';
  else if (entry.tags >= 250) entry.title = 'Plasma Marshal';
  else if (entry.tags >= 100) entry.title = 'Grid Stalker';
  else if (entry.tags >= 40) entry.title = 'Sensor Specialist';
  else entry.title = 'Neon Recruit';

  sortLeaderboard();
}

// --- FULL STACK APP SETUP ---

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // --- REST APIS ---

  app.get('/api/leaderboard', (req, res) => {
    res.json({ leaderboard: globalLeaderboard });
  });

  app.get('/api/arenas', (req, res) => {
    res.json({ arenas: savedArenas });
  });

  app.post('/api/arenas', (req, res) => {
    const newArena = req.body as ArenaLayout;
    if (!newArena || !newArena.id || !newArena.blocks) {
      return res.status(400).json({ error: 'Invalid arena data' });
    }
    const existingIndex = savedArenas.findIndex((a) => a.id === newArena.id);
    if (existingIndex >= 0) {
      savedArenas[existingIndex] = newArena;
    } else {
      savedArenas.push(newArena);
    }
    res.json({ success: true, arena: newArena });
  });

  app.get('/api/rooms', (req, res) => {
    const list: RoomInfo[] = [];
    rooms.forEach((r) => {
      list.push({
        id: r.id,
        name: r.name,
        arenaId: r.arena.id,
        arenaName: r.arena.name,
        gameMode: r.gameMode,
        playerCount: r.players.size,
        maxPlayers: r.maxPlayers,
        timeRemaining: Math.ceil(r.timeRemaining),
        state: r.state,
        scores: r.scores,
      });
    });
    res.json({ rooms: list });
  });

  // --- WEBSOCKET CONNECTION HANDLER ---

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (msgRaw: string) => {
      try {
        const msg = JSON.parse(msgRaw.toString());

        if (msg.type === 'join_room') {
          const { roomId, playerInfo, createOptions } = msg;

          let room = rooms.get(roomId);
          if (!room) {
            if (createOptions) {
              room = createRoom(
                roomId,
                createOptions.roomName,
                createOptions.arenaId,
                createOptions.gameMode,
                createOptions.botCount,
                createOptions.matchDuration
              );
            } else {
              room = createRoom(roomId, 'Arena Sector', 'neon-citadel', 'team', 5, 300);
            }
          }

          currentRoomId = room.id;
          currentPlayerId = playerInfo.id;

          // If room has bot and is full or replacing a bot
          const bots = Array.from(room.players.values()).filter((p) => p.isBot);
          if (bots.length > 0 && room.players.size >= room.maxPlayers) {
            room.players.delete(bots[0].id);
          }

          const spawn = getSpawnPoint(room.arena, playerInfo.team || 'neon');
          const player: Player = {
            id: playerInfo.id,
            name: playerInfo.name || 'Viper',
            team: playerInfo.team || 'neon',
            color: playerInfo.team === 'neon' ? '#06b6d4' : '#ec4899',
            x: spawn.x,
            y: spawn.y,
            z: spawn.z,
            yaw: 0,
            pitch: 0,
            health: 100,
            maxHealth: 100,
            shield: 100,
            maxShield: 100,
            score: 0,
            kills: 0,
            deaths: 0,
            streak: 0,
            bestStreak: 0,
            activeWeapon: playerInfo.activeWeapon || 'pulse',
            heat: 0,
            isOverheated: false,
            isRespawning: false,
            respawnTimeRemaining: 0,
            invulnerableTimeRemaining: 3.0,
            powerups: { overcharge: 0, cloak: 0, speed: 0 },
            isBot: false,
            shotsFired: 0,
            shotsHit: 0,
          };

          room.players.set(player.id, player);
          room.clients.set(player.id, ws);

          // Send init payload to player
          ws.send(JSON.stringify({
            type: 'init_state',
            player,
            room: {
              id: room.id,
              name: room.name,
              arenaId: room.arena.id,
              arenaName: room.arena.name,
              gameMode: room.gameMode,
              playerCount: room.players.size,
              maxPlayers: room.maxPlayers,
              timeRemaining: Math.ceil(room.timeRemaining),
              state: room.state,
              scores: room.scores,
            },
            arena: room.arena,
            players: Array.from(room.players.values()),
            killFeed: room.killFeed,
          }));

          // Broadcast join to others
          broadcastToRoom(room, {
            type: 'player_joined',
            player,
          });

        } else if (msg.type === 'player_move') {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const player = room.players.get(currentPlayerId);
          if (player && !player.isRespawning) {
            player.x = msg.x;
            player.y = msg.y;
            player.z = msg.z;
            player.yaw = msg.yaw;
            player.pitch = msg.pitch;
          }

        } else if (msg.type === 'shoot_laser') {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const player = room.players.get(currentPlayerId);
          if (!player || player.isRespawning || player.isOverheated) return;

          player.shotsFired++;
          const wConfig = WEAPONS[msg.weaponType as WeaponType];
          player.heat = Math.min(100, player.heat + wConfig.heatPerShot);
          if (player.heat >= 100) player.isOverheated = true;

          const shotData: LaserShotData = {
            id: `shot_${Date.now()}_${player.id}`,
            playerId: player.id,
            weaponType: msg.weaponType,
            color: player.color,
            startX: msg.startX,
            startY: msg.startY,
            startZ: msg.startZ,
            dirX: msg.dirX,
            dirY: msg.dirY,
            dirZ: msg.dirZ,
            timestamp: Date.now(),
            isHitscan: wConfig.projectileSpeed === 0,
          };

          broadcastToRoom(room, {
            type: 'laser_shot',
            shot: shotData,
          });

        } else if (msg.type === 'report_hit') {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          applyDamage(room, currentPlayerId, msg.targetId, msg.weapon, msg.hitZone);

        } else if (msg.type === 'switch_weapon') {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const player = room.players.get(currentPlayerId);
          if (player && WEAPONS[msg.weapon as WeaponType]) {
            player.activeWeapon = msg.weapon;
          }

        } else if (msg.type === 'touch_powerup') {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const player = room.players.get(currentPlayerId);
          const pu = room.arena.powerups.find((p) => p.id === msg.powerupId);

          if (player && pu && pu.active && !player.isRespawning) {
            pu.active = false;
            pu.respawnCountdown = 30; // 30 sec respawn

            if (pu.type === 'overcharge') player.powerups.overcharge = 15;
            if (pu.type === 'cloak') player.powerups.cloak = 15;
            if (pu.type === 'speed') player.powerups.speed = 15;
            if (pu.type === 'repair') {
              player.health = player.maxHealth;
              player.shield = player.maxShield;
            }

            broadcastToRoom(room, {
              type: 'powerup_state',
              powerupId: pu.id,
              active: false,
              takenBy: player.name,
              typeKey: pu.type,
            });
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && currentPlayerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          const player = room.players.get(currentPlayerId);
          room.players.delete(currentPlayerId);
          room.clients.delete(currentPlayerId);

          if (player) {
            updatePlayerInLeaderboard(player);
          }

          broadcastToRoom(room, {
            type: 'player_left',
            playerId: currentPlayerId,
          });
        }
      }
    });
  });

  // --- VITE MIDDLEWARE / STATIC ASSETS ---

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CYBERTAG Server listening on port ${PORT}`);
  });
}

startServer();
