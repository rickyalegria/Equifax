import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Edit, Trash2, LogOut, FileText, CheckCircle, Search, 
  Upload, X, RefreshCw, Key, Shield, Globe, Calendar, ArrowLeft, ExternalLink, QrCode, Download
} from "lucide-react";
import { Certificate, COUNTRIES, Country } from "../types";
import QRCode from "qrcode";

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  // Authentication states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("adminToken"));
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Certificates directory states
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Create / Edit Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [certNumber, setCertNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>("Chile");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  
  // Drag and drop highlights
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active QR preview state
  const [qrModalCert, setQrModalCert] = useState<Certificate | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Load certificates list if authenticated
  useEffect(() => {
    if (token) {
      loadCertificates();
    }
  }, [token]);

  // Load QR preview
  useEffect(() => {
    if (qrModalCert) {
      // Dynamic resolution of host for the PDF direct URL
      const appUrl = window.location.origin;
      const pdfUrl = `${appUrl}/uploads/${qrModalCert.pdfFilename}`;
      QRCode.toDataURL(pdfUrl, { width: 350, margin: 2 }, (err, url) => {
        if (!err) {
          setQrCodeDataUrl(url);
        } else {
          console.error("Error generating QR:", err);
        }
      });
    } else {
      setQrCodeDataUrl("");
    }
  }, [qrModalCert]);

  // Fetch certificates from Express backend
  const loadCertificates = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/certificates", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        logout();
        throw new Error("Sesión expirada. Por favor inicie sesión de nuevo.");
      }
      if (!res.ok) {
        throw new Error("No se pudieron cargar los certificados.");
      }
      const data = await res.json();
      setCertificates(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Login execution
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("adminToken", data.token);
        setToken(data.token);
        setUsername("");
        setPassword("");
      } else {
        setLoginError(data.error || "Credenciales no válidas.");
      }
    } catch (err) {
      setLoginError("Error de conexión al servidor.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setCertificates([]);
    setSuccessMessage("");
    setErrorMessage("");
  };

  // Form drag-drop helpers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setFileError("");
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Solo se permiten archivos en formato PDF (.pdf)");
      setSelectedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setFileError("El tamaño del archivo excede el límite de 10 MB.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  // Submit create or edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!certNumber.trim()) {
      setErrorMessage("El número de certificado es obligatorio.");
      return;
    }

    if (!isEditing && !selectedFile) {
      setErrorMessage("Debe subir un archivo PDF para el nuevo certificado.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("certificateNumber", certNumber.trim());
    formData.append("country", selectedCountry);
    if (selectedFile) {
      formData.append("pdf", selectedFile);
    }

    try {
      let url = "/api/admin/certificates";
      let method = "POST";

      if (isEditing && editId) {
        url = `/api/admin/certificates/${editId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData // Must omit "Content-Type" for file uploads with boundary
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al procesar el certificado.");
      }

      setSuccessMessage(
        isEditing 
          ? "Certificado actualizado exitosamente." 
          : "Certificado registrado y cargado exitosamente."
      );
      
      // Reset form
      resetForm();
      // Reload list
      loadCertificates();

    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con la base de datos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (cert: Certificate) => {
    setIsEditing(true);
    setEditId(cert.id);
    setCertNumber(cert.certificateNumber);
    setSelectedCountry(cert.country as Country);
    setSelectedFile(null);
    setFileError("");
    setErrorMessage("");
    setSuccessMessage("");
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = async (id: string, number: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar el certificado N° ${number}? Esta acción borrará permanentemente el PDF cargado.`)) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/admin/certificates/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo eliminar el certificado.");
      }

      setSuccessMessage("Certificado eliminado correctamente.");
      loadCertificates();
      if (isEditing && editId === id) {
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al borrar el certificado.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setCertNumber("");
    setSelectedCountry("Chile");
    setSelectedFile(null);
    setFileError("");
  };

  // Filter list
  const filteredCertificates = certificates.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.certificateNumber.toLowerCase().includes(term) ||
      c.country.toLowerCase().includes(term)
    );
  });

  // Login screen
  if (!token) {
    return (
      <div className="max-w-md w-full mx-auto px-4 py-16 flex flex-col justify-center min-h-[60vh] font-sans" id="login-container">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-[#9E1B32] rounded-full flex items-center justify-center text-white mb-3 shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight text-center">
              Panel Administrativo Equifax
            </h2>
            <p className="text-xs text-gray-500 text-center mt-1">
              Ingrese con sus credenciales de seguridad autorizadas.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center space-x-2">
              <div className="font-extrabold text-[14px]">!</div>
              <p>{loginError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: Equifax"
                required
                className="w-full px-3 py-2 border rounded border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#9E1B32]"
                id="login-username-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 border rounded border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#9E1B32]"
                id="login-password-input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#9E1B32] text-white py-2 text-sm font-medium hover:bg-[#851627] transition border rounded cursor-pointer flex justify-center items-center gap-2"
              id="login-submit-button"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <button
            onClick={onClose}
            className="w-full mt-3 text-center text-xs text-gray-500 hover:text-gray-800 transition py-2"
            id="login-cancel-button"
          >
            ← Volver a Verificación Pública
          </button>
        </div>
      </div>
    );
  }

  // Dashboard screen
  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-8 font-sans" id="admin-dashboard">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-4 mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-extrabold text-[#9E1B32] uppercase tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Consola Administrativa EFX
          </h1>
          <p className="text-xs text-gray-500">
            Registra certificados oficiales para que la ciudadanía pueda verificarlos de forma segura.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 border rounded transition flex items-center gap-1 cursor-pointer"
            id="dashboard-back-button"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Verificador
          </button>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 border rounded transition flex items-center gap-1 cursor-pointer"
            id="dashboard-logout-button"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 text-sm rounded border border-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-800 text-sm rounded border border-red-200 flex items-center gap-2">
          <div className="font-extrabold text-lg text-red-600 shrink-0">!</div>
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-gray-100 p-5 sticky top-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2 mb-4">
              {isEditing ? "Editar Certificado" : "Nuevo Certificado"}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  N° de Certificado *
                </label>
                <input
                  type="text"
                  required
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  placeholder="Ej: 3003r2578-310g-..."
                  className="w-full px-3 py-2 border rounded border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#9E1B32]"
                  id="dashboard-cert-number-input"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Debe ingresarse exactamente igual al documento físico.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  País *
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value as Country)}
                  className="w-full px-3 py-2 border rounded bg-white border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#9E1B32]"
                  id="dashboard-country-select"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Archivo PDF *
                </label>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? "border-[#9E1B32] bg-red-50 text-red-900" 
                      : selectedFile 
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900" 
                        : "border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-500"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                    id="dashboard-file-input"
                  />
                  
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 text-emerald-600 mb-1" />
                      <p className="text-xs font-medium text-gray-800 line-clamp-1">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Listo para subir
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 mb-1 animate-pulse" />
                      <p className="text-xs font-normal">
                        Arrastre su PDF aquí o <span className="font-semibold text-gray-700 underline">busque</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Solo archivos PDF hasta 10MB
                      </p>
                    </div>
                  )}
                </div>

                {fileError && <p className="text-[10px] text-red-600 mt-1">{fileError}</p>}
                
                {isEditing && !selectedFile && (
                  <p className="text-[10px] text-amber-600 mt-1 bg-amber-50 p-1.5 rounded">
                    Sugerencia: Deje este campo vacío para mantener el archivo PDF actual.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-[#9E1B32] text-white py-2 text-xs font-bold uppercase tracking-wider rounded-md hover:bg-[#851627] transition border border-[#9E1B32] cursor-pointer flex justify-center items-center gap-1.5"
                  id="dashboard-submit-button"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isEditing ? (
                    <>
                      <Edit className="w-3.5 h-3.5" />
                      Guardar Cambios
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Registrar
                    </>
                  )}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 bg-gray-200 text-gray-700 py-2 text-xs font-bold uppercase rounded-md hover:bg-gray-300 transition border border-gray-300 cursor-pointer"
                    id="dashboard-cancel-edit"
                  >
                    X
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Certificates List Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-gray-100 p-5">
            
            {/* Search/Filter Bar */}
            <div className="flex items-center space-x-2 mb-6">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por n° de certificado, país..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#9E1B32]"
                  id="dashboard-search-input"
                />
              </div>
              <button
                onClick={loadCertificates}
                className="p-2 border rounded border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 transition"
                title="Sincronizar Lista"
                id="dashboard-refresh-list-btn"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Table */}
            {isLoading && certificates.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-16">
                <RefreshCw className="w-8 h-8 text-[#9E1B32] animate-spin mb-2" />
                <p className="text-xs text-gray-500 font-medium">Sincronizando expedientes...</p>
              </div>
            ) : filteredCertificates.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-lg">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-500">Ningún certificado registrado</p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchTerm ? "Intente buscar con otros términos" : "Utilice el formulario de la izquierda para ingresar un nuevo certificado."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="admin-certs-table">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-gray-50">
                      <th className="py-3 px-3">N° de Certificado</th>
                      <th className="py-3 px-3">País</th>
                      <th className="py-3 px-3 hidden md:table-cell">Archivo PDF</th>
                      <th className="py-3 px-3">QR PDF</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-medium text-gray-900 break-all select-all">
                          {cert.certificateNumber}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center space-x-1 font-semibold text-gray-800">
                            <Globe className="w-3 h-3 text-gray-400" />
                            <span>{cert.country}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 hidden md:table-cell text-gray-500 truncate max-w-[140px]" title={cert.pdfOriginalName}>
                          <a 
                            href={`/uploads/${cert.pdfFilename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 font-medium text-blue-600 hover:underline"
                          >
                            <FileText className="w-3 h-3 text-red-500 shrink-0" />
                            <span>Ver PDF</span>
                          </a>
                        </td>
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => setQrModalCert(cert)}
                            className="inline-flex items-center space-x-1 text-xs text-gray-600 hover:text-[#9E1B32] font-semibold bg-gray-100 px-2 py-1 rounded transition border cursor-pointer border-gray-200"
                            title="Generar y Ver QR Asociado"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex justify-end space-x-1">
                            <button
                              onClick={() => handleEditClick(cert)}
                              className="p-1 px-2 text-gray-600 hover:bg-gray-200 border rounded cursor-pointer transition flex items-center gap-0.5"
                              title="Editar"
                            >
                              <Edit className="w-3 h-3" />
                              <span className="text-[10px] hidden sm:inline">Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(cert.id, cert.certificateNumber)}
                              className="p-1 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 border rounded cursor-pointer transition flex items-center gap-0.5"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span className="text-[10px] hidden sm:inline">Borrar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QR Preview Dialog/Modal */}
      {qrModalCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl border max-w-sm w-full p-6 relative animate-scale-up">
            <button
              onClick={() => setQrModalCert(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition duration-150"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-10 h-10 bg-red-100 text-[#9E1B32] rounded-full flex items-center justify-center mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              
              <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
                Código QR de Acceso Directo
              </h3>
              <p className="text-xs text-gray-500 max-w-[260px] mt-1">
                Al escanear este código, el ciudadano será llevado directamente al archivo PDF verificado de Equifax.
              </p>

              {/* QR Image */}
              <div className="my-5 p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Código QR del PDF verificado"
                    className="w-52 h-52 object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
                  </div>
                )}
              </div>

              {/* PDF info */}
              <div className="w-full bg-gray-50 rounded-lg p-3 text-left border border-gray-100 text-xs space-y-1.5 mb-2">
                <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                  Detalles del Certificado
                </p>
                <p className="font-mono font-medium text-gray-900 break-all bg-white p-1 border rounded text-[10px]">
                  N°: {qrModalCert.certificateNumber}
                </p>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>País:</span>
                  <span className="font-semibold text-gray-800">{qrModalCert.country}</span>
                </div>
              </div>

              <div className="w-full flex space-x-2 pt-2">
                <a
                  href={`/uploads/${qrModalCert.pdfFilename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-3 text-xs font-semibold rounded-md transition duration-150 flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir PDF
                </a>
                
                {qrCodeDataUrl && (
                  <a
                    href={qrCodeDataUrl}
                    download={`QR-Certificado-${qrModalCert.certificateNumber}.png`}
                    className="flex-1 bg-[#9E1B32] hover:bg-[#851627] text-white py-2 px-3 text-xs font-semibold rounded-md transition duration-150 flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar QR
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
