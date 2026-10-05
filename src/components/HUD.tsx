import React from 'react';
import { Player, WeaponType, KillFeedItem, RoomInfo } from '../types/game';
import { WEAPONS } from '../game/constants';
import { Shield, Zap, Flame, Radio, Crosshair, Award, Eye, FastForward } from 'lucide-react';

interface HUDProps {
  player: Player | null;
  opponents: Player[];
  room: RoomInfo | null;
  killFeed: KillFeedItem[];
  hitMarker: { active: boolean; isHeadshot: boolean } | null;
  damageDirection: number | null; // angle in degrees
  recentTagNotice: { title: string; subtitle: string } | null;
  isPointerLocked: boolean;
  onPointerLockRequest: () => void;
  onWeaponSelect: (weapon: WeaponType) => void;
  showScoreboard: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  opponents,
  room,
  killFeed,
  hitMarker,
  damageDirection,
  recentTagNotice,
  isPointerLocked,
  onPointerLockRequest,
  onWeaponSelect,
  showScoreboard,
}) => {
  if (!player) return null;

  const currentWeapon = WEAPONS[player.activeWeapon];
  const isOverheated = player.isOverheated;
  const isRespawning = player.isRespawning;

  // Format time remaining MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10 flex flex-col justify-between p-4 md:p-6 font-sans">
      {/* 1. TOP HEADER / MATCH STATUS */}
      <div className="flex items-start justify-between w-full">
        {/* Match Timer & Mode */}
        <div className="flex items-center gap-3">
          <div className="cyber-panel backdrop-blur-md border-cyan-500/30 px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div>
              <div className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
                {room?.gameMode === 'team' ? 'TEAM LASER CONFLICT' : 'FREE-FOR-ALL MATRIX'}
              </div>
              <div className="text-xl font-heading font-black tracking-wider text-cyan-300">
                {room ? formatTime(room.timeRemaining) : '10:00'}
              </div>
            </div>
          </div>

          {/* Arena Name Indicator */}
          <div className="hidden sm:block bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 px-3 py-2 rounded-lg text-xs text-slate-300 font-medium">
            <span className="text-slate-500 uppercase text-[10px] block">ARENA</span>
            {room?.arenaName || 'Neon Citadel'}
          </div>
        </div>

        {/* Center Team Scores / Top Score */}
        {room && room.gameMode === 'team' ? (
          <div className="flex items-center cyber-panel backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-5 py-2.5 bg-cyan-950/40 border-r border-slate-800 text-center min-w-[90px]">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">NEON</div>
              <div className="text-2xl font-heading font-black text-cyan-300 text-glow-cyan">
                {room.scores.neon}
              </div>
            </div>
            <div className="px-2 text-xs font-mono text-slate-500 font-bold">VS</div>
            <div className="px-5 py-2.5 bg-pink-950/40 border-l border-slate-800 text-center min-w-[90px]">
              <div className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">PLASMA</div>
              <div className="text-2xl font-heading font-black text-pink-300 text-glow-magenta">
                {room.scores.plasma}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-xl">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">TAGS:</span>
            <span className="text-xl font-heading font-black text-amber-300">{player.kills}</span>
            <span className="text-xs text-slate-500 ml-2">STREAK: {player.streak}</span>
          </div>
        )}

        {/* Top Right: Killfeed & Radar */}
        <div className="flex flex-col items-end gap-3">
          {/* Radar Hologram Mini-Compass */}
          <div className="relative w-28 h-28 cyber-panel backdrop-blur-md rounded-full border border-cyan-500/40 shadow-xl overflow-hidden flex items-center justify-center">
            {/* Scanline Sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent rounded-full animate-spin [animation-duration:4s]" />
            <div className="absolute w-20 h-20 rounded-full border border-cyan-500/20" />
            <div className="absolute w-10 h-10 rounded-full border border-cyan-500/20" />

            {/* Radar Center (You) */}
            <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_#ffffff] z-10" />

            {/* Opponent Blips relative to player yaw */}
            {opponents.map((opp) => {
              if (opp.isRespawning) return null;
              const dx = opp.x - player.x;
              const dz = opp.z - player.z;
              const dist = Math.hypot(dx, dz);
              if (dist > 35) return null; // Outside radar range

              // Rotate by player yaw
              const angle = Math.atan2(dx, -dz) - player.yaw;
              const radarDist = Math.min(46, (dist / 35) * 46);
              const blipX = Math.sin(angle) * radarDist;
              const blipY = -Math.cos(angle) * radarDist;

              const isEnemy = room?.gameMode === 'team' ? opp.team !== player.team : true;
              return (
                <div
                  key={opp.id}
                  className={`absolute w-2 h-2 rounded-full ${
                    isEnemy ? 'bg-pink-500 shadow-[0_0_6px_#ec4899]' : 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]'
                  }`}
                  style={{
                    transform: `translate(${blipX}px, ${blipY}px)`,
                  }}
                />
              );
            })}
          </div>

          {/* Killfeed Notifications */}
          <div className="flex flex-col items-end gap-1.5 max-h-48 overflow-hidden w-64">
            {killFeed.slice(-4).map((kf) => (
              <div
                key={kf.id}
                className="cyber-panel backdrop-blur-sm border border-slate-800/80 px-2.5 py-1 rounded text-xs flex items-center gap-1.5 shadow-md animate-fadeIn"
              >
                <span className="font-semibold text-cyan-400">{kf.killerName}</span>
                <span className="text-[10px] text-slate-500 font-mono">[{WEAPONS[kf.weapon].name.split(' ')[0]}]</span>
                {kf.isHeadshot && <span className="text-amber-400 text-[10px] font-bold">🎯</span>}
                <span className="text-slate-400">tagged</span>
                <span className="font-semibold text-pink-400">{kf.victimName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CENTER RETICLE, HIT MARKERS, & ANNOUNCEMENTS */}
      <div className="relative flex flex-col items-center justify-center pointer-events-none">
        {/* Dynamic Crosshair */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          {/* Inner Dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${
              isOverheated ? 'bg-red-500' : 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]'
            }`}
          />

          {/* Reticle brackets with weapon spread */}
          <div className="absolute inset-0 flex items-center justify-between">
            <div className="w-1.5 h-0.5 bg-cyan-400/80" />
            <div className="w-1.5 h-0.5 bg-cyan-400/80" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-between">
            <div className="w-0.5 h-1.5 bg-cyan-400/80" />
            <div className="w-0.5 h-1.5 bg-cyan-400/80" />
          </div>

          {/* Hit Confirmation Marker (X-Ticks) */}
          {hitMarker && hitMarker.active && (
            <div className="absolute inset-0 flex items-center justify-center animate-ping duration-150">
              <Crosshair
                className={`w-8 h-8 ${
                  hitMarker.isHeadshot ? 'text-amber-400 stroke-[3]' : 'text-red-500 stroke-[2.5]'
                }`}
              />
            </div>
          )}
        </div>

        {/* Damage Direction Vignette Flash */}
        {damageDirection !== null && (
          <div
            className="absolute w-72 h-72 rounded-full border-4 border-red-500/70 blur-[1px] pointer-events-none animate-pulse"
            style={{
              transform: `rotate(${damageDirection}deg)`,
            }}
          />
        )}

        {/* Tag Notification Banner (Kill / Streak) */}
        {recentTagNotice && (
          <div className="mt-8 text-center animate-bounce">
            <div className="text-xl font-heading font-black tracking-widest text-amber-400 text-glow-cyan uppercase">
              {recentTagNotice.title}
            </div>
            <div className="text-xs text-slate-300 font-mono tracking-wider">
              {recentTagNotice.subtitle}
            </div>
          </div>
        )}

        {/* Respawn Shield Indicator */}
        {player.invulnerableTimeRemaining > 0 && (
          <div className="mt-4 bg-cyan-950/80 border border-cyan-400/60 px-4 py-1.5 rounded-full text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400 animate-spin" />
            RESPAWN SHIELD: {player.invulnerableTimeRemaining.toFixed(1)}s
          </div>
        )}

        {/* Pointer Lock Required Click Overlay */}
        {!isPointerLocked && !isRespawning && (
          <div className="pointer-events-auto mt-6 bg-slate-950/90 backdrop-blur-md border border-cyan-500/50 p-6 rounded-2xl shadow-2xl max-w-md text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
              <Crosshair className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-white">READY FOR COMBAT</h3>
              <p className="text-xs text-slate-400 mt-1">
                Click anywhere or hit the button below to lock mouse view and aim your laser blaster.
              </p>
            </div>
            <button
              onClick={onPointerLockRequest}
              className="w-full py-2.5 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading font-bold text-sm tracking-wider shadow-lg shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer"
            >
              ENGAGE LASER SENSORS
            </button>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
              <span>WASD to Move</span>
              <span>·</span>
              <span>Space to Jump</span>
              <span>·</span>
              <span>1-4 Blasters</span>
              <span>·</span>
              <span>TAB Scoreboard</span>
            </div>
          </div>
        )}

        {/* De-Rez Elimination Overlay */}
        {isRespawning && (
          <div className="bg-red-950/90 backdrop-blur-md border border-red-500/60 p-6 rounded-2xl shadow-2xl max-w-sm text-center flex flex-col items-center gap-3">
            <div className="text-red-400 font-heading font-black text-xl tracking-wider animate-pulse">
              TAGGED OUT
            </div>
            <div className="text-xs text-slate-300">
              Sensor vest overload. Reconstituting avatar at spawn point in...
            </div>
            <div className="text-4xl font-heading font-black text-white">
              {Math.ceil(player.respawnTimeRemaining)}
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM PANEL: HEALTH, WEAPONS, HEAT/CAPACITOR */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom Left: Health & Shield Gauges */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/90 p-4 rounded-2xl shadow-xl w-72">
          {/* Shield Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-cyan-400 font-bold font-mono tracking-wider">
                <Shield className="w-3.5 h-3.5" /> SHIELD
              </span>
              <span className="font-mono font-bold text-cyan-300">{Math.round(player.shield)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/20">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-150 rounded-full shadow-[0_0_8px_#06b6d4]"
                style={{ width: `${Math.max(0, Math.min(100, player.shield))}%` }}
              />
            </div>
          </div>

          {/* Armor/Health Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono tracking-wider">
                <Zap className="w-3.5 h-3.5" /> VEST INTEGRITY
              </span>
              <span className="font-mono font-bold text-emerald-300">{Math.round(player.health)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/20">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150 rounded-full shadow-[0_0_8px_#10b981]"
                style={{ width: `${Math.max(0, Math.min(100, player.health))}%` }}
              />
            </div>
          </div>

          {/* Active Powerups Indicators */}
          {(player.powerups.overcharge > 0 || player.powerups.cloak > 0 || player.powerups.speed > 0) && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
              {player.powerups.overcharge > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                  <Flame className="w-3 h-3 text-red-400" /> 2X DMG ({player.powerups.overcharge.toFixed(0)}s)
                </div>
              )}
              {player.powerups.cloak > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                  <Eye className="w-3 h-3 text-purple-400" /> CLOAK ({player.powerups.cloak.toFixed(0)}s)
                </div>
              )}
              {player.powerups.speed > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  <FastForward className="w-3 h-3 text-amber-400" /> SPRINT ({player.powerups.speed.toFixed(0)}s)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Center: Weapon Selector Hotbar */}
        <div className="hidden md:flex items-center gap-2 pointer-events-auto bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
          {(['pulse', 'rail', 'scatter', 'rapid'] as WeaponType[]).map((wKey, idx) => {
            const w = WEAPONS[wKey];
            const isSelected = player.activeWeapon === wKey;
            return (
              <button
                key={wKey}
                onClick={() => onWeaponSelect(wKey)}
                className={`px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'hover:bg-slate-900/60 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-cyan-400">
                    {idx + 1}
                  </span>
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {w.name.split(' ')[0]}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">{w.category.split(' ')[0]}</div>
              </button>
            );
          })}
        </div>

        {/* Bottom Right: Capacitor Heat Gauge & Weapon Info */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/90 p-4 rounded-2xl shadow-xl w-72">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold">ACTIVE WEAPON</div>
              <div className="text-base font-heading font-black text-white">{currentWeapon.name}</div>
              <div className="text-[11px] text-slate-400">{currentWeapon.category}</div>
            </div>
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: currentWeapon.color, boxShadow: `0 0 8px ${currentWeapon.color}` }}
            />
          </div>

          {/* Capacitor Heat Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span
                className={`flex items-center gap-1 font-mono text-[11px] font-bold ${
                  isOverheated ? 'text-red-400 animate-pulse' : 'text-slate-400'
                }`}
              >
                <Flame className="w-3 h-3" /> {isOverheated ? 'OVERHEAT VENTING' : 'CAPACITOR THERMAL'}
              </span>
              <span className="font-mono text-xs font-bold text-slate-300">{Math.round(player.heat)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  isOverheated
                    ? 'bg-red-500 animate-pulse'
                    : player.heat > 75
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, player.heat))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
