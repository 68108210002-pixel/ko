import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Sparkles, Key, Keyboard, Play, RotateCcw, 
  MapPin, Heart, Zap, Crosshair, ArrowLeft, Volume2, VolumeX, Eye, Activity
} from 'lucide-react';
import { CharacterClass, KeyBindings, GraphicsSettings } from '../types';

interface GameWorldProps {
  selectedClass: CharacterClass;
  characterName: string;
  keyBindings: KeyBindings;
  graphicsSettings: GraphicsSettings;
  soundEnabled: boolean;
  sfxVolume: number;
  onExit: () => void;
}

interface ActionLog {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'attack' | 'skill' | 'move';
}

// Sub-components for pixel-perfect animated dialogue portraits
const AnimatedPlayerDialogueSprite: React.FC = () => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 4);
    }, 150);
    return () => clearInterval(interval);
  }, []);
  return (
    <div 
      className="w-24 h-24 sm:w-32 sm:h-32 transition-all duration-150"
      style={{
        backgroundImage: `url('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png')`,
        backgroundSize: '400% 400%',
        backgroundPosition: `${frame * 33.33}% 100%`, // Row 3 is standing/idle sequence
        imageRendering: 'pixelated'
      }}
    />
  );
};

const AnimatedNpcDialogueSprite: React.FC = () => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 4);
    }, 150);
    return () => clearInterval(interval);
  }, []);
  return (
    <div 
      className="w-24 h-24 sm:w-32 sm:h-32 transition-all duration-150 scale-x-[-1]"
      style={{
        backgroundImage: `url('https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/npc1_pdraha.png')`,
        backgroundSize: '400% 200%',
        backgroundPosition: `${frame * 33.33}% 0%`, // Row 0 is idle front-view sequence
        imageRendering: 'pixelated'
      }}
    />
  );
};

