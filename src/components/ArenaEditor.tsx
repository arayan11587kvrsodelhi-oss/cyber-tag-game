import React, { useState, useRef, useEffect } from 'react';
import { ArenaLayout, ArenaBlock, ArenaPowerup, ArenaSpawnPoint, BlockType, PowerupType } from '../types/game';
import { Layers, Play, Save, Download, Upload, Trash2, RotateCcw, Shield, Zap, Sparkles, Box, ArrowUpCircle } from 'lucide-react';

interface ArenaEditorProps {
  initialArena?: ArenaLayout;
  onSave: (arena: ArenaLayout) => void;
  onTestPlay: (arena: ArenaLayout) => void;
  onClose: () => void;
}

type ToolType = 
  | 'wall' 
  | 'cover' 
  | 'energy_barrier' 
  | 'tower' 
  | 'jump_pad' 
  | 'pu_overcharge' 
  | 'pu_cloak' 
  | 'pu_repair' 
  | 'pu_speed' 
  | 'spawn_neon' 
  | 'spawn_plasma' 
  | 'spawn_solo' 
  | 'eraser';

export const ArenaEditor: React.FC<ArenaEditorProps> = ({
  initialArena,
  onSave,
  onTestPlay,
  onClose,
}) => {
  const gridSize = 24; // 24x24 grid = 48x48 meter arena
  const cellSize = 2; // meters per cell

  const [arenaName, setArenaName] = useState(initialArena ? initialArena.name : 'Sector Prime');
  const [description, setDescription] = useState(initialArena ? initialArena.description : 'Custom laser combat facility with tactical jump angles.');
  const [theme, setTheme] = useState<'cyberpunk' | 'neon_matrix' | 'void_colosseum'>(initialArena ? initialArena.theme : 'cyberpunk');
  const [selectedTool, setSelectedTool] = useState<ToolType>('wall');
  const [symmetry, setSymmetry] = useState<'none' | 'mirror' | 'quad'>('mirror');

  // Blocks and items
  const [blocks, setBlocks] = useState<ArenaBlock[]>(initialArena ? initialArena.blocks : []);
  const [powerups, setPowerups] = useState<ArenaPowerup[]>(initialArena ? initialArena.powerups : []);
  const [spawns, setSpawns] = useState<ArenaSpawnPoint[]>(initialArena ? initialArena.spawnPoints : []);

  const [isMouseDown, setIsMouseDown] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Convert grid coords (col, row) to world coordinates (x, z)
  const gridToWorld = (col: number, row: number) => {
    const half = (gridSize * cellSize) / 2;
    return {
      x: col * cellSize - half + cellSize / 2,
      z: row * cellSize - half + cellSize / 2,
    };
  };

  // Convert world coords (x, z) to grid coords (col, row)
  const worldToGrid = (x: number, z: number) => {
    const half = (gridSize * cellSize) / 2;
    return {
      col: Math.floor((x + half) / cellSize),
      row: Math.floor((z + half) / cellSize),
    };
  };

  // Paint onto grid
  const applyToolToCell = (col: number, row: number) => {
    if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) return;

    // Apply symmetry targets
    const targets: { col: number; row: number }[] = [{ col, row }];
    if (symmetry === 'mirror') {
      targets.push({ col: gridSize - 1 - col, row });
    } else if (symmetry === 'quad') {
      targets.push({ col: gridSize - 1 - col, row });
      targets.push({ col, row: gridSize - 1 - row });
      targets.push({ col: gridSize - 1 - col, row: gridSize - 1 - row });
    }

    targets.forEach((t) => {
      const { x, z } = gridToWorld(t.col, t.row);

      // Remove existing item at cell
      const newBlocks = blocks.filter((b) => Math.hypot(b.x - x, b.z - z) > cellSize * 0.7);
      const newPowerups = powerups.filter((p) => Math.hypot(p.x - x, p.z - z) > cellSize * 0.7);
      const newSpawns = spawns.filter((s) => Math.hypot(s.x - x, s.z - z) > cellSize * 0.7);

      if (selectedTool === 'eraser') {
        setBlocks(newBlocks);
        setPowerups(newPowerups);
        setSpawns(newSpawns);
        return;
      }

      if (selectedTool === 'wall') {
        newBlocks.push({
          id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x,
          y: 2,
          z,
          width: cellSize,
          height: 4,
          depth: cellSize,
          type: 'wall',
          color: theme === 'cyberpunk' ? '#06b6d4' : theme === 'neon_matrix' ? '#10b981' : '#f43f5e',
        });
      } else if (selectedTool === 'cover') {
        newBlocks.push({
          id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x,
          y: 1,
          z,
          width: cellSize * 0.8,
          height: 1.8,
          depth: cellSize * 0.8,
          type: 'crate',
          color: '#38bdf8',
        });
      } else if (selectedTool === 'energy_barrier') {
        newBlocks.push({
          id: `eb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x,
          y: 2,
          z,
          width: cellSize,
          height: 4,
          depth: 0.3,
          type: 'energy_barrier',
          color: '#06b6d4',
          opacity: 0.45,
        });
      } else if (selectedTool === 'tower') {
        newBlocks.push({
          id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x,
          y: 3,
          z,
          width: cellSize * 1.5,
          height: 6,
          depth: cellSize * 1.5,
          type: 'tower',
          color: '#a855f7',
        });
      } else if (selectedTool === 'jump_pad') {
        newBlocks.push({
          id: `jp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x,
          y: 0.2,
          z,
          width: cellSize * 0.9,
          height: 0.4,
          depth: cellSize * 0.9,
          type: 'jump_pad',
          color: '#8b5cf6',
        });
      } else if (selectedTool.startsWith('pu_')) {
        const puType = selectedTool.replace('pu_', '') as PowerupType;
        newPowerups.push({
          id: `pu_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x,
          y: 1.2,
          z,
          type: puType,
          active: true,
          respawnCountdown: 0,
        });
      } else if (selectedTool.startsWith('spawn_')) {
        const teamStr = selectedTool.replace('spawn_', '') as 'neon' | 'plasma' | 'solo';
        newSpawns.push({
          id: `sp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x,
          y: 1,
          z,
          team: teamStr === 'solo' ? undefined : teamStr,
        });
      }

      setBlocks(newBlocks);
      setPowerups(newPowerups);
      setSpawns(newSpawns);
    });
  };

  // Canvas rendering of blueprint
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellPixel = width / gridSize;

    // Dark grid background
    ctx.fillStyle = '#060b14';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellPixel, 0);
      ctx.lineTo(i * cellPixel, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellPixel);
      ctx.lineTo(width, i * cellPixel);
      ctx.stroke();
    }

    // Center Crosshairs
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Render blocks
    blocks.forEach((b) => {
      const { col, row } = worldToGrid(b.x, b.z);
      const px = col * cellPixel;
      const py = row * cellPixel;

      if (b.type === 'wall') {
        ctx.fillStyle = b.color || '#06b6d4';
        ctx.fillRect(px + 2, py + 2, cellPixel - 4, cellPixel - 4);
      } else if (b.type === 'crate') {
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(px + 4, py + 4, cellPixel - 8, cellPixel - 8);
      } else if (b.type === 'energy_barrier') {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.fillRect(px + 2, py + cellPixel / 2 - 2, cellPixel - 4, 4);
      } else if (b.type === 'tower') {
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(px + 1, py + 1, cellPixel - 2, cellPixel - 2);
      } else if (b.type === 'jump_pad') {
        ctx.fillStyle = '#9333ea';
        ctx.beginPath();
        ctx.arc(px + cellPixel / 2, py + cellPixel / 2, cellPixel / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e9d5ff';
        ctx.stroke();
      }
    });

    // Render powerups
    powerups.forEach((pu) => {
      const { col, row } = worldToGrid(pu.x, pu.z);
      const px = col * cellPixel + cellPixel / 2;
      const py = row * cellPixel + cellPixel / 2;

      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = pu.type === 'overcharge' ? '#ef4444' : pu.type === 'cloak' ? '#8b5cf6' : pu.type === 'repair' ? '#22c55e' : '#eab308';
      ctx.beginPath();
      ctx.moveTo(0, -cellPixel / 3);
      ctx.lineTo(cellPixel / 3, 0);
      ctx.lineTo(0, cellPixel / 3);
      ctx.lineTo(-cellPixel / 3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Render spawn points
    spawns.forEach((sp) => {
      const { col, row } = worldToGrid(sp.x, sp.z);
      const px = col * cellPixel + cellPixel / 2;
      const py = row * cellPixel + cellPixel / 2;

      ctx.fillStyle = sp.team === 'neon' ? '#06b6d4' : sp.team === 'plasma' ? '#ec4899' : '#10b981';
      ctx.beginPath();
      ctx.arc(px, py, cellPixel / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [blocks, powerups, spawns, theme]);

  const handleCanvasAction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellPixel = canvas.width / gridSize;
    const col = Math.floor(x / cellPixel);
    const row = Math.floor(y / cellPixel);

    applyToolToCell(col, row);
  };

  const handleClear = () => {
    if (confirm('Clear all blocks, powerups, and spawns?')) {
      setBlocks([]);
      setPowerups([]);
      setSpawns([]);
    }
  };

  const handleGenerateArena = (): ArenaLayout => {
    // Add perimeter boundary walls automatically if missing
    const half = (gridSize * cellSize) / 2;
    const boundaryColor = theme === 'cyberpunk' ? '#06b6d4' : theme === 'neon_matrix' ? '#10b981' : '#f43f5e';
    const finalBlocks = [...blocks];

    // Ensure boundary walls exist
    const hasNorth = finalBlocks.some((b) => b.z <= -half + 2);
    if (!hasNorth) {
      finalBlocks.push(
        { id: 'bound_n', x: 0, y: 3, z: -half, width: gridSize * cellSize, height: 6, depth: 1, type: 'wall', color: boundaryColor },
        { id: 'bound_s', x: 0, y: 3, z: half, width: gridSize * cellSize, height: 6, depth: 1, type: 'wall', color: boundaryColor },
        { id: 'bound_w', x: -half, y: 3, z: 0, width: 1, height: 6, depth: gridSize * cellSize, type: 'wall', color: boundaryColor },
        { id: 'bound_e', x: half, y: 3, z: 0, width: 1, height: 6, depth: gridSize * cellSize, type: 'wall', color: boundaryColor }
      );
    }

    // Default spawns if none placed
    const finalSpawns: ArenaSpawnPoint[] = spawns.length > 0 ? spawns : [
      { id: 'def_sp1', x: -half + 4, y: 1, z: -half + 4, team: 'neon' },
      { id: 'def_sp2', x: half - 4, y: 1, z: half - 4, team: 'plasma' },
      { id: 'def_sp3', x: 0, y: 1, z: 0, team: 'solo' },
    ];

    return {
      id: initialArena?.id || `custom-${Date.now()}`,
      name: arenaName,
      creator: 'User Architect',
      description,
      createdAt: Date.now(),
      gridSize,
      cellSize,
      blocks: finalBlocks,
      powerups,
      spawnPoints: finalSpawns,
      theme,
    };
  };

  const handleExportJson = () => {
    const layout = handleGenerateArena();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(layout, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${arenaName.toLowerCase().replace(/\s+/g, '-')}-arena.json`);
    dlAnchor.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as ArenaLayout;
        if (imported.blocks) {
          setArenaName(imported.name || 'Imported Arena');
          setDescription(imported.description || '');
          setBlocks(imported.blocks);
          setPowerups(imported.powerups || []);
          setSpawns(imported.spawnPoints || []);
          if (imported.theme) setTheme(imported.theme);
        }
      } catch {
        alert('Invalid JSON arena layout file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-slate-100">
      {/* Top Bar */}
      <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-black text-white">ARENA BLUEPRINT ARCHITECT</h2>
            <div className="text-xs text-slate-400">Design, construct, test, and host custom laser combat arenas</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onTestPlay(handleGenerateArena())}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" /> TEST PLAY IN 3D
          </button>
          <button
            onClick={() => onSave(handleGenerateArena())}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/30 cursor-pointer"
          >
            <Save className="w-4 h-4" /> SAVE & HOST
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            BACK TO LOBBY
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Palette & Tools */}
        <div className="w-72 bg-slate-900/60 border-r border-slate-800 p-5 overflow-y-auto flex flex-col gap-6">
          {/* Arena Metadata */}
          <div>
            <label className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold block mb-1.5">
              Arena Name
            </label>
            <input
              type="text"
              value={arenaName}
              onChange={(e) => setArenaName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold block mb-1.5">
              Theme / Atmosphere
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'cyberpunk' | 'neon_matrix' | 'void_colosseum')}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="cyberpunk">Cyberpunk Neon Cyan/Magenta</option>
              <option value="neon_matrix">Matrix Grid Emerald/Gold</option>
              <option value="void_colosseum">Void Colosseum Rose/Amber</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold block mb-1.5">
              Architect Symmetry
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setSymmetry('none')}
                className={`py-1.5 text-xs font-medium rounded cursor-pointer ${
                  symmetry === 'none' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                None
              </button>
              <button
                onClick={() => setSymmetry('mirror')}
                className={`py-1.5 text-xs font-medium rounded cursor-pointer ${
                  symmetry === 'mirror' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mirror
              </button>
              <button
                onClick={() => setSymmetry('quad')}
                className={`py-1.5 text-xs font-medium rounded cursor-pointer ${
                  symmetry === 'quad' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                4-Way
              </button>
            </div>
          </div>

          {/* Placement Tools */}
          <div>
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold mb-2">
              Structural Elements
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedTool('wall')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  selectedTool === 'wall'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Box className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium">Solid Wall</span>
              </button>
              <button
                onClick={() => setSelectedTool('cover')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  selectedTool === 'cover'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium">Low Crate</span>
              </button>
              <button
                onClick={() => setSelectedTool('energy_barrier')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  selectedTool === 'energy_barrier'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-medium">Energy Glass</span>
              </button>
              <button
                onClick={() => setSelectedTool('tower')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  selectedTool === 'tower'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium">Sniper Tower</span>
              </button>
              <button
                onClick={() => setSelectedTool('jump_pad')}
                className={`col-span-2 p-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  selectedTool === 'jump_pad'
                    ? 'bg-purple-950/80 border-purple-400 text-purple-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium">Jump / Bounce Pad</span>
              </button>
            </div>
          </div>

          {/* Powerups & Spawns */}
          <div>
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold mb-2">
              Powerup Crystals & Spawns
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedTool('pu_overcharge')}
                className={`p-2 rounded-lg border text-left text-xs cursor-pointer ${
                  selectedTool === 'pu_overcharge'
                    ? 'bg-red-950 border-red-500 text-red-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                ⚡ 2X Overcharge
              </button>
              <button
                onClick={() => setSelectedTool('pu_cloak')}
                className={`p-2 rounded-lg border text-left text-xs cursor-pointer ${
                  selectedTool === 'pu_cloak'
                    ? 'bg-purple-950 border-purple-500 text-purple-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                👁️ Hyper Cloak
              </button>
              <button
                onClick={() => setSelectedTool('pu_repair')}
                className={`p-2 rounded-lg border text-left text-xs cursor-pointer ${
                  selectedTool === 'pu_repair'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                🛡️ Nano Repair
              </button>
              <button
                onClick={() => setSelectedTool('pu_speed')}
                className={`p-2 rounded-lg border text-left text-xs cursor-pointer ${
                  selectedTool === 'pu_speed'
                    ? 'bg-amber-950 border-amber-500 text-amber-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                ⚡ Speed Boost
              </button>
              <button
                onClick={() => setSelectedTool('spawn_neon')}
                className={`p-2 rounded-lg border text-left text-xs cursor-pointer ${
                  selectedTool === 'spawn_neon'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                🟦 Neon Spawn
              </button>
              <button
                onClick={() => setSelectedTool('spawn_plasma')}
                className={`p-2 rounded-lg border text-left text-xs cursor-pointer ${
                  selectedTool === 'spawn_plasma'
                    ? 'bg-pink-950 border-pink-500 text-pink-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                🟥 Plasma Spawn
              </button>
            </div>
          </div>

          {/* Eraser & Clear */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setSelectedTool('eraser')}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedTool === 'eraser'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Eraser
            </button>
            <button
              onClick={handleClear}
              className="py-2 px-3 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          {/* Import / Export JSON */}
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex-1 py-2 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" /> Export JSON
            </button>
            <label className="flex-1 py-2 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-cyan-400" /> Import JSON
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* Center: Interactive Blueprint Canvas */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center overflow-auto">
          <div className="relative border-2 border-cyan-500/30 rounded-2xl p-2 bg-slate-900/40 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              onMouseDown={(e) => {
                setIsMouseDown(true);
                handleCanvasAction(e);
              }}
              onMouseUp={() => setIsMouseDown(false)}
              onMouseMove={(e) => {
                if (isMouseDown) handleCanvasAction(e);
              }}
              className="cursor-crosshair rounded-xl block"
            />

            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/80 px-4 py-2 rounded-lg backdrop-blur-md border border-slate-800">
              <div className="flex items-center gap-3">
                <span>Blocks: <b className="text-white">{blocks.length}</b></span>
                <span>Powerups: <b className="text-white">{powerups.length}</b></span>
                <span>Spawns: <b className="text-white">{spawns.length}</b></span>
              </div>
              <div className="text-cyan-400 font-mono">
                Click & drag to paint · Symmetry: {symmetry.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
