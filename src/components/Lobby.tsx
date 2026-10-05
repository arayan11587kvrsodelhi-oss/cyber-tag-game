import React, { useState } from 'react';
import { ArenaLayout, RoomInfo, TeamId, WeaponType } from '../types/game';
import { WEAPONS } from '../game/constants';
import { Play, Layers, Trophy, Settings, Users, Radio, Crosshair, Volume2, Shield, Sparkles, ChevronRight } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface LobbyProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  selectedTeam: TeamId;
  setSelectedTeam: (team: TeamId) => void;
  selectedWeapon: WeaponType;
  setSelectedWeapon: (weapon: WeaponType) => void;
  arenas: ArenaLayout[];
  activeRooms: RoomInfo[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (options: {
    roomName: string;
    arenaId: string;
    gameMode: 'ffa' | 'team';
    botCount: number;
    matchDuration: number;
  }) => void;
  onOpenArenaEditor: () => void;
  onOpenLeaderboard: () => void;
  mouseSensitivity: number;
  setMouseSensitivity: (val: number) => void;
  volume: number;
  setVolume: (val: number) => void;
  isConnected: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  playerName,
  setPlayerName,
  selectedTeam,
  setSelectedTeam,
  selectedWeapon,
  setSelectedWeapon,
  arenas,
  activeRooms,
  onJoinRoom,
  onCreateRoom,
  onOpenArenaEditor,
  onOpenLeaderboard,
  mouseSensitivity,
  setMouseSensitivity,
  volume,
  setVolume,
  isConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'rooms' | 'settings'>('quick');

  // Custom room options
  const [customRoomName, setCustomRoomName] = useState(`${playerName}'s Arena`);
  const [selectedArenaId, setSelectedArenaId] = useState<string>(arenas[0]?.id || 'neon-citadel');
  const [gameMode, setGameMode] = useState<'ffa' | 'team'>('team');
  const [botCount, setBotCount] = useState<number>(5);
  const [duration, setDuration] = useState<number>(300); // 5 mins

  const handleStartQuickMatch = () => {
    sound.init();
    sound.playPowerupPickup();
    onCreateRoom({
      roomName: 'Quick Match',
      arenaId: arenas[0]?.id || 'neon-citadel',
      gameMode: 'team',
      botCount: 5,
      matchDuration: 300,
    });
  };

  const handleCreateCustom = () => {
    sound.init();
    sound.playPowerupPickup();
    onCreateRoom({
      roomName: customRoomName,
      arenaId: selectedArenaId,
      gameMode,
      botCount,
      matchDuration: duration,
    });
  };

  return (
    <div className="cyber-shell relative w-full h-full min-h-screen text-slate-100 flex flex-col justify-between overflow-x-hidden scanline-effect">
      <div className="cyber-scan" />
      {/* Background Decorative Cyber Beams */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="px-6 md:px-12 py-5 border-b border-slate-800/80 bg-slate-950/65 backdrop-blur-xl flex items-center justify-between z-20 shadow-[0_10px_40px_rgba(0,0,0,.2)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Radio className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-heading font-black tracking-widest text-white flex items-center gap-2">
              CYBERTAG <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 font-mono">3D ARENA</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Massive Real-Time First-Person Laser Tag Simulator
            </div>
          </div>
        </div>

        {/* Global Action Links */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={onOpenLeaderboard}
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold flex items-center gap-2 text-amber-300 transition-all cursor-pointer shadow-md"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Leaderboards</span>
          </button>

          <button
            onClick={onOpenArenaEditor}
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/40 text-xs font-semibold flex items-center gap-2 text-cyan-300 transition-all cursor-pointer shadow-md"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Arena Architect</span>
          </button>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-slate-400 hidden md:inline">{isConnected ? 'SERVER SYNCHRONIZED' : 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* Main Hub Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start z-10">
        {/* Left Column: Player Identity & Armory Loadout */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Identity Card */}
          <div className="cyber-panel cyber-corner rounded-2xl p-6 shadow-xl">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
              <Crosshair className="w-4 h-4" /> COMBATANT PROFILE
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Combat Call-Sign</label>
                <input
                  type="text"
                  maxLength={18}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-heading font-bold text-white focus:outline-none focus:border-cyan-400 shadow-inner"
                  placeholder="Call-Sign"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Sensor Armor Faction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedTeam('neon')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold font-heading transition-all cursor-pointer ${
                      selectedTeam === 'neon'
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    NEON SQUAD
                  </button>
                  <button
                    onClick={() => setSelectedTeam('plasma')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold font-heading transition-all cursor-pointer ${
                      selectedTeam === 'plasma'
                        ? 'bg-pink-950 border-pink-400 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    PLASMA REIGN
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Blaster Loadout */}
          <div className="cyber-panel cyber-corner rounded-2xl p-6 shadow-xl">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold mb-3 flex items-center justify-between">
              <span>STARTING LASER BLASTER</span>
              <span className="text-[10px] text-slate-500 font-mono">SWITCHABLE IN-GAME (1-4)</span>
            </div>

            <div className="space-y-2">
              {(['pulse', 'rail', 'scatter', 'rapid'] as WeaponType[]).map((wKey) => {
                const w = WEAPONS[wKey];
                const isSel = selectedWeapon === wKey;
                return (
                  <button
                    key={wKey}
                    onClick={() => setSelectedWeapon(wKey)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSel
                        ? 'bg-slate-800/90 border-cyan-400 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: w.color, boxShadow: `0 0 8px ${w.color}` }}
                        />
                        <span className={`text-xs font-heading font-bold ${isSel ? 'text-white' : 'text-slate-300'}`}>
                          {w.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{w.damage} DMG</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 pl-5.5">{w.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Game Mode Hub & Server Options */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Main Action Banner */}
          <div className="cyber-panel cyber-corner relative overflow-hidden rounded-3xl border-cyan-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/50 p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="relative z-10 max-w-md">
              <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold mb-1">
                COMPETITIVE LASER TAG PROTOCOL
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-black text-white tracking-wide">
                DROP INTO THE LASER ARENA
              </h1>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Step into responsive 3D first-person combat with glowing hit-sensor vests, instant laser beams, tactical jump pads, and live synchronized scoreboards.
              </p>
            </div>

            <button
              onClick={handleStartQuickMatch}
              className="cyber-button relative z-10 py-4 px-8 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-heading font-black text-base tracking-widest shadow-xl shadow-cyan-500/30 flex items-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-slate-950" /> QUICK MATCH
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="cyber-panel flex items-center gap-1.5 p-1 rounded-xl border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'quick' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Curated Arenas
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'custom' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Host Custom Game
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'rooms' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Matches ({activeRooms.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Controls & Audio
            </button>
          </div>

          {/* Tab 1: Curated Arenas Cards */}
          {activeTab === 'quick' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {arenas.map((arena) => (
                <div
                  key={arena.id}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-lg group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                        {arena.blocks.length} ELEMENTS
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{arena.creator}</span>
                    </div>
                    <h3 className="text-base font-heading font-black text-white group-hover:text-cyan-300 transition-colors">
                      {arena.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {arena.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {arena.powerups.length} Powerup Nodes
                    </span>
                    <button
                      onClick={() => {
                        onCreateRoom({
                          roomName: `${arena.name} Match`,
                          arenaId: arena.id,
                          gameMode: 'team',
                          botCount: 5,
                          matchDuration: 300,
                        });
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-400/40 hover:text-slate-950 text-cyan-300 text-xs font-bold font-heading transition-all cursor-pointer"
                    >
                      DEPLOY
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Host Custom Game */}
          {activeTab === 'custom' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Room Title</label>
                  <input
                    type="text"
                    value={customRoomName}
                    onChange={(e) => setCustomRoomName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Select Arena Map</label>
                  <select
                    value={selectedArenaId}
                    onChange={(e) => setSelectedArenaId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {arenas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.creator})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Combat Ruleset</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGameMode('team')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold cursor-pointer ${
                        gameMode === 'team'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Team Laser Tag
                    </button>
                    <button
                      onClick={() => setGameMode('ffa')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold cursor-pointer ${
                        gameMode === 'ffa'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Free-For-All
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    AI Tactical Bots ({botCount} Combatants)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={botCount}
                    onChange={(e) => setBotCount(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Real players seamlessly replace bots when connecting via link or room list.
                </div>
                <button
                  onClick={handleCreateCustom}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs tracking-wider cursor-pointer shadow-lg shadow-cyan-500/25"
                >
                  INITIALIZE MATCH ROOM
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Active Rooms */}
          {activeTab === 'rooms' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              {activeRooms.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                  <div className="text-sm font-semibold">No active public rooms discovered</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Host a custom game or click Quick Match to auto-launch an arena!
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRooms.map((rm) => (
                    <div
                      key={rm.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-heading font-bold text-white">{rm.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          Arena: <span className="text-cyan-400">{rm.arenaName}</span> · Mode: {rm.gameMode.toUpperCase()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-white">
                            {rm.playerCount}/{rm.maxPlayers} Combatants
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono">LIVE</div>
                        </div>

                        <button
                          onClick={() => onJoinRoom(rm.id)}
                          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-xs cursor-pointer"
                        >
                          JOIN
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Controls & Audio */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">Mouse Sensitivity</span>
                  <span className="font-mono text-cyan-400">{Math.round(mouseSensitivity * 10000)}</span>
                </div>
                <input
                  type="range"
                  min={0.0005}
                  max={0.006}
                  step={0.0001}
                  value={mouseSensitivity}
                  onChange={(e) => setMouseSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">Master Sound Volume</span>
                  <span className="font-mono text-cyan-400">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    sound.setMasterVolume(v);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="font-bold text-slate-200 font-heading">Key Bindings Reference:</div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>WASD: Move Avatar</div>
                  <div>Left Click: Fire Laser Blaster</div>
                  <div>Spacebar: Jump / Vertical Thrust</div>
                  <div>1, 2, 3, 4: Quick Select Blaster</div>
                  <div>Shift: Sprint Boost</div>
                  <div>Tab: View Real-Time Scoreboard</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-4 border-t border-slate-800/80 bg-slate-950/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 z-10 font-mono">
        <div>CYBERTAG PROTOCOL · MASSIVE MULTIPLAYER 3D LASER ARENA</div>
        <div className="flex items-center gap-4">
          <span>Tickrate: 30Hz Authoritative</span>
          <span>·</span>
          <span>Web Audio Engine Active</span>
        </div>
      </footer>
    </div>
  );
};
