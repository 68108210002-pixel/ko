import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Flame, Zap, User, ArrowRight, Sparkles } from 'lucide-react';
import { CharacterClass } from '../types';
import { CHARACTER_CLASSES } from '../data';
import { playHoverSound, playClickSound } from '../utils/audio';

interface CharacterSelectProps {
  selectedClass: CharacterClass;
  setSelectedClass: (cls: CharacterClass) => void;
  characterName: string;
  setCharacterName: (name: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  soundEnabled: boolean;
  sfxVolume: number;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  selectedClass,
  setSelectedClass,
  characterName,
  setCharacterName,
  onBack,
  onConfirm,
  soundEnabled,
  sfxVolume,
}) => {
  const [activeSkinColor, setActiveSkinColor] = useState<string>('hue-rotate-0'); // color shifts via CSS filter!

  const skinColors = [
    { id: 'hue-rotate-0', name: 'Original', class: 'bg-indigo-500' },
    { id: 'hue-rotate-90', name: 'Acid Green', class: 'bg-emerald-500' },
    { id: 'hue-rotate-180', name: 'Ember Red', class: 'bg-rose-500' },
    { id: 'hue-rotate-[270deg]', name: 'Cyber Neon', class: 'bg-fuchsia-500' },
  ];

  const handleHover = () => {
    if (soundEnabled) {
      playHoverSound(sfxVolume);
    }
  };

  const handleClick = () => {
    if (soundEnabled) {
      playClickSound(sfxVolume);
    }
  };

  const handleClassChange = (cls: CharacterClass) => {
    handleClick();
    setSelectedClass(cls);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="w-full h-full flex flex-col md:grid md:grid-cols-12 gap-6"
      id="char-select-root"
    >
      {/* Left panel: Character Selection (Grid columns 1-7) */}
      <div className="md:col-span-7 flex flex-col bg-black/60 backdrop-blur-xl border border-purple-900/35 rounded-2xl p-6 shadow-2xl justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl md:text-2xl font-thai font-extrabold text-white tracking-wide">
              เลือกตัวละคร <span className="text-purple-400">Select Character</span>
            </h2>
            <p className="font-thai text-xs text-gray-400 mt-1">
              เลือกสายพลังและทักษะพิเศษประจำตัวก่อนเริ่มต้นออกเดินทางผจญภัย
            </p>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <label className="block font-thai text-sm text-gray-300 font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" /> ชื่อตัวละคร (Character Name)
            </label>
            <input
              type="text"
              maxLength={15}
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="กรอกชื่อตัวละครของคุณ..."
              className="w-full bg-purple-950/25 border border-purple-900/40 rounded-xl px-4 py-3 text-white font-thai text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-purple-300/35"
            />
          </div>

          {/* Class selection buttons */}
          <div className="space-y-3">
            <label className="block font-thai text-sm text-gray-300 font-bold">
              สายอาชีพตัวละคร (Select Class)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CHARACTER_CLASSES.map((cls) => {
                const isSelected = selectedClass.id === cls.id;
                return (
                  <button
                    key={cls.id}
                    onClick={() => handleClassChange(cls)}
                    onMouseEnter={handleHover}
                    className={`p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer flex flex-col ${
                      isSelected
                        ? `bg-gradient-to-br ${cls.color} text-white border-transparent shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-[1.02]`
                        : 'bg-purple-950/15 text-gray-400 border-purple-900/25 hover:bg-white/5 hover:border-purple-900/40'
                    }`}
                  >
                    <span className="font-thai font-bold text-base">{cls.thaiName}</span>
                    <span className="font-mono text-[10px] uppercase opacity-75 mt-0.5">{cls.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Skills */}
          <div className="bg-purple-950/20 border border-purple-900/25 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 text-sm font-bold font-thai">
              <Sparkles className="w-4 h-4" /> สกิลประจำตัว: {selectedClass.skillName}
            </div>
            <p className="font-thai text-xs text-gray-300 leading-relaxed">
              {selectedClass.skillDesc}
            </p>
          </div>
        </div>

        {/* Back and Confirm Controls */}
        <div className="flex gap-4 mt-6 border-t border-purple-900/20 pt-4 justify-between items-center">
          <button
            onClick={() => {
              handleClick();
              onBack();
            }}
            onMouseEnter={handleHover}
            className="px-5 py-2.5 bg-black/40 hover:bg-white/5 font-thai text-xs font-bold text-gray-400 hover:text-white rounded-lg transition-all border-none cursor-pointer"
          >
            ย้อนกลับ (Back)
          </button>
          <button
            onClick={() => {
              handleClick();
              onConfirm();
            }}
            onMouseEnter={handleHover}
            disabled={!characterName.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-thai text-sm font-bold text-white rounded-lg transition-all border-none cursor-pointer hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            สร้างตัวละคร & เข้าเล่น (Create) <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right panel: Live Stat Analyzer & Player Preview (Grid columns 8-12) */}
      <div className="md:col-span-5 flex flex-col gap-6">
        {/* Character Visual Preview */}
        <div className="flex-1 bg-black/60 backdrop-blur-xl border border-purple-900/35 rounded-2xl p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl min-h-[350px]">
          {/* Subtle technological elements */}
          <div className="absolute top-3 left-3 text-[10px] font-mono text-purple-500/50">SYSTEM_PREVIEW_MAPPED</div>
          <div className="absolute bottom-3 right-3 text-[10px] font-mono text-purple-500/50">HUE_FILTER_ACTIVE</div>

          {/* Portal glow ring */}
          <div className="absolute w-56 h-56 rounded-full border-2 border-dashed border-purple-500/25 animate-spin" style={{ animationDuration: '20s' }} />
          <div className="absolute w-48 h-48 rounded-full bg-purple-900/10 blur-xl" />

          {/* Character Skin customizer */}
          <div className="z-10 flex gap-1.5 self-end text-xs font-thai font-medium text-gray-400 bg-black/40 px-2 py-1 rounded-full border border-purple-950">
            {skinColors.map((color) => (
              <button
                key={color.id}
                onClick={() => {
                  handleClick();
                  setActiveSkinColor(color.id);
                }}
                className={`w-4 h-4 rounded-full border-2 transition-all ${color.class} ${
                  activeSkinColor === color.id ? 'scale-125 border-white' : 'border-transparent'
                }`}
                title={color.name}
              />
            ))}
          </div>

          {/* Actual player image */}
          <div className="flex-1 flex justify-center items-center z-10 my-4 relative">
            <motion.img
              key={selectedClass.id + activeSkinColor}
              src="https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png"
              alt="Player Character"
              className={`w-36 h-36 object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.7)] transition-all duration-500 select-none ${activeSkinColor}`}
              referrerPolicy="no-referrer"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="z-10 text-center">
            <span className="font-thai font-bold text-sm text-purple-400 tracking-wider">
              {characterName || 'ฮีโร่ไร้นาม'}
            </span>
            <div className="font-mono text-xs text-gray-400 mt-0.5">
              CLASS: {selectedClass.name.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Live Stat Analyzer */}
        <div className="bg-black/60 backdrop-blur-xl border border-purple-900/35 rounded-2xl p-6 shadow-2xl">
          <h3 className="font-thai font-bold text-sm text-gray-300 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" /> คุณสมบัติพื้นฐาน (Base Stats)
          </h3>
          <div className="space-y-4">
            {[
              { label: 'พลังชีวิต (HP)', value: selectedClass.stats.health, icon: <Shield className="w-3.5 h-3.5 text-rose-400" /> },
              { label: 'พลังโจมตี (ATK)', value: selectedClass.stats.power, icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
              { label: 'ความเร็ว (SPD)', value: selectedClass.stats.speed, icon: <Zap className="w-3.5 h-3.5 text-cyan-400" /> },
              { label: 'เกราะป้องกัน (DEF)', value: selectedClass.stats.defense, icon: <Shield className="w-3.5 h-3.5 text-emerald-400" /> },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="flex justify-between items-center text-xs font-thai font-semibold text-gray-400">
                  <span className="flex items-center gap-1">{stat.icon} {stat.label}</span>
                  <span className="font-mono font-bold text-white">{stat.value}</span>
                </div>
                <div className="w-full h-2 bg-purple-950/40 rounded-full overflow-hidden border border-purple-900/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.value}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r ${selectedClass.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
