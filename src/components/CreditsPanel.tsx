import React from 'react';
import { motion } from 'motion/react';
import { Shield, Users, Globe, ExternalLink } from 'lucide-react';
import { playHoverSound, playClickSound } from '../utils/audio';

interface CreditsPanelProps {
  onBack: () => void;
  soundEnabled: boolean;
  sfxVolume: number;
}

export const CreditsPanel: React.FC<CreditsPanelProps> = ({
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
      id="credits-container"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl md:text-2xl font-thai font-extrabold text-white tracking-wide flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" /> คณะผู้จัดทำ <span className="text-purple-400">Credits</span>
          </h2>
          <p className="font-thai text-xs text-gray-400 mt-1">
            รายชื่อผู้ร่วมขับเคลื่อน สรรค์สร้างงานดีไซน์ และซอฟต์แวร์คุณภาพ
          </p>
        </div>

        {/* Info Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-purple-950/10 border border-purple-900/15 rounded-xl p-4 space-y-4">
            <h3 className="font-thai font-bold text-sm text-purple-300 flex items-center gap-2 pb-1.5 border-b border-purple-950">
              👥 ทีมผู้สร้างสรรค์ (Development Team)
            </h3>
            <div className="space-y-3">
              <div>
                <span className="font-thai text-xs text-gray-400 block">อาจารย์ผู้ควบคุมวิชา / ผู้ให้โจทย์</span>
                <span className="font-thai text-sm text-white font-bold">อาจารย์บรรยพล (banyapon)</span>
              </div>
              <div>
                <span className="font-thai text-xs text-gray-400 block">สถาบันการศึกษา</span>
                <span className="font-thai text-sm text-white font-bold">มหาวิทยาลัยราชพฤกษ์ (RPU)</span>
              </div>
              <div>
                <span className="font-thai text-xs text-gray-400 block">วิศวกรรมสถาปัตยกรรม UI / โค้ดดิ้ง</span>
                <span className="font-thai text-sm text-purple-400 font-extrabold">Google AI Studio Build Agent</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-950/10 border border-purple-900/15 rounded-xl p-4 space-y-4">
            <h3 className="font-thai font-bold text-sm text-purple-300 flex items-center gap-2 pb-1.5 border-b border-purple-950">
              🛠️ เทคโนโลยีที่เลือกใช้ (Technology Stack)
            </h3>
            <div className="space-y-3">
              {[
                { name: 'React (v19) & TypeScript', desc: 'โครงสร้างคอมโพเนนต์และการพิมพ์ปลอดภัย' },
                { name: 'Tailwind CSS (v4)', desc: 'ปรับแต่งดีไซน์ด้วยยูทิลิตีคลาสระดับพิกเซล' },
                { name: 'Motion (by Motion/React)', desc: 'ระบบแอนิเมชันลื่นไหลและทรานซิชันฟิสิกส์' },
                { name: 'Web Audio API', desc: 'สังเคราะห์เสียง retro SFX สดแบบเรียลไทม์' },
              ].map((tech, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs font-thai">
                  <div>
                    <span className="text-white font-bold block">{tech.name}</span>
                    <span className="text-gray-500 text-[10px]">{tech.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Open Source Asset credits */}
        <div className="bg-purple-950/15 border border-purple-900/20 rounded-xl p-3.5 text-xs font-thai text-gray-300 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-purple-300">ลิขสิทธิ์แอสเซทการ์ตูนตัวละคร (Asset License)</span>
            <span className="text-gray-400 text-[11px] leading-relaxed block">
              รูปภาพตัวละคร <code>player.png</code> ลิขสิทธิ์โดย banyapon บน GitHub ใช้สำหรับศึกษาและการพัฒนาระบบคลาสห้องเรียนวิชาสร้างเกมและการออกแบบซอฟต์แวร์
            </span>
          </div>
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
