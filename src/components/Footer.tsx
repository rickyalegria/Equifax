import React from "react";
import { Settings } from "lucide-react";

interface FooterProps {
  onAdminClick: () => void;
}

export default function Footer({ onAdminClick }: FooterProps) {
  return (
    <footer className="bg-[#4d555d] text-gray-300 py-8 px-6 mt-auto border-t border-gray-600">
      <div className="max-w-4xl w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0 text-xs font-sans">
        {/* Left Side branding */}
        <div className="flex flex-col space-y-2">
          {/* EFX logo representation in Footer */}
          <div className="flex items-center space-x-0.5 select-none text-gray-400 font-bold italic tracking-tighter text-lg leading-none">
            <span>EFX</span>
            <span className="text-[8px] tracking-normal not-italic relative -top-2">®</span>
          </div>
          <p className="text-gray-400">
            Copyright {new Date().getFullYear()} Equifax Inc. Todos los derechos reservados.
          </p>
          <p className="text-gray-400 leading-relaxed md:max-w-md">
            Equifax es marca comercial de Equifax Inc. y sus filiales. Todas las demás marcas registradas son de titularidad de Equifax Inc. y sus filiales.
          </p>
        </div>

        {/* Right Side Info & Hidden Admin Gear */}
        <div className="flex flex-row md:flex-col justify-between items-end w-full md:w-auto relative">
          <div className="text-right text-gray-400">
            <p className="font-semibold text-gray-300">Servicio al Cliente</p>
            <p className="text-sm tracking-wide">600 378 4329</p>
            <p className="text-[10px] text-gray-500 hover:text-gray-200">soporte@equifax.com</p>
          </div>

          {/* Admin Gear Trigger */}
          <button
            onClick={onAdminClick}
            className="absolute -bottom-4 right-0 p-2 text-gray-400 md:text-gray-500 opacity-20 hover:opacity-100 transition-all focus:outline-none flex items-center justify-center cursor-pointer"
            title="Administración"
            id="admin-gear-button"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
