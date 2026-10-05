import React, { useState } from 'react';
import { LeaderboardEntry } from '../types/game';
import { WEAPONS } from '../game/constants';
import { Trophy, Crosshair, Flame, Award, X, Sparkles, Filter } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  currentUserId,
}) => {
  const [filter, setFilter] = useState<'all' | 'accuracy' | 'streak'>('all');

  if (!isOpen) return null;

  // Sort based on selected tab
  const sortedEntries = [...entries].sort((a, b) => {
    if (filter === 'accuracy') return b.accuracy - a.accuracy;
    if (filter === 'streak') return b.bestStreak - a.bestStreak;
    return b.score - a.score;
  });

  const currentUserEntry = entries.find((e) => e.playerId === currentUserId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-black text-white tracking-wide">
                GLOBAL LASER TAG LEADERBOARD
              </h2>
              <div className="text-xs text-slate-400">
                Synchronized real-time combat rankings and player statistics
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls (Zero-Pill standard button group) */}
        <div className="px-6 py-3 bg-slate-950/20 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All-Time Score
            </button>
            <button
              onClick={() => setFilter('accuracy')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filter === 'accuracy'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Precision Sharpshooters
            </button>
            <button
              onClick={() => setFilter('streak')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filter === 'streak'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Highest Streaks
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {sortedEntries.length} Combatants Active
          </div>
        </div>

        {/* Current User Highlighting Banner */}
        {currentUserEntry && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-cyan-400">YOUR RANK #{currentUserEntry.rank}</span>
              <span className="font-heading font-bold text-white">{currentUserEntry.name}</span>
              <span className="text-xs text-cyan-300 font-mono">[{currentUserEntry.title}]</span>
            </div>
            <div className="flex items-center gap-5 text-xs font-mono">
              <span>Tags: <b className="text-white">{currentUserEntry.tags}</b></span>
              <span>K/D: <b className="text-white">{currentUserEntry.kdRatio.toFixed(2)}</b></span>
              <span>Acc: <b className="text-white">{currentUserEntry.accuracy}%</b></span>
              <span>Score: <b className="text-cyan-400">{currentUserEntry.score.toLocaleString()}</b></span>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="w-full text-left">
            <div className="grid grid-cols-12 gap-3 pb-3 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Combatant</div>
              <div className="col-span-2 text-right">Tags / Deaths</div>
              <div className="col-span-1 text-right">K/D</div>
              <div className="col-span-1 text-right">Accuracy</div>
              <div className="col-span-1 text-right">Streak</div>
              <div className="col-span-2 text-right">Total Score</div>
            </div>

            <div className="divide-y divide-slate-800/60 mt-1">
              {sortedEntries.map((entry, index) => {
                const rankNum = index + 1;
                const isUser = entry.playerId === currentUserId;
                const isTop3 = rankNum <= 3;

                return (
                  <div
                    key={entry.playerId}
                    className={`grid grid-cols-12 gap-3 py-3 items-center text-xs transition-colors ${
                      isUser
                        ? 'bg-cyan-950/30 rounded-lg px-2 border-l-2 border-cyan-400'
                        : 'hover:bg-slate-800/40 px-2'
                    }`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center gap-1.5 font-heading font-black">
                      {rankNum === 1 && <span className="text-amber-400">🥇</span>}
                      {rankNum === 2 && <span className="text-slate-300">🥈</span>}
                      {rankNum === 3 && <span className="text-amber-600">🥉</span>}
                      <span className={isTop3 ? 'text-white font-bold' : 'text-slate-400'}>
                        #{rankNum}
                      </span>
                    </div>

                    {/* Combatant Name & Title */}
                    <div className="col-span-4 flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isUser ? 'text-cyan-400' : 'text-slate-100'}`}>
                          {entry.name}
                        </span>
                        {entry.favoriteWeapon && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            [{WEAPONS[entry.favoriteWeapon]?.name.split(' ')[0]}]
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{entry.title}</span>
                    </div>

                    {/* Tags / Deaths */}
                    <div className="col-span-2 text-right font-mono text-slate-300">
                      <span className="text-emerald-400 font-semibold">{entry.tags}</span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-slate-400">{entry.deaths}</span>
                    </div>

                    {/* K/D */}
                    <div className="col-span-1 text-right font-mono font-medium text-slate-200">
                      {entry.kdRatio.toFixed(2)}
                    </div>

                    {/* Accuracy */}
                    <div className="col-span-1 text-right font-mono text-cyan-300">
                      {entry.accuracy}%
                    </div>

                    {/* Best Streak */}
                    <div className="col-span-1 text-right font-mono text-amber-400 font-bold">
                      {entry.bestStreak}
                    </div>

                    {/* Total Score */}
                    <div className="col-span-2 text-right font-heading font-black text-sm text-cyan-400">
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Leaderboard auto-synchronizes after each laser tag match</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
