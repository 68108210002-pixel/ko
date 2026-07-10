import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Key, Compass, Award } from 'lucide-react';
import { KeyBindings } from '../types';
import { playHoverSound, playClickSound } from '../utils/audio';

interface HowToPlayProps {
  keyBindings: KeyBindings;
  onBack: () => void;
  soundEnabled: boolean;
  sfxVolume: number;
}

export const HowToPlay: React.FC<HowToPlayProps> = ({
  keyBindings,
  onBack,
  soundEnabled,
  sfxVolume,
}) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="w-full h-full flex flex-col bg-black/60 backdrop-blur-xl border border-purple-900/35 rounded-2xl p-6 shadow-2xl justify-between"
      id="how-to-play-container"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl md:text-2xl font-thai font-extrabold text-white tracking-wide flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-purple-400" /> วิธีการเล่น <span className="text-purple-400">How to Play</span>
          </h2>
          <p className="font-thai text-xs text-gray-400 mt-1">
            เรียนรู้วิธีการควบคุมปุ่มและทักษะพิเศษเพื่อปกป้องโลกไซเบอร์
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls list */}
          <div className="space-y-4">
            <h3 className="font-thai font-bold text-sm text-purple-300 flex items-center gap-1.5 border-b border-purple-950 pb-2">
              <Compass className="w-4 h-4" /> ปุ่มควบคุมการเดินทาง
            </h3>
            <div className="space-y-2.5">
              {[
                { name: 'เคลื่อนที่ไปข้างหน้า (Move Forward)', binding: keyBindings.forward, desc: 'เดินตรงไปด้านหน้าของแผนที่' },
                { name: 'ถอยกลับด้านหลัง (Move Backward)', binding: keyBindings.backward, desc: 'ก้าวถอยหลังรักษาระยะห่างจากศัตรู' },
                { name: 'เคลื่อนที่ไปด้านซ้าย (Move Left)', binding: keyBindings.left, desc: 'เลี้ยวหรือเดินซ้ายหลบหลีก' },
                { name: 'เคลื่อนที่ไปด้านขวา (Move Right)', binding: keyBindings.right, desc: 'เลี้ยวหรือเดินขวาหลบหลีก' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 rounded-xl p-3 border border-purple-900/10">
                  <div>
                    <span className="font-thai text-xs text-gray-200 block font-bold">{item.name}</span>
                    <span className="font-thai text-[10px] text-gray-500">{item.desc}</span>
                  </div>
                  <span className="font-mono text-xs font-bold bg-purple-950/50 text-purple-300 border border-purple-900/30 px-2.5 py-1 rounded">
                    {item.binding}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action skills */}
          <div className="space-y-4">
            <h3 className="font-thai font-bold text-sm text-purple-300 flex items-center gap-1.5 border-b border-purple-950 pb-2">
              <Award className="w-4 h-4" /> ปุ่มแอ็กชันและทักษะต่อสู้
            </h3>
            <div className="space-y-2.5">
              {[
                { name: 'กระโดดกลางอากาศ (Jump)', binding: keyBindings.jump, desc: 'กระโดดขึ้นเพื่อข้ามสิ่งกีดขวางหรือหลบกระสุน' },
                { name: 'พุ่งตัวอย่างรวดเร็ว (Dash)', binding: keyBindings.dash, desc: 'แดชตัวเคลื่อนไหวว่องไวอย่างรวดเร็วเป็นแนวราบ' },
                { name: 'โจมตีปกติ (Attack)', binding: keyBindings.attack, desc: 'ทำการแกว่งดาบหรือปล่อยพลังยิงปกติ' },
                { name: 'ใช้สกิลไม้ตาย (Special Skill)', binding: keyBindings.skill, desc: 'เรียกพลังพิเศษของสายอาชีพคุณสร้างความเสียหายรุนแรง' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 rounded-xl p-3 border border-purple-900/10">
                  <div>
                    <span className="font-thai text-xs text-gray-200 block font-bold">{item.name}</span>
                    <span className="font-thai text-[10px] text-gray-500">{item.desc}</span>
                  </div>
                  <span className="font-mono text-xs font-bold bg-purple-950/50 text-purple-300 border border-purple-900/30 px-2.5 py-1 rounded">
                    {item.binding}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Keybinding notice tip */}
        <div className="bg-purple-950/15 border border-purple-900/20 rounded-xl p-3.5 text-xs font-thai text-gray-300 flex items-start gap-2">
          <Key className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <span>
            คุณสามารถปรับแต่งปุ่มทั้งหมดข้างต้นได้ตามสะดวกที่เมนู <strong>ตั้งค่าระบบ (Options) &gt; การควบคุม</strong> ปุ่มของคุณจะอัปเดตและพร้อมใช้งานในสนามรบทันที!
          </span>
        </div>
      </div>

      {/* Footer back btn */}
      <div className="flex justify-end border-t border-purple-900/20 pt-4 mt-6">
        <button
          onClick={() => {
            handleClick();
            onBack();
          }}
          onMouseEnter={handleHover}
          className="px-6 py-2 bg-purple-700 hover:bg-purple-600 font-thai font-bold text-white rounded-lg transition-all border-none cursor-pointer hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]"
        >
          กลับหน้าหลัก (Back)
        </button>
      </div>
    </motion.div>
  );
};
