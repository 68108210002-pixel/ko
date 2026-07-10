export type MenuTab = 'main' | 'start' | 'options' | 'how-to' | 'credits' | 'exit' | 'game';
export type OptionsSubTab = 'controls' | 'graphics' | 'audio';

export interface KeyBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  jump: string;
  dash: string;
  attack: string;
  skill: string;
}

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsSettings {
  preset: GraphicsPreset;
  resolution: string;
  vsync: boolean;
  fpsLimit: number;
  bloom: boolean;
  scanlines: boolean;
  motionBlur: boolean;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  soundEnabled: boolean;
}

export interface CharacterClass {
  id: string;
  name: string;
  thaiName: string;
  description: string;
  stats: {
    health: number; // 1-100
    power: number;  // 1-100
    speed: number;  // 1-100
    defense: number;// 1-100
  };
  color: string; // Tailwind hex color or class
  skillName: string;
  skillDesc: string;
}
