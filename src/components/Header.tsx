import React from "react";

export default function Header() {
  return (
    <header className="bg-[#9E1B32] py-4 px-6 md:px-12 flex items-center shadow-md">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        {/* EFX Brand Logo */}
        <div className="flex items-center space-x-1 select-none">
          <span className="text-white font-sans font-black italic text-3xl tracking-tighter">
            EFX
          </span>
          <span className="text-white text-[10px] font-sans font-normal relative -top-3 left-0.5">
            ®
          </span>
        </div>
      </div>
    </header>
  );
}
