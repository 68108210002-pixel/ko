import React from 'react';
import { motion } from 'motion/react';
import { MenuTab } from '../types';
import { playHoverSound, playClickSound } from '../utils/audio';

interface MainMenuProps {
  currentTab: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  soundEnabled: boolean;
  sfxVolume: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onTabChange,
  soundEnabled,
  sfxVolume,
}) => {
  const menuItems: { id: MenuTab; label: string; desc: string }[] = [
    { id: 'start', label: 'เริ่มต้นเดินทาง (Start Game)', desc: 'เลือกตัวละครและเข้าสู่โลกแห่งการผจญภัย' },
    { id: 'options', label: 'ตั้งค่าระบบ (Options)', desc: 'ปรับแต่งปุ่มควบคุมและคุณภาพการแสดงผลกราฟิก' },
    { id: 'how-to', label: 'วิธีเล่น (How to Play)', desc: 'ศึกษาวิธีการควบคุมและการโจมตีเบื้องต้น' },
    { id: 'credits', label: 'คณะผู้จัดทำ (Credits)', desc: 'รายชื่อผู้ร่วมสรรค์สร้างผลงานและเทคโนโลยี' },
    { id: 'exit', label: 'ออกจากเกม (Exit Game)', desc: 'หยุดพักผ่อนและบันทึกประวัติการผจญภัย' },
  ];

  const handleHover = () => {
    if (soundEnabled) {
      playHoverSound(sfxVolume);
    }
  };

  const handleClick = (tab: MenuTab) => {
    if (soundEnabled) {
      playClickSound(sfxVolume);
    }
    onTabChange(tab);
  };

  return (
    <nav className="flex flex-col gap-4 text-left w-full max-w-md md:max-w-lg select-none pl-4 md:pl-12" id="game-main-nav">
      {menuItems.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
          className="group relative py-2"
        >
          {/* Subtle neon sidebar hover indicator */}
          <span className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-1 h-0 bg-cyan-400 group-hover:h-8 transition-all duration-300 rounded-full shadow-[0_0_8px_#22d3ee]" />

          <button
            onClick={() => handleClick(item.id)}
            onMouseEnter={handleHover}
            className="w-full text-left bg-transparent border-0 outline-none cursor-pointer focus:outline-none p-0"
          >
            {/* 
              Strictly following the user instruction:
              - "ปุ่ม ไม่เอา border ขอแค่ font ใช้ Google Font "noto sans thai" ตัวหนาด้วยและเพิ่มเงาให้ปุ่มเวลาเอาเมาส์ชี้"
              Using font-thai font-extrabold with text drop shadow on hover.
            */}
            <span
              className="block font-thai font-extrabold text-2xl md:text-3xl tracking-wide text-gray-300 group-hover:text-white transition-all duration-300 ease-out select-none
                group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.95)] group-hover:scale-105 origin-left"
            >
              {item.label}
            </span>
            <span
              className="block font-thai font-normal text-xs md:text-sm text-gray-500 group-hover:text-purple-300/80 transition-all duration-300 mt-0.5 select-none"
            >
              {item.desc}
            </span>
          </button>
        </motion.div>
      ))}
    </nav>
  );
};
