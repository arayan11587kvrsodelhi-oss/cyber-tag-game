import * as THREE from 'three';
import { ArenaLayout, Player, WeaponType } from '../types/game';
import { WEAPONS, PLAYER_HEIGHT, EYE_HEIGHT, MOVE_SPEED, SPRINT_MULTIPLIER, JUMP_VELOCITY, GRAVITY } from './constants';
import { sound } from '../audio/soundEngine';

export interface LaserVisual {
  mesh: THREE.Object3D;
  start: THREE.Vector3;
  dir: THREE.Vector3;
  currentDist: number;
  maxDist: number;
  speed: number;
  isHitscan: boolean;
  color: string;
  birth: number;
  life: number;
}

export interface ParticleSpark {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ThreeRenderer {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Arena
  public arena: ArenaLayout | null = null;
  private arenaMeshes: THREE.Group;
  private arenaColliders: THREE.Box3[] = [];
  private jumpPadZones: { box: THREE.Box3; yBoost: number }[] = [];

  // Local Player Physics & Controls
  public localPlayerPos = new THREE.Vector3(0, EYE_HEIGHT, 0);
  public localPlayerVel = new THREE.Vector3(0, 0, 0);
  public isGrounded = true;
  public yaw = 0;
  public pitch = 0;
  public isPointerLocked = false;
  public mouseSensitivity = 0.0022;
  public fov = 85;

  // Key states
  public keys: Record<string, boolean> = {
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    Space: false,
    ShiftLeft: false,
    ControlLeft: false,
  };

  // FPS Viewmodel (Blaster)
  private fpsWeaponGroup: THREE.Group;
  private weaponMesh: THREE.Group | null = null;
  private muzzleFlashLight: THREE.PointLight;
  private recoilOffset = 0;
  private weaponBobTime = 0;
  private swayX = 0;
  private swayY = 0;

  // Other Players 3D Avatars
  private playerAvatars: Map<string, {
    group: THREE.Group;
    torsoSensors: THREE.Mesh[];
    headMesh: THREE.Mesh;
    visorMesh: THREE.Mesh;
    tagSprite: THREE.Sprite;
    hitFlashTimer: number;
    targetPos: THREE.Vector3;
    targetYaw: number;
  }> = new Map();

  // Effects & Lasers
  private activeLasers: LaserVisual[] = [];
  private activeSparks: ParticleSpark[] = [];
  private powerupMeshes: Map<string, { group: THREE.Group; light: THREE.PointLight }> = new Map();

  // Callbacks
  public onShootRequest?: (weapon: WeaponType, origin: THREE.Vector3, dir: THREE.Vector3) => void;
  public onPowerupTouch?: (powerupId: string) => void;
  public onJumpPadTrigger?: () => void;

  private isDisposed = false;
  private animFrameId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030712);
    this.scene.fog = new THREE.FogExp2(0x050814, 0.015);

    this.camera = new THREE.PerspectiveCamera(this.fov, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, EYE_HEIGHT, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.arenaMeshes = new THREE.Group();
    this.scene.add(this.arenaMeshes);

    // Setup Lighting
    const ambient = new THREE.AmbientLight(0x1e293b, 1.2);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight.position.set(20, 40, 20);
    this.scene.add(dirLight);

    const secondaryDirLight = new THREE.DirectionalLight(0xd946ef, 0.8);
    secondaryDirLight.position.set(-20, 25, -20);
    this.scene.add(secondaryDirLight);

    // Viewmodel Blaster Setup
    this.fpsWeaponGroup = new THREE.Group();
    this.camera.add(this.fpsWeaponGroup);
    this.scene.add(this.camera);

    this.muzzleFlashLight = new THREE.PointLight(0x06b6d4, 0, 15);
    this.fpsWeaponGroup.add(this.muzzleFlashLight);

    this.buildFpsBlaster('pulse');

    // Event listeners
    this.bindEvents();
    this.startLoop();
  }

  private bindEvents() {
    this.handleResize = this.handleResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.container.addEventListener('mousemove', this.handleMouseMove);
  }

  public requestPointerLock() {
    this.container.requestPointerLock();
  }

  public exitPointerLock() {
    if (document.pointerLockElement === this.container) {
      document.exitPointerLock();
    }
  }

