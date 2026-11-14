"use client";

import React, { useState, useRef } from "react";
import { 
  BlueprintProject, 
  RoomSpec, 
  ALL_PRESETS, 
  CASA_SERRA_PRESET, 
  ArchitecturalStyle, 
  FloorMaterialType, 
  Orientation, 
  TimeOfDay,
  convertBlueprintProjectToLayoutData,
  updateProjectFromLayoutData
} from "@/lib/floorplan-types";
import { scanBlueprintWithAI } from "@/lib/floorplan-ai-scanner";
import { exportLayoutDataToGLB } from "@/lib/floorplan-glb-exporter";
import VectorCorrectionCanvas from "./VectorCorrectionCanvas";
import StylePicker from "./StylePicker";
import { applyStyleToBlueprintProject, SYSTEM_STYLE_PRESETS } from "@/lib/floorplan-auto-staging";

interface BlueprintInputModalProps {
  initialProject?: BlueprintProject;
  onApply: (project: BlueprintProject) => void;
  onClose?: () => void;
}

export default function BlueprintInputModal({
  initialProject = CASA_SERRA_PRESET,
  onApply,
  onClose
}: BlueprintInputModalProps) {
  const [activeTab, setActiveTab] = useState<"source" | "style" | "specs" | "rooms">("source");
  const [project, setProject] = useState<BlueprintProject>(JSON.parse(JSON.stringify(initialProject)));
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialProject.originalBlueprintUrl || null);
  const [isScanning, setIsScanning] = useState(false);
  const [isExportingGLB, setIsExportingGLB] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isEditingVector, setIsEditingVector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportGLB = async () => {
    setIsExportingGLB(true);
    setScanMessage("Packaging the full 3D scene as a compressed .GLB file...");
    try {
      const layoutData = convertBlueprintProjectToLayoutData(project);
      const res = await exportLayoutDataToGLB(layoutData, { autoDownload: true });
      setScanMessage(`✓ Downloaded 3D file ${res.filename} (${res.sizeKb} KB)!`);
    } catch (err: any) {
      setScanMessage(`3D export failed: ${err?.message || "Could not export .GLB"}`);
    } finally {
      setIsExportingGLB(false);
    }
  };

  // Switch preset
  const handleSelectPreset = (preset: BlueprintProject) => {
    setProject(JSON.parse(JSON.stringify(preset)));
    setUploadedImage(null);
    setScanMessage(`Loaded sample floor plan: ${preset.name} (${preset.specs.totalArea} m²)`);
  };

  // Switch architectural style & adapt materials
  const handleSelectStyle = (style: ArchitecturalStyle) => {
    const updated = applyStyleToBlueprintProject(project, style);
    setProject(updated);
    setScanMessage(`✓ Applied the ${SYSTEM_STYLE_PRESETS[style]?.vietnameseName || style} style!`);
  };

  // Smart auto-stage furniture and layout
  const handleAutoStage = (style: ArchitecturalStyle) => {
    const updated = applyStyleToBlueprintProject(project, style);
    setProject(updated);
    setScanMessage(`✓ Staged the furniture and applied materials for the ${SYSTEM_STYLE_PRESETS[style]?.vietnameseName || style} style!`);
  };

  // Upload image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setUploadedImage(b64);
      setScanMessage("Floor plan image loaded. Select 'Scan with AI' or adjust the settings below.");
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI Scan
  const handleTriggerAIScan = async () => {
    if (!uploadedImage) {
      alert("Upload a 2D floor plan image before scanning with AI.");
      return;
    }
    setIsScanning(true);
    setScanMessage("Vision AI is analyzing the architecture and identifying walls, rooms, and dimensions...");

    try {
      const res = await scanBlueprintWithAI(uploadedImage, `Requested style: ${project.specs.style}`);
      if (res.project) {
        setProject(res.project);
        setScanMessage(
          res.source === "ai" 
            ? `✓ AI extracted ${res.project.rooms.length} rooms from the floor plan!`
            : `✓ Extracted the architectural layout with ${res.project.rooms.length} rooms!`
        );
        setActiveTab("rooms"); // Move user to review rooms
      }
    } catch (err: any) {
      setScanMessage(`Scan failed: ${err?.message || "Could not analyze the image"}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Update building spec field
  const handleUpdateSpec = (field: keyof typeof project.specs, value: any) => {
    if (field === "style") {
      setProject((prev) => applyStyleToBlueprintProject(prev, value as ArchitecturalStyle));
    } else {
      setProject((prev) => ({
        ...prev,
        specs: {
          ...prev.specs,
          [field]: value
        }
      }));
    }
  };

  // Room editing
  const handleUpdateRoom = (index: number, field: keyof RoomSpec, value: any) => {
    setProject((prev) => {
      const nextRooms = [...prev.rooms];
      nextRooms[index] = {
        ...nextRooms[index],
        [field]: value
      };
      return { ...prev, rooms: nextRooms };
    });
  };

  const handleUpdateRoomBounds = (index: number, boundIndex: number, val: number) => {
    setProject((prev) => {
      const nextRooms = [...prev.rooms];
      const curBounds = [...nextRooms[index].bounds] as [number, number, number, number];
      curBounds[boundIndex] = val;
      // Recalculate area: |x1 - x0| * |z1 - z0|
      const width = Math.abs(curBounds[2] - curBounds[0]);
      const depth = Math.abs(curBounds[3] - curBounds[1]);
      const newArea = Math.round(width * depth);
      
      nextRooms[index] = {
        ...nextRooms[index],
        bounds: curBounds,
        area: newArea > 0 ? newArea : nextRooms[index].area
      };
      return { ...prev, rooms: nextRooms };
    });
  };

  const handleAddRoom = () => {
    const newRoom: RoomSpec = {
      id: `room-${Date.now()}`,
      name: `New Room ${project.rooms.length + 1}`,
      vietnameseName: `New Room ${project.rooms.length + 1}`,
      category: "living",
      bounds: [0, 0, 4, 4],
      area: 16,
      ceilingHeight: project.specs.ceilingHeight,
      floorMaterial: project.specs.baseFloorMaterial,
      description: "An open space added to the floor plan",
      specs: { orientation: "Natural", ventilation: "Cross-ventilated", lightSource: "Window" }
    };
    setProject((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
  };

  const handleRemoveRoom = (index: number) => {
    if (project.rooms.length <= 1) {
      alert("The floor plan must contain at least one room.");
      return;
    }
    setProject((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-[#141518] border border-[#2b2f38] shadow-2xl text-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232730] bg-[#1a1d24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
              📐
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-white flex items-center gap-2">
                Import a 2D Floor Plan & Configure Real-World Dimensions
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Casa Serra Engine
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Enter architectural specifications so the system can build an accurate 3D model.
              </p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-[#232730] bg-[#101216] px-6 gap-2">
          <button
            onClick={() => setActiveTab("source")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "source" 
                ? "border-amber-400 text-amber-300 bg-amber-400/5" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>1. Floor Plan Source & AI Scan</span>
          </button>
          <button
            onClick={() => setActiveTab("style")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "style" 
                ? "border-amber-400 text-amber-300 bg-amber-400/5" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>2. Style & Furniture Staging</span>
          </button>
          <button
            onClick={() => setActiveTab("specs")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "specs" 
                ? "border-amber-400 text-amber-300 bg-amber-400/5" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>3. Architectural Specifications</span>
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "rooms" 
                ? "border-amber-400 text-amber-300 bg-amber-400/5" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>4. Room Details ({project.rooms.length})</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: SOURCE & PRESETS & AI SCAN */}
          {activeTab === "source" && (
            <div className="space-y-6">
              {/* Presets Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-3">
                  Option 1: Choose a Real-World Architectural Sample
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ALL_PRESETS.map((p) => {
                    const isSelected = project.id === p.id && !uploadedImage;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`cursor-pointer rounded-xl p-4 border transition ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-400 text-white shadow-lg shadow-amber-500/5"
                            : "bg-[#181b22] border-[#292e3a] hover:border-neutral-500 text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-mono">
                            {p.code}
                          </span>
                          <span className="text-xs font-semibold text-neutral-400">
                            {p.specs.totalArea} m²
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-white mb-1">{p.name}</h4>
                        <p className="text-xs text-neutral-400 mb-2 line-clamp-2">{p.subtitle}</p>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <span>🚪 {p.rooms.length} rooms</span>
                          <span>•</span>
                          <span>📏 {p.specs.scale}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload Blueprint Image */}
              <div className="border-t border-[#232730] pt-6">
                <label className="block text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-3">
                  Option 2: Upload Your 2D Floor Plan (Image / CAD / Sketch)
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#343b49] hover:border-amber-400/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[#14171e] transition group text-center min-h-[180px]"
                  >
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                    <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-amber-400/20 text-neutral-400 group-hover:text-amber-400 flex items-center justify-center text-2xl mb-3 transition">
                      ⬆
                    </div>
                    <span className="text-sm font-medium text-neutral-200 group-hover:text-amber-300">
                      Click to choose an image or drag a floor plan here
                    </span>
                    <span className="text-xs text-neutral-500 mt-1">
                      Supports JPG, PNG, WEBP, CAD floor plans, and site plans
                    </span>
                  </div>

                  {/* Preview & AI Scan CTA */}
                  <div className="bg-[#181b22] border border-[#2a2f3b] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-neutral-400 font-medium">Current floor plan:</span>
                        {uploadedImage && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            ● Image uploaded
                          </span>
                        )}
                      </div>
                      
                      {uploadedImage ? (
                        <div className="w-full h-28 rounded-lg overflow-hidden border border-[#343b49] bg-black flex items-center justify-center mb-3">
                          <img 
                            src={uploadedImage} 
                            alt="Blueprint Preview" 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      ) : (
                        <div className="w-full h-28 rounded-lg border border-dashed border-[#2a2f3b] bg-black/20 flex items-center justify-center text-xs text-neutral-500 mb-3">
                          No image uploaded (using {project.name})
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleTriggerAIScan}
                      disabled={isScanning || !uploadedImage}
                      className="w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                    >
                      {isScanning ? (
                        <>
                          <span className="animate-spin text-base">⚙</span>
                          <span>Scanning floor plan with AI...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Scan with AI & Detect Rooms</span>
                        </>
                      )}
                    </button>

                    {uploadedImage && (
                      <button
                        onClick={() => setIsEditingVector(true)}
                        className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/60 text-cyan-300"
                        title="Open the drawing tools to trace and correct walls on the source plan"
                      >
                        <span>✏️ Edit Vector Lines on the Floor Plan</span>
                      </button>
                    )}
                  </div>
                </div>

                {scanMessage && (
                  <div className="mt-3 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-neutral-300">
                    {scanMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ARCHITECTURAL STYLE & AUTO-STAGING */}
          {activeTab === "style" && (
            <div className="space-y-6">
              <StylePicker
                currentStyle={project.specs.style}
                onSelectStyle={handleSelectStyle}
                onAutoStage={handleAutoStage}
              />
              {scanMessage && (
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-neutral-300">
                  {scanMessage}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ARCHITECTURAL SPECS */}
          {activeTab === "specs" && (
            <div className="space-y-6">
              {/* Project Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Project / Property Name</label>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => setProject({ ...project, name: e.target.value })}
                    className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none "
                    placeholder="e.g. Casa Serra, Riverside Townhouse..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Technical Drawing Number</label>
                  <input
                    type="text"
                    value={project.code}
                    onChange={(e) => setProject({ ...project, code: e.target.value })}
                    className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none  font-mono"
                    placeholder="VD: A-101 rev D"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Drawing Scale</label>
                  <select
                    value={project.specs.scale}
                    onChange={(e) => handleUpdateSpec("scale", e.target.value)}
                    className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none "
                  >
                    <option value="1:50">1:50 (Interior detail)</option>
                    <option value="1:100">1:100 (Construction standard)</option>
                    <option value="1:200">1:200 (Master plan, such as Casa Serra)</option>
                  </select>
                </div>
              </div>

              {/* Exact Dimensions & Structural Parameters */}
              <div className="border-t border-[#232730] pt-4">
                <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-3">
                  Building Geometry & Structure
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Floor Plan Width (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={project.specs.width}
                      onChange={(e) => handleUpdateSpec("width", parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none  font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Floor Plan Length (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={project.specs.length}
                      onChange={(e) => handleUpdateSpec("length", parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none  font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Total Floor Area (m²)</label>
                    <input
                      type="number"
                      value={project.specs.totalArea}
                      onChange={(e) => handleUpdateSpec("totalArea", parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none  font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Ceiling Height (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={project.specs.ceilingHeight}
                      onChange={(e) => handleUpdateSpec("ceilingHeight", parseFloat(e.target.value) || 3.0)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none  font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Exterior Wall Thickness (m)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={project.specs.exteriorWallThickness}
                      onChange={(e) => handleUpdateSpec("exteriorWallThickness", parseFloat(e.target.value) || 0.2)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none  font-mono"
                    />
                    <span className="text-[11px] text-neutral-500 mt-0.5 block">
                      Thermal double-wall standard: 0.20 m–0.25 m (200–250 mm)
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Interior Wall Thickness (m)
                    </label>
                    <input
                      type="number"
                      step="0.02"
                      value={project.specs.interiorWallThickness}
                      onChange={(e) => handleUpdateSpec("interiorWallThickness", parseFloat(e.target.value) || 0.1)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none  font-mono"
                    />
                    <span className="text-[11px] text-neutral-500 mt-0.5 block">
                      Standard interior partition: 0.10 m (100 mm)
                    </span>
                  </div>
                </div>
              </div>

              {/* Environment, Sun & Material Style */}
              <div className="border-t border-[#232730] pt-4">
                <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-3">
                  Natural Lighting & Material Style
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Main Building Orientation</label>
                    <select
                      value={project.specs.orientation}
                      onChange={(e) => handleUpdateSpec("orientation", e.target.value as Orientation)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none "
                    >
                      <option value="S">South (cool breezes, soft sunlight)</option>
                      <option value="SE">Southeast (ideal for Vietnam's climate)</option>
                      <option value="E">East (morning sunlight)</option>
                      <option value="NE">Northeast</option>
                      <option value="N">North (even, diffused light)</option>
                      <option value="SW">Southwest</option>
                      <option value="W">West (afternoon sunlight)</option>
                      <option value="NW">Northwest</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Time of Day</label>
                    <select
                      value={project.specs.timeOfDay}
                      onChange={(e) => handleUpdateSpec("timeOfDay", e.target.value as TimeOfDay)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none "
                    >
                      <option value="golden_hour">Sunset / Golden hour (Casa Serra)</option>
                      <option value="morning">Early morning (fresh light)</option>
                      <option value="noon">Midday (vertical shadows)</option>
                      <option value="night">Night (warm interior lighting)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Architectural Style</label>
                    <select
                      value={project.specs.style}
                      onChange={(e) => handleUpdateSpec("style", e.target.value as ArchitecturalStyle)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none "
                    >
                      <option value="casa_serra">Casa Serra Brutalist (Concrete & natural wood)</option>
                      <option value="modern_minimal">Modern Minimalist</option>
                      <option value="scandinavian">Scandinavian (Warm & bright)</option>
                      <option value="luxury_marble">Luxury Marble</option>
                      <option value="tropical">Tropical Resort</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Primary Floor Material</label>
                    <select
                      value={project.specs.baseFloorMaterial}
                      onChange={(e) => handleUpdateSpec("baseFloorMaterial", e.target.value as FloorMaterialType)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none "
                    >
                      <option value="concrete">Polished concrete</option>
                      <option value="oak">Natural oak</option>
                      <option value="marble">Italian marble</option>
                      <option value="tile">Matte architectural tile</option>
                      <option value="dark_wood">Dark walnut</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROOM-BY-ROOM BREAKDOWN */}
          {activeTab === "rooms" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Room Details ({project.rooms.length} rooms)
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Edit each room's name, dimensions [X0, Z0, X1, Z1], area, and finish materials.
                  </p>
                </div>
                <button
                  onClick={handleAddRoom}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>+ Add Room</span>
                </button>
              </div>

              {/* Room Cards / Rows */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {project.rooms.map((room, idx) => (
                  <div
                    key={room.id}
                    className="p-4 rounded-xl bg-[#171a21] border border-[#262b36] hover:border-[#384050] transition space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-neutral-800 text-neutral-400 text-xs font-mono flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => handleUpdateRoom(idx, "name", e.target.value)}
                          className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-neutral-500  focus:outline-none text-white px-1"
                          placeholder="Room name"
                        />
                        <span className="text-xs text-neutral-500 font-mono">({room.name})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={room.category}
                          onChange={(e) => handleUpdateRoom(idx, "category", e.target.value)}
                          className="bg-[#20242e] border border-[#303644] rounded px-2 py-1 text-xs text-neutral-300"
                        >
                          <option value="living">Living Room</option>
                          <option value="kitchen">Kitchen & Dining</option>
                          <option value="bedroom">Bedroom</option>
                          <option value="bath">Bathroom / Spa</option>
                          <option value="outdoor">Garden / Patio</option>
                          <option value="hallway">Lobby / Hallway</option>
                          <option value="utility">Dressing Room / Storage</option>
                          <option value="office">Office</option>
                        </select>

                        <select
                          value={room.floorMaterial || project.specs.baseFloorMaterial}
                          onChange={(e) => handleUpdateRoom(idx, "floorMaterial", e.target.value)}
                          className="bg-[#20242e] border border-[#303644] rounded px-2 py-1 text-xs text-amber-300"
                        >
                          <option value="concrete">Concrete Floor</option>
                          <option value="oak">Oak Floor</option>
                          <option value="marble">Marble Floor</option>
                          <option value="tile">Tile Floor</option>
                          <option value="gravel">White Gravel (Zen)</option>
                          <option value="grass">Natural Grass</option>
                        </select>

                        <button
                          onClick={() => handleRemoveRoom(idx)}
                          className="text-neutral-500 hover:text-red-400 p-1 text-xs transition"
                          title="Delete this room"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Coordinates & Area */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500 block text-[10px]">X0 Coordinate (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[0]}
                          onChange={(e) => handleUpdateRoomBounds(idx, 0, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Z0 Coordinate (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[1]}
                          onChange={(e) => handleUpdateRoomBounds(idx, 1, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">X1 Coordinate (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[2]}
                          onChange={(e) => handleUpdateRoomBounds(idx, 2, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Z1 Coordinate (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[3]}
                          onChange={(e) => handleUpdateRoomBounds(idx, 3, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Area (m²)</span>
                        <input
                          type="number"
                          value={room.area}
                          onChange={(e) => handleUpdateRoom(idx, "area", parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-amber-300 font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Room Ceiling (m)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={room.ceilingHeight || project.specs.ceilingHeight}
                          onChange={(e) => handleUpdateRoom(idx, "ceilingHeight", parseFloat(e.target.value) || 3.0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                    </div>

                    {/* Room Description & Specs */}
                    <input
                      type="text"
                      value={room.description}
                      onChange={(e) => handleUpdateRoom(idx, "description", e.target.value)}
                      placeholder="Describe the room's function and architectural feel..."
                      className="w-full bg-[#111317] border border-[#272c36] rounded px-2.5 py-1.5 text-xs text-neutral-400 focus:outline-none "
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#232730] bg-[#161920]">
          <div className="text-xs text-neutral-400">
            Total: <span className="text-white font-semibold">{project.rooms.length} rooms</span> • Area: <span className="text-amber-400 font-semibold">{project.specs.totalArea} m²</span> • Ceiling height: <span className="text-white font-semibold">{project.specs.ceilingHeight} m</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditingVector(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-cyan-500/40 bg-cyan-950/50 text-cyan-300 hover:text-white hover:bg-cyan-900 transition flex items-center gap-1.5"
              title="Open the 2D vector wall correction tools"
            >
              <span>✏️ Correct 2D Vectors</span>
            </button>
            <button
              onClick={handleExportGLB}
              disabled={isExportingGLB}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-700 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Export the full 3D structure as a standard .GLB file"
            >
              <span>{isExportingGLB ? "⏳ Exporting..." : "📥 Download 3D File (.GLB)"}</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-lg transition"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => onApply(project)}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <span>Build Realistic 3D (Casa Serra Style)</span>
              <span>➔</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2D VECTOR CORRECTION CANVAS MODAL (Story 4.1) */}
      {isEditingVector && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <VectorCorrectionCanvas
            initialLayout={convertBlueprintProjectToLayoutData(project)}
            onConfirm={(updatedLayout) => {
              const updatedProject = updateProjectFromLayoutData(project, updatedLayout);
              setProject(updatedProject);
              setIsEditingVector(false);
              setScanMessage("✓ Updated wall and room coordinates from the 2D vector plan!");
            }}
            onClose={() => setIsEditingVector(false)}
          />
        </div>
      )}
    </div>
  );
}
