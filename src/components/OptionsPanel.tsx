import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Keyboard, Video, Volume2, RotateCcw, HelpCircle } from 'lucide-react';
import { KeyBindings, GraphicsSettings, AudioSettings, OptionsSubTab } from '../types';
import { playHoverSound, playClickSound, playChimeSound, updateAmbientVolume } from '../utils/audio';

interface OptionsPanelProps {
  keyBindings: KeyBindings;
  setKeyBindings: React.Dispatch<React.SetStateAction<KeyBindings>>;
  graphicsSettings: GraphicsSettings;
  setGraphicsSettings: React.Dispatch<React.SetStateAction<GraphicsSettings>>;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  onBack: () => void;
  onReset: () => void;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  keyBindings,
  setKeyBindings,
  graphicsSettings,
  setGraphicsSettings,
  audioSettings,
  setAudioSettings,
  onBack,
  onReset,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<OptionsSubTab>('controls');
  const [bindingKey, setBindingKey] = useState<keyof KeyBindings | null>(null);

  const subTabs: { id: OptionsSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'controls', label: 'การควบคุม (Controls)', icon: <Keyboard className="w-5 h-5" /> },
    { id: 'graphics', label: 'กราฟิก (Graphics)', icon: <Video className="w-5 h-5" /> },
    { id: 'audio', label: 'เสียง (Audio)', icon: <Volume2 className="w-5 h-5" /> },
  ];

  // Listener for key rebinding
  useEffect(() => {
    if (!bindingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Normalize common key representations
      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      if (keyName === 'Shift') keyName = 'Shift';
      if (keyName === 'Control') keyName = 'Ctrl';
      if (keyName === 'Alt') keyName = 'Alt';
      if (keyName === 'Escape') keyName = 'Esc';
      if (keyName.length === 1) keyName = keyName.toUpperCase();

      setKeyBindings((prev) => ({
        ...prev,
        [bindingKey]: keyName,
      }));

      if (audioSettings.soundEnabled) {
        playChimeSound(audioSettings.sfxVolume);
      }

      setBindingKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bindingKey, setKeyBindings, audioSettings]);

  const handleHover = () => {
    if (audioSettings.soundEnabled) {
      playHoverSound(audioSettings.sfxVolume);
    }
  };

  const handleClick = () => {
    if (audioSettings.soundEnabled) {
      playClickSound(audioSettings.sfxVolume);
    }
  };

  const handlePresetChange = (preset: 'low' | 'medium' | 'high' | 'ultra') => {
    handleClick();
    const presets: Record<'low' | 'medium' | 'high' | 'ultra', Partial<GraphicsSettings>> = {
      low: { preset: 'low', bloom: false, motionBlur: false, scanlines: false },
      medium: { preset: 'medium', bloom: true, motionBlur: false, scanlines: false },
      high: { preset: 'high', bloom: true, motionBlur: true, scanlines: false },
      ultra: { preset: 'ultra', bloom: true, motionBlur: true, scanlines: true },
    };
    setGraphicsSettings((prev) => ({
      ...prev,
      ...presets[preset],
    }));
  };

  const handleVolumeChange = (type: keyof AudioSettings, val: number) => {
    setAudioSettings((prev) => {
      const updated = { ...prev, [type]: val };
      if (type === 'musicVolume') {
        updateAmbientVolume(val * (prev.soundEnabled ? 1 : 0));
      }
      return updated;
    });
  };

  const handleSoundToggle = () => {
    handleClick();
    setAudioSettings((prev) => {
      const updated = { ...prev, soundEnabled: !prev.soundEnabled };
      updateAmbientVolume(updated.soundEnabled ? updated.musicVolume : 0);
      return updated;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="w-full h-full flex flex-col bg-black/60 backdrop-blur-xl border border-purple-900/35 rounded-2xl overflow-hidden shadow-2xl"
      id="options-panel-container"
    >
      {/* Settings Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-purple-900/20 bg-purple-950/20">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-purple-400 animate-spin" style={{ animationDuration: '8s' }} />
          <h2 className="text-xl md:text-2xl font-thai font-bold text-white tracking-wide">
            ตั้งค่าระบบ <span className="text-purple-400">Settings</span>
          </h2>
        </div>
        <button
          onClick={onReset}
          onMouseEnter={handleHover}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-rose-400 transition-colors bg-transparent border-none outline-none cursor-pointer p-1"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="font-thai font-medium">คืนค่าเริ่มต้น (Reset)</span>
        </button>
      </div>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Settings Side Navigation */}
        <div className="w-full md:w-56 border-r border-purple-900/20 bg-purple-950/10 flex flex-row md:flex-col p-2 gap-1 overflow-x-auto md:overflow-x-visible">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                handleClick();
                setActiveSubTab(tab.id);
              }}
              onMouseEnter={handleHover}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 border-none outline-none cursor-pointer flex-1 md:flex-none text-left whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-gradient-to-r from-purple-900/40 to-indigo-900/40 text-purple-200 border-l-4 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] font-bold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <div className={activeSubTab === tab.id ? 'text-purple-400' : 'text-gray-400'}>{tab.icon}</div>
              <span className="font-thai text-sm font-semibold">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Setting Content Panel */}
        <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-black/10 via-purple-950/5 to-black/30">
          <AnimatePresence mode="wait">
            {activeSubTab === 'controls' && (
              <motion.div
                key="controls"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-purple-950/20 border border-purple-900/20 rounded-xl p-4 flex gap-3 items-start">
                  <HelpCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 font-thai leading-relaxed">
                    คลิกปุ่มสีม่วงแล้วกดปุ่มบนคีย์บอร์ดที่ต้องการเพื่อเปลี่ยนปุ่มควบคุม ปุ่มเหล่านีจะนำไปใช้ในการควบคุมตัวละครในฉากทดสอบการเล่นเกมจริงได้!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'forward', label: 'เดินหน้า (Move Forward)' },
                    { key: 'backward', label: 'ถอยหลัง (Move Backward)' },
                    { key: 'left', label: 'เลี้ยวซ้าย (Move Left)' },
                    { key: 'right', label: 'เลี้ยวขวา (Move Right)' },
                    { key: 'jump', label: 'กระโดด (Jump)' },
                    { key: 'dash', label: 'แดชตัว (Dash / Roll)' },
                    { key: 'attack', label: 'โจมตีปกติ (Attack)' },
                    { key: 'skill', label: 'ใช้สกิลพิเศษ (Special Skill)' },
                  ].map(({ key, label }) => {
                    const isBinding = bindingKey === key;
                    return (
                      <div
                        key={key}
                        className="flex justify-between items-center bg-white/5 hover:bg-white/10 border border-purple-900/10 rounded-xl p-3.5 transition-all"
                      >
                        <span className="font-thai text-xs font-semibold text-gray-300">{label}</span>
                        <button
                          onClick={() => {
                            handleClick();
                            setBindingKey(key as keyof KeyBindings);
                          }}
                          onMouseEnter={handleHover}
                          className={`min-w-[80px] px-3 py-1.5 rounded-lg font-mono text-xs font-bold border-none cursor-pointer transition-all duration-300 ${
                            isBinding
                              ? 'bg-purple-500 text-white animate-pulse shadow-[0_0_15px_#a855f7]'
                              : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/50 hover:text-white'
                          }`}
                        >
                          {isBinding ? 'กดปุ่ม...' : keyBindings[key as keyof KeyBindings]}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeSubTab === 'graphics' && (
              <motion.div
                key="graphics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Presets */}
                <div className="space-y-2">
                  <label className="block font-thai text-sm text-gray-300 font-semibold">คุณภาพกราฟิกโดยรวม (Quality Preset)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'ultra'] as const).map((pr) => (
                      <button
                        key={pr}
                        onClick={() => handlePresetChange(pr)}
                        onMouseEnter={handleHover}
                        className={`py-2 rounded-lg font-thai font-bold text-xs border transition-all uppercase cursor-pointer ${
                          graphicsSettings.preset === pr
                            ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                            : 'bg-black/30 text-gray-400 border-purple-950/40 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {pr === 'low'
                          ? 'ต่ำ'
                          : pr === 'medium'
                          ? 'กลาง'
                          : pr === 'high'
                          ? 'สูง'
                          : 'สูงสุด'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub Graphics Options */}
                <div className="space-y-4 pt-2 border-t border-purple-900/20">
                  <div className="flex justify-between items-center bg-white/5 rounded-xl p-3.5">
                    <div>
                      <span className="block font-thai text-sm text-gray-200">ความละเอียดหน้าจอ (Resolution)</span>
                      <span className="block font-thai text-[11px] text-gray-500">ปรับขนาดจอให้คมชัดที่สุดตามอุปกรณ์</span>
                    </div>
                    <select
                      value={graphicsSettings.resolution}
                      onChange={(e) => {
                        handleClick();
                        setGraphicsSettings((prev) => ({ ...prev, resolution: e.target.value }));
                      }}
                      className="bg-black/80 border border-purple-900/30 text-white rounded-lg p-1.5 text-xs font-mono font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="1280x720">1280 x 720 (720p)</option>
                      <option value="1920x1080">1920 x 1080 (1080p)</option>
                      <option value="2560x1440">2560 x 1440 (2K)</option>
                      <option value="Fit to Screen">Fit to Screen (Auto)</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 rounded-xl p-3.5">
                    <div>
                      <span className="block font-thai text-sm text-gray-200">การแสดงผลแบบมีเส้นแสกนไลน์ (Scanlines)</span>
                      <span className="block font-thai text-[11px] text-gray-500">สร้างฟิลเตอร์สไตล์ตู้เกมอาร์เคดเรโทรสุดคลาสสิก</span>
                    </div>
                    <button
                      onClick={() => {
                        handleClick();
                        setGraphicsSettings((prev) => ({ ...prev, scanlines: !prev.scanlines }));
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-thai font-bold transition-all border cursor-pointer ${
                        graphicsSettings.scanlines
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500'
                          : 'bg-black/30 text-gray-400 border-purple-950/40 hover:bg-white/5'
                      }`}
                    >
                      {graphicsSettings.scanlines ? 'เปิดใช้งาน (ON)' : 'ปิดใช้งาน (OFF)'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 rounded-xl p-3.5">
                    <div>
                      <span className="block font-thai text-sm text-gray-200">บลูม / แสงเรืองรอง (Bloom Glow)</span>
                      <span className="block font-thai text-[11px] text-gray-500">เพิ่มรัศมีออร่าเรืองแสงให้กับปุ่มและพื้นผิวสีนีออน</span>
                    </div>
                    <button
                      onClick={() => {
                        handleClick();
                        setGraphicsSettings((prev) => ({ ...prev, bloom: !prev.bloom }));
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-thai font-bold transition-all border cursor-pointer ${
                        graphicsSettings.bloom
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500'
                          : 'bg-black/30 text-gray-400 border-purple-950/40 hover:bg-white/5'
                      }`}
                    >
                      {graphicsSettings.bloom ? 'เปิดใช้งาน (ON)' : 'ปิดใช้งาน (OFF)'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 rounded-xl p-3.5">
                    <div>
                      <span className="block font-thai text-sm text-gray-200">จำกัดอัตราเฟรมสูงสุด (FPS Cap)</span>
                      <span className="block font-thai text-[11px] text-gray-500">จำกัดขอบเขตเฟรมเพื่อประหยัดทรัพยากรการประมวลผล</span>
                    </div>
                    <select
                      value={graphicsSettings.fpsLimit}
                      onChange={(e) => {
                        handleClick();
                        setGraphicsSettings((prev) => ({ ...prev, fpsLimit: parseInt(e.target.value) }));
                      }}
                      className="bg-black/80 border border-purple-900/30 text-white rounded-lg p-1.5 text-xs font-mono font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="30">30 FPS</option>
                      <option value="60">60 FPS</option>
                      <option value="120">120 FPS</option>
                      <option value="240">240 FPS</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'audio' && (
              <motion.div
                key="audio"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center bg-white/5 rounded-xl p-4">
                  <div>
                    <span className="block font-thai text-sm text-gray-200 font-semibold">เปิด/ปิดเสียงทั้งหมด (Audio Master Enable)</span>
                    <span className="block font-thai text-xs text-gray-500">สลับการทำงานของดนตรีประกอบและเอฟเฟกต์สังเคราะห์</span>
                  </div>
                  <button
                    onClick={handleSoundToggle}
                    className={`px-5 py-2 rounded-lg text-xs font-thai font-bold transition-all border cursor-pointer ${
                      audioSettings.soundEnabled
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-rose-950/20 text-rose-400 border-rose-900/40 hover:bg-white/5'
                    }`}
                  >
                    {audioSettings.soundEnabled ? 'เปิดใช้งาน (ENABLED)' : 'ปิดเสียง (MUTED)'}
                  </button>
                </div>

                <div className="space-y-5 pt-4 border-t border-purple-900/20">
                  {[
                    { key: 'masterVolume', label: 'ระดับเสียงหลัก (Master Volume)' },
                    { key: 'musicVolume', label: 'ระดับเสียงเพลงประกอบ (Music Ambient)' },
                    { key: 'sfxVolume', label: 'ระดับเสียงเอฟเฟกต์ (Sound Effects)' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-xs font-thai font-medium text-gray-300">
                        <span>{label}</span>
                        <span className="font-mono font-bold text-purple-400">
                          {Math.round(audioSettings[key as keyof AudioSettings] as number * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        disabled={!audioSettings.soundEnabled}
                        value={audioSettings[key as keyof AudioSettings] as number}
                        onChange={(e) => handleVolumeChange(key as keyof AudioSettings, parseFloat(e.target.value))}
                        className={`w-full h-1.5 rounded-lg bg-purple-950 accent-purple-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Options Footer / Back Button */}
      <div className="p-4 bg-purple-950/20 border-t border-purple-900/20 flex justify-end gap-3">
        <button
          onClick={() => {
            handleClick();
            onBack();
          }}
          onMouseEnter={handleHover}
          className="px-6 py-2 bg-purple-700 hover:bg-purple-600 font-thai font-bold text-white rounded-lg transition-all border-none outline-none cursor-pointer hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]"
        >
          กลับหน้าหลัก (Back)
        </button>
      </div>
    </motion.div>
  );
};
