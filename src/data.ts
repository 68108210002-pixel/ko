import { CharacterClass, KeyBindings, GraphicsSettings, AudioSettings } from './types';

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: 'W',
  backward: 'S',
  left: 'A',
  right: 'D',
  jump: 'Space',
  dash: 'Shift',
  attack: 'J',
  skill: 'K',
};

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  preset: 'high',
  resolution: 'Fit to Screen',
  vsync: true,
  fpsLimit: 60,
  bloom: true,
  scanlines: false,
  motionBlur: true,
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.7,
  musicVolume: 0.5,
  soundEnabled: true,
};

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: 'warrior',
    name: 'Vanguard',
    thaiName: 'ผู้กล้าเกราะเหล็ก',
    description: 'นักรบผู้แข็งแกร่งมาพร้อมเกราะหนาหนักและพละกำลังมหาศาล บุกตะลุยแนวหน้าอย่างไม่เกรงกลัว',
    stats: {
      health: 95,
      power: 75,
      speed: 40,
      defense: 90,
    },
    color: 'from-orange-500 to-red-600',
    skillName: 'Iron Fortress',
    skillDesc: 'เพิ่มพลังป้องกัน 200% และสะท้อนความเสียหายเป็นเวลา 5 วินาที',
  },
  {
    id: 'mage',
    name: 'Aether Mage',
    thaiName: 'จอมเวทเอเธอร์',
    description: 'ผู้ควบคุมพลังงานเวทมนตร์ดวงดาวและห้วงมิติ ทำลายล้างศัตรูจากระยะไกลด้วยพลังทำลายสูงสุดยอด',
    stats: {
      health: 50,
      power: 95,
      speed: 60,
      defense: 45,
    },
    color: 'from-cyan-500 to-blue-600',
    skillName: 'Supernova Strike',
    skillDesc: 'ร่ายระเบิดดาวตกสร้างความเสียหายเวทวงกว้างอย่างรุนแรง',
  },
  {
    id: 'assassin',
    name: 'Shadow Blade',
    thaiName: 'เงาสังหาร',
    description: 'นักฆ่าไร้ร่องรอย เคลื่อนไหวในเงามืดอย่างว่องไวและแม่นยำ ปลิดชีพศัตรูได้ในพริบตา',
    stats: {
      health: 60,
      power: 85,
      speed: 95,
      defense: 50,
    },
    color: 'from-purple-500 to-fuchsia-600',
    skillName: 'Shadowstep Strike',
    skillDesc: 'เทเลพอร์ตไปด้านหลังศัตรูและโจมตีจุดตายทันทีด้วยความแรงคริติคอล',
  },
  {
    id: 'ranger',
    name: 'Windrunner',
    thaiName: 'ผู้พิทักษ์สายลม',
    description: 'พลธนูผู้รวดเร็วและคล่องตัวสูง ใช้สัญชาตญาณสัตว์ป่าในการเคลื่อนไหวและยิงศัตรูจากระยะไกล',
    stats: {
      health: 70,
      power: 70,
      speed: 80,
      defense: 65,
    },
    color: 'from-emerald-500 to-teal-600',
    skillName: 'Galeforce Arrow',
    skillDesc: 'ยิงลูกธนูพายุทะลวงสิ่งกีดขวาง ผลักศัตรูทั้งหมดถอยหลังพร้อมสร้างความเสียหายต่อเนื่อง',
  },
];
