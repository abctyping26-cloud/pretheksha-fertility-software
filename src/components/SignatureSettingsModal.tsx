import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type ClinicSignatureItem,
  fetchClinicSignatures,
  createClinicSignature,
  deleteClinicSignature,
} from "../services/api";
import {
  PenTool,
  Upload,
  RotateCcw,
  Check,
  Trash2,
  Star,
  X,
} from "lucide-react";

interface SignatureSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSignatureId?: string | null;
  onSelectSignature: (sig: ClinicSignatureItem) => void;
}

export const SignatureSettingsModal: React.FC<SignatureSettingsModalProps> = ({
  isOpen,
  onClose,
  activeSignatureId,
  onSelectSignature,
}) => {
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [signatures, setSignatures] = useState<ClinicSignatureItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // New Signature Form State
  const [doctorName, setDoctorName] = useState<string>("Dr. Pretheeksha");
  const [doctorTitle, setDoctorTitle] = useState<string>("Consultant Fertility Specialist");
  const [isDefaultSig, setIsDefaultSig] = useState<boolean>(true);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // Local System Favorite State (Stored in System/Browser Storage per device)
  const [favSignatureId, setFavSignatureId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("pretheeksha_system_fav_signature_id");
    } catch {
      return null;
    }
  });

  // Canvas Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Load signatures from database
  const loadSignatures = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchClinicSignatures();
      if (res.data) {
        setSignatures(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSignatures();
      try {
        setFavSignatureId(localStorage.getItem("pretheeksha_system_fav_signature_id"));
      } catch {}
    }
  }, [isOpen, loadSignatures]);

  // Canvas initialization
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Support High DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#181b20";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (isOpen && mode === "draw") {
      // Short delay to let DOM render canvas bounding box
      const timer = setTimeout(() => {
        initCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode, initCanvas]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    if (lastPointRef.current) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasDrawn(true);
    }
    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  // Image upload handling
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setUploadedImagePreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Signature
  const handleSaveSignature = async () => {
    if (!doctorName.trim()) {
      alert("Please enter the doctor or signatory name");
      return;
    }

    let signatureDataUrl = "";
    if (mode === "draw") {
      if (!hasDrawn || !canvasRef.current) {
        alert("Please draw a signature on the board");
        return;
      }
      signatureDataUrl = canvasRef.current.toDataURL("image/png");
    } else {
      if (!uploadedImagePreview) {
        alert("Please upload a signature image file");
        return;
      }
      signatureDataUrl = uploadedImagePreview;
    }

    setIsSaving(true);
    try {
      const res = await createClinicSignature({
        name: doctorName.trim(),
        title: doctorTitle.trim(),
        signatureData: signatureDataUrl,
        source: mode === "draw" ? "drawn" : "uploaded",
        isDefault: isDefaultSig,
      });

      if (res.data) {
        if (isDefaultSig) {
          try {
            localStorage.setItem("pretheeksha_system_fav_signature_id", res.data._id);
            setFavSignatureId(res.data._id);
          } catch {}
        }
        onSelectSignature(res.data);
        clearCanvas();
        setUploadedImagePreview(null);
        await loadSignatures();
        onClose();
      }
    } catch (err: any) {
      alert(err.message || "Failed to save signature");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle/Set favorite signature on this local system (localStorage)
  const handleToggleFavorite = (sig: ClinicSignatureItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem("pretheeksha_system_fav_signature_id", sig._id);
      setFavSignatureId(sig._id);
      onSelectSignature(sig);
    } catch (err: any) {
      alert("Failed to save favorite locally");
    }
  };

  // Delete signature
  const handleDeleteSignature = async (sig: ClinicSignatureItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete signature for ${sig.name}?`)) return;
    try {
      await deleteClinicSignature(sig._id);
      if (favSignatureId === sig._id) {
        try {
          localStorage.removeItem("pretheeksha_system_fav_signature_id");
          setFavSignatureId(null);
        } catch {}
      }
      await loadSignatures();
    } catch (err: any) {
      alert(err.message || "Failed to delete signature");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton={true} className="w-[95vw] max-w-2xl p-6 gap-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Doctor Signatures
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Mode Selector */}
        <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-[6px]">
          <button
            type="button"
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-[4px] transition-all flex items-center justify-center gap-1.5 ${
              mode === "draw"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
            onClick={() => setMode("draw")}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Draw Signature Board</span>
          </button>

          <button
            type="button"
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-[4px] transition-all flex items-center justify-center gap-1.5 ${
              mode === "upload"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
            onClick={() => setMode("upload")}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Image File</span>
          </button>
        </div>

        {/* Mode 1: Drawing Board */}
        {mode === "draw" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-medium">Draw your signature with mouse, pen or finger:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] rounded-[4px]"
                onClick={clearCanvas}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                <span>Clear</span>
              </Button>
            </div>

            <div className="relative border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-950/40 rounded-lg overflow-hidden h-[160px]">
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-neutral-400">
                  Draw signature here
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode 2: Upload Image */}
        {mode === "upload" && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Select signature image (PNG, JPG, SVG with transparent/white background):
            </span>

            <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-950/40 rounded-lg p-5 flex flex-col items-center justify-center gap-3">
              {uploadedImagePreview ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="h-28 w-full max-w-[280px] bg-white border border-neutral-200 dark:border-neutral-800 rounded-[6px] p-2 flex items-center justify-center">
                    <img
                      src={uploadedImagePreview}
                      alt="Signature preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-[4px]"
                    onClick={() => setUploadedImagePreview(null)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    <span>Choose Different Image</span>
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full py-6">
                  <Upload className="h-8 w-8 text-neutral-400" />
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    Click to browse signature file
                  </span>
                  <span className="text-[11px] text-neutral-400">PNG, JPG, SVG up to 5MB</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Signatory Metadata Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Doctor / Signatory Name
            </label>
            <Input
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="e.g. Dr. Pretheeksha"
              className="h-8 text-xs rounded-[4px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Designation / Title
            </label>
            <Input
              value={doctorTitle}
              onChange={(e) => setDoctorTitle(e.target.value)}
              placeholder="e.g. Consultant Fertility Specialist"
              className="h-8 text-xs rounded-[4px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 gap-4">
          <label
            className="cursor-pointer text-xs font-medium text-neutral-700 dark:text-neutral-300 select-none"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={isDefaultSig}
              onChange={(e) => setIsDefaultSig(e.target.checked)}
              style={{
                width: "16px",
                minWidth: "16px",
                maxWidth: "16px",
                height: "16px",
                padding: 0,
                margin: 0,
                flexShrink: 0,
                cursor: "pointer",
                accentColor: "#09090b",
              }}
              className="rounded-[3px] border-neutral-300 cursor-pointer"
            />
            <span style={{ whiteSpace: "nowrap" }}>Set as Favorite on this System</span>
          </label>

          <Button
            variant="default"
            size="sm"
            className="h-8 px-4 text-xs font-semibold rounded-[4px] shrink-0"
            onClick={handleSaveSignature}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save & Apply to Invoice"}
          </Button>
        </div>

        {/* Stored Doctor Signatures Gallery */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            Stored Doctor Signatures ({signatures.length})
          </span>

          {isLoading ? (
            <div className="text-xs text-neutral-400 py-4 text-center">Loading signatures...</div>
          ) : signatures.length === 0 ? (
            <div className="text-xs text-neutral-400 py-4 text-center">No signatures stored yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {signatures.map((sig) => {
                const isActive = activeSignatureId === sig._id;
                const isFav = favSignatureId === sig._id || (!favSignatureId && sig.isDefault);
                return (
                  <div
                    key={sig._id}
                    onClick={() => {
                      onSelectSignature(sig);
                      onClose();
                    }}
                    className={`relative p-3 rounded-[6px] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isActive
                        ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
                        : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/40 hover:border-neutral-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    <div className="h-12 w-full flex items-center justify-center bg-white dark:bg-neutral-950 rounded-[4px] border border-neutral-200/60 dark:border-neutral-800 p-1">
                      <img
                        src={sig.signatureData}
                        alt={sig.name}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {sig.name}
                        </span>
                        {sig.title && (
                          <span className="text-[11px] text-neutral-500 truncate">{sig.title}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title={isFav ? "Favorite Signature on this System" : "Set as Favorite on this System"}
                          onClick={(e) => handleToggleFavorite(sig, e)}
                          className={`p-1 rounded-[4px] transition-colors ${
                            isFav
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/60"
                              : "text-neutral-400 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <Star
                            className={`h-3 w-3 ${
                              isFav ? "fill-amber-500 text-amber-500" : ""
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          title="Delete Signature"
                          onClick={(e) => handleDeleteSignature(sig, e)}
                          className="p-1 rounded-[4px] text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-1.5 py-0.5 rounded-[3px]">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