  private handlePointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.container;
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isPointerLocked) return;
    const movementX = e.movementX || 0;
    const movementY = e.movementY || 0;

    this.yaw -= movementX * this.mouseSensitivity;
    this.pitch -= movementY * this.mouseSensitivity;

    // Clamp pitch between -88 and +88 deg
    const maxPitch = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    // Weapon sway
    this.swayX = THREE.MathUtils.lerp(this.swayX, -movementX * 0.0006, 0.2);
    this.swayY = THREE.MathUtils.lerp(this.swayY, movementY * 0.0006, 0.2);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.keys[e.code] !== undefined) {
      this.keys[e.code] = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (this.keys[e.code] !== undefined) {
      this.keys[e.code] = false;
    }
  }

  private handleResize() {
    if (!this.container || this.isDisposed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // --- ARENA GENERATION ---

  public loadArena(arena: ArenaLayout) {
    this.arena = arena;
    // Clear old arena meshes
    while (this.arenaMeshes.children.length > 0) {
      const obj = this.arenaMeshes.children[0];
      this.arenaMeshes.remove(obj);
    }
    this.arenaColliders = [];
    this.jumpPadZones = [];
    this.powerupMeshes.clear();

    const arenaRadius = (arena.gridSize * arena.cellSize) / 2;

    // 1. Cyber Grid Floor
    const floorGeo = new THREE.PlaneGeometry(arenaRadius * 2 + 10, arenaRadius * 2 + 10, 64, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.25,
      metalness: 0.85,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    this.arenaMeshes.add(floorMesh);

    // Floor Grid Overlay
    const gridHelper = new THREE.GridHelper(arenaRadius * 2, arena.gridSize, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = 0.01;
    this.arenaMeshes.add(gridHelper);

    // 2. Build blocks
    arena.blocks.forEach((block) => {
      const geo = new THREE.BoxGeometry(block.width, block.height, block.depth);
      let mat: THREE.Material;

      const neonColor = block.color ? new THREE.Color(block.color) : new THREE.Color(0x06b6d4);

      if (block.type === 'energy_barrier') {
        mat = new THREE.MeshStandardMaterial({
          color: neonColor,
          roughness: 0.1,
          metalness: 0.2,
          transparent: true,
          opacity: block.opacity || 0.45,
          emissive: neonColor,
          emissiveIntensity: 0.4,
        });
      } else if (block.type === 'jump_pad') {
        mat = new THREE.MeshStandardMaterial({
          color: 0x581c87,
          roughness: 0.3,
          metalness: 0.9,
          emissive: new THREE.Color(0xa855f7),
          emissiveIntensity: 0.8,
        });
      } else {
        // High-tech sci-fi wall
        mat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.4,
          metalness: 0.7,
        });
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(block.x, block.y, block.z);
      this.arenaMeshes.add(mesh);

      // Add neon wireframe/edge highlight on solid walls
      if (block.type !== 'energy_barrier') {
        const edges = new THREE.EdgesGeometry(geo);
        const lineMat = new THREE.LineBasicMaterial({
          color: neonColor,
          linewidth: 1.5,
          transparent: true,
          opacity: 0.85,
        });
        const line = new THREE.LineSegments(edges, lineMat);
        mesh.add(line);
      }

      // Add to collision checks
      const box = new THREE.Box3().setFromObject(mesh);
      this.arenaColliders.push(box);

      if (block.type === 'jump_pad') {
        this.jumpPadZones.push({
          box: new THREE.Box3(
            new THREE.Vector3(block.x - block.width / 2, 0, block.z - block.depth / 2),
            new THREE.Vector3(block.x + block.width / 2, block.height + 1, block.z + block.depth / 2)
          ),
          yBoost: 18.0,
        });
      }
    });

    // 3. Arena dressing: non-colliding geometry for depth, scale, and navigation.
    this.addArenaDressing(arenaRadius);

    // 3. Powerups
    arena.powerups.forEach((pu) => {
      this.createPowerupVisual(pu.id, pu.type, new THREE.Vector3(pu.x, pu.y, pu.z));
    });
  }

  private addArenaDressing(arenaRadius: number) {
    const accentA = new THREE.Color(0x06b6d4);
    const accentB = new THREE.Color(0xec4899);

    // Recessed floor lanes: gives the arena a physical sci-fi deck instead of a flat plane.
    const laneMat = new THREE.MeshBasicMaterial({ color: 0x0b1624, transparent: true, opacity: 0.9 });
    const glowMat = new THREE.MeshBasicMaterial({ color: accentA, transparent: true, opacity: 0.55 });
    for (let i = -3; i <= 3; i++) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, arenaRadius * 2 - 2), glowMat);
      lane.position.set(i * 8, 0.035, 0);
      this.arenaMeshes.add(lane);
    }
    for (let i = -3; i <= 3; i++) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(arenaRadius * 2 - 2, 0.025, 0.035), laneMat);
      lane.position.set(0, 0.032, i * 8);
      this.arenaMeshes.add(lane);
    }

    // Tall corner beacons establish scale and make the arena readable at a glance.
    const beaconPositions = [
      [-arenaRadius + 3, 0, -arenaRadius + 3], [arenaRadius - 3, 0, -arenaRadius + 3],
      [-arenaRadius + 3, 0, arenaRadius - 3], [arenaRadius - 3, 0, arenaRadius - 3]
    ];
    beaconPositions.forEach(([x, y, z], index) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.28, 5.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.22, emissive: index % 2 ? accentB : accentA, emissiveIntensity: 0.35 })
      );
      shaft.position.y = 2.75;
      group.add(shaft);
      const lamp = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 0),
        new THREE.MeshBasicMaterial({ color: index % 2 ? accentB : accentA })
      );
      lamp.position.y = 5.65;
      group.add(lamp);
      const light = new THREE.PointLight(index % 2 ? accentB : accentA, 2.2, 12, 2);
      light.position.y = 5.5;
      group.add(light);
      this.arenaMeshes.add(group);
    });

    // Overhead structural beams make the space feel enclosed without changing collision.
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.28, emissive: 0x0e7490, emissiveIntensity: 0.18 });
    const beamGlow = new THREE.MeshBasicMaterial({ color: accentB, transparent: true, opacity: 0.7 });
    [-arenaRadius * 0.55, 0, arenaRadius * 0.55].forEach((z, i) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(arenaRadius * 1.65, 0.22, 0.22), beamMat);
      beam.position.set(0, 8.5, z);
      this.arenaMeshes.add(beam);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(arenaRadius * 1.4, 0.035, 0.035), beamGlow);
      strip.position.set(0, 8.35, z);
      this.arenaMeshes.add(strip);
    });

    // Holographic navigation rings around the arena centre.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.min(9, arenaRadius * 0.22), 0.025, 6, 96),
      new THREE.MeshBasicMaterial({ color: accentA, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    this.arenaMeshes.add(ring);
    const ring2 = ring.clone();
    ring2.scale.setScalar(1.55);
    ring2.material = new THREE.MeshBasicMaterial({ color: accentB, transparent: true, opacity: 0.32 });
    ring2.position.y = 0.09;
    this.arenaMeshes.add(ring2);
  }

  private createPowerupVisual(id: string, type: string, pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    let colorHex = 0x06b6d4;
    if (type === 'overcharge') colorHex = 0xef4444; // Red
    else if (type === 'cloak') colorHex = 0x8b5cf6; // Purple
    else if (type === 'repair') colorHex = 0x22c55e; // Green
    else if (type === 'speed') colorHex = 0xeab308; // Yellow

    const color = new THREE.Color(colorHex);

    // Rotating diamond octahedron
    const geo = new THREE.OctahedronGeometry(0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.9,
    });
    const diamond = new THREE.Mesh(geo, mat);
    group.add(diamond);

    // Glowing ring beacon
    const ringGeo = new THREE.RingGeometry(0.7, 0.8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.4;
    group.add(ring);

    // Point Light
    const light = new THREE.PointLight(colorHex, 1.2, 8);
    group.add(light);

    this.arenaMeshes.add(group);
    this.powerupMeshes.set(id, { group, light });
  }

  public updatePowerupStatus(id: string, active: boolean) {
    const pu = this.powerupMeshes.get(id);
    if (pu) {
      pu.group.visible = active;
      pu.light.intensity = active ? 1.2 : 0;
    }
  }

  // --- 3D FPS VIEWMODEL BLASTER ---

  public buildFpsBlaster(weaponType: WeaponType) {
    if (this.weaponMesh) {
      this.fpsWeaponGroup.remove(this.weaponMesh);
    }

    const cfg = WEAPONS[weaponType];
    const color = new THREE.Color(cfg.color);

    const group = new THREE.Group();

    // Gun body
    const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, 0.42);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.3,
      metalness: 0.9,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.2);
    group.add(body);

    // Neon Barrel Trim
    const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.2,
      metalness: 0.95,
      emissive: color,
      emissiveIntensity: 0.3,
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.38);
    group.add(barrel);

    // Glowing Emitter Ring at muzzle
    const muzzleRingGeo = new THREE.TorusGeometry(0.035, 0.008, 8, 16);
    const muzzleRingMat = new THREE.MeshBasicMaterial({ color: color });
    const muzzleRing = new THREE.Mesh(muzzleRingGeo, muzzleRingMat);
    muzzleRing.position.set(0, 0.03, -0.53);
    group.add(muzzleRing);

    // Top Holographic Sight
    const sightGeo = new THREE.BoxGeometry(0.04, 0.04, 0.08);
    const sightMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.7,
    });
    const sight = new THREE.Mesh(sightGeo, sightMat);
    sight.position.set(0, 0.09, -0.2);
    group.add(sight);

    // Initial position in bottom-right of viewport
    group.position.set(0.24, -0.22, -0.45);
    this.fpsWeaponGroup.add(group);
    this.weaponMesh = group;

    this.muzzleFlashLight.color = color;
    this.muzzleFlashLight.position.set(0.24, -0.19, -0.98);
  }

  // --- LASER FIRING & VFX ---

  public triggerLaserShot(weaponType: WeaponType, start: THREE.Vector3, dir: THREE.Vector3, isLocal: boolean = false) {
    const cfg = WEAPONS[weaponType];
    const color = cfg.color;

    // Recoil on local viewmodel
    if (isLocal) {
      this.recoilOffset = weaponType === 'rail' ? 0.08 : 0.035;
      this.muzzleFlashLight.intensity = 3.5;
    }

    if (cfg.projectileSpeed === 0) {
      // Hitscan Beam (Railgun)
      this.createRailgunBeam(start, dir, color);
    } else if (cfg.pelletCount && cfg.pelletCount > 1) {
      // Scatter cannon: create multiple spread beams
      for (let i = 0; i < cfg.pelletCount; i++) {
        const spreadDir = dir.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * cfg.spread,
            (Math.random() - 0.5) * cfg.spread,
            (Math.random() - 0.5) * cfg.spread
          )
        ).normalize();
        this.createLaserBolt(start, spreadDir, color, cfg.projectileSpeed, cfg.range);
      }
    } else {
      // Standard or Rapid bolt
      this.createLaserBolt(start, dir, color, cfg.projectileSpeed, cfg.range);
    }
  }

  private createLaserBolt(origin: THREE.Vector3, dir: THREE.Vector3, colorStr: string, speed: number, maxRange: number) {
    const color = new THREE.Color(colorStr);

    const group = new THREE.Group();

    // Laser core capsule
    const length = 1.4;
    const geo = new THREE.CylinderGeometry(0.035, 0.035, length, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(geo, mat);
    core.rotation.x = Math.PI / 2;
    group.add(core);

    // Glowing outer sheath
    const glowGeo = new THREE.CylinderGeometry(0.08, 0.08, length * 1.1, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.65,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = Math.PI / 2;
    group.add(glow);

    group.position.copy(origin);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    this.scene.add(group);

    this.activeLasers.push({
      mesh: group,
      start: origin.clone(),
      dir: dir.clone(),
      currentDist: 0,
      maxDist: maxRange,
      speed: speed,
      isHitscan: false,
      color: colorStr,
      birth: this.clock.getElapsedTime(),
      life: maxRange / speed,
    });
  }

  private createRailgunBeam(origin: THREE.Vector3, dir: THREE.Vector3, colorStr: string) {
    const color = new THREE.Color(colorStr);
    const length = 200;

    const group = new THREE.Group();

    // Core laser beam line
    const geo = new THREE.CylinderGeometry(0.04, 0.04, length, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(geo, mat);
    core.position.z = -length / 2;
    core.rotation.x = Math.PI / 2;
    group.add(core);

    // High energy outer glow cylinder
    const glowGeo = new THREE.CylinderGeometry(0.14, 0.14, length, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -length / 2;
    glow.rotation.x = Math.PI / 2;
    group.add(glow);

    group.position.copy(origin);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    this.scene.add(group);

    this.activeLasers.push({
      mesh: group,
      start: origin.clone(),
      dir: dir.clone(),
      currentDist: length,
      maxDist: length,
      speed: 0,
      isHitscan: true,
      color: colorStr,
      birth: this.clock.getElapsedTime(),
      life: 0.22, // Fades over 220ms
    });

    // Spawn sparks along collision point
    const ray = new THREE.Ray(origin, dir);
    for (const box of this.arenaColliders) {
      const hit = ray.intersectBox(box, new THREE.Vector3());
      if (hit) {
        this.spawnSparks(hit, colorStr, 12);
        break;
      }
    }
  }

  public spawnSparks(pos: THREE.Vector3, colorStr: string, count: number = 8) {
    const color = new THREE.Color(colorStr);
    const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const mat = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < count; i++) {
      const sparkMesh = new THREE.Mesh(geo, mat);
      sparkMesh.position.copy(pos);
      this.scene.add(sparkMesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 6
      );

      this.activeSparks.push({
        mesh: sparkMesh,
        vel,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
      });
    }
  }

  // --- 3D OPPONENT AVATARS ---

  public updateOpponent(player: Player) {
    let avatar = this.playerAvatars.get(player.id);
    if (!avatar) {
      avatar = this.buildPlayerAvatar(player);
      this.playerAvatars.set(player.id, avatar);
    }

    avatar.targetPos.set(player.x, player.y, player.z);
    avatar.targetYaw = player.yaw;

    // Visibility & Cloak powerup handling
    const isCloaked = player.powerups && player.powerups.cloak > 0;
    avatar.group.visible = !player.isRespawning;

    // Update floating health tag sprite
    this.updateAvatarTag(avatar.tagSprite, player);
  }

  public flashOpponentHit(playerId: string) {
    const avatar = this.playerAvatars.get(playerId);
    if (avatar) {
      avatar.hitFlashTimer = 0.25; // Flash sensor armor plates
    }
  }

  public removeOpponent(playerId: string) {
    const avatar = this.playerAvatars.get(playerId);
    if (avatar) {
      this.scene.remove(avatar.group);
      this.playerAvatars.delete(playerId);
    }
  }

  private buildPlayerAvatar(player: Player) {
    const group = new THREE.Group();
    const teamColor = new THREE.Color(player.team === 'neon' ? 0x06b6d4 : player.team === 'plasma' ? 0xec4899 : 0x10b981);

    // 1. Cybernetic Body / Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.95;
    group.add(torso);

    // Glowing Chest Laser Sensor Plate (Primary target)
    const chestGeo = new THREE.BoxGeometry(0.32, 0.35, 0.05);
    const chestMat = new THREE.MeshStandardMaterial({
      color: teamColor,
      emissive: teamColor,
      emissiveIntensity: 0.9,
    });
    const chestSensor = new THREE.Mesh(chestGeo, chestMat);
    chestSensor.position.set(0, 1.0, 0.16);
    group.add(chestSensor);

    // Glowing Back Sensor Plate
    const backSensor = new THREE.Mesh(chestGeo, chestMat);
    backSensor.position.set(0, 1.0, -0.16);
    group.add(backSensor);

    // 2. Head & Visor
    const headGeo = new THREE.BoxGeometry(0.3, 0.32, 0.3);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    group.add(head);

    // Neon glowing Visor
    const visorGeo = new THREE.BoxGeometry(0.26, 0.1, 0.06);
    const visorMat = new THREE.MeshBasicMaterial({ color: teamColor });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.55, 0.155);
    group.add(visor);

    // 3. Limbs (Legs & Arms)
    const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.16, 0.3, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.16, 0.3, 0);
    group.add(rightLeg);

    // Laser Rifle in hand
    const rifleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.5);
    const rifleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      emissive: teamColor,
      emissiveIntensity: 0.4,
    });
    const rifle = new THREE.Mesh(rifleGeo, rifleMat);
    rifle.position.set(0.3, 0.85, 0.25);
    group.add(rifle);

    // 4. Floating Overhead Name & Health Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const tagSprite = new THREE.Sprite(spriteMat);
    tagSprite.position.set(0, 2.1, 0);
    tagSprite.scale.set(1.5, 0.375, 1);
    group.add(tagSprite);

    group.position.set(player.x, player.y, player.z);
    this.scene.add(group);

    return {
      group,
      torsoSensors: [chestSensor, backSensor],
      headMesh: head,
      visorMesh: visor,
      tagSprite,
      hitFlashTimer: 0,
      targetPos: new THREE.Vector3(player.x, player.y, player.z),
      targetYaw: player.yaw,
    };
  }

  private updateAvatarTag(sprite: THREE.Sprite, player: Player) {
    const mat = sprite.material as THREE.SpriteMaterial;
    const texture = mat.map as THREE.CanvasTexture;
    if (!texture) return;

    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 256, 64);

    // Draw background pill
    ctx.fillStyle = 'rgba(3, 7, 18, 0.75)';
    ctx.roundRect(10, 6, 236, 52, 6);
    ctx.fill();

    // Name & Title
    ctx.font = 'bold 18px Orbitron, Rajdhani, sans-serif';
    ctx.fillStyle = player.team === 'neon' ? '#38bdf8' : player.team === 'plasma' ? '#f472b6' : '#34d399';
    ctx.textAlign = 'center';
    ctx.fillText(player.name.substring(0, 14), 128, 28);

    // Health / Shield Bar
    const totalMax = (player.maxHealth || 100) + (player.maxShield || 100);
    const currentTotal = (player.health || 0) + (player.shield || 0);
    const ratio = Math.max(0, Math.min(1, currentTotal / totalMax));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(20, 36, 216, 12);

    // Shield (Cyan/Pink) + Health
    const fillWidth = 216 * ratio;
    ctx.fillStyle = player.shield > 0 ? '#38bdf8' : '#ef4444';
    ctx.fillRect(20, 36, fillWidth, 12);

    texture.needsUpdate = true;
  }

  // --- LOCAL PLAYER RAYCAST HITSCAN CHECK ---

  public performLocalShootRaycast(weapon: WeaponType): { hit: boolean; targetId?: string; hitZone?: 'head' | 'chest' | 'back' | 'limb'; point?: THREE.Vector3 } {
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    // Apply weapon spread
    const cfg = WEAPONS[weapon];
    if (cfg.spread > 0) {
      dir.x += (Math.random() - 0.5) * cfg.spread;
      dir.y += (Math.random() - 0.5) * cfg.spread;
      dir.z += (Math.random() - 0.5) * cfg.spread;
      dir.normalize();
    }

    const ray = new THREE.Ray(origin, dir);

    let closestHitDist = cfg.range;
    let hitResult: { hit: boolean; targetId?: string; hitZone?: 'head' | 'chest' | 'back' | 'limb'; point?: THREE.Vector3 } = { hit: false };

    // Check arena wall collision first (lasers are blocked by walls)
    for (const box of this.arenaColliders) {
      const hitPoint = ray.intersectBox(box, new THREE.Vector3());
      if (hitPoint) {
        const d = origin.distanceTo(hitPoint);
        if (d < closestHitDist) {
          closestHitDist = d;
          hitResult = { hit: false, point: hitPoint };
        }
      }
    }

    // Check opponent hitboxes
    for (const [id, avatar] of this.playerAvatars.entries()) {
      if (!avatar.group.visible) continue;

      const pPos = avatar.group.position;
      // Head sphere check
      const headCenter = new THREE.Vector3(pPos.x, pPos.y + 1.55, pPos.z);
      const headDist = ray.distanceToPoint(headCenter);
      if (headDist < 0.28) {
        const d = origin.distanceTo(headCenter);
        if (d < closestHitDist) {
          closestHitDist = d;
          hitResult = { hit: true, targetId: id, hitZone: 'head', point: headCenter };
          continue;
        }
      }

      // Torso / Body cylinder/box check
      const chestCenter = new THREE.Vector3(pPos.x, pPos.y + 1.0, pPos.z);
      const chestDist = ray.distanceToPoint(chestCenter);
      if (chestDist < 0.42) {
        const d = origin.distanceTo(chestCenter);
        if (d < closestHitDist) {
          // Check if shot hits back or front based on avatar yaw
          const toShooter = origin.clone().sub(chestCenter).normalize();
          const avatarFacing = new THREE.Vector3(Math.sin(avatar.targetYaw), 0, Math.cos(avatar.targetYaw));
          const dot = toShooter.dot(avatarFacing);
          const zone = dot < -0.2 ? 'back' : 'chest';

          closestHitDist = d;
          hitResult = { hit: true, targetId: id, hitZone: zone, point: chestCenter };
          continue;
        }
      }

      // Limbs check
      const limbCenter = new THREE.Vector3(pPos.x, pPos.y + 0.4, pPos.z);
      if (ray.distanceToPoint(limbCenter) < 0.4) {
        const d = origin.distanceTo(limbCenter);
        if (d < closestHitDist) {
          closestHitDist = d;
          hitResult = { hit: true, targetId: id, hitZone: 'limb', point: limbCenter };
        }
      }
    }

    return hitResult;
  }

  // --- GAME LOOP & PHYSICS UPDATE ---

  private startLoop() {
    const animate = () => {
      if (this.isDisposed) return;
      this.animFrameId = requestAnimationFrame(animate);

      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.updatePhysics(delta);
      this.updateVisualEffects(delta);
      this.updateOpponentInterpolations(delta);

      this.renderer.render(this.scene, this.camera);
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  private updatePhysics(delta: number) {
    if (!this.isPointerLocked) return;

    // Movement calculation
    const moveX = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0);
    const moveZ = (this.keys.KeyS ? 1 : 0) - (this.keys.KeyW ? 1 : 0);

    const isSprint = this.keys.ShiftLeft;
    const speed = MOVE_SPEED * (isSprint ? SPRINT_MULTIPLIER : 1.0);

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const wishDir = new THREE.Vector3();
    wishDir.addScaledVector(forward, -moveZ);
    wishDir.addScaledVector(right, moveX);
    if (wishDir.lengthSq() > 0.001) {
      wishDir.normalize();
    }

    // Horizontal velocity
    this.localPlayerVel.x = wishDir.x * speed;
    this.localPlayerVel.z = wishDir.z * speed;

    // Jump
    if (this.keys.Space && this.isGrounded) {
      this.localPlayerVel.y = JUMP_VELOCITY;
      this.isGrounded = false;
      sound.playJumpPad();
    }

    // Gravity
    this.localPlayerVel.y -= GRAVITY * delta;

    // Integrate position with AABB collision resolution
    const nextPos = this.localPlayerPos.clone().addScaledVector(this.localPlayerVel, delta);

    // Floor collision
    if (nextPos.y <= EYE_HEIGHT) {
      nextPos.y = EYE_HEIGHT;
      this.localPlayerVel.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // AABB Player Box against arena obstacles
    const playerRadius = 0.45;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - playerRadius, nextPos.y - EYE_HEIGHT + 0.1, nextPos.z - playerRadius),
      new THREE.Vector3(nextPos.x + playerRadius, nextPos.y - EYE_HEIGHT + PLAYER_HEIGHT, nextPos.z + playerRadius)
    );

    for (const box of this.arenaColliders) {
      if (playerBox.intersectsBox(box)) {
        // Resolve horizontal collision by checking X and Z axis separately
        const testPosX = this.localPlayerPos.clone();
        testPosX.x = nextPos.x;
        const boxX = new THREE.Box3(
          new THREE.Vector3(testPosX.x - playerRadius, testPosX.y - EYE_HEIGHT + 0.1, testPosX.z - playerRadius),
          new THREE.Vector3(testPosX.x + playerRadius, testPosX.y - EYE_HEIGHT + PLAYER_HEIGHT, testPosX.z + playerRadius)
        );
        if (boxX.intersectsBox(box)) {
          nextPos.x = this.localPlayerPos.x;
          this.localPlayerVel.x = 0;
        }

        const testPosZ = this.localPlayerPos.clone();
        testPosZ.z = nextPos.z;
        const boxZ = new THREE.Box3(
          new THREE.Vector3(testPosZ.x - playerRadius, testPosZ.y - EYE_HEIGHT + 0.1, testPosZ.z - playerRadius),
          new THREE.Vector3(testPosZ.x + playerRadius, testPosZ.y - EYE_HEIGHT + PLAYER_HEIGHT, testPosZ.z + playerRadius)
        );
        if (boxZ.intersectsBox(box)) {
          nextPos.z = this.localPlayerPos.z;
          this.localPlayerVel.z = 0;
        }
      }
    }

    // Jump Pad Trigger check
    for (const jp of this.jumpPadZones) {
      if (jp.box.containsPoint(nextPos)) {
        this.localPlayerVel.y = jp.yBoost;
        this.isGrounded = false;
        sound.playJumpPad();
        if (this.onJumpPadTrigger) this.onJumpPadTrigger();
        break;
      }
    }

    // Powerup Touch check
    if (this.arena) {
      for (const pu of this.arena.powerups) {
        if (pu.active) {
          const puPos = new THREE.Vector3(pu.x, pu.y, pu.z);
          if (nextPos.distanceTo(puPos) < 1.8) {
            if (this.onPowerupTouch) this.onPowerupTouch(pu.id);
          }
        }
      }
    }

    this.localPlayerPos.copy(nextPos);

    // Update camera transform
    this.camera.position.copy(this.localPlayerPos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Viewmodel Bobbing & Recoil Spring
    const isMoving = wishDir.lengthSq() > 0.01 && this.isGrounded;
    if (isMoving) {
      this.weaponBobTime += delta * (isSprint ? 14 : 9);
    }
    const bobX = Math.cos(this.weaponBobTime) * 0.015;
    const bobY = Math.sin(this.weaponBobTime * 2) * 0.015;

    this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, delta * 18);
    this.muzzleFlashLight.intensity = THREE.MathUtils.lerp(this.muzzleFlashLight.intensity, 0, delta * 25);

    if (this.weaponMesh) {
      this.weaponMesh.position.set(
        0.24 + bobX + this.swayX,
        -0.22 + bobY - this.swayY,
        -0.45 + this.recoilOffset
      );
    }
  }

  private updateVisualEffects(delta: number) {
    const elapsed = this.clock.getElapsedTime();

    // 1. Update Laser Bolts & Beams
    for (let i = this.activeLasers.length - 1; i >= 0; i--) {
      const laser = this.activeLasers[i];
      const age = elapsed - laser.birth;

      if (age > laser.life) {
        this.scene.remove(laser.mesh);
        this.activeLasers.splice(i, 1);
        continue;
      }

      if (laser.isHitscan) {
        // Fade out railgun glow
        const ratio = 1 - (age / laser.life);
        laser.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = ratio * 0.8;
          }
        });
      } else {
        // Move projectile along dir
        const moveDist = laser.speed * delta;
        laser.mesh.position.addScaledVector(laser.dir, moveDist);
        laser.currentDist += moveDist;

        // Check if hit arena wall
        for (const box of this.arenaColliders) {
          if (box.containsPoint(laser.mesh.position)) {
            this.spawnSparks(laser.mesh.position, laser.color, 6);
            this.scene.remove(laser.mesh);
            this.activeLasers.splice(i, 1);
            break;
          }
        }
      }
    }

    // 2. Update Sparks
    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const sp = this.activeSparks[i];
      sp.life += delta;
      if (sp.life >= sp.maxLife) {
        this.scene.remove(sp.mesh);
        this.activeSparks.splice(i, 1);
        continue;
      }

      sp.vel.y -= 12 * delta;
      sp.mesh.position.addScaledVector(sp.vel, delta);
      const fade = 1 - sp.life / sp.maxLife;
      sp.mesh.scale.setScalar(fade);
    }

    // 3. Rotate Powerups
    this.powerupMeshes.forEach((pu) => {
      pu.group.rotation.y += delta * 1.5;
      pu.group.children[0].rotation.x += delta * 0.8;
      // Hover bobbing
      pu.group.children[0].position.y = Math.sin(elapsed * 2.5) * 0.15;
    });
  }

  private updateOpponentInterpolations(delta: number) {
    this.playerAvatars.forEach((avatar) => {
      // Smooth position interpolation
      avatar.group.position.lerp(avatar.targetPos, delta * 16);

      // Smooth yaw interpolation
      avatar.group.rotation.y = THREE.MathUtils.lerp(avatar.group.rotation.y, avatar.targetYaw, delta * 14);

      // Hit flash decay
      if (avatar.hitFlashTimer > 0) {
        avatar.hitFlashTimer -= delta;
        const flashWhite = avatar.hitFlashTimer > 0;
        avatar.torsoSensors.forEach((s) => {
          if (s.material instanceof THREE.MeshStandardMaterial) {
            s.material.emissive.setHex(flashWhite ? 0xffffff : 0x06b6d4);
            s.material.emissiveIntensity = flashWhite ? 2.5 : 0.9;
          }
        });
      }
    });
  }

  public dispose() {
    this.isDisposed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.container.removeEventListener('mousemove', this.handleMouseMove);

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