export const GameWorld: React.FC<GameWorldProps> = ({
  selectedClass,
  characterName,
  keyBindings,
  graphicsSettings,
  soundEnabled: initialSoundEnabled,
  sfxVolume,
  onExit,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Game state & options
  const [soundOn, setSoundOn] = useState<boolean>(initialSoundEnabled);
  const [ambientPlaying, setAmbientPlaying] = useState<boolean>(false);
  const [hudScale, setHudScale] = useState<boolean>(true);
  
  // Stats
  const [playerHP, setPlayerHP] = useState<number>(100);
  const [playerLives, setPlayerLives] = useState<number>(5);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isGameClear, setIsGameClear] = useState<boolean>(false);
  const [isDialogueActive, setIsDialogueActive] = useState<boolean>(false);
  const [dialogueStep, setDialogueStep] = useState<number>(0);
  const [bossHP, setBossHP] = useState<number>(0);
  const [bossMaxHP, setBossMaxHP] = useState<number>(30);
  const [bossActiveUI, setBossActiveUI] = useState<boolean>(false);
  const [resetCounter, setResetCounter] = useState<number>(0);
  const [playerMP, setPlayerMP] = useState<number>(100);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [currentActionState, setCurrentActionState] = useState<string>('IDLE');
  const [directionLabel, setDirectionLabel] = useState<string>('SOUTH (หน้าตรง)');
  const [coords, setCoords] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [fps, setFps] = useState<number>(60);
  
  // Action Logger state
  const [logs, setLogs] = useState<ActionLog[]>([]);
  
  // Active Keyboard states (strictly WASD, Arrows, P, O)
  const [pressedKeys, setPressedKeys] = useState<{ [key: string]: boolean }>({
    W: false, A: false, S: false, D: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    P: false, O: false
  });

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodeRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Add Log helper
  const addLog = (message: string, type: 'info' | 'attack' | 'skill' | 'move') => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const newLog = { id: Math.random().toString(), time, message, type };
    setLogs(prev => [newLog, ...prev.slice(0, 11)]);
  };

  const handleRestart = () => {
    setPlayerLives(5);
    setIsGameOver(false);
    setIsGameClear(false);
    setIsDialogueActive(false);
    setDialogueStep(0);
    setBossActiveUI(false);
    setBossHP(0);
    setPlayerHP(100);
    setPlayerMP(100);
    setPlayerScore(0);
    setResetCounter(prev => prev + 1);
  };

  // Sound Synth Helpers
  const playSound = (type: 'shoot' | 'burst' | 'move' | 'hit') => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      if (type === 'shoot') {
        // Attack Punch Sound (Whoosh & High Impact Glide)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(sfxVolume * 0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'burst') {
        // Exploding Burst Energy Ring (Bass Drop & High Laser Rising)
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();

        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(120, ctx.currentTime);
        subOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
        subGain.gain.setValueAtTime(sfxVolume * 0.4, ctx.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start();
        subOsc.stop(ctx.currentTime + 0.5);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(sfxVolume * 0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'move') {
        // Soft click or rustle sound for stepping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(sfxVolume * 0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'hit') {
        // Solid physical landing strike
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(sfxVolume * 0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      // Audio block bypass
    }
  };

  // Toggle ambient humming background music
  const toggleAmbientMusic = () => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (ambientPlaying) {
        if (ambientNodeRef.current) {
          ambientNodeRef.current.stop();
          ambientNodeRef.current.disconnect();
          ambientNodeRef.current = null;
        }
        setAmbientPlaying(false);
        addLog("ปิดเสียงดนตรีประกอบ (Music Off)", "info");
      } else {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gainNode = ctx.createGain();

        // Safe futuristic cyber ambient pad
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(85, ctx.currentTime); // C2 deep drone
        
        // Slow modulations
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.25; // 0.25Hz sweep
        lfoGain.gain.value = 5;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        filter.type = 'lowpass';
        filter.frequency.value = 350;

        gainNode.gain.setValueAtTime(sfxVolume * 0.15, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        ambientNodeRef.current = osc;
        ambientGainRef.current = gainNode;
        setAmbientPlaying(true);
        addLog("เปิดเสียงดนตรีประกอบแนว Cyber Ambient", "info");
      }
    } catch (e) {
      // Audio block bypass
    }
  };

  useEffect(() => {
    addLog(`ระบบโหลดฮีโร่ ${characterName} (${selectedClass.name}) เรียบร้อย!`, 'info');
    addLog(`ควบคุม: WASD / Arrow Keys เพื่อเดิน 8 ทิศทาง`, 'info');
    addLog(`ปุ่มต่อย [ P ] | ปุ่มสกิลระเบิดพลัง [ O ]`, 'info');
    
    // Initialize WebGL Scene
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    // Elegant deep slate-950 fog that matches the background beautifully and keeps colors clear
    scene.fog = new THREE.FogExp2(0x020617, 0.015);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x020617, 1);
    container.appendChild(renderer.domElement);

    // Camera Setup - Perspective tracking behind player with high-angle view
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 13.5, 9.5);

    // Lights - Neutral warm/white lights to preserve beautiful, true colors of pixel art sprites
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    const d = 15;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Dynamic glowing warm-spotlight centered on player to enhance presence without tinting colors
    const playerLight = new THREE.PointLight(0xfff7ed, 1.5, 12);
    playerLight.castShadow = true;
    scene.add(playerLight);

    // Ground Plane with tiling texture
    const textureLoader = new THREE.TextureLoader();
    const groundTex = textureLoader.load(
      'https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png',
      (txt) => {
        txt.wrapS = THREE.RepeatWrapping;
        txt.wrapT = THREE.RepeatWrapping;
        txt.repeat.set(22, 22); // Fine tiling details
        txt.minFilter = THREE.LinearMipmapLinearFilter;
        txt.magFilter = THREE.LinearFilter;
      }
    );

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.6,
      metalness: 0.4,
      bumpScale: 0.05,
    });
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Scenic decorative glowing cyber crystals
    const crystalGeo = new THREE.ConeGeometry(0.6, 3, 4);
    const crystals: THREE.Mesh[] = [];
    const crystalColors = [0x00ffff, 0xa855f7, 0xfacc15, 0xec4899];

    // Scatter 8 crystals on the ground
    const coordsList = [
      { x: -10, z: -10 }, { x: 12, z: -8 }, { x: -15, z: 12 }, { x: 14, z: 14 },
      { x: -5, z: 18 }, { x: 8, z: -16 }, { x: -18, z: -5 }, { x: 5, z: 8 }
    ];

    coordsList.forEach((pos, idx) => {
      const color = crystalColors[idx % crystalColors.length];
      const crystalMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9
      });
      const cry = new THREE.Mesh(crystalGeo, crystalMat);
      cry.position.set(pos.x, 1.5, pos.z);
      cry.castShadow = true;
      cry.receiveShadow = true;
      scene.add(cry);
      crystals.push(cry);
    });

    // 2D Billboard Player setup
    // Load character sheet (4 Columns x 4 Rows, 256x256px frames)
    const playerTex = textureLoader.load(
      'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png',
      (txt) => {
        txt.wrapS = THREE.RepeatWrapping;
        txt.wrapT = THREE.RepeatWrapping;
        txt.repeat.set(0.25, 0.25); // Show exactly 1 frame at a time
        txt.magFilter = THREE.NearestFilter; // Sharp crispy pixel-art!
        txt.minFilter = THREE.NearestFilter;
      }
    );

    const playerMat = new THREE.MeshStandardMaterial({
      map: playerTex,
      transparent: true,
      alphaTest: 0.45, // Perfect sharp pixel edge clipping
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.1,
      shadowSide: THREE.DoubleSide
    });

    // Player geometric dimensions (slightly tall, perfectly billboarded)
    const playerGeo = new THREE.PlaneGeometry(2.8, 2.8);
    const playerMesh = new THREE.Mesh(playerGeo, playerMat);
    playerMesh.position.set(0, 1.82, 0); // Feet on the ground plane
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
    scene.add(playerMesh);

    // Active animation state
    let playerPos = new THREE.Vector3(0, 1.82, 0);
    let facingLeft = false;
    let currentRow = 0; // 0: Idle, 1: Walk, 2: Attack, 3: Dance
    let currentCol = 0; // 0..3 anim frames
    let animTimer = 0;
    
    // Custom logic state flags
    let isAttacking = false;
    let attackTimer = 0;
    let attackAnimSpeed = 0.05; // Quick punch!

    // Energy rings (O key)
    const activeRings: Array<{
      mesh: THREE.Mesh;
      scale: number;
      opacity: number;
      maxScale: number;
    }> = [];

    // Class skill trackers
    let shieldMesh: THREE.Object3D | null = null;
    let shieldActiveTimer = 0;

    interface SkillMeteor {
      mesh: THREE.Object3D;
      pos: THREE.Vector3;
      targetPos: THREE.Vector3;
      progress: number;
      speed: number;
      explosionRadius: number;
    }
    const activeMeteors: SkillMeteor[] = [];

    interface SkillWindArrow {
      mesh: THREE.Object3D;
      pos: THREE.Vector3;
      dir: THREE.Vector3;
      speed: number;
      age: number;
      maxAge: number;
    }
    const activeWindArrows: SkillWindArrow[] = [];

    // Recursive disposal helper
    const disposeObject = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    };

    // Slash hitboxes (P key)
    const activeHitboxes: Array<{
      mesh: THREE.Mesh;
      age: number;
      maxAge: number;
    }> = [];

    // Track input key flags
    const keys = {
      w: false, a: false, s: false, d: false,
      arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
      p: false, o: false
    };

    // Potion setup & definition
    interface PotionEntity {
      mesh: THREE.Mesh;
      pos: THREE.Vector3;
    }
    const potions: PotionEntity[] = [];

    // Mana Potion setup & definition
    interface ManaEntity {
      mesh: THREE.Mesh;
      pos: THREE.Vector3;
    }
    const manas: ManaEntity[] = [];

    const potionTex = textureLoader.load('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png', (txt) => {
      txt.magFilter = THREE.NearestFilter;
      txt.minFilter = THREE.NearestFilter;
    });
    const potionMat = new THREE.MeshStandardMaterial({
      map: potionTex,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.2
    });
    const potionGeo = new THREE.PlaneGeometry(1.6, 1.6);

    const manaMat = new THREE.MeshStandardMaterial({
      map: potionTex,
      color: 0x3b82f6, // Vibrant blue tint
      emissive: 0x2563eb, // Glowing cyan/blue emission
      emissiveIntensity: 2.8,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.2,
      metalness: 0.8
    });

    const spawnPotion = (x: number, z: number) => {
      const pMesh = new THREE.Mesh(potionGeo, potionMat.clone());
      pMesh.position.set(x, 1.0, z);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      scene.add(pMesh);
      potions.push({ mesh: pMesh, pos: new THREE.Vector3(x, 1.0, z) });
    };

    const spawnMana = (x: number, z: number) => {
      const mMesh = new THREE.Mesh(potionGeo, manaMat.clone());
      mMesh.position.set(x, 1.0, z);
      mMesh.castShadow = true;
      mMesh.receiveShadow = true;
      scene.add(mMesh);
      manas.push({ mesh: mMesh, pos: new THREE.Vector3(x, 1.0, z) });
    };

    // Spawn initial potions
    for (let i = 0; i < 4; i++) {
      spawnPotion(
        THREE.MathUtils.randFloat(-22, 22),
        THREE.MathUtils.randFloat(-22, 22)
      );
    }

    // Spawn initial mana potions
    for (let i = 0; i < 4; i++) {
      spawnMana(
        THREE.MathUtils.randFloat(-22, 22),
        THREE.MathUtils.randFloat(-22, 22)
      );
    }

    // Enemy setup & definition
    interface EnemyEntity {
      id: string;
      mesh: THREE.Mesh;
      texture: THREE.Texture;
      pos: THREE.Vector3;
      currentCol: number;
      currentRow: number;
      animTimer: number;
      health: number; // 2 hits to die
      isKnockedBack: boolean;
      knockbackDir: THREE.Vector3;
      knockbackTimer: number;
      knockbackSpeed: number;
      isDead: boolean;
      deathTimer: number;
      flashTimer: number;
      flashState: boolean;
      attackCooldown: number;
      isAttacking: boolean;
      attackFlashTimer: number;
    }
    const enemies: EnemyEntity[] = [];

    const enemyTexLoader = () => {
      const tex = textureLoader.load('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png');
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(0.25, 0.5); // 4 columns, 2 rows
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    };

    const spawnEnemy = () => {
      if (enemies.length >= 6) return; // Keep rendering fast and playable
      
      let spawnX = playerPos.x;
      let spawnZ = playerPos.z;
      while (playerPos.distanceTo(new THREE.Vector3(spawnX, 1.82, spawnZ)) < 10) {
        spawnX = THREE.MathUtils.randFloat(-22, 22);
        spawnZ = THREE.MathUtils.randFloat(-22, 22);
      }

      const eTex = enemyTexLoader();
      const eMat = new THREE.MeshStandardMaterial({
        map: eTex,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.1,
        shadowSide: THREE.DoubleSide
      });

      const eMesh = new THREE.Mesh(playerGeo, eMat); // Same mesh dimensions as player
      eMesh.position.set(spawnX, 1.82, spawnZ);
      eMesh.scale.set(1.3, 1.3, 1.3);
      eMesh.castShadow = true;
      eMesh.receiveShadow = true;
      scene.add(eMesh);

      enemies.push({
        id: Math.random().toString(),
        mesh: eMesh,
        texture: eTex,
        pos: new THREE.Vector3(spawnX, 1.82, spawnZ),
        currentCol: 0,
        currentRow: 0,
        animTimer: 0,
        health: 2,
        isKnockedBack: false,
        knockbackDir: new THREE.Vector3(0, 0, 0),
        knockbackTimer: 0,
        knockbackSpeed: 0,
        isDead: false,
        deathTimer: 0,
        flashTimer: 0,
        flashState: false,
        attackCooldown: THREE.MathUtils.randFloat(0.5, 2.0),
        isAttacking: false,
        attackFlashTimer: 0
      });
    };

    // Spawn initial enemies
    for (let i = 0; i < 3; i++) {
      spawnEnemy();
    }

    // Player Gameplay mutable variables
    let playerLives = 5;
    let currentMP = 100;
    let invincibilityTimer = 0;
    let score = 0;
    let gameIsOver = false;
    let defeatedEnemiesCount = 0;

    // Enemy spawn timing
    let enemySpawnTimer = 0;
    let nextEnemySpawnDelay = THREE.MathUtils.randFloat(1.0, 3.0);

    // Fireball setup
    interface FireballEntity {
      mesh: THREE.Mesh;
      startPos: THREE.Vector3;
      targetPos: THREE.Vector3;
      progress: number; // 0 to 1
      speed: number;
      indicatorRing: THREE.Mesh;
      hasLanded: boolean;
    }
    const fireballs: FireballEntity[] = [];

    // Warp portal setup
    interface WarpPortal {
      mesh: THREE.Mesh;
      pos: THREE.Vector3;
      active: boolean;
    }
    let warpPortal: WarpPortal | null = null;

    // NPC setup & definition
    interface NpcEntity {
      mesh: THREE.Mesh;
      texture: THREE.Texture;
      pos: THREE.Vector3;
      targetPos: THREE.Vector3;
      currentCol: number;
      currentRow: number;
      animTimer: number;
      isWalking: boolean;
      facingLeft: boolean;
    }
    let npc: NpcEntity | null = null;
    let dialogueTriggered = false;

    const npcTexLoader = () => {
      const tex = textureLoader.load('https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/npc1_pdraha.png');
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(0.25, 0.5); // 4 columns, 2 rows
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    };

    const spawnNpc = (x: number, z: number) => {
      const nTex = npcTexLoader();
      const nMat = new THREE.MeshStandardMaterial({
        map: nTex,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.1,
        shadowSide: THREE.DoubleSide
      });
      const nMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), nMat);
      nMesh.position.set(x, 1.82, z);
      nMesh.scale.set(1.3, 1.3, 1.3);
      nMesh.castShadow = true;
      nMesh.receiveShadow = true;
      scene.add(nMesh);

      npc = {
        mesh: nMesh,
        texture: nTex,
        pos: new THREE.Vector3(x, 1.82, z),
        targetPos: new THREE.Vector3(x, 1.82, z),
        currentCol: 0,
        currentRow: 0,
        animTimer: 0,
        isWalking: false,
        facingLeft: false
      };
      
      addLog("🚶 สหายผู้เฝ้ามิติลึกลับปรากฏตัวขึ้นและก้าวเดินตรงมาหาคุณ!", "info");
    };

    // Boss Setup & Definition
    interface BossEntity {
      mesh: THREE.Mesh;
      texture: THREE.Texture;
      pos: THREE.Vector3;
      health: number;
      maxHealth: number;
      currentCol: number;
      currentRow: number;
      animTimer: number;
      state: 'idle' | 'dash_far' | 'dash_close' | 'anticipate' | 'shoot';
      stateTimer: number;
      targetPos: THREE.Vector3;
      isDead: boolean;
      deathTimer: number;
      flashTimer: number;
      facingLeft: boolean;
    }
    let boss: BossEntity | null = null;
    let bossSpawned = false;

    const bossTexLoader = () => {
      const tex = textureLoader.load('https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png');
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(0.25, 0.5); // 4 columns, 2 rows
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    };

    const spawnBoss = () => {
      if (bossSpawned) return;
      bossSpawned = true;
      setBossActiveUI(true);

      const bTex = bossTexLoader();
      const bMat = new THREE.MeshStandardMaterial({
        map: bTex,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.2,
        shadowSide: THREE.DoubleSide
      });

      // Boss is a flying entity
      const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), bMat);
      const bX = playerPos.x;
      const bZ = playerPos.z - 8;
      bMesh.position.set(bX, 4.2, bZ);
      bMesh.scale.set(2.2, 2.2, 2.2);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      scene.add(bMesh);

      boss = {
        mesh: bMesh,
        texture: bTex,
        pos: new THREE.Vector3(bX, 4.2, bZ),
        health: 30,
        maxHealth: 30,
        currentCol: 0,
        currentRow: 0,
        animTimer: 0,
        state: 'idle',
        stateTimer: THREE.MathUtils.randFloat(1.5, 2.5),
        targetPos: new THREE.Vector3(bX, 4.2, bZ),
        isDead: false,
        deathTimer: 0,
        flashTimer: 0,
        facingLeft: false
      };

      setBossHP(30);
      setBossMaxHP(30);
      playSound('burst');
      addLog("👿 บอสผู้ทรงพลังปรากฏตัวแล้ว! ระวังลูกไฟระเบิดจากสรวงสวรรค์!", "info");
    };

    const launchFireball = (target: THREE.Vector3) => {
      if (!boss) return;

      target.y = 0.05;
      target.x = THREE.MathUtils.clamp(target.x, -24, 24);
      target.z = THREE.MathUtils.clamp(target.z, -24, 24);

      const fireGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const fireMat = new THREE.MeshBasicMaterial({
        color: 0xff3700,
        transparent: true,
        opacity: 0.95
      });
      const fMesh = new THREE.Mesh(fireGeo, fireMat);
      
      const start = boss.pos.clone();
      start.y += 1.0;
      fMesh.position.copy(start);
      scene.add(fMesh);

      const ringGeo = new THREE.RingGeometry(0.1, 1.5, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(target.x, 0.05, target.z);
      ringMesh.rotation.x = -Math.PI / 2;
      scene.add(ringMesh);

      fireballs.push({
        mesh: fMesh,
        startPos: start,
        targetPos: target,
        progress: 0,
        speed: 0.65, // takes approx 1.5s to crash
        indicatorRing: ringMesh,
        hasLanded: false
      });
    };

    const spawnEnemyFromAllDirections = () => {
      if (enemies.filter(e => !e.isDead).length >= 10) return; // Cap regular enemies for gameplay

      const angle = Math.random() * Math.PI * 2;
      const distance = THREE.MathUtils.randFloat(13, 19);
      let spawnX = playerPos.x + Math.cos(angle) * distance;
      let spawnZ = playerPos.z + Math.sin(angle) * distance;

      // Clamp within arena boundaries
      spawnX = THREE.MathUtils.clamp(spawnX, -22, 22);
      spawnZ = THREE.MathUtils.clamp(spawnZ, -22, 22);

      const eTex = enemyTexLoader();
      const eMat = new THREE.MeshStandardMaterial({
        map: eTex,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.1,
        shadowSide: THREE.DoubleSide
      });

      const eMesh = new THREE.Mesh(playerGeo, eMat);
      eMesh.position.set(spawnX, 1.82, spawnZ);
      eMesh.scale.set(1.3, 1.3, 1.3);
      eMesh.castShadow = true;
      eMesh.receiveShadow = true;
      scene.add(eMesh);

      enemies.push({
        id: Math.random().toString(),
        mesh: eMesh,
        texture: eTex,
        pos: new THREE.Vector3(spawnX, 1.82, spawnZ),
        currentCol: 0,
        currentRow: 0,
        animTimer: 0,
        health: 2,
        isKnockedBack: false,
        knockbackDir: new THREE.Vector3(0, 0, 0),
        knockbackTimer: 0,
        knockbackSpeed: 0,
        isDead: false,
        deathTimer: 0,
        flashTimer: 0,
        flashState: false,
        attackCooldown: THREE.MathUtils.randFloat(0.5, 2.0),
        isAttacking: false,
        attackFlashTimer: 0
      });
    };

    // Helper to hit enemies
    const hitEnemy = (enemy: EnemyEntity) => {
      if (enemy.isDead) return;
      
      const kbDir = enemy.pos.clone().sub(playerPos).normalize();
      kbDir.y = 0;
      if (kbDir.lengthSq() === 0) {
        kbDir.set(facingLeft ? -1 : 1, 0, 0);
      }

      if (enemy.health === 2) {
        // First Hit
        enemy.health = 1;
        enemy.isKnockedBack = true;
        enemy.knockbackDir.copy(kbDir);
        enemy.knockbackSpeed = 14.0;
        enemy.knockbackTimer = 0.28;
        enemy.flashTimer = 0.25; // Brief flash white
        playSound('hit');
        addLog("โจมตีโดนศัตรู! ศัตรูกระเด็นถอยหลัง 💥", "attack");
      } else if (enemy.health === 1) {
        // Second Hit -> DEAD!
        enemy.health = 0;
        enemy.isDead = true;
        enemy.deathTimer = 0.8;
        
        // Throw away up and back!
        enemy.knockbackDir.copy(kbDir);
        enemy.knockbackDir.y = 1.0; // Fly up
        enemy.knockbackDir.normalize();
        enemy.knockbackSpeed = 24.0;
        enemy.flashTimer = 0.8;
        
        playSound('burst');
        addLog("คอมโบโจมตีครั้งที่สอง! ศัตรูกระเด็นหายไปอย่างรุนแรง 🌀✨", "attack");
        
        score += 100;
        setPlayerScore(score);

        defeatedEnemiesCount++;
        addLog(`⚔️ ปราบศัตรูสะสม: ${defeatedEnemiesCount} / 10 ตัว`, "info");
        if (defeatedEnemiesCount >= 10 && !bossSpawned) {
          spawnBoss();
        }

        // 45% chance to drop a recovery item (20% for Health Potion, 25% for Mana Potion)
        const randDrop = Math.random();
        if (randDrop < 0.20) {
          spawnPotion(enemy.pos.x, enemy.pos.z);
          addLog("💊 ศัตรูทำไอเทมยาฟื้นพลังชีวิต (POTION) ตกหล่นบนพื้น!", "info");
        } else if (randDrop < 0.45) {
          spawnMana(enemy.pos.x, enemy.pos.z);
          addLog("🧪 ศัตรูทำไอเทมขวดฟื้นมานา (MANA POTION) ตกหล่นบนพื้น!", "info");
        }
      }
    };

    const spawnWarpPortal = (x: number, z: number) => {
      const portalGeo = new THREE.TorusGeometry(1.2, 0.22, 16, 100);
      const portalMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 3.5,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const portalMesh = new THREE.Mesh(portalGeo, portalMat);
      portalMesh.position.set(x, 0.05, z); // spawn flat on the ground
      portalMesh.rotation.x = Math.PI / 2; // lie flat like a beautiful glowing pad
      portalMesh.castShadow = true;
      portalMesh.receiveShadow = true;
      scene.add(portalMesh);

      warpPortal = {
        mesh: portalMesh,
        pos: new THREE.Vector3(x, 0.05, z),
        active: true
      };
    };

    const hitBoss = (damage: number) => {
      if (!boss || boss.isDead) return;

      boss.health -= damage;
      boss.flashTimer = 0.25; // brief white flash on damage
      setBossHP(Math.max(0, boss.health));

      playSound('hit');
      addLog(`⚔️ โจมตีโดนบอส! ลดพลังชีวิตบอสลง (${Math.max(0, boss.health)}/30) 💥`, "attack");

      if (boss.health <= 0) {
        boss.isDead = true;
        boss.deathTimer = 1.8;
        setBossActiveUI(false);
        playSound('burst');
        addLog("🎉 สำเร็จ! ฮีโร่ปราบ Boss ทลายสังเวียน! ประตูวาร์ป (WARP PORTAL) เปิดแล้ว!", "info");
        spawnWarpPortal(boss.pos.x, boss.pos.z);
        spawnNpc(boss.pos.x, boss.pos.z - 4);

        // Spawn victory health and mana potions around Boss position!
        spawnPotion(boss.pos.x - 1.5, boss.pos.z - 1.5);
        spawnMana(boss.pos.x + 1.5, boss.pos.z - 1.5);
        spawnPotion(boss.pos.x, boss.pos.z + 1.5);
        spawnMana(boss.pos.x - 1.5, boss.pos.z + 1.5);
        addLog("💊 บอสถูกกำจัด! ค้นพบขวดยาฟื้นฟูพลังชีวิตและขวดมานาขนาดใหญ่รวม 4 ขวดตกอยู่รอบสังเวียน!", "info");
      }
    };

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameIsOver) return;
      
      const k = e.key.toLowerCase();
      if (k in keys) {
        keys[k as keyof typeof keys] = true;
        // Update reactive React UI states
        setPressedKeys(prev => {
          const mappedKey = e.key === 'p' || e.key === 'P' ? 'P' :
                            e.key === 'o' || e.key === 'O' ? 'O' :
                            e.key.length === 1 ? e.key.toUpperCase() : e.key;
          return { ...prev, [mappedKey]: true };
        });
      }

      // Attack trigger: 'P'
      if (k === 'p' && !isAttacking) {
        isAttacking = true;
        attackTimer = 0;
        currentRow = 2; // Row 3 (Index 2): Attack animation row
        currentCol = 0;
        playSound('shoot');
        addLog(`โจมตีรวดเร็วด้วยหมัดเปล่า! [P]`, 'attack');

        // Spawn a glowing amber Hit Box Arc in front of player
        const arcGeo = new THREE.RingGeometry(1.2, 1.6, 16, 1, 0, Math.PI);
        const arcMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9
        });
        const arc = new THREE.Mesh(arcGeo, arcMat);
        
        // Place slash arc based on facing direction
        const offsetDist = 1.2;
        const lookAngle = facingLeft ? Math.PI : 0;
        arc.position.set(
          playerPos.x + (facingLeft ? -offsetDist : offsetDist),
          playerPos.y,
          playerPos.z + 0.1
        );
        arc.rotation.y = lookAngle;
        arc.rotation.x = Math.PI / 2; // Flat on player hands height
        scene.add(arc);
        activeHitboxes.push({ mesh: arc, age: 0, maxAge: 12 });

        // Check for hits
        enemies.forEach(enemy => {
          if (enemy.isDead) return;
          const dist = playerPos.distanceTo(enemy.pos);
          if (dist < 2.5) {
            const inFront = facingLeft ? (enemy.pos.x < playerPos.x) : (enemy.pos.x > playerPos.x);
            if (inFront || dist < 1.3) {
              hitEnemy(enemy);
            }
          }
        });

        // Check for hits on Boss
        if (boss && !boss.isDead) {
          const dist = playerPos.distanceTo(boss.pos);
          if (dist < 3.5) {
            const inFront = facingLeft ? (boss.pos.x < playerPos.x) : (boss.pos.x > playerPos.x);
            if (inFront || dist < 1.8) {
              hitBoss(1);
            }
          }
        }
      }

      // Special Burst Class Skill: 'O'
      if (k === 'o') {
        if (currentMP < 25) {
          playSound('move');
          addLog("⚠️ พลังเวท (MP) ไม่เพียงพอในการร่ายสกิล! (ต้องการ 25 MP - ฟื้นฟูอัตโนมัติ)", "info");
          return;
        }

        // Deduct mana synchronously
        currentMP -= 25;
        setPlayerMP(Math.floor(currentMP));

        if (selectedClass.id === 'warrior') {
          // 🛡️ Vanguard: Iron Fortress & Aegis Pulse (Radial AOE defensive-offensive burst!)
          shieldActiveTimer = 5.0;
          playSound('burst');
          addLog("🛡️ Vanguard ปลดปล่อยคลื่นโล่เทพเจ้า [Iron Fortress & Aegis Pulse] สร้างเกราะบาเรีย 100% พร้อมคลื่นผลักกระแทกศัตรูรอบตัวรัศมี 6 เมตร!", "skill");
          
          if (shieldMesh) {
            scene.remove(shieldMesh);
            disposeObject(shieldMesh);
          }

          // Create a grouped multi-layered shield
          const shieldGroup = new THREE.Group();

          // Inner pulsing energy sphere
          const innerGeo = new THREE.SphereGeometry(1.3, 24, 12);
          const innerMat = new THREE.MeshStandardMaterial({
            color: 0xfacc15,
            emissive: 0xeab308,
            emissiveIntensity: 1.8,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1
          });
          const innerMesh = new THREE.Mesh(innerGeo, innerMat);
          innerMesh.name = "inner";
          shieldGroup.add(innerMesh);

          // Outer orbiting forcefield wireframe
          const outerGeo = new THREE.SphereGeometry(1.65, 12, 6);
          const outerMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xf97316,
            emissiveIntensity: 3.5,
            transparent: true,
            opacity: 0.55,
            wireframe: true
          });
          const outerMesh = new THREE.Mesh(outerGeo, outerMat);
          outerMesh.name = "outer";
          shieldGroup.add(outerMesh);

          // Glowing floor runic ring
          const runeGeo = new THREE.RingGeometry(0.1, 1.8, 32);
          const runeMat = new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide
          });
          const runeMesh = new THREE.Mesh(runeGeo, runeMat);
          runeMesh.rotation.x = -Math.PI / 2;
          runeMesh.position.y = -0.38;
          runeMesh.name = "rune";
          shieldGroup.add(runeMesh);

          shieldGroup.position.copy(playerPos);
          shieldGroup.position.y = playerPos.y + 0.4;
          scene.add(shieldGroup);
          shieldMesh = shieldGroup;

          // Aegis Pulse Radial Shockwave Ring
          const pulseGeo = new THREE.RingGeometry(0.1, 0.4, 32);
          const pulseMat = new THREE.MeshStandardMaterial({
            color: 0xeab308,
            emissive: 0xfacc15,
            emissiveIntensity: 3.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
          });
          const pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
          pulseRing.rotation.x = -Math.PI / 2;
          pulseRing.position.set(playerPos.x, 0.05, playerPos.z);
          scene.add(pulseRing);
          activeRings.push({
            mesh: pulseRing,
            scale: 0.2,
            opacity: 0.9,
            maxScale: 15.0 // Expands to 6 meters
          });

          // Actively damage & knock back all enemies around the player
          enemies.forEach(enemy => {
            if (enemy.isDead) return;
            const dist = playerPos.distanceTo(enemy.pos);
            if (dist < 6.0) {
              hitEnemy(enemy);
              // Powerful knockback
              const pushDir = enemy.pos.clone().sub(playerPos).setY(0).normalize();
              enemy.pos.addScaledVector(pushDir, 4.5);
              enemy.mesh.position.copy(enemy.pos);
            }
          });

          if (boss && !boss.isDead) {
            const dist = playerPos.distanceTo(boss.pos);
            if (dist < 6.0) {
              hitBoss(2); // Knockback-immune but takes extra damage
            }
          }

        } else if (selectedClass.id === 'mage') {
          // ☄️ Aether Mage: Supernova Strike (Centered around the player - Radial AOE!)
          playSound('burst');
          addLog("☄️ Aether Mage ระเบิดพลังจิตดวงดาว [Aether Supernova Burst] มหาเวทวงแหวนดวงดาวถล่มรอบตัวรัศมี 7 เมตร!", "skill");

          const targetPos = new THREE.Vector3(playerPos.x, 0.05, playerPos.z);
          const startPos = new THREE.Vector3(targetPos.x - 2.5, 16.0, targetPos.z - 2.5); // Descend straight onto the player

          // Meteor sphere
          const meteorGeo = new THREE.SphereGeometry(1.2, 16, 16); // Slightly bigger
          const meteorMat = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6, // Purple
            emissive: 0xd946ef, // Glowing magenta
            emissiveIntensity: 4.5,
            roughness: 0.1,
            metalness: 0.8
          });
          const mMesh = new THREE.Mesh(meteorGeo, meteorMat);
          mMesh.position.copy(startPos);
          mMesh.castShadow = true;
          scene.add(mMesh);

          // Spawn ground indicator ring for blast radius centered on player
          const indGeo = new THREE.RingGeometry(0.1, 7.0, 32); // Radius 7.0
          const indMat = new THREE.MeshBasicMaterial({ color: 0xd946ef, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
          const indMesh = new THREE.Mesh(indGeo, indMat);
          indMesh.position.copy(targetPos);
          indMesh.rotation.x = -Math.PI / 2;
          scene.add(indMesh);
          
          activeRings.push({
            mesh: indMesh,
            scale: 1.0,
            opacity: 0.45,
            maxScale: 1.0
          });

          activeMeteors.push({
            mesh: mMesh,
            pos: startPos.clone(),
            targetPos: targetPos.clone(),
            progress: 0.0,
            speed: 1.8, // Descends in approx 0.55 seconds for punchy response
            explosionRadius: 7.0 // Bigger AOE radius!
          });

        } else if (selectedClass.id === 'assassin') {
          // 👤 Shadow Blade: Void Tempest Slash (Radial AOE!)
          playSound('burst');
          addLog("👤 [Void Tempest Slash] มหาสกิลร่ายระเบิดคลื่นดาบเงาทมิฬรอบตัวรัศมี 6 เมตร ฉีกกระชากวิญญาณศัตรู!", "skill");

          // 1. Create elegant purple ground shadow ring that expands
          const enterRingGeo = new THREE.RingGeometry(0.1, 0.4, 32);
          const enterRingMat = new THREE.MeshBasicMaterial({ color: 0x701a75, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
          const enterRing = new THREE.Mesh(enterRingGeo, enterRingMat);
          enterRing.rotation.x = -Math.PI / 2;
          enterRing.position.set(playerPos.x, 0.05, playerPos.z);
          scene.add(enterRing);
          activeRings.push({ mesh: enterRing, scale: 0.2, opacity: 0.9, maxScale: 15.0 }); // Massive expansion

          // 2. Vertical rising shadow rift beam
          const enterBeamGeo = new THREE.CylinderGeometry(0.1, 1.2, 5.5, 16, 1, true);
          const enterBeamMat = new THREE.MeshBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
          const enterBeam = new THREE.Mesh(enterBeamGeo, enterBeamMat);
          enterBeam.position.set(playerPos.x, 2.0, playerPos.z);
          scene.add(enterBeam);
          activeRings.push({ mesh: enterBeam, scale: 0.2, opacity: 0.85, maxScale: 8.0 });

          // 3. Instant direct damage to all enemies in 6.0 radius
          const aoeRadius = 6.0;
          enemies.forEach(enemy => {
            if (enemy.isDead) return;
            const dist = playerPos.distanceTo(enemy.pos);
            if (dist < aoeRadius) {
              hitEnemy(enemy);
              hitEnemy(enemy); // Double strike!
              
              // Draw visual hit spark on the enemy
              const sparkGeo = new THREE.RingGeometry(0.1, 0.6, 8);
              const sparkMat = new THREE.MeshBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 1 });
              const spark = new THREE.Mesh(sparkGeo, sparkMat);
              spark.rotation.x = -Math.PI / 2;
              spark.position.set(enemy.pos.x, 0.1, enemy.pos.z);
              scene.add(spark);
              activeRings.push({ mesh: spark, scale: 0.2, opacity: 1, maxScale: 3.5 });
            }
          });

          if (boss && !boss.isDead) {
            const dist = playerPos.distanceTo(boss.pos);
            if (dist < aoeRadius) {
              hitBoss(6); // Direct heavy chunk damage to Boss
              addLog("👤 [Void Tempest Slash] เผาผลาญเงามืดคุกคาม Boss! กรีดดาบเงาทะลวงเกราะบอสสำเร็จ (ลดพลังบอส 6 หน่วย) 🗡️⚡", "skill");
            }
          }

          // 4. Spawn 8 shadow crescent daggers shooting outwards in 360 degrees
          for (let i = 0; i < 8; i++) {
            const angle = i * (Math.PI / 4);
            const shotDir = new THREE.Vector3(Math.cos(angle), 0.0, Math.sin(angle));

            const daggerGroup = new THREE.Group();
            
            // Crescent dagger geometry (flat sharp diamond)
            const dGeo = new THREE.ConeGeometry(0.18, 1.4, 4);
            dGeo.rotateX(Math.PI / 2); // align to Z axis
            const dMat = new THREE.MeshStandardMaterial({
              color: 0x4a044e, // deep dark purple
              emissive: 0xd946ef, // bright magenta edge
              emissiveIntensity: 3.5,
              roughness: 0.1
            });
            const dMesh = new THREE.Mesh(dGeo, dMat);
            dMesh.name = "core";
            daggerGroup.add(dMesh);

            daggerGroup.position.set(playerPos.x, playerPos.y + 0.4, playerPos.z);
            daggerGroup.lookAt(playerPos.clone().add(shotDir));
            scene.add(daggerGroup);

            activeWindArrows.push({
              mesh: daggerGroup,
              pos: daggerGroup.position.clone(),
              dir: shotDir,
              speed: 18.0,
              age: 0.0,
              maxAge: 1.8
            });
          }

        } else if (selectedClass.id === 'ranger') {
          // 🏹 Windrunner: Cyclone Tempest (Radial 360-degree AOE Arrow Storm!)
          playSound('shoot');
          addLog("🏹 Windrunner น้าวคันศรร่ายพายุม้วนหัวหมุน [Cyclone Tempest Storm] ปลดปล่อยศรพายุสลาตัน 12 ทิศทางกวาดล้างรอบตัว!", "skill");

          // 1. Create a beautiful green emerald gale shockwave ring on the floor
          const galeRingGeo = new THREE.RingGeometry(0.1, 0.4, 32);
          const galeRingMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x34d399,
            emissiveIntensity: 3.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
          });
          const galeRing = new THREE.Mesh(galeRingGeo, galeRingMat);
          galeRing.rotation.x = -Math.PI / 2;
          galeRing.position.set(playerPos.x, 0.05, playerPos.z);
          scene.add(galeRing);
          activeRings.push({
            mesh: galeRing,
            scale: 0.2,
            opacity: 0.9,
            maxScale: 14.5
          });

          // 2. Spawn 12 wind arrows shooting outwards radially in 360 degrees
          for (let i = 0; i < 12; i++) {
            const angle = i * (Math.PI / 6); // 12 arrows, spaced 30 degrees apart
            const shotDir = new THREE.Vector3(Math.cos(angle), 0.0, Math.sin(angle));

            const arrowGroup = new THREE.Group();

            // Core sharp emerald bolt
            const arrowGeo = new THREE.CylinderGeometry(0.04, 0.22, 2.5, 8);
            arrowGeo.rotateX(Math.PI / 2);
            const arrowMat = new THREE.MeshStandardMaterial({
              color: 0x059669,
              emissive: 0x10b981,
              emissiveIntensity: 2.5
            });
            const coreMesh = new THREE.Mesh(arrowGeo, arrowMat);
            coreMesh.name = "core";
            arrowGroup.add(coreMesh);

            // Outer wind drilling wireframe helix
            const helixGeo = new THREE.CylinderGeometry(0.4, 0.1, 2.8, 8, 4, true);
            helixGeo.rotateX(Math.PI / 2);
            const helixMat = new THREE.MeshStandardMaterial({
              color: 0x34d399,
              emissive: 0x059669,
              emissiveIntensity: 3.5,
              wireframe: true,
              transparent: true,
              opacity: 0.7
            });
            const helixMesh = new THREE.Mesh(helixGeo, helixMat);
            helixMesh.name = "helix";
            arrowGroup.add(helixMesh);

            // Back trail vortex ring
            const trailGeo = new THREE.TorusGeometry(0.5, 0.06, 8, 24);
            const trailMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.8
            });
            const trailMesh = new THREE.Mesh(trailGeo, trailMat);
            trailMesh.position.z = -1.2;
            trailMesh.name = "trail";
            arrowGroup.add(trailMesh);

            arrowGroup.position.set(playerPos.x, playerPos.y + 0.4, playerPos.z);
            arrowGroup.lookAt(playerPos.clone().add(shotDir));
            scene.add(arrowGroup);

            activeWindArrows.push({
              mesh: arrowGroup,
              pos: arrowGroup.position.clone(),
              dir: shotDir,
              speed: 21.0,
              age: 0.0,
              maxAge: 2.5
            });
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in keys) {
        keys[k as keyof typeof keys] = false;
        setPressedKeys(prev => {
          const mappedKey = e.key === 'p' || e.key === 'P' ? 'P' :
                            e.key === 'o' || e.key === 'O' ? 'O' :
                            e.key.length === 1 ? e.key.toUpperCase() : e.key;
          return { ...prev, [mappedKey]: false };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Track FPS & Game loops
    let lastTime = performance.now();
    let frameCount = 0;
    let clock = new THREE.Clock();
    let animSpeedMultiplier = 1;

    // Game loop inside requestAnimationFrame
    let animationFrameId: number;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);

      // Measure FPS
      frameCount++;
      const time = performance.now();
      if (time >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }

      const delta = clock.getDelta();

      // Read combined inputs (WASD & Arrows) for 8-directional movement
      let dx = 0;
      let dz = 0;

      if (!gameIsOver) {
        if (keys.w || keys.arrowup) dz -= 1;
        if (keys.s || keys.arrowdown) dz += 1;
        if (keys.a || keys.arrowleft) dx -= 1;
        if (keys.d || keys.arrowright) dx += 1;
      }

      // Class-specific movement stats - balanced and smooth (no longer hyper-fast)
      const classSpeed = 5.5 + (selectedClass.stats.speed / 18); // Vanguard: ~7.7, Shadow Blade: ~10.8 units/sec
      const speed = classSpeed * (dz !== 0 && dx !== 0 ? 0.7071 : 1.0); // Normalize diagonal speed!

      let moving = false;
      let activeDirLabel = '';

      if (dx !== 0 || dz !== 0) {
        playerPos.x += dx * speed * delta;
        playerPos.z += dz * speed * delta;
        moving = true;

        // Set facing direction
        if (dx < 0) facingLeft = true;
        if (dx > 0) facingLeft = false;

        // Calculate Direction Text HUD
        if (dz < 0 && dx === 0) activeDirLabel = 'NORTH (หลังตรง)';
        else if (dz > 0 && dx === 0) activeDirLabel = 'SOUTH (หน้าตรง)';
        else if (dz === 0 && dx < 0) activeDirLabel = 'WEST (ซ้าย)';
        else if (dz === 0 && dx > 0) activeDirLabel = 'EAST (ขวา)';
        else if (dz < 0 && dx < 0) activeDirLabel = 'NORTH-WEST (เฉียงบนซ้าย)';
        else if (dz < 0 && dx > 0) activeDirLabel = 'NORTH-EAST (เฉียงบนขวา)';
        else if (dz > 0 && dx < 0) activeDirLabel = 'SOUTH-WEST (เฉียงล่างซ้าย)';
        else if (dz > 0 && dx > 0) activeDirLabel = 'SOUTH-EAST (เฉียงล่างขวา)';

        setDirectionLabel(activeDirLabel);

        // Rare step sounds
        if (Math.random() < 0.08) {
          playSound('move');
        }
      }

      // Passive MP Regen (+4 per second)
      if (!gameIsOver && currentMP < 100) {
        currentMP = Math.min(100, currentMP + delta * 4);
        setPlayerMP(Math.floor(currentMP));
      }

      // Arena boundary lock
      playerPos.x = THREE.MathUtils.clamp(playerPos.x, -24.5, 24.5);
      playerPos.z = THREE.MathUtils.clamp(playerPos.z, -24.5, 24.5);

      // Update player 3D mesh position
      playerMesh.position.copy(playerPos);
      playerLight.position.set(playerPos.x, playerPos.y + 0.5, playerPos.z);

      // Update Coordinates HUD
      setCoords({ x: parseFloat(playerPos.x.toFixed(2)), z: parseFloat(playerPos.z.toFixed(2)) });

      // Handle custom 8-directional Billboard sprite sheets
      if (isAttacking) {
        setCurrentActionState('ATTACK');
        currentRow = 2; // Row index 2: Attack
        animTimer += delta;
        
        // Very fast framing speed for attack punch triggers
        const frameInterval = attackAnimSpeed; 
        if (animTimer >= frameInterval) {
          animTimer = 0;
          currentCol++;
          if (currentCol > 3) {
            // End of Attack anim sequence
            isAttacking = false;
            currentCol = 0;
            currentRow = 0; // return to idle
          }
        }
      } else if (moving) {
        setCurrentActionState('WALKING');
        currentRow = 1; // Row index 1: Walk
        animTimer += delta;
        const frameInterval = 0.12; // Standard walking frame swap interval
        if (animTimer >= frameInterval) {
          animTimer = 0;
          currentCol = (currentCol + 1) % 4;
        }
      } else {
        // Character standing still -> Idle (or automatic dance if lazy!)
        currentRow = 0;
        setCurrentActionState('IDLE');
        animTimer += delta;
        const frameInterval = 0.18;
        if (animTimer >= frameInterval) {
          animTimer = 0;
          currentCol = (currentCol + 1) % 4;
        }
      }

      // Set Sprite Texture offsets (U, V mapping)
      // Columns are left-to-right (0..3) -> mapped to offset.x (0, 0.25, 0.5, 0.75)
      // Rows are top-to-bottom (0..3) -> mapped to offset.y from top down.
      // Top row index 0 -> offset.y = 0.75
      // Second row index 1 -> offset.y = 0.50
      // Third row index 2 -> offset.y = 0.25
      // Bottom row index 3 -> offset.y = 0.00
      playerTex.offset.x = currentCol * 0.25;
      playerTex.offset.y = (3 - currentRow) * 0.25;

      // Handle horizontal mirroring for 2D facing directions
      playerMesh.scale.x = facingLeft ? -1.3 : 1.3;
      playerMesh.scale.y = 1.3;

      // Force 2D Plane Billboard to face the active camera angle upright on the ground plane (no leaning back)
      const playerAngle = Math.atan2(camera.position.x - playerMesh.position.x, camera.position.z - playerMesh.position.z);
      playerMesh.rotation.set(0, playerAngle, 0);

      // Smooth lerping Camera following behind player - elevated high-angle perspective for tactical RPG view
      const camTargetOffset = new THREE.Vector3(playerPos.x, playerPos.y + 13.5, playerPos.z + 9.5);
      camera.position.lerp(camTargetOffset, 0.08);
      // Look slightly above the player's feet (approx chest height) for a better framing
      const cameraLookAtTarget = new THREE.Vector3(playerPos.x, playerPos.y + 0.6, playerPos.z);
      camera.lookAt(cameraLookAtTarget);

      // Spin crystal cones for sci-fi atmosphere
      crystals.forEach((cry, idx) => {
        cry.rotation.y += delta * 0.8;
        cry.position.y = 1.5 + Math.sin(clock.getElapsedTime() + idx) * 0.2;
      });

      // Player Invincibility frame animation
      if (invincibilityTimer > 0) {
        invincibilityTimer -= delta;
        const blink = Math.floor(clock.getElapsedTime() * 15) % 2 === 0;
        playerMat.opacity = blink ? 0.35 : 1.0;
        if (invincibilityTimer <= 0) {
          playerMat.opacity = 1.0;
        }
      }

      // ----------------------------------------------------
      // UPDATE POTIONS (Collection and Floating Animation)
      // ----------------------------------------------------
      for (let i = potions.length - 1; i >= 0; i--) {
        const pot = potions[i];
        pot.mesh.position.y = 1.0 + Math.sin(clock.getElapsedTime() * 4 + i) * 0.15;
        
        // Force potions to stand upright facing the camera
        const potAngle = Math.atan2(camera.position.x - pot.mesh.position.x, camera.position.z - pot.mesh.position.z);
        pot.mesh.rotation.set(0, potAngle, 0);

        const distToPlayer = playerPos.distanceTo(pot.pos);
        if (distToPlayer < 1.4 && !gameIsOver) {
          scene.remove(pot.mesh);
          pot.mesh.geometry.dispose();
          if (Array.isArray(pot.mesh.material)) pot.mesh.material.forEach(m => m.dispose());
          else pot.mesh.material.dispose();
          potions.splice(i, 1);

          if (playerLives < 5) {
            playerLives++;
            setPlayerLives(playerLives);
            setPlayerHP(playerLives * 20);
            addLog("💊 เก็บยาเติมพลังสำเร็จ! ฟื้นฟูพลังชีวิต (+1 Heart)", "info");
          } else {
            addLog("💊 เก็บยาเติมพลัง! (พลังชีวิตเต็ม ได้โบนัสคะแนน +50)", "info");
            score += 50;
            setPlayerScore(score);
          }
          playSound('hit');

          setTimeout(() => {
            if (!gameIsOver) {
              spawnPotion(
                THREE.MathUtils.randFloat(-22, 22),
                THREE.MathUtils.randFloat(-22, 22)
              );
            }
          }, THREE.MathUtils.randFloat(4000, 8000));
        }
      }

      // ----------------------------------------------------
      // UPDATE MANA POTIONS (Collection and Floating Animation)
      // ----------------------------------------------------
      for (let i = manas.length - 1; i >= 0; i--) {
        const mana = manas[i];
        mana.mesh.position.y = 1.0 + Math.sin(clock.getElapsedTime() * 4.5 + i) * 0.15;
        
        // Force mana potions to stand upright facing the camera
        const manaAngle = Math.atan2(camera.position.x - mana.mesh.position.x, camera.position.z - mana.mesh.position.z);
        mana.mesh.rotation.set(0, manaAngle, 0);

        const distToPlayer = playerPos.distanceTo(mana.pos);
        if (distToPlayer < 1.4 && !gameIsOver) {
          scene.remove(mana.mesh);
          mana.mesh.geometry.dispose();
          if (Array.isArray(mana.mesh.material)) mana.mesh.material.forEach(m => m.dispose());
          else mana.mesh.material.dispose();
          manas.splice(i, 1);

          if (currentMP < 100) {
            currentMP = Math.min(100, currentMP + 35);
            setPlayerMP(Math.floor(currentMP));
            addLog("🧪 เก็บขวดฟื้นมานาสำเร็จ! ฟื้นฟูพลังเวท (+35 MP) ⚡✨", "info");
          } else {
            addLog("🧪 เก็บขวดฟื้นมานา! (มานาเต็มแล้ว ได้โบนัสคะแนน +50)", "info");
            score += 50;
            setPlayerScore(score);
          }
          playSound('hit');

          setTimeout(() => {
            if (!gameIsOver) {
              spawnMana(
                THREE.MathUtils.randFloat(-22, 22),
                THREE.MathUtils.randFloat(-22, 22)
              );
            }
          }, THREE.MathUtils.randFloat(4000, 8000));
        }
      }

      // ----------------------------------------------------
      // UPDATE ENEMIES (Periodic Spawner every 1-3 seconds)
      // ----------------------------------------------------
      if (!gameIsOver) {
        enemySpawnTimer += delta;
        if (enemySpawnTimer >= nextEnemySpawnDelay) {
          enemySpawnTimer = 0;
          nextEnemySpawnDelay = THREE.MathUtils.randFloat(1.0, 3.0);
          spawnEnemyFromAllDirections();
        }
      }

      // Keep spawning if count is extremely low
      if (enemies.filter(e => !e.isDead).length < 2 && !gameIsOver) {
        spawnEnemyFromAllDirections();
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        if (enemy.isDead) {
          enemy.deathTimer -= delta;
          enemy.pos.addScaledVector(enemy.knockbackDir, enemy.knockbackSpeed * delta);
          enemy.knockbackSpeed = Math.max(0, enemy.knockbackSpeed - delta * 25);
          enemy.mesh.rotation.z += delta * 12;
          enemy.mesh.position.copy(enemy.pos);

          const isFlash = Math.floor(clock.getElapsedTime() * 25) % 2 === 0;
          if (enemy.mesh.material instanceof THREE.MeshStandardMaterial) {
            enemy.mesh.material.opacity = isFlash ? 0.2 : 0.8;
            enemy.mesh.material.emissive.setHex(0xffffff);
            enemy.mesh.material.emissiveIntensity = isFlash ? 3.0 : 0.5;
          }

          if (enemy.deathTimer <= 0) {
            scene.remove(enemy.mesh);
            enemy.mesh.geometry.dispose();
            if (Array.isArray(enemy.mesh.material)) enemy.mesh.material.forEach(m => m.dispose());
            else enemy.mesh.material.dispose();
            enemies.splice(i, 1);
          }
          continue;
        }

        // Force alive enemies to stand upright facing the camera
        const enemyAngle = Math.atan2(camera.position.x - enemy.mesh.position.x, camera.position.z - enemy.mesh.position.z);
        enemy.mesh.rotation.set(0, enemyAngle, 0);

        if (enemy.flashTimer > 0) {
          enemy.flashTimer -= delta;
          if (enemy.mesh.material instanceof THREE.MeshStandardMaterial) {
            enemy.mesh.material.emissive.setHex(0xffffff);
            enemy.mesh.material.emissiveIntensity = 2.0;
          }
          if (enemy.flashTimer <= 0) {
            if (enemy.mesh.material instanceof THREE.MeshStandardMaterial) {
              enemy.mesh.material.emissive.setHex(0x000000);
              enemy.mesh.material.emissiveIntensity = 0;
            }
          }
        }

        if (enemy.isAttacking) {
          enemy.attackFlashTimer -= delta;
          if (enemy.mesh.material instanceof THREE.MeshStandardMaterial) {
            enemy.mesh.material.color.setHex(0xff3333);
            enemy.mesh.material.emissive.setHex(0xff0000);
            enemy.mesh.material.emissiveIntensity = 1.5;
          }
          if (enemy.attackFlashTimer <= 0) {
            enemy.isAttacking = false;
            if (enemy.mesh.material instanceof THREE.MeshStandardMaterial) {
              enemy.mesh.material.color.setHex(0xffffff);
              enemy.mesh.material.emissive.setHex(0x000000);
              enemy.mesh.material.emissiveIntensity = 0;
            }
          }
        }

        if (enemy.isKnockedBack) {
          enemy.knockbackTimer -= delta;
          enemy.pos.addScaledVector(enemy.knockbackDir, enemy.knockbackSpeed * delta);
          enemy.knockbackSpeed = Math.max(0, enemy.knockbackSpeed - delta * 35);
          enemy.mesh.position.copy(enemy.pos);

          if (enemy.knockbackTimer <= 0) {
            enemy.isKnockedBack = false;
          }
        } else {
          const toPlayer = playerPos.clone().sub(enemy.pos);
          toPlayer.y = 0;
          const dist = toPlayer.length();

          if (dist > 1.2) {
            toPlayer.normalize();
            const enemySpeed = 2.4 + (selectedClass.name === 'Rogue' ? 0.6 : 0);
            enemy.pos.addScaledVector(toPlayer, enemySpeed * delta);
            enemy.mesh.position.copy(enemy.pos);

            enemy.currentRow = 1;
            enemy.animTimer += delta;
            if (enemy.animTimer >= 0.14) {
              enemy.animTimer = 0;
              enemy.currentCol = (enemy.currentCol + 1) % 4;
            }

            if (toPlayer.x > 0) {
              enemy.mesh.scale.x = 1.3;
            } else if (toPlayer.x < 0) {
              enemy.mesh.scale.x = -1.3;
            }
            enemy.mesh.scale.y = 1.3;
          } else {
            enemy.currentRow = 0;
            enemy.animTimer += delta;
            if (enemy.animTimer >= 0.18) {
              enemy.animTimer = 0;
              enemy.currentCol = (enemy.currentCol + 1) % 4;
            }

            if (enemy.attackCooldown <= 0 && !gameIsOver) {
              enemy.isAttacking = true;
              enemy.attackFlashTimer = 0.35;
              enemy.attackCooldown = 2.0;

              if (shieldActiveTimer > 0) {
                playSound('burst');
                addLog(`🛡️ [Iron Fortress] สะท้อนและปัดป้องการโจมตีจากระยะประชิดอย่างเด็ดขาด! สะท้อนความเสียหายฟันศัตรูคืน!`, 'skill');
                hitEnemy(enemy);
                invincibilityTimer = 0.35; // Brief iframe buffer
              } else if (invincibilityTimer <= 0) {
                playerLives--;
                setPlayerLives(playerLives);
                setPlayerHP(playerLives * 20);
                invincibilityTimer = 1.0;
                playSound('hit');
                addLog(`💥 โดนศัตรูจู่โจม! เสียพลังชีวิต (เหลือ ${playerLives}/5)`, 'move');

                if (playerLives <= 0) {
                  gameIsOver = true;
                  setIsGameOver(true);
                  setCurrentActionState('GAME OVER');
                  addLog("☠️ สิ้นชีพในการต่อสู้! เกมจบลงแล้ว (GAME OVER)", "info");
                }
              }
            }
          }

          if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= delta;
          }
        }

        enemy.texture.offset.x = enemy.currentCol * 0.25;
        enemy.texture.offset.y = (1 - enemy.currentRow) * 0.5;
      }

      // ----------------------------------------------------
      // UPDATE BOSS
      // ----------------------------------------------------
      if (boss) {
        boss.mesh.position.copy(boss.pos);
        
        // Force Boss Plane Billboard to face camera upright
        const bAngle = Math.atan2(camera.position.x - boss.mesh.position.x, camera.position.z - boss.mesh.position.z);
        boss.mesh.rotation.set(0, bAngle, 0);

        if (boss.isDead) {
          boss.deathTimer -= delta;
          boss.pos.y += delta * 1.5; // Float upwards on death
          boss.mesh.rotation.z += delta * 10;
          boss.mesh.position.copy(boss.pos);

          const isFlash = Math.floor(clock.getElapsedTime() * 25) % 2 === 0;
          if (boss.mesh.material instanceof THREE.MeshStandardMaterial) {
            boss.mesh.material.opacity = isFlash ? 0.1 : 0.7;
            boss.mesh.material.emissive.setHex(0xff0000);
            boss.mesh.material.emissiveIntensity = isFlash ? 4.0 : 0.8;
          }

          if (boss.deathTimer <= 0) {
            scene.remove(boss.mesh);
            boss.mesh.geometry.dispose();
            if (Array.isArray(boss.mesh.material)) boss.mesh.material.forEach(m => m.dispose());
            else boss.mesh.material.dispose();
            boss = null;
          }
        } else {
          // Normal alive Boss state machine
          boss.stateTimer -= delta;

          // Animations (sprite sheet update, 4 frames, 2 rows)
          boss.animTimer += delta;
          if (boss.animTimer >= 0.16) {
            boss.animTimer = 0;
            boss.currentCol = (boss.currentCol + 1) % 4;
          }

          // Handle flashTimer
          if (boss.flashTimer > 0) {
            boss.flashTimer -= delta;
            if (boss.mesh.material instanceof THREE.MeshStandardMaterial) {
              boss.mesh.material.emissive.setHex(0xffffff);
              boss.mesh.material.emissiveIntensity = 2.5;
            }
            if (boss.flashTimer <= 0) {
              if (boss.mesh.material instanceof THREE.MeshStandardMaterial) {
                boss.mesh.material.emissive.setHex(0x000000);
                boss.mesh.material.emissiveIntensity = 0;
              }
            }
          }

          // Boss State Transitions
          if (boss.stateTimer <= 0) {
            if (boss.state === 'idle') {
              const rand = Math.random();
              if (rand < 0.45) {
                boss.state = 'dash_close';
                const angle = Math.random() * Math.PI * 2;
                const dist = THREE.MathUtils.randFloat(4.0, 6.0);
                boss.targetPos.set(playerPos.x + Math.cos(angle) * dist, 4.2, playerPos.z + Math.sin(angle) * dist);
                boss.stateTimer = 0.8;
              } else if (rand < 0.85) {
                boss.state = 'dash_far';
                const angle = Math.random() * Math.PI * 2;
                const dist = THREE.MathUtils.randFloat(14.0, 18.0);
                boss.targetPos.set(playerPos.x + Math.cos(angle) * dist, 4.2, playerPos.z + Math.sin(angle) * dist);
                boss.stateTimer = 1.0;
              } else {
                boss.state = 'anticipate';
                boss.stateTimer = 1.2;
              }
            } else if (boss.state === 'dash_close' || boss.state === 'dash_far') {
              boss.state = 'anticipate';
              boss.stateTimer = 1.2;
            } else if (boss.state === 'anticipate') {
              boss.state = 'shoot';
              boss.stateTimer = 0.6;
              
              // Shoot Fireballs!
              launchFireball(playerPos.clone());
              launchFireball(playerPos.clone().add(new THREE.Vector3(THREE.MathUtils.randFloat(-4, 4), 0, THREE.MathUtils.randFloat(-4, 4))));
              launchFireball(playerPos.clone().add(new THREE.Vector3(THREE.MathUtils.randFloat(-4, 4), 0, THREE.MathUtils.randFloat(-4, 4))));
            } else if (boss.state === 'shoot') {
              boss.state = 'idle';
              boss.stateTimer = THREE.MathUtils.randFloat(1.5, 2.5);
              boss.mesh.scale.set(2.2, 2.2, 2.2);
            }
          }

          // Execute state behavior
          if (boss.state === 'dash_close' || boss.state === 'dash_far') {
            boss.pos.lerp(boss.targetPos, delta * 6.0);
            boss.currentRow = 1;
          } else if (boss.state === 'anticipate') {
            const scaleFactor = (1.0 + Math.sin(clock.getElapsedTime() * 15.0) * 0.35) * 2.2;
            boss.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
            boss.currentRow = 1;
          } else {
            boss.pos.y = 4.2 + Math.sin(clock.getElapsedTime() * 3.0) * 0.35;
            boss.currentRow = 0;
          }

          // Handle spritesheet offsets
          boss.texture.offset.x = boss.currentCol * 0.25;
          boss.texture.offset.y = (1 - boss.currentRow) * 0.5;
        }
      }

      // ----------------------------------------------------
      // UPDATE FIREBALLS
      // ----------------------------------------------------
      for (let i = fireballs.length - 1; i >= 0; i--) {
        const fb = fireballs[i];
        fb.progress += delta * fb.speed;

        if (fb.progress >= 1.0) {
          fb.progress = 1.0;
          fb.hasLanded = true;

          // Hit detection on Player
          const distToPlayer = playerPos.distanceTo(fb.targetPos);
          if (distToPlayer < 1.6 && !gameIsOver) {
            if (shieldActiveTimer > 0) {
              playSound('burst');
              addLog(`🛡️ [Iron Fortress] โล่บาเรียเหล็กสัจจะป้องกันการระเบิดของบอสได้อย่างราบคาบ พร้อมสะท้อนคืน 2 ดาเมจ!`, 'skill');
              hitBoss(2);
              invincibilityTimer = 0.35; // Brief iframe buffer
            } else if (invincibilityTimer <= 0) {
              playerLives--;
              setPlayerLives(playerLives);
              setPlayerHP(playerLives * 20);
              invincibilityTimer = 1.0;
              playSound('hit');
              addLog(`💥 โดนอุกกาบาตลูกไฟของบอส! พลังชีวิตลดลง (เหลือ ${playerLives}/5)`, 'move');

              if (playerLives <= 0) {
                gameIsOver = true;
                setIsGameOver(true);
                setCurrentActionState('GAME OVER');
                addLog("☠️ มอดไหม้ไปกับกองเพลิงอสูร! (GAME OVER)", "info");
              }
            }
          }

          // Create small explosion effect
          const expGeo = new THREE.SphereGeometry(1.6, 8, 8);
          const expMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.8
          });
          const expMesh = new THREE.Mesh(expGeo, expMat);
          expMesh.position.copy(fb.targetPos);
          scene.add(expMesh);

          setTimeout(() => {
            scene.remove(expMesh);
            expGeo.dispose();
            expMat.dispose();
          }, 300);

          // Clean up fireball
          scene.remove(fb.mesh);
          fb.mesh.geometry.dispose();
          if (Array.isArray(fb.mesh.material)) fb.mesh.material.forEach(m => m.dispose());
          else fb.mesh.material.dispose();

          scene.remove(fb.indicatorRing);
          fb.indicatorRing.geometry.dispose();
          if (Array.isArray(fb.indicatorRing.material)) fb.indicatorRing.material.forEach(m => m.dispose());
          else fb.indicatorRing.material.dispose();

          fireballs.splice(i, 1);
        } else {
          const currentX = THREE.MathUtils.lerp(fb.startPos.x, fb.targetPos.x, fb.progress);
          const currentZ = THREE.MathUtils.lerp(fb.startPos.z, fb.targetPos.z, fb.progress);
          const heightArc = Math.sin(fb.progress * Math.PI) * 12.0;
          const currentY = fb.startPos.y + heightArc;

          fb.mesh.position.set(currentX, currentY, currentZ);

          const blink = Math.floor(clock.getElapsedTime() * 15) % 2 === 0;
          if (fb.indicatorRing.material instanceof THREE.MeshBasicMaterial) {
            fb.indicatorRing.material.opacity = blink ? 0.3 : 0.8;
            const rScale = 0.8 + fb.progress * 0.4;
            fb.indicatorRing.scale.set(rScale, rScale, 1);
          }
        }
      }

      // ----------------------------------------------------
      // UPDATE NPC
      // ----------------------------------------------------
      if (npc) {
        // Billboarding
        const npcAngle = Math.atan2(camera.position.x - npc.mesh.position.x, camera.position.z - npc.mesh.position.z);
        npc.mesh.rotation.set(0, npcAngle, 0);

        const distToPlayer = npc.pos.distanceTo(playerPos);

        if (distToPlayer > 2.2 && !dialogueTriggered && !gameIsOver) {
          // Walk towards player
          npc.isWalking = true;
          npc.currentRow = 1; // Walk row

          const npcSpeed = 3.0; // Moderate speed to walk towards player
          const dir = playerPos.clone().sub(npc.pos);
          dir.y = 0;
          dir.normalize();
          npc.pos.add(dir.multiplyScalar(delta * npcSpeed));
          npc.mesh.position.copy(npc.pos);

          npc.facingLeft = playerPos.x < npc.pos.x;
        } else {
          // Arrived! Idle
          npc.isWalking = false;
          npc.currentRow = 0; // Idle row

          // Trigger Dialogue automatically when close
          if (distToPlayer <= 2.3 && !dialogueTriggered && !gameIsOver) {
            dialogueTriggered = true;
            gameIsOver = true; // Stop play mode inputs/movement
            setIsDialogueActive(true);
            setDialogueStep(0);
            playSound('burst');
            addLog("🗣️ บทสนทนาระหว่างผู้กล้าและสหายต่างมิติเริ่มต้นขึ้น...", "info");
          }
        }

        // Animate columns (0..3)
        npc.animTimer += delta;
        const frameInterval = npc.isWalking ? 0.12 : 0.18;
        if (npc.animTimer >= frameInterval) {
          npc.animTimer = 0;
          npc.currentCol = (npc.currentCol + 1) % 4;
        }

        // Texture Mapping
        npc.texture.offset.x = npc.currentCol * 0.25;
        npc.texture.offset.y = (1 - npc.currentRow) * 0.5;

        // Sprite mirroring
        npc.mesh.scale.x = npc.facingLeft ? -1.3 : 1.3;
        npc.mesh.scale.y = 1.3;
      }

      // ----------------------------------------------------
      // UPDATE WARP PORTAL
      // ----------------------------------------------------
      if (warpPortal && warpPortal.active && !gameIsOver) {
        // Portal floating & rotating animation
        warpPortal.mesh.rotation.z += delta * 2.5;

        // Check player distance to warp portal
        const dist = playerPos.distanceTo(warpPortal.pos);
        if (dist < 1.6) {
          if (!dialogueTriggered) {
            // Trigger dialogue immediately by bringing NPC here!
            dialogueTriggered = true;
            gameIsOver = true;
            if (npc) {
              npc.pos.copy(playerPos).add(new THREE.Vector3(facingLeft ? -2.0 : 2.0, 0, 0));
              npc.mesh.position.copy(npc.pos);
              npc.facingLeft = !facingLeft;
            }
            setIsDialogueActive(true);
            setDialogueStep(0);
            playSound('burst');
            addLog("🗣️ ก้าวเข้าสู่มิติเวลา บทสนทนาระหว่างคุณและสหายพิทักษ์เริ่มขึ้น...", "info");
          } else {
            // Fallback clear
            gameIsOver = true;
            setIsGameClear(true);
            setCurrentActionState('VICTORY');
            playSound('burst');
          }
        }
      }

      // Animate active exploding Energy Rings
      for (let i = activeRings.length - 1; i >= 0; i--) {
        const r = activeRings[i];
        r.scale += delta * 12.0; // Fast neon shockwave speed
        r.opacity -= delta * 2.2; // Fade out slowly

        r.mesh.scale.set(r.scale, r.scale, r.scale);
        if (r.mesh.material instanceof THREE.Material) {
          r.mesh.material.opacity = Math.max(0, r.opacity);
        }

        // If ring fully faded or maximized, dismantle it safely from scene
        if (r.opacity <= 0 || r.scale >= r.maxScale) {
          scene.remove(r.mesh);
          r.mesh.geometry.dispose();
          if (Array.isArray(r.mesh.material)) {
            r.mesh.material.forEach(m => m.dispose());
          } else {
            r.mesh.material.dispose();
          }
          activeRings.splice(i, 1);
        }
      }

      // Update Warrior Shield Mesh position & animation
      if (shieldActiveTimer > 0) {
        shieldActiveTimer -= delta;
        if (shieldMesh) {
          shieldMesh.position.copy(playerPos);
          shieldMesh.position.y = playerPos.y + 0.4; // Center around player body

          // Retrieve and animate sub-meshes dynamically!
          const inner = shieldMesh.getObjectByName("inner");
          const outer = shieldMesh.getObjectByName("outer");
          const rune = shieldMesh.getObjectByName("rune");

          const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 7.5) * 0.08;

          if (inner) {
            inner.rotation.y -= delta * 1.5;
            inner.rotation.z += delta * 0.5;
            inner.scale.set(pulse, pulse, pulse);
          }
          if (outer) {
            outer.rotation.y += delta * 3.0;
            outer.rotation.x += delta * 1.5;
          }
          if (rune) {
            rune.rotation.z -= delta * 4.0;
            const runePulse = 1.0 + Math.sin(clock.getElapsedTime() * 7.5) * 0.15;
            rune.scale.set(runePulse, runePulse, 1);
          }
        }
        if (shieldActiveTimer <= 0) {
          if (shieldMesh) {
            scene.remove(shieldMesh);
            disposeObject(shieldMesh);
            shieldMesh = null;
            addLog("🛡️ โล่บาเรียเหล็กสัจจะ [Iron Fortress] ของ Vanguard สลายตัวไปแล้ว", "info");
          }
        }
      }

      // Update Falling Meteors (Aether Mage)
      for (let i = activeMeteors.length - 1; i >= 0; i--) {
        const met = activeMeteors[i];
        met.progress += delta * met.speed;
        
        // Animate rotational spin
        met.mesh.rotation.y += delta * 6;
        met.mesh.rotation.x += delta * 3;

        const currentPos = new THREE.Vector3().lerpVectors(met.pos, met.targetPos, met.progress);
        met.mesh.position.copy(currentPos);

        if (met.progress >= 1.0) {
          // Explode at destination!
          playSound('burst');
          
          // Elegant visual impact shockwave ring
          const ringGeo = new THREE.RingGeometry(0.1, 0.4, 32);
          const ringMat = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            emissive: 0x8b5cf6,
            emissiveIntensity: 2.5,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(met.targetPos.x, 0.05, met.targetPos.z);
          scene.add(ring);
          activeRings.push({
            mesh: ring,
            scale: 0.1,
            opacity: 1.0,
            maxScale: 11.5 // Massive supernova field!
          });

          // Elegant visual impact shockwave dome (half-sphere expanding)
          const domeGeo = new THREE.SphereGeometry(0.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
          const domeMat = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            emissive: 0xd946ef,
            emissiveIntensity: 3.5,
            transparent: true,
            opacity: 0.8,
            wireframe: true
          });
          const dome = new THREE.Mesh(domeGeo, domeMat);
          dome.position.set(met.targetPos.x, 0.02, met.targetPos.z);
          scene.add(dome);
          activeRings.push({
            mesh: dome,
            scale: 0.1,
            opacity: 0.8,
            maxScale: 6.5
          });

          // Hit detection
          enemies.forEach(enemy => {
            if (enemy.isDead) return;
            const dist = enemy.pos.distanceTo(met.targetPos);
            if (dist < met.explosionRadius) {
              hitEnemy(enemy);
            }
          });

          if (boss && !boss.isDead) {
            const dist = boss.pos.distanceTo(met.targetPos);
            if (dist < met.explosionRadius) {
              hitBoss(5); // Massive chunk damage!
            }
          }

          addLog("☄️ [Supernova Strike] ระเบิดดาวตกมิติกวาดล้างศัตรูทั้งระนาบอย่างรุนแรง! 💥💫", "skill");

          // Clean up meteor mesh
          scene.remove(met.mesh);
          disposeObject(met.mesh);
          activeMeteors.splice(i, 1);
        }
      }

      // Update Wind Projectiles (Windrunner)
      for (let i = activeWindArrows.length - 1; i >= 0; i--) {
        const arrow = activeWindArrows[i];
        arrow.age += delta;

        arrow.pos.addScaledVector(arrow.dir, arrow.speed * delta);
        arrow.mesh.position.copy(arrow.pos);

        // Retrieve and rotate sub-meshes of the arrow Group!
        const core = arrow.mesh.getObjectByName("core");
        const helix = arrow.mesh.getObjectByName("helix");
        const trail = arrow.mesh.getObjectByName("trail");

        if (core) {
          core.rotation.z += delta * 15.0;
        }
        if (helix) {
          helix.rotation.z -= delta * 30.0; // spin extremely fast in the opposite direction!
        }
        if (trail) {
          trail.rotation.y += delta * 8.0;
        }

        // Collisions with regular enemies
        enemies.forEach(enemy => {
          if (enemy.isDead) return;
          const dist = enemy.pos.distanceTo(arrow.pos);
          if (dist < 2.5) {
            // Knockback push away from hero
            const pushDir = arrow.dir.clone().normalize();
            enemy.pos.addScaledVector(pushDir, 3.5);
            enemy.mesh.position.copy(enemy.pos);
            hitEnemy(enemy);
          }
        });

        // Collisions with Boss
        if (boss && !boss.isDead) {
          const dist = boss.pos.distanceTo(arrow.pos);
          if (dist < 3.2) {
            const pushDir = arrow.dir.clone().normalize();
            boss.pos.addScaledVector(pushDir, 1.2);
            boss.mesh.position.copy(boss.pos);
            hitBoss(3); // 3 Damage
          }
        }

        if (arrow.age >= arrow.maxAge) {
          scene.remove(arrow.mesh);
          disposeObject(arrow.mesh);
          activeWindArrows.splice(i, 1);
        }
      }

      // Animate active Hitbox slashes (fade out)
      for (let i = activeHitboxes.length - 1; i >= 0; i--) {
        const hb = activeHitboxes[i];
        hb.age++;
        
        if (hb.mesh.material instanceof THREE.Material) {
          hb.mesh.material.opacity = Math.max(0, 1 - hb.age / hb.maxAge);
        }

        if (hb.age >= hb.maxAge) {
          scene.remove(hb.mesh);
          hb.mesh.geometry.dispose();
          if (Array.isArray(hb.mesh.material)) {
            hb.mesh.material.forEach(m => m.dispose());
          } else {
            hb.mesh.material.dispose();
          }
          activeHitboxes.splice(i, 1);
          setPlayerScore(prev => prev + 10); // Reward points per solid attacks
        }
      }

      renderer.render(scene, camera);
    };

    tick();

    // Resize container observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    // Clean up event listeners & render components
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);

      // Clean up ThreeJS meshes
      scene.remove(playerMesh);
      playerGeo.dispose();
      playerMat.dispose();

      scene.remove(groundMesh);
      groundGeo.dispose();
      groundMat.dispose();

      crystals.forEach(cry => {
        scene.remove(cry);
        cry.geometry.dispose();
        if (Array.isArray(cry.material)) cry.material.forEach(m => m.dispose());
        else cry.material.dispose();
      });

      activeRings.forEach(r => {
        scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        if (Array.isArray(r.mesh.material)) r.mesh.material.forEach(m => m.dispose());
        else r.mesh.material.dispose();
      });

      activeHitboxes.forEach(hb => {
        scene.remove(hb.mesh);
        hb.mesh.geometry.dispose();
        if (Array.isArray(hb.mesh.material)) hb.mesh.material.forEach(m => m.dispose());
        else hb.mesh.material.dispose();
      });

      // Clean up enemies
      enemies.forEach(enemy => {
        scene.remove(enemy.mesh);
        enemy.mesh.geometry.dispose();
        if (Array.isArray(enemy.mesh.material)) enemy.mesh.material.forEach(m => m.dispose());
        else enemy.mesh.material.dispose();
      });

      // Clean up potions
      potions.forEach(pot => {
        scene.remove(pot.mesh);
        pot.mesh.geometry.dispose();
        if (Array.isArray(pot.mesh.material)) pot.mesh.material.forEach(m => m.dispose());
        else pot.mesh.material.dispose();
      });

      // Clean up mana potions
      manas.forEach(mana => {
        scene.remove(mana.mesh);
        mana.mesh.geometry.dispose();
        if (Array.isArray(mana.mesh.material)) mana.mesh.material.forEach(m => m.dispose());
        else mana.mesh.material.dispose();
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Terminate background music nodes
      if (ambientNodeRef.current) {
        try {
          ambientNodeRef.current.stop();
          ambientNodeRef.current.disconnect();
        } catch (e) {}
      }
    };
  }, [selectedClass, characterName, soundOn, resetCounter]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col select-none">
      
      {/* Absolute Full Screen Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Cyberpunk Vignette Filter Overlays */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none z-10" />

      {/* TOP HUD: Vital Status Counters */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row justify-between items-start gap-4 pointer-events-none">
        
        {/* Boss HP Bar */}
        {bossActiveUI && (
          <div className="bg-black/85 backdrop-blur-md border-2 border-red-500/40 rounded-xl p-4 flex flex-col gap-1 shadow-[0_0_25px_rgba(239,68,68,0.25)] min-w-[280px] md:min-w-[340px] max-w-sm w-full pointer-events-auto animate-pulse">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-red-500 font-bold tracking-wider font-thai flex items-center gap-1.5">
                💀 BOSS HP: ARCHDEMON
              </span>
              <span className="text-red-400 font-bold">{bossHP} / {bossMaxHP}</span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-red-950">
              <div 
                className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                style={{ width: `${(bossHP / bossMaxHP) * 100}%` }} 
              />
            </div>
            <div className="text-[9px] text-center font-thai text-slate-500 mt-0.5">
              หลบลูกไฟอุกกาบาตแล้วต่อย [P] หรือ สกิล [O] ปราบอสูร!
            </div>
          </div>
        )}

        {/* Profile Card & Bars */}
        <div className="bg-black/75 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 flex items-center gap-4 pointer-events-auto shadow-[0_0_20px_rgba(6,182,212,0.15)] min-w-[280px]">
          <div className="relative">
            <div className="w-12 h-12 rounded-lg bg-cyan-950/50 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 font-thai font-bold">
              {selectedClass.name.substring(0, 2)}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-purple-600 text-[8px] text-white px-1.5 py-0.5 rounded font-mono border border-purple-400">
              LV.99
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="font-thai text-xs font-bold text-white tracking-wide">{characterName}</span>
              <span className="font-mono text-[9px] text-cyan-400 font-semibold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/30">
                {selectedClass.name}
              </span>
            </div>

            {/* HP Bar / Hearts display */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-rose-400 flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 fill-rose-400" /> พลังชีวิต (LIVES)
                </span>
                <span className="text-rose-300 font-bold">{playerLives} / 5</span>
              </div>
              <div className="flex gap-1.5 items-center mt-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Heart
                    key={idx}
                    className={`w-4 h-4 transition-all duration-300 ${
                      idx < playerLives
                        ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)] scale-110'
                        : 'text-slate-700 fill-slate-900 scale-95 opacity-40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* MP Bar */}
            <div className="space-y-1 mt-1.5">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-cyan-400 flex items-center gap-1"><Zap className="w-2.5 h-2.5 fill-cyan-400" /> ENERGY</span>
                <span className="text-cyan-300">{playerMP} / 100</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-cyan-950/50">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${playerMP}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Global HUD Settings & Exit button */}
        <div className="flex gap-2 pointer-events-auto self-end md:self-start">
          <button 
            onClick={toggleAmbientMusic}
            className={`px-3 py-2 rounded-lg border text-xs font-thai font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all ${
              ambientPlaying 
                ? 'bg-fuchsia-600/30 border-fuchsia-500 text-fuchsia-200 shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                : 'bg-black/75 border-purple-900/30 text-purple-400 hover:border-purple-700'
            }`}
          >
            {ambientPlaying ? <Volume2 className="w-4 h-4 text-fuchsia-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{ambientPlaying ? 'ปิดเสียงดนตรี Ambient' : 'เปิดเสียงดนตรี Ambient'}</span>
          </button>

          <button 
            onClick={() => setSoundOn(!soundOn)}
            className={`p-2 rounded-lg border backdrop-blur-md transition-all ${
              soundOn 
                ? 'bg-cyan-600/20 border-cyan-500 text-cyan-200' 
                : 'bg-black/75 border-slate-800 text-slate-500'
            }`}
            title="สลับเสียงเอฟเฟกต์"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button 
            onClick={onExit}
            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 hover:border-rose-500 text-rose-200 rounded-lg text-xs font-thai font-bold backdrop-blur-md transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ออกจากการผจญภัย</span>
          </button>
        </div>
      </div>

      {/* LEFT GAME CONSOLE LOGS & COORDINATES */}
      <div className="absolute left-4 bottom-28 md:bottom-24 z-20 w-80 max-h-56 pointer-events-none hidden md:flex flex-col gap-2">
        
        {/* Coordinates and Engine Info */}
        <div className="bg-black/80 backdrop-blur-md border border-cyan-500/20 rounded-lg p-2 flex justify-between text-[10px] font-mono text-cyan-300 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>X: <strong className="text-white">{coords.x}</strong></span>
            <span className="text-slate-600">|</span>
            <span>Z: <strong className="text-white">{coords.z}</strong></span>
          </div>
          <div>
            <span>FPS: <strong className="text-emerald-400">{fps}</strong></span>
          </div>
        </div>

        {/* Live log of actions */}
        <div className="bg-black/80 backdrop-blur-md border border-purple-500/20 rounded-xl p-3 flex-1 flex flex-col gap-1 overflow-hidden pointer-events-auto">
          <div className="flex items-center justify-between border-b border-purple-950/50 pb-1.5 mb-1.5">
            <span className="font-thai text-[10px] font-bold text-purple-300 tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              รายงานสถานะระบบเกม (SYS LOGS)
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin text-[9px] font-mono leading-relaxed">
            {logs.length === 0 ? (
              <span className="text-slate-600 italic font-thai">ไม่มีความเคลื่อนไหวขณะนี้...</span>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2 items-start">
                  <span className="text-slate-500">[{log.time}]</span>
                  <span className={`
                    ${log.type === 'attack' ? 'text-amber-300 font-bold' : ''}
                    ${log.type === 'skill' ? 'text-cyan-300 font-bold' : ''}
                    ${log.type === 'move' ? 'text-slate-400' : ''}
                    ${log.type === 'info' ? 'text-purple-300' : ''}
                  `}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT ACTION MAPPING KEYS */}
      <div className="absolute right-4 bottom-28 md:bottom-24 z-20 pointer-events-none hidden md:flex flex-col gap-3">
        
        {/* Combat state overlay */}
        <div className="bg-black/85 backdrop-blur-md border border-fuchsia-500/30 rounded-xl p-4 w-72 pointer-events-auto">
          <div className="text-[10px] font-thai text-fuchsia-400 font-bold border-b border-fuchsia-950/40 pb-1.5 mb-2.5 flex items-center justify-between">
            <span>สถานะตัวละครในสังเวียน 2.5D</span>
            <span className="font-mono bg-fuchsia-950/60 px-1.5 py-0.5 text-fuchsia-300 rounded text-[9px]">
              {currentActionState}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">หันหน้าทิศทาง (Facing):</span>
              <span className="text-cyan-300 font-bold font-thai">{directionLabel}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">โจมตีสะสมคะแนน (Score):</span>
              <span className="text-yellow-400 font-bold font-mono">{playerScore} PTS</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">ระยะจำกัดพื้นที่ (Bound):</span>
              <span className="text-slate-500">50 x 50 Units</span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: Interactive Controls Overlay HUD Dashboard */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-black/90 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Keyboard status and instruction legends */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/40 border border-cyan-950 rounded-xl">
            <Keyboard className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-thai font-bold text-xs text-slate-200">
              ควบคุมด้วยปุ่ม WASD, Arrow Keys, P และ O
            </h3>
            <p className="font-thai text-[10px] text-slate-500 mt-0.5">
              ตัวละคร 2D จะหันหน้ามองกล้องเสมอแบบ Retro 2.5D และกล้องจะเคลื่อนที่ตามคุณอย่างนุ่มนวล
            </p>
          </div>
        </div>

        {/* Visual responsive keyboard map */}
        <div className="flex flex-wrap gap-2 justify-center pointer-events-auto">
          {/* Movement Directions keys */}
          <div className="flex gap-1 bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/40">
            {['W', 'A', 'S', 'D'].map((key) => {
              const active = pressedKeys[key];
              return (
                <div
                  key={key}
                  className={`w-7 h-7 rounded border text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                    active 
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-110'
                      : 'bg-black/50 border-slate-700 text-slate-400'
                  }`}
                >
                  {key}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1 bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/40">
            {[
              { code: 'ArrowUp', symbol: '↑' },
              { code: 'ArrowLeft', symbol: '←' },
              { code: 'ArrowDown', symbol: '↓' },
              { code: 'ArrowRight', symbol: '→' }
            ].map((k) => {
              const active = pressedKeys[k.code];
              return (
                <div
                  key={k.code}
                  className={`w-7 h-7 rounded border text-xs font-bold flex items-center justify-center transition-all ${
                    active 
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-110'
                      : 'bg-black/50 border-slate-700 text-slate-400'
                  }`}
                  title={k.code}
                >
                  {k.symbol}
                </div>
              );
            })}
          </div>

          {/* Action Attack P Key */}
          <div
            className={`px-3.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all duration-200 ${
              pressedKeys['P']
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-105'
                : 'bg-black/50 border-amber-900/30 text-amber-400'
            }`}
          >
            <span className="font-thai text-[10px] font-bold">ต่อย/โจมตี (Attack)</span>
            <span className="font-mono text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded text-amber-300">
              P
            </span>
          </div>

          {/* Special Burst Energy Ring O Key */}
          <div
            className={`px-3.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all duration-200 ${
              pressedKeys['O']
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-105'
                : 'bg-black/50 border-cyan-900/30 text-cyan-300'
            }`}
          >
            <span className="font-thai text-[10px] font-bold">สกิลระเบิดพลัง (Skill Burst)</span>
            <span className="font-mono text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded text-cyan-200">
              O
            </span>
          </div>
        </div>

      </div>

      {/* GAME OVER POPUP OVERLAY */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-slate-950/80 border border-red-500/30 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-950/40 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
                <Heart className="w-10 h-10 fill-red-500/20" />
              </div>

              <h2 className="text-3xl font-bold font-thai text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-600 tracking-wide mb-2">
                ภารกิจสิ้นสุดลงแล้ว!
              </h2>
              <p className="text-slate-400 text-sm font-thai mb-6">
                ฮีโร่ของคุณพ่ายแพ้ให้กับฝูงผู้รุกรานในสังเวียนนี้ ไม่ต้องกังวล คุณสามารถกลับมาแก้มือและเอาคืนได้เสมอ!
              </p>

              <div className="bg-slate-900/60 rounded-xl p-4 mb-8 border border-slate-800/40 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-thai">ฮีโร่ผู้ท้าชิง:</span>
                  <span className="text-cyan-400 font-bold font-mono">{characterName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-thai">คะแนนที่ทำได้:</span>
                  <span className="text-yellow-400 font-bold font-mono text-base">{playerScore} PTS</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRestart}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-thai font-bold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>เริ่มท้าทายใหม่</span>
                </button>
                <button
                  onClick={onExit}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-thai font-semibold rounded-xl border border-slate-800 transition-all duration-200"
                >
                  หน้าหลัก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RPG DIALOGUE OVERLAY */}
      <AnimatePresence>
        {isDialogueActive && (() => {
          const dialogues = [
            {
              speaker: 'npc',
              name: 'สหายผู้พิทักษ์มิติ (Keeper)',
              text: `โอ้! ท่านผู้กล้าหาญ! ข้าเห็นลำแสงระเบิดอันยิ่งใหญ่จากวิหารสรวงสวรรค์ที่ท่านได้กอบกู้เอาไว้!`,
              side: 'right'
            },
            {
              speaker: 'player',
              name: `${characterName} (${selectedClass.name})`,
              text: `ข้าได้ต่อสู้สุดกำลังและโค่นล้มจอมอสูร Archdemon เรียบร้อยแล้ว! ท้องฟ้ากำลังฟื้นฟูและอุกกาบาตทลายสิ้นแล้วสหาย!`,
              side: 'left'
            },
            {
              speaker: 'npc',
              name: 'สหายผู้พิทักษ์มิติ (Keeper)',
              text: `เหลือเชื่อจริงๆ! สังเวียนมิตินี้ไร้ซึ่งความสงบสุข ตกอยู่ในเงามืดและความสิ้นหวังมานานหลายทศวรรษ...`,
              side: 'right'
            },
            {
              speaker: 'npc',
              name: 'สหายผู้พิทักษ์มิติ (Keeper)',
              text: `แต่ด้วยวิชาความแข็งแกร่งและพลังรบของสายอาชีพ ${selectedClass.name} ลมหายใจแห่งแผ่นดินจึงกลับมาบริสุทธิ์อีกครั้ง!`,
              side: 'right'
            },
            {
              speaker: 'player',
              name: `${characterName} (${selectedClass.name})`,
              text: `ข้าทุ่มเทจิตวิญญาณแห่งการต่อสู้นี้เพื่อปลดปล่อยดวงวิญญาณ และปลุกชีพดินแดนให้ตื่นขึ้นจากทรราชผู้ทำลาย`,
              side: 'left'
            },
            {
              speaker: 'npc',
              name: 'สหายผู้พิทักษ์มิติ (Keeper)',
              text: `ท่านคือตำนานฮีโร่ไร้พ่ายแห่งยุคสมัย! นามอันยิ่งใหญ่ "${characterName}" และเกียรติยศระดับวิหาร ${playerScore} คะแนน จะถูกกล่าวขานสืบไป!`,
              side: 'right'
            },
            {
              speaker: 'player',
              name: `${characterName} (${selectedClass.name})`,
              text: `ขอบใจสหายผู้ซื่อสัตย์ ตอนนี้ประตูมิติเวลาเสถียรแล้ว มาร่วมก้าวออกไปสู่ดินแดนใหม่แห่งวันรุ่งอรุณกันเถอะ`,
              side: 'left'
            },
            {
              speaker: 'npc',
              name: 'สหายผู้พิทักษ์มิติ (Keeper)',
              text: `ขอมหารัศมีและเกียรติยศสูงสุดสถิตอยู่เคียงข้างท่านเสมอ... ลาก่อนผู้กอบกู้โลกผู้ยิ่งใหญ่! ประตูสรวงสวรรค์พร้อมน้อมส่งท่านแล้ว!`,
              side: 'right'
            }
          ];

          const currentDialogue = dialogues[dialogueStep] || dialogues[0];

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end p-6 pointer-events-auto select-none"
            >
              {/* Cinematic bars */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-black/95 border-b border-cyan-500/20 z-10 flex items-center justify-between px-8">
                <span className="text-[10px] font-mono tracking-[0.25em] text-cyan-400 font-bold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping" />
                  STORY EPILOGUE: THE TRIUMPHANT ENDING
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  PRESS BUTTON TO PROGRESS
                </span>
              </div>

              {/* Main Dialogue Portrait Area */}
              <div className="flex-1 flex justify-between items-end px-4 md:px-24 pb-8 gap-8">
                
                {/* Player Character portrait card */}
                <motion.div 
                  animate={{ 
                    y: currentDialogue.side === 'left' ? -10 : 0,
                    scale: currentDialogue.side === 'left' ? 1.08 : 0.9,
                    opacity: currentDialogue.side === 'left' ? 1 : 0.45 
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className={`p-4 rounded-2xl bg-slate-950/90 border-2 transition-all duration-300 ${
                    currentDialogue.side === 'left' 
                      ? 'border-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.45)] bg-slate-900' 
                      : 'border-slate-800'
                  }`}>
                    <AnimatedPlayerDialogueSprite />
                  </div>
                  <div className={`px-4 py-1.5 rounded-lg text-xs font-bold font-thai tracking-wide transition-all ${
                    currentDialogue.side === 'left' 
                      ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    {characterName} <span className="opacity-70 text-[10px] ml-1">({selectedClass.name})</span>
                  </div>
                </motion.div>

                {/* NPC Portrait card */}
                <motion.div 
                  animate={{ 
                    y: currentDialogue.side === 'right' ? -10 : 0,
                    scale: currentDialogue.side === 'right' ? 1.08 : 0.9,
                    opacity: currentDialogue.side === 'right' ? 1 : 0.45 
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className={`p-4 rounded-2xl bg-slate-950/90 border-2 transition-all duration-300 ${
                    currentDialogue.side === 'right' 
                      ? 'border-teal-400 shadow-[0_0_35px_rgba(20,184,166,0.45)] bg-slate-900' 
                      : 'border-slate-800'
                  }`}>
                    <AnimatedNpcDialogueSprite />
                  </div>
                  <div className={`px-4 py-1.5 rounded-lg text-xs font-bold font-thai tracking-wide transition-all ${
                    currentDialogue.side === 'right' 
                      ? 'bg-teal-400 text-black shadow-lg shadow-teal-400/20' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    สหายผู้พิทักษ์มิติ <span className="opacity-70 text-[10px] ml-1">(Keeper)</span>
                  </div>
                </motion.div>

              </div>

              {/* Bottom Dialog Box */}
              <motion.div 
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-4xl mx-auto bg-slate-950/95 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col gap-4 relative"
              >
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-sm font-black font-thai text-cyan-400 tracking-wide flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                    {currentDialogue.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold tracking-wider">
                    บทสนทนา {dialogueStep + 1} / 8
                  </span>
                </div>

                <div className="py-2 text-slate-100 text-base md:text-lg font-thai leading-relaxed min-h-[72px] font-medium">
                  {currentDialogue.text}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      playSound('shoot');
                      if (dialogueStep < 7) {
                        setDialogueStep(prev => prev + 1);
                      } else {
                        setIsDialogueActive(false);
                        setIsGameClear(true);
                        playSound('burst');
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-thai font-black rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center gap-2 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                  >
                    <span>{dialogueStep < 7 ? 'อ่านต่อ [Next]' : 'สำเร็จภารกิจ [Finish]'}</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* GAME CLEAR POPUP OVERLAY (FINISH / ENDING SCREEN) */}
      <AnimatePresence>
        {isGameClear && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-lg w-full bg-slate-950/90 border-2 border-emerald-500/40 rounded-3xl p-8 text-center shadow-[0_0_70px_rgba(16,185,129,0.3)]"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-950/50 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.5)] animate-bounce">
                <Sparkles className="w-12 h-12 text-emerald-300" />
              </div>

              <h1 className="text-5xl font-black font-thai text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-yellow-300 tracking-wider mb-2">
                FINISH (เคลียร์เกม)
              </h1>
              <h3 className="text-xl font-bold font-thai text-emerald-200 mb-6">
                🎉 ชัยชนะอันเป็นนิรันดร์แห่งมิติสรวงสวรรค์
              </h3>
              
              <div className="text-slate-300 text-sm font-thai mb-6 space-y-3 leading-relaxed bg-slate-900/60 p-5 rounded-2xl border border-slate-800/60 text-left">
                <p>
                  🌌 ยินดีด้วยอย่างยิ่ง! <strong>{characterName}</strong> จอมคนผู้พิชิตดินแดนด้วยอาชีพ <strong>{selectedClass.name}</strong> ได้เดินทางก้าวผ่านประตูมิติวาร์ป ร่วมมือกับผู้พิทักษ์ทลายสังเวียนร้ายและกลับคืนสู่โลกแห่งความสงบสุข!
                </p>
                <p>
                  บอสผู้ครองสรวงสวรรค์มืดพ่ายแพ้อย่างสมบูรณ์ ท้องฟ้าพายุอุกกาบาตทั้งหมดได้อันตรธานหายไป เป็นเกียรติสูงสุดและรอยยิ้มแด่ความพยายามของคุณ!
                </p>
              </div>

              {/* Character Stats Box */}
              <div className="bg-slate-900/80 rounded-2xl p-5 mb-8 border border-slate-800/60 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-thai">ฮีโร่ผู้พิทักษ์:</span>
                  <span className="text-cyan-400 font-bold font-mono text-sm">{characterName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-thai">สายอาชีพผู้พิชิต:</span>
                  <span className="text-teal-400 font-bold font-thai">{selectedClass.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-thai">คะแนนเกียรติยศสูงสุด:</span>
                  <span className="text-yellow-400 font-black font-mono text-xl">{playerScore} PTS</span>
                </div>
              </div>

              {/* Title Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRestart}
                  className="flex-1 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-thai font-black rounded-xl border border-emerald-950 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>กลับไปท้าทายใหม่</span>
                </button>
                <button
                  onClick={onExit}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-thai font-black rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-black" />
                  <span>กลับสู่หน้าหลัก Title</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
