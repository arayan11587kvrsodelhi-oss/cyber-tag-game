import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Player, 
  ArenaLayout, 
  RoomInfo, 
  LeaderboardEntry, 
  KillFeedItem, 
  TeamId, 
  WeaponType,
  LaserShotData,
  HitEventData
} from './types/game';
import { DEFAULT_ARENAS } from './game/defaultArenas';
import { WEAPONS } from './game/constants';
import { ThreeRenderer } from './game/threeRenderer';
import { sound } from './audio/soundEngine';
import { HUD } from './components/HUD';
import { Lobby } from './components/Lobby';
import { ArenaEditor } from './components/ArenaEditor';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MatchEndModal } from './components/MatchEndModal';
import { LogOut, Volume2, VolumeX, Maximize2, Shield, Crosshair } from 'lucide-react';
import * as THREE from 'three';

export default function App() {
  // App View Mode
  const [viewMode, setViewMode] = useState<'lobby' | 'game' | 'editor'>('lobby');

  // Player Profile
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('cybertag_name') || `Viper_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [selectedTeam, setSelectedTeam] = useState<TeamId>('neon');
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('pulse');
  const [mouseSensitivity, setMouseSensitivity] = useState<number>(0.0022);
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Arenas & Rooms
  const [arenas, setArenas] = useState<ArenaLayout[]>(DEFAULT_ARENAS);
  const [editingArena, setEditingArena] = useState<ArenaLayout | undefined>(undefined);
  const [activeRooms, setActiveRooms] = useState<RoomInfo[]>([]);

  // Active Game State
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [localPlayer, setLocalPlayer] = useState<Player | null>(null);
  const [opponents, setOpponents] = useState<Player[]>([]);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [currentArena, setCurrentArena] = useState<ArenaLayout>(DEFAULT_ARENAS[0]);

  // HUD Feedbacks
  const [hitMarker, setHitMarker] = useState<{ active: boolean; isHeadshot: boolean } | null>(null);
  const [damageDirection, setDamageDirection] = useState<number | null>(null);
  const [recentTagNotice, setRecentTagNotice] = useState<{ title: string; subtitle: string } | null>(null);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [isMatchEndOpen, setIsMatchEndOpen] = useState<boolean>(false);

  // Connection
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // 3D Canvas
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);

  // Shoot timing
  const lastShotTimeRef = useRef<number>(0);
  const localPlayerRef = useRef<Player | null>(null);
  localPlayerRef.current = localPlayer;

  // Persist player name
  useEffect(() => {
    localStorage.setItem('cybertag_name', playerName);
  }, [playerName]);

  // Fetch arenas & leaderboard on mount
  useEffect(() => {
    fetch('/api/arenas')
      .then((res) => res.json())
      .then((data) => {
        if (data.arenas && data.arenas.length > 0) {
          setArenas(data.arenas);
        }
      })
      .catch(() => {});

    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard) {
          setLeaderboardEntries(data.leaderboard);
        }
      })
      .catch(() => {});

    fetch('/api/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms) {
          setActiveRooms(data.rooms);
        }
      })
      .catch(() => {});

    // Periodic rooms refresh
    const interval = setInterval(() => {
      fetch('/api/rooms')
        .then((res) => res.json())
        .then((data) => {
          if (data.rooms) setActiveRooms(data.rooms);
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Connect to WebSocket Server
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'init_state') {
          setLocalPlayer(msg.player);
          setCurrentRoom(msg.room);
          setCurrentArena(msg.arena);
          setKillFeed(msg.killFeed || []);
          setIsMatchEndOpen(false);

          const otherPlayers = (msg.players as Player[]).filter((p) => p.id !== msg.player.id);
          setOpponents(otherPlayers);

          // Initialize or update 3D scene
          if (rendererRef.current) {
            rendererRef.current.loadArena(msg.arena);
            rendererRef.current.localPlayerPos.set(msg.player.x, msg.player.y, msg.player.z);
            rendererRef.current.yaw = msg.player.yaw;
            rendererRef.current.buildFpsBlaster(msg.player.activeWeapon);

            otherPlayers.forEach((opp) => {
              rendererRef.current?.updateOpponent(opp);
            });
          }

        } else if (msg.type === 'world_tick') {
          const players = msg.players as Player[];
          const myId = localPlayerRef.current?.id;

          const me = players.find((p) => p.id === myId);
          if (me) {
            setLocalPlayer(me);
          }

          const others = players.filter((p) => p.id !== myId);
          setOpponents(others);

          // Update 3D avatars for other players
          if (rendererRef.current) {
            others.forEach((p) => {
              rendererRef.current?.updateOpponent(p);
            });
          }

          // Update room timer & scores
          setCurrentRoom((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              timeRemaining: msg.timeRemaining,
              scores: msg.scores,
            };
          });

        } else if (msg.type === 'laser_shot') {
          const shot = msg.shot as LaserShotData;
          const isMine = shot.playerId === localPlayerRef.current?.id;

          // Sound
          sound.playLaserShot(shot.weaponType);

          // Visual laser beam / projectile in 3D scene
          if (rendererRef.current) {
            const start = new THREE.Vector3(shot.startX, shot.startY, shot.startZ);
            const dir = new THREE.Vector3(shot.dirX, shot.dirY, shot.dirZ);
            rendererRef.current.triggerLaserShot(shot.weaponType, start, dir, isMine);
          }

        } else if (msg.type === 'hit_event') {
          const hit = msg.hit as HitEventData;
          const myId = localPlayerRef.current?.id;

          if (hit.shooterId === myId) {
            // Local player tagged an opponent!
            const isHead = hit.hitZone === 'head';
            sound.playHitConfirm(isHead);
            setHitMarker({ active: true, isHeadshot: isHead });
            setTimeout(() => setHitMarker(null), 180);
          }

          if (hit.targetId === myId) {
            // Local player was tagged!
            sound.playDamageTaken();
            setDamageDirection(Math.random() * 360);
            setTimeout(() => setDamageDirection(null), 300);
          } else {
            // Opponent was hit: flash their 3D sensor armor
            rendererRef.current?.flashOpponentHit(hit.targetId);
          }

        } else if (msg.type === 'kill_confirmed') {
          const { item, shooter } = msg;
          setKillFeed((prev) => [...prev.slice(-9), item]);

          const myId = localPlayerRef.current?.id;
          if (item.killerId === myId) {
            sound.playEliminationSound();
            let title = `TAGGED ${item.victimName.toUpperCase()}`;
            let subtitle = `+100 PTS · SENSOR ELIMINATION`;
            if (item.isHeadshot) {
              title = `🎯 HEAD SENSOR OVERLOAD!`;
              subtitle = `+150 PTS · CRITICAL ACCURACY`;
            }
            if (shooter.streak >= 3) {
              subtitle = `🔥 ${shooter.streak}X TAG STREAK!`;
            }
            setRecentTagNotice({ title, subtitle });
            setTimeout(() => setRecentTagNotice(null), 2500);
          }

          if (item.victimId === myId) {
            sound.playDeRezDeath();
          }

        } else if (msg.type === 'powerup_state') {
          const { powerupId, active, takenBy, typeKey } = msg;
          rendererRef.current?.updatePowerupStatus(powerupId, active);
          if (!active) {
            sound.playPowerupPickup();
            if (takenBy) {
              setRecentTagNotice({
                title: `${typeKey.toUpperCase()} ACTIVATED`,
                subtitle: `${takenBy} acquired the node`,
              });
              setTimeout(() => setRecentTagNotice(null), 2000);
            }
          }

        } else if (msg.type === 'player_left') {
          rendererRef.current?.removeOpponent(msg.playerId);

        } else if (msg.type === 'match_ended') {
          setIsMatchEndOpen(true);
          rendererRef.current?.exitPointerLock();

          // Refresh leaderboard
          fetch('/api/leaderboard')
            .then((res) => res.json())
            .then((data) => {
              if (data.leaderboard) setLeaderboardEntries(data.leaderboard);
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 2s
      setTimeout(connectWebSocket, 2000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  // Initialize Three.js renderer when in game mode
  useEffect(() => {
    if (viewMode === 'game' && canvasContainerRef.current) {
      if (!rendererRef.current) {
        const tr = new ThreeRenderer(canvasContainerRef.current);
        rendererRef.current = tr;
        tr.mouseSensitivity = mouseSensitivity;

        // Callback for jump pad trigger
        tr.onJumpPadTrigger = () => {
          sound.playJumpPad();
        };

        // Callback for powerup touch
        tr.onPowerupTouch = (puId: string) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'touch_powerup',
              powerupId: puId,
            }));
          }
        };

        // Load arena
        if (currentArena) {
          tr.loadArena(currentArena);
        }
      }

      // Check pointer lock state regularly
      const checkLock = () => {
        setIsPointerLocked(document.pointerLockElement === canvasContainerRef.current);
      };
      document.addEventListener('pointerlockchange', checkLock);

      return () => {
        document.removeEventListener('pointerlockchange', checkLock);
      };
    } else if (viewMode !== 'game' && rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
  }, [viewMode, currentArena, mouseSensitivity]);

  // Update mouse sensitivity if changed
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.mouseSensitivity = mouseSensitivity;
    }
  }, [mouseSensitivity]);

  // In-Game Input and Laser Firing Handler
  useEffect(() => {
    if (viewMode !== 'game') return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only primary left-click
      const tr = rendererRef.current;
      if (!tr || !tr.isPointerLocked) return;

      const p = localPlayerRef.current;
      if (!p || p.isRespawning || p.isOverheated) return;

      const now = performance.now();
      const wConfig = WEAPONS[p.activeWeapon];

      // Rate of fire check
      if (now - lastShotTimeRef.current < wConfig.fireInterval) {
        return;
      }
      lastShotTimeRef.current = now;

      // Calculate camera forward direction
      const dir = new THREE.Vector3();
      tr.camera.getWorldDirection(dir);
      const origin = tr.camera.position.clone();

      // Trigger local sound & viewmodel recoil
      sound.playLaserShot(p.activeWeapon);
      tr.triggerLaserShot(p.activeWeapon, origin, dir, true);

      // Perform local raycast hit detection
      const hitResult = tr.performLocalShootRaycast(p.activeWeapon);

      // Send laser shot to server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'shoot_laser',
          weaponType: p.activeWeapon,
          startX: origin.x,
          startY: origin.y,
          startZ: origin.z,
          dirX: dir.x,
          dirY: dir.y,
          dirZ: dir.z,
        }));

        // If target was hit, report hit to server
        if (hitResult.hit && hitResult.targetId && hitResult.hitZone) {
          wsRef.current.send(JSON.stringify({
            type: 'report_hit',
            targetId: hitResult.targetId,
            hitZone: hitResult.hitZone,
            weapon: p.activeWeapon,
          }));
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Weapon selection 1, 2, 3, 4
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const index = parseInt(e.code.replace('Digit', '')) - 1;
        const weapons: WeaponType[] = ['pulse', 'rail', 'scatter', 'rapid'];
        const chosen = weapons[index];
        if (chosen) {
          handleSelectWeapon(chosen);
        }
      }

      // Tab for Scoreboard
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        setShowScoreboard(false);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewMode]);

  // Send local movement to server (25 Hz)
  useEffect(() => {
    if (viewMode !== 'game') return;

    const interval = setInterval(() => {
      const tr = rendererRef.current;
      const p = localPlayerRef.current;
      if (!tr || !p || p.isRespawning) return;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'player_move',
          x: tr.localPlayerPos.x,
          y: tr.localPlayerPos.y,
          z: tr.localPlayerPos.z,
          yaw: tr.yaw,
          pitch: tr.pitch,
        }));
      }
    }, 40);

    return () => clearInterval(interval);
  }, [viewMode]);

  const handleSelectWeapon = (weapon: WeaponType) => {
    setSelectedWeapon(weapon);
    if (rendererRef.current) {
      rendererRef.current.buildFpsBlaster(weapon);
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'switch_weapon',
        weapon,
      }));
    }
  };

  // Join or Create Room
  const handleJoinOrCreate = (roomId: string, createOptions?: {
    roomName: string;
    arenaId: string;
    gameMode: 'ffa' | 'team';
    botCount: number;
    matchDuration: number;
  }) => {
    sound.init();
    setViewMode('game');

    // Find arena
    if (createOptions) {
      const a = arenas.find((ar) => ar.id === createOptions.arenaId);
      if (a) setCurrentArena(a);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_room',
        roomId,
        playerInfo: {
          id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: playerName,
          team: selectedTeam,
          activeWeapon: selectedWeapon,
        },
        createOptions,
      }));
    }
  };

  // Arena Editor Actions
  const handleSaveArena = (newArena: ArenaLayout) => {
    fetch('/api/arenas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newArena),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.arena) {
          setArenas((prev) => {
            const idx = prev.findIndex((a) => a.id === data.arena.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = data.arena;
              return updated;
            }
            return [...prev, data.arena];
          });
        }
      })
      .catch(() => {});

    // Launch room on this custom arena!
    handleJoinOrCreate(`room-${newArena.id}-${Date.now().toString(36)}`, {
      roomName: `${newArena.name} Match`,
      arenaId: newArena.id,
      gameMode: 'team',
      botCount: 4,
      matchDuration: 300,
    });
  };

  const handleTestPlayArena = (testArena: ArenaLayout) => {
    setCurrentArena(testArena);
    handleJoinOrCreate(`test-${Date.now().toString(36)}`, {
      roomName: `Test: ${testArena.name}`,
      arenaId: testArena.id,
      gameMode: 'ffa',
      botCount: 3,
      matchDuration: 180,
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030712] text-slate-100 select-none">
      {/* 1. LOBBY VIEW */}
      {viewMode === 'lobby' && (
        <Lobby
          playerName={playerName}
          setPlayerName={setPlayerName}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
          selectedWeapon={selectedWeapon}
          setSelectedWeapon={setSelectedWeapon}
          arenas={arenas}
          activeRooms={activeRooms}
          onJoinRoom={(roomId) => handleJoinOrCreate(roomId)}
          onCreateRoom={(opts) => handleJoinOrCreate(`room_${Date.now().toString(36)}`, opts)}
          onOpenArenaEditor={() => {
            setEditingArena(undefined);
            setViewMode('editor');
          }}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          mouseSensitivity={mouseSensitivity}
          setMouseSensitivity={setMouseSensitivity}
          volume={volume}
          setVolume={setVolume}
          isConnected={isConnected}
        />
      )}

      {/* 2. CUSTOM ARENA ARCHITECT BUILDER VIEW */}
      {viewMode === 'editor' && (
        <ArenaEditor
          initialArena={editingArena}
          onSave={handleSaveArena}
          onTestPlay={handleTestPlayArena}
          onClose={() => setViewMode('lobby')}
        />
      )}

      {/* 3. 3D FIRST PERSON GAME VIEW */}
      {viewMode === 'game' && (
        <div className="relative w-full h-full">
          {/* Three.js Canvas Container */}
          <div
            ref={canvasContainerRef}
            onClick={() => {
              rendererRef.current?.requestPointerLock();
            }}
            className="w-full h-full cursor-crosshair"
          />

          {/* Sci-Fi Combat HUD */}
          <HUD
            player={localPlayer}
            opponents={opponents}
            room={currentRoom}
            killFeed={killFeed}
            hitMarker={hitMarker}
            damageDirection={damageDirection}
            recentTagNotice={recentTagNotice}
            isPointerLocked={isPointerLocked}
            onPointerLockRequest={() => rendererRef.current?.requestPointerLock()}
            onWeaponSelect={handleSelectWeapon}
            showScoreboard={showScoreboard}
          />

          {/* In-Game Top Left Quick Controls Overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => {
                rendererRef.current?.exitPointerLock();
                setViewMode('lobby');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-md"
            >
              <LogOut className="w-3.5 h-3.5" /> EXIT MATCH
            </button>
            <button
              onClick={() => {
                const muted = sound.toggleMute();
                setIsMuted(muted);
              }}
              className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer backdrop-blur-md shadow-md"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>

          {/* TAB Scoreboard Modal Overlay */}
          {showScoreboard && (
            <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl w-full max-w-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="font-heading font-black text-lg text-white">
                    LIVE MATCH SCOREBOARD
                  </div>
                  <div className="text-xs font-mono text-cyan-400">
                    {currentRoom?.arenaName} · {currentRoom?.gameMode.toUpperCase()}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="grid grid-cols-12 text-[11px] font-mono text-slate-400 uppercase pb-2 border-b border-slate-800">
                    <div className="col-span-5">Combatant</div>
                    <div className="col-span-2 text-center">Team</div>
                    <div className="col-span-2 text-right">Tags / Deaths</div>
                    <div className="col-span-1 text-right">Streak</div>
                    <div className="col-span-2 text-right">Score</div>
                  </div>

                  <div className="divide-y divide-slate-800/60 mt-1 max-h-96 overflow-y-auto">
                    {localPlayer && [localPlayer, ...opponents]
                      .sort((a, b) => b.score - a.score)
                      .map((p) => {
                        const isMe = p.id === localPlayer.id;
                        return (
                          <div
                            key={p.id}
                            className={`grid grid-cols-12 py-2.5 items-center text-xs ${
                              isMe ? 'bg-cyan-950/40 text-cyan-300 font-bold px-2 rounded' : 'text-slate-300'
                            }`}
                          >
                            <div className="col-span-5 flex items-center gap-2">
                              <span className="truncate">{p.name}</span>
                              {p.isBot && <span className="text-[10px] text-slate-500 font-mono">[AI]</span>}
                            </div>
                            <div className="col-span-2 text-center font-mono uppercase text-[10px]">
                              <span className={p.team === 'neon' ? 'text-cyan-400' : 'text-pink-400'}>
                                {p.team}
                              </span>
                            </div>
                            <div className="col-span-2 text-right font-mono">
                              <span className="text-emerald-400">{p.kills}</span>
                              <span className="text-slate-600 mx-1">/</span>
                              <span className="text-slate-400">{p.deaths}</span>
                            </div>
                            <div className="col-span-1 text-right font-mono text-amber-400">
                              {p.streak}
                            </div>
                            <div className="col-span-2 text-right font-mono font-bold text-white">
                              {p.score}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Match End Podium Modal */}
          <MatchEndModal
            isOpen={isMatchEndOpen}
            room={currentRoom}
            players={localPlayer ? [localPlayer, ...opponents] : opponents}
            localPlayerId={localPlayer?.id || ''}
            onRematch={() => {
              setIsMatchEndOpen(false);
              handleJoinOrCreate(`rematch_${Date.now().toString(36)}`, {
                roomName: `${currentArena.name} Rematch`,
                arenaId: currentArena.id,
                gameMode: currentRoom?.gameMode || 'team',
                botCount: 4,
                matchDuration: 300,
              });
            }}
            onReturnLobby={() => {
              setIsMatchEndOpen(false);
              setViewMode('lobby');
            }}
          />
        </div>
      )}

      {/* Global Leaderboard Modal (Accessible from anywhere) */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboardEntries}
        currentUserId={localPlayer?.id}
      />
    </div>
  );
}
