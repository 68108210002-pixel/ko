import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VolumeX, Volume2, ShieldCheck, Cpu } from 'lucide-react';

import { MenuTab, KeyBindings, GraphicsSettings, AudioSettings, CharacterClass } from './types';
import {
  DEFAULT_KEY_BINDINGS,
  DEFAULT_GRAPHICS_SETTINGS,
  DEFAULT_AUDIO_SETTINGS,
  CHARACTER_CLASSES,
} from './data';
import {
  startAmbientDrone,
  stopAmbientDrone,
  playHoverSound,
  playClickSound,
  playChimeSound,
} from './utils/audio';

// Components
import { MainMenu } from './components/MainMenu';
import { OptionsPanel } from './components/OptionsPanel';
import { CharacterSelect } from './components/CharacterSelect';
import { GameWorld } from './components/GameWorld';
import { HowToPlay } from './components/HowToPlay';
import { CreditsPanel } from './components/CreditsPanel';

interface BgParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<MenuTab>('main');
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  // States
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(() => {
    const saved = localStorage.getItem('rpu_game_keys');
    return saved ? JSON.parse(saved) : DEFAULT_KEY_BINDINGS;
  });

  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>(() => {
    const saved = localStorage.getItem('rpu_game_graphics');
    return saved ? JSON.parse(saved) : DEFAULT_GRAPHICS_SETTINGS;
  });

  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => {
    const saved = localStorage.getItem('rpu_game_audio');
    return saved ? JSON.parse(saved) : DEFAULT_AUDIO_SETTINGS;
  });

  const [selectedClass, setSelectedClass] = useState<CharacterClass>(CHARACTER_CLASSES[0]);
  const [characterName, setCharacterName] = useState<string>('RPU_HERO');
  
  // Image states
  const [logoLoadError, setLogoLoadError] = useState<boolean>(false);

  // Background particles state
  const [particles, setParticles] = useState<BgParticle[]>([]);

  // Exit Modal state
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('rpu_game_keys', JSON.stringify(keyBindings));
  }, [keyBindings]);

  useEffect(() => {
    localStorage.setItem('rpu_game_graphics', JSON.stringify(graphicsSettings));
  }, [graphicsSettings]);

  useEffect(() => {
    localStorage.setItem('rpu_game_audio', JSON.stringify(audioSettings));
  }, [audioSettings]);

  // Activate audio engine on interaction
  const handleUserInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      if (audioSettings.soundEnabled) {
        startAmbientDrone(audioSettings.musicVolume);
        playChimeSound(audioSettings.sfxVolume);
      }
    }
  };

  // Toggle master sound mute easily via HUD
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedMute = !audioSettings.soundEnabled;
    setAudioSettings((prev) => ({ ...prev, soundEnabled: updatedMute }));
    
    if (updatedMute) {
      startAmbientDrone(audioSettings.musicVolume);
      playClickSound(audioSettings.sfxVolume);
    } else {
      stopAmbientDrone();
    }
  };

  // Sound effects helper
  const handleHover = () => {
    if (audioSettings.soundEnabled && hasInteracted) {
      playHoverSound(audioSettings.sfxVolume);
    }
  };

  const handleClick = () => {
    if (audioSettings.soundEnabled && hasInteracted) {
      playClickSound(audioSettings.sfxVolume);
    }
  };

  // Generate particles based on preset
  useEffect(() => {
    const countMap = {
      low: 12,
      medium: 25,
      high: 55,
      ultra: 95,
    };
    const count = countMap[graphicsSettings.preset];
    const generated: BgParticle[] = [];
    for (let i = 0; i < count; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * (graphicsSettings.preset === 'ultra' ? 4 : 2) + 1,
        speed: Math.random() * 12 + 8, // float speed (seconds)
        opacity: Math.random() * 0.6 + 0.1,
      });
    }
    setParticles(generated);
  }, [graphicsSettings.preset]);

  // Reset all to defaults
  const handleResetSettings = () => {
    setKeyBindings(DEFAULT_KEY_BINDINGS);
    setGraphicsSettings(DEFAULT_GRAPHICS_SETTINGS);
    setAudioSettings(DEFAULT_AUDIO_SETTINGS);
    if (audioSettings.soundEnabled) {
      playChimeSound(audioSettings.sfxVolume);
    }
  };

  // Handle Main Menu Exit trigger
  const handleTabChange = (tab: MenuTab) => {
    if (tab === 'exit') {
      setShowExitModal(true);
    } else {
      setCurrentTab(tab);
    }
  };

  return (
    <div
      onClick={handleUserInteraction}
      className="w-screen h-screen overflow-hidden flex flex-col justify-between items-center relative select-none"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #101530 0%, #080a1c 60%, #020205 100%)',
      }}
      id="app-viewport-root"
    >
      {/* 1. Animated floating particles backend */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-purple-400"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              boxShadow: graphicsSettings.bloom ? `0 0 10px rgba(168, 85, 247, 0.5)` : 'none',
            }}
            animate={{
              y: ['0px', '-120px'],
              opacity: [p.opacity, 0, p.opacity],
            }}
            transition={{
              duration: p.speed,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* 2. CRT scanlines filter for high arcade fidelity */}
      {graphicsSettings.scanlines && (
        <div className="absolute inset-0 pointer-events-none z-40 opacity-[0.14] bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%]" />
      )}

      {/* 3. Subtle background grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0 bg-[linear-gradient(to_right,#312e81_1px,transparent_1px),linear-gradient(to_bottom,#312e81_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Click-to-unmute audio warning overlay if not interacted */}
      {!hasInteracted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col justify-center items-center p-4 text-center cursor-pointer select-none"
        >
          <div className="space-y-4 max-w-sm">
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse" />
              <Volume2 className="w-14 h-14 text-purple-400 mx-auto animate-bounce" />
            </div>
            <div className="space-y-1">
              <h2 className="font-thai font-black text-xl text-white tracking-wide">
                ยินดีต้อนรับสู่ล็อบบี้เกม
              </h2>
              <p className="font-thai text-xs text-purple-200">
                คลิกเมาส์ที่จุดใดก็ได้เพื่อเริ่มต้นระบบภาพ แอนิเมชัน และเสียงสังเคราะห์คุณภาพสูง
              </p>
            </div>
            <div className="pt-2 font-mono text-[10px] text-purple-500 tracking-widest font-bold">
              CLICK ANYWHERE TO INITIALIZE APPMENU
            </div>
          </div>
        </motion.div>
      )}

      {/* HEADER SECTION (Brand & Sound control) */}
      <header className="w-full max-w-7xl px-6 py-5 flex justify-between items-center z-20" id="lobby-header">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          <span className="font-mono text-xs font-bold text-gray-500 tracking-wider">
            RPU_STUDIO // PRO
          </span>
        </div>

        {/* Audio Mute/Unmute Indicator */}
        <button
          onClick={handleToggleMute}
          onMouseEnter={handleHover}
          className="flex items-center gap-2 bg-purple-950/20 border border-purple-900/35 hover:bg-purple-900/40 px-3.5 py-1.5 rounded-full transition-all text-gray-300 hover:text-white cursor-pointer"
        >
          {audioSettings.soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="font-thai text-xs font-semibold">เปิดเสียงลำโพง</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span className="font-thai text-xs font-semibold">ปิดเสียงลำโพง</span>
            </>
          )}
        </button>
      </header>

      {/* CORE VIEWPORT MAIN COMPONENT */}
      <main className="w-full max-w-7xl px-6 md:px-12 flex-1 flex flex-col justify-center items-center z-10" id="lobby-viewport-main">
        <AnimatePresence mode="wait">
          {currentTab === 'main' && (
            <div className="w-full flex flex-col md:grid md:grid-cols-12 gap-8 items-center" key="main-menu-view">
              
              {/* Left Side: Game Logo Container (Grid columns 1-5) */}
              <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-4">
                <motion.div
                  /* 
                    Following the user's specific demand:
                    "logo  animation loop เล็กๆ" (gentle floating breathing loop)
                  */
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="relative select-none"
                >
                  {/* Neon Glow reflection behind logo */}
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-3xl pointer-events-none scale-90" />

                  {!logoLoadError ? (
                    <img
                      src="https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/logo.png"
                      alt="Game Logo"
                      onError={() => setLogoLoadError(true)}
                      className="max-w-[280px] md:max-w-[340px] h-auto object-contain drop-shadow-[0_0_35px_rgba(168,85,247,0.45)] select-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    /* Fallback beautifully-crafted dynamic neon SVG logo text */
                    <div className="py-4 px-2 select-none">
                      <h1 className="font-thai font-black text-4xl md:text-5xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-500 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]">
                        RPU CYBER
                      </h1>
                      <div className="font-mono text-xs tracking-[0.35em] text-cyan-400/80 font-bold mt-1 uppercase text-center md:text-left">
                        // NEXUS LOBBY
                      </div>
                    </div>
                  )}
                </motion.div>

                <p className="font-thai text-xs md:text-sm text-gray-400 max-w-sm leading-relaxed select-none">
                  ยินดีต้อนรับเข้าสู่ระบบจัดการและล๊อบบี้เกมผจญภัย RPU ปรับแต่งทักษะตัวละครและการแสดงผลกราฟิกตามใจคุณ
                </p>
              </div>

              {/* Right Side: Navigation Menu (Grid columns 6-12) */}
              <div className="md:col-span-7 w-full flex justify-center md:justify-start">
                <MainMenu
                  currentTab={currentTab}
                  onTabChange={handleTabChange}
                  soundEnabled={audioSettings.soundEnabled}
                  sfxVolume={audioSettings.sfxVolume}
                />
              </div>
            </div>
          )}

          {currentTab === 'options' && (
            <div className="w-full max-w-4xl h-[560px]" key="options-view">
              <OptionsPanel
                keyBindings={keyBindings}
                setKeyBindings={setKeyBindings}
                graphicsSettings={graphicsSettings}
                setGraphicsSettings={setGraphicsSettings}
                audioSettings={audioSettings}
                setAudioSettings={setAudioSettings}
                onBack={() => setCurrentTab('main')}
                onReset={handleResetSettings}
              />
            </div>
          )}

          {currentTab === 'start' && (
            <div className="w-full max-w-5xl" key="character-select-view">
              <CharacterSelect
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                characterName={characterName}
                setCharacterName={setCharacterName}
                onBack={() => setCurrentTab('main')}
                onConfirm={() => setCurrentTab('game')} // Route directly into simulated gameworld area
                soundEnabled={audioSettings.soundEnabled}
                sfxVolume={audioSettings.sfxVolume}
              />
            </div>
          )}

          {/* Special GameWorld view (Activated by entering from selecting character) */}
          {currentTab === 'game' && (
            <div className="fixed inset-0 w-screen h-screen z-50 bg-black overflow-hidden animate-fade-in" key="gameworld-view">
              <GameWorld
                selectedClass={selectedClass}
                characterName={characterName}
                keyBindings={keyBindings}
                graphicsSettings={graphicsSettings}
                soundEnabled={audioSettings.soundEnabled}
                sfxVolume={audioSettings.sfxVolume}
                onExit={() => setCurrentTab('main')}
              />
            </div>
          )}

          {currentTab === 'how-to' && (
            <div className="w-full max-w-4xl" key="how-to-view">
              <HowToPlay
                keyBindings={keyBindings}
                onBack={() => setCurrentTab('main')}
                soundEnabled={audioSettings.soundEnabled}
                sfxVolume={audioSettings.sfxVolume}
              />
            </div>
          )}

          {currentTab === 'credits' && (
            <div className="w-full max-w-4xl" key="credits-view">
              <CreditsPanel
                onBack={() => setCurrentTab('main')}
                soundEnabled={audioSettings.soundEnabled}
                sfxVolume={audioSettings.sfxVolume}
              />
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER METADATA BAR */}
      <footer className="w-full max-w-7xl px-6 py-4 flex justify-between items-center text-[10px] font-mono text-gray-500 z-20 border-t border-purple-900/10 mt-4" id="lobby-footer">
        <span className="font-thai">มหาวิทยาลัยราชพฤกษ์ (RPU) // พัฒนาปี 2026</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SYSTEM_ONLINE
          </span>
          <span>PRESET: {graphicsSettings.preset.toUpperCase()}</span>
        </div>
      </footer>

      {/* 4. Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-zinc-950 border border-rose-900/40 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-thai font-extrabold text-xl text-rose-400">
                    ออกจากระบบเกมใช่หรือไม่?
                  </h3>
                  <p className="font-thai text-xs text-gray-400 leading-relaxed">
                    คุณกำลังจะปิดเซสชันและออกจากห้องต้อนรับ ลิขสิทธิ์ปุ่มควบคุมที่กำหนดเองและข้อมูลกราฟิกจะถูกบันทึกไว้ในอุปกรณ์นี้อย่างถาวร
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => {
                      handleClick();
                      setShowExitModal(false);
                    }}
                    onMouseEnter={handleHover}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 font-thai text-xs font-bold text-gray-300 hover:text-white rounded-lg transition-all border-none cursor-pointer"
                  >
                    ยกเลิก (Cancel)
                  </button>
                  <button
                    onClick={() => {
                      handleClick();
                      setShowExitModal(false);
                      // Custom interactive reload to exit cleanly
                      window.location.reload();
                    }}
                    onMouseEnter={handleHover}
                    className="px-5 py-2 bg-rose-700 hover:bg-rose-600 font-thai text-xs font-black text-white rounded-lg transition-all border-none cursor-pointer hover:drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                  >
                    ยืนยันออกจากเกม (Exit)
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
