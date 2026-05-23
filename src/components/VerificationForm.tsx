import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, ChevronUp, FileCheck, RefreshCw, QrCode, FileText, ExternalLink, Download, AlertTriangle } from "lucide-react";
import { Country, COUNTRIES, Certificate } from "../types";
import QRCode from "qrcode";

export default function VerificationForm() {
  const [certificateNumber, setCertificateNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>("Chile");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showEmptyError, setShowEmptyError] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Results
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedCert, setVerifiedCert] = useState<Certificate | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update empty error state dynamically
  useEffect(() => {
    if (certificateNumber.trim().length > 0) {
      setShowEmptyError(false);
    }
  }, [certificateNumber]);

  // Generate QR code for verified certificate
  useEffect(() => {
    if (isVerified && verifiedCert) {
      const appUrl = window.location.origin;
      const pdfUrl = `${appUrl}/uploads/${verifiedCert.pdfFilename}`;
      QRCode.toDataURL(pdfUrl, { width: 300, margin: 2 }, (err, url) => {
        if (!err) {
          setQrCodeDataUrl(url);
        } else {
          console.error("Error generating public QR:", err);
        }
      });
    } else {
      setQrCodeDataUrl("");
    }
  }, [isVerified, verifiedCert]);

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certificateNumber.trim()) {
      setShowEmptyError(true);
      return;
    }

    setShowEmptyError(false);
    setIsSearching(true);
    setSearchAttempted(false);
    setErrorMessage("");

    try {
      // Query the dynamic public verify endpoint
      const res = await fetch(`/api/verify?certificateNumber=${encodeURIComponent(certificateNumber.trim())}&country=${encodeURIComponent(selectedCountry)}`);
      if (!res.ok) {
        throw new Error("Error en la conexión con el servicio de verificación.");
      }

      const data = await res.json();
      if (data.verified) {
        setIsVerified(true);
        setVerifiedCert(data.certificate);
      } else {
        setIsVerified(false);
        setVerifiedCert(null);
        setErrorMessage(data.message || "Certificado o Informe no encontrado.");
      }
      setSearchAttempted(true);
    } catch (err: any) {
      setIsVerified(false);
      setVerifiedCert(null);
      setErrorMessage(err.message || "Error al conectar con la base de datos de Equifax.");
      setSearchAttempted(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResetSearch = () => {
    setCertificateNumber("");
    setSelectedCountry("Chile");
    setSearchAttempted(false);
    setIsVerified(false);
    setVerifiedCert(null);
    setErrorMessage("");
  };

  const isButtonEnabled = certificateNumber.trim().length > 0;

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8 font-sans" id="verification-app-view">
      
      {!searchAttempted ? (
        <div className="bg-white rounded-md shadow-sm border border-gray-100 p-6">
          <h2 className="text-[#333333] font-medium text-lg mb-6 tracking-tight">
            Verificación de Certificados o Informes
          </h2>

          <form onSubmit={handleConsultar} className="space-y-6">
            {/* Certificate Number Input */}
            <div>
              <label className="block text-xs font-semibold text-[#9E1B32] uppercase tracking-wider mb-1">
                N° de Certificado:*
              </label>
              <input
                type="text"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                autoFocus
                placeholder=""
                className={`w-full px-3 py-3 border-b bg-[#fafafa] text-sm focus:outline-none focus:bg-white transition-all ${
                  showEmptyError 
                    ? "border-red-600 focus:border-red-600" 
                    : "border-gray-200 focus:border-[#9E1B32]"
                }`}
                id="verify-cert-input"
              />
              
              {/* Mandatory fields alert matching the Equifax style */}
              {(showEmptyError || certificateNumber.trim() === "") && (
                <p className="text-[11px] text-red-600 mt-1 font-medium select-none" id="cert-required-text">
                  *Campo obligatorio
                </p>
              )}
            </div>

            {/* Country Selector - Custom styling to clone Equifax dropdown */}
            <div>
              <label className="block text-xs font-semibold text-[#9E1B32] uppercase tracking-wider mb-1">
                País:*
              </label>
              
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={handleDropdownToggle}
                  className="w-full text-left px-3 py-3 border-b border-gray-200 bg-[#eff1f4] text-sm flex items-center justify-between focus:outline-none transition-all cursor-pointer"
                  id="country-dropdown-trigger"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-normal select-none">--Seleccione--</span>
                    <span className="text-gray-800 font-medium">{selectedCountry}</span>
                  </div>
                  {isDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#9E1B32]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#9E1B32]" />
                  )}
                </button>

                {/* Country Dropdown options Popover - Clones screenshot 2 */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 overflow-hidden" id="country-dropdown-popover">
                    <div className="py-1">
                      {COUNTRIES.map((ctry) => (
                        <button
                          key={ctry}
                          type="button"
                          onClick={() => handleCountrySelect(ctry)}
                          className="w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer text-gray-700"
                        >
                          <span className={`${ctry === selectedCountry ? "font-bold text-gray-950" : "font-normal"}`}>
                            {ctry}
                          </span>
                          {ctry === selectedCountry && (
                            <Check className="w-4 h-4 text-[#9E1B32]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit button - disabled/grey or active/burgundy based on typing */}
            <div className="pt-4 flex justify-center">
              <button
                type="submit"
                disabled={isSearching}
                className={`px-8 py-2.5 text-sm font-medium rounded transition duration-150 border flex items-center justify-center space-x-2 cursor-pointer ${
                  isButtonEnabled 
                    ? "bg-[#9E1B32] text-white hover:bg-[#851627] border-[#9E1B32]" 
                    : "bg-[#e5e7eb] text-gray-400 border-gray-200 cursor-not-allowed"
                }`}
                id="verify-submit-button"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <span>Consultar</span>
                )}
              </button>
            </div>
          </form>

          {/* Equifax description legal clone */}
          <p className="text-xs text-gray-500 font-normal leading-relaxed text-center mt-8 pt-4 border-t border-gray-100 max-w-sm mx-auto">
            A través de Certificados, evitas falsificación de documentos y aseguras la autenticidad del certificado que te ha sido entregado a través de las plataformas proporcionadas por Equifax
          </p>
        </div>
      ) : (
        /* verification resolution block */
        <div className="bg-white rounded-md shadow-md border border-gray-100 p-6 animate-fade-in" id="verification-resolution-view">
          
          {isVerified && verifiedCert ? (
            /* VERIFIED */
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mb-3 shadow-md">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-emerald-800">
                  ¡Certificado Verificado con Éxito!
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                  Este es un documento auténtico y vigente registrado en Equifax.
                </p>
              </div>

              {/* Certificate metadata showcase */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-xs text-gray-700 space-y-2.5">
                <div className="border-b pb-1.5 mb-1 flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <span>Detalles Oficiales</span>
                  <span className="text-emerald-600 font-normal">Activo</span>
                </div>
                
                <div className="flex flex-col space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">N° de Certificado:</span>
                  <span className="font-mono text-sm font-bold text-gray-900 select-all break-all pr-2">
                    {verifiedCert.certificateNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">País de Validez:</span>
                    <span className="font-bold text-gray-800 text-xs">{verifiedCert.country}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">Fecha Registro:</span>
                    <span className="font-semibold text-gray-800 text-xs">
                      {new Date(verifiedCert.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* File action buttons */}
              <div className="space-y-2.5">
                <a
                  href={`/uploads/${verifiedCert.pdfFilename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#9E1B32] hover:bg-[#851627] text-white py-3 px-4 font-bold rounded transition text-xs flex items-center justify-center gap-2 shadow-sm"
                  id="open-pdf-certified-button"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  Visualizar Documento PDF Confirmado
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                {/* QR code reader - specifically requested by user to auto-generate and direct download */}
                {qrCodeDataUrl && (
                  <div className="bg-white border rounded-lg p-5 flex flex-col items-center text-center shadow-xs">
                    <p className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                      <QrCode className="w-4 h-4 text-[#9E1B32]" />
                      Código QR de Validación Directa
                    </p>
                    <p className="text-[10px] text-gray-400 max-w-[260px] leading-relaxed mb-3">
                      Cualquier persona puede escanear este código QR para acceder y verificar directamente el archivo PDF original de este informe en su celular.
                    </p>
                    
                    <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg mb-3">
                      <img
                        src={qrCodeDataUrl}
                        alt="Código QR de verificación"
                        className="w-44 h-44 object-contain shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <a
                      href={qrCodeDataUrl}
                      download={`QR-Equifax-${verifiedCert.certificateNumber}.png`}
                      className="inline-flex items-center gap-1.5 text-xs text-[#9E1B32] font-bold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Imagen del QR para imprimir
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-800 p-2 text-decoration-none transition"
                  id="reset-search-verified-button"
                >
                  ← Validar Otro Certificado
                </button>
              </div>

            </div>
          ) : (
            /* NOT VERIFIED / ERROR */
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center p-5 bg-red-50 rounded-lg border border-red-100">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-red-800">
                  Verificación Rechazada
                </h3>
                <p className="text-xs text-red-600 font-medium mt-1 leading-relaxed max-w-xs">
                  {errorMessage || "El certificado ingresado no es válido o no corresponde al país seleccionado."}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1.5 leading-relaxed">
                <p className="font-bold text-gray-800 text-[10px] uppercase">Recomendaciones:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Revise que no existan espacios en blanco al inicio o al final del número.</li>
                  <li>Compruebe si seleccionó el país correcto (ej: <span className="font-semibold">{selectedCountry}</span>).</li>
                  <li>Asegúrese de haber escrito la combinación exacta de letras, números y guiones.</li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded text-xs py-2.5 font-bold transition flex items-center justify-center gap-1"
                  id="reset-search-failed-button"
                >
                  Intentar Nuevamente
                </button>
              </div>
            </div>
          )}

          {/* Guarantee foot block */}
          <p className="text-xs text-gray-400 font-normal leading-relaxed text-center mt-6 pt-4 border-t border-gray-100">
            Equifax promueve la transparencia y validación libre de documentos financieros y de identidad para combatir la falsificación.
          </p>
        </div>
      )}

    </div>
  );
}
