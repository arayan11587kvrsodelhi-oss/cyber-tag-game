import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player, RoomInfo } from '../types/game';
import { Trophy, Award, Zap, Crosshair, RotateCcw, Home } from 'lucide-react';

interface MatchEndModalProps {
  isOpen: boolean;
  room: RoomInfo | null;
  players: Player[];
  localPlayerId: string;
  onRematch: () => void;
  onReturnLobby: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  isOpen,
  room,
  players,
  localPlayerId,
  onRematch,
  onReturnLobby,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#ec4899', '#3b82f6', '#f59e0b'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Rank players by score / kills
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const localPlayer = players.find((p) => p.id === localPlayerId);

  // Winner calculation
  let winnerText = 'MATCH CONCLUDED';
  let winnerColor = 'text-white';
  if (room?.gameMode === 'team') {
    if (room.scores.neon > room.scores.plasma) {
      winnerText = 'TEAM NEON VICTORIOUS';
      winnerColor = 'text-cyan-400';
    } else if (room.scores.plasma > room.scores.neon) {
      winnerText = 'TEAM PLASMA VICTORIOUS';
      winnerColor = 'text-pink-400';
    } else {
      winnerText = 'TACTICAL DRAW';
      winnerColor = 'text-amber-400';
    }
  } else if (ranked[0]) {
    winnerText = `${ranked[0].name.toUpperCase()} DOMINATES THE ARENA`;
    winnerColor = 'text-amber-400';
  }

  const accuracy = localPlayer && localPlayer.shotsFired > 0
    ? Math.round((localPlayer.shotsHit / localPlayer.shotsFired) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Trophy Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
        </div>

        <h2 className={`text-2xl md:text-3xl font-heading font-black tracking-wider ${winnerColor}`}>
          {winnerText}
        </h2>
        <div className="text-xs text-slate-400 font-mono mt-1">
          Sector Operation Finished · {room?.arenaName || 'Citadel Arena'}
        </div>

        {/* Podium Top 3 */}
        <div className="grid grid-cols-3 gap-3 w-full my-6 items-end">
          {/* 2nd Place */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <span className="text-xl">🥈</span>
            <div className="text-xs font-heading font-bold text-slate-200 truncate w-full mt-1">
              {ranked[1]?.name || '---'}
            </div>
            <div className="text-xs font-mono text-cyan-400 font-bold">{ranked[1]?.score || 0} pts</div>
            <div className="text-[10px] text-slate-500 mt-1">{ranked[1]?.kills || 0} Tags</div>
          </div>

          {/* 1st Place (Center, higher) */}
          <div className="bg-amber-950/30 border-2 border-amber-500/50 rounded-2xl p-4 flex flex-col items-center shadow-lg shadow-amber-500/10 scale-105">
            <span className="text-3xl">👑</span>
            <div className="text-sm font-heading font-black text-amber-300 truncate w-full mt-1">
              {ranked[0]?.name || 'Champion'}
            </div>
            <div className="text-sm font-mono text-amber-400 font-black">{ranked[0]?.score || 0} pts</div>
            <div className="text-xs text-slate-400 mt-1 font-semibold">{ranked[0]?.kills || 0} Tags</div>
          </div>

          {/* 3rd Place */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <span className="text-xl">🥉</span>
            <div className="text-xs font-heading font-bold text-slate-200 truncate w-full mt-1">
              {ranked[2]?.name || '---'}
            </div>
            <div className="text-xs font-mono text-cyan-400 font-bold">{ranked[2]?.score || 0} pts</div>
            <div className="text-[10px] text-slate-500 mt-1">{ranked[2]?.kills || 0} Tags</div>
          </div>
        </div>

        {/* Local Player Stats Recap Card */}
        {localPlayer && (
          <div className="w-full bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 mb-6">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold mb-2">
              YOUR COMBAT PERFORMANCE
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Tags</div>
                <div className="text-lg font-heading font-black text-emerald-400">{localPlayer.kills}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Deaths</div>
                <div className="text-lg font-heading font-black text-slate-300">{localPlayer.deaths}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Accuracy</div>
                <div className="text-lg font-heading font-black text-cyan-400">{accuracy}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Best Streak</div>
                <div className="text-lg font-heading font-black text-amber-400">{localPlayer.bestStreak || localPlayer.streak}</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onRematch}
            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading font-bold text-sm tracking-wider shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> PLAY AGAIN / REMATCH
          </button>
          <button
            onClick={onReturnLobby}
            className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-heading font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Home className="w-4 h-4" /> LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};
