import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PhotoRecord } from '../services/db';
import { X, Box, Sparkles, MapPin, Flame, Mountain, Moon, Layers, Camera, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/context';
import html2canvas from 'html2canvas';

// Ensure L is globally available for leaflet plugins that expect it
if (typeof window !== 'undefined') {
  (window as any).L = L;
}
import 'leaflet.heat';

interface PhotoMapProps {
  photos: PhotoRecord[];
  onSelectLocation: (locationName: string) => void;
  selectedLocations: string[];
}

export const PhotoMap = ({ photos, onSelectLocation, selectedLocations }: PhotoMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.TileLayer | null>(null);
  const heatLayerInstanceRef = useRef<any | null>(null);
  
  const [mapType, setMapType] = useState<'vworld-base' | 'vworld-sat' | 'vworld-midnight' | 'vworld-gray' | 'osm'>('vworld-base');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const { t, locale } = useTranslation();

  const handleExportPng = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    try {
      // Small timeout to allow state rendering or any necessary tile paints to settle
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          // Hide both top and bottom overlay bars which are absolute floating controls inside the container element.
          // This ensures target snapshot is pristine and presents purely the gorgeous map and active features.
          const controls = clonedDoc.querySelectorAll('.pointer-events-auto, .leaflet-control-zoom');
          controls.forEach((el: any) => {
            el.style.display = 'none';
          });
        }
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `VWorld-Map-Snapshot-${timestamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export map snapshot:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getMapLabel = (type: 'base' | 'sat' | 'midnight' | 'gray' | 'osm') => {
    if (locale === 'kr') {
      if (type === 'base') return '도로망 일반';
      if (type === 'sat') return '위성 하이브리드';
      if (type === 'midnight') return '다크 야간';
      if (type === 'gray') return '미니멀 회색조';
      return '글로벌 OSM';
    } else {
      if (type === 'base') return 'Street';
      if (type === 'sat') return 'Satellite';
      if (type === 'midnight') return 'Midnight';
      if (type === 'gray') return 'Gray Terrain';
      return 'Global OSM';
    }
  };

  // Group photos by unique location (lat/lng) or locationName
  const markers = useMemo(() => {
    const groups: Record<string, { lat: number, lng: number, name: string, count: number, date: number }> = {};
    
    photos.forEach(p => {
      if (p.latitude && p.longitude && p.locationName) {
         const key = `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
         if (!groups[key]) {
           groups[key] = { 
             lat: p.latitude, 
             lng: p.longitude, 
             name: p.locationName, 
             count: 0,
             date: p.dateTaken || p.lastModified
           };
         }
         groups[key].count++;
      }
    });
    
    return Object.values(groups).sort((a,b) => a.date - b.date);
  }, [photos]);

  // Extract lat, lng and intensity weight for heatmap rendering
  const heatData = useMemo(() => {
    return photos
      .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude !== 0 && p.longitude !== 0)
      .map(p => [p.latitude!, p.longitude!, 1.0] as [number, number, number]);
  }, [photos]);

  // Initial map setup
  useEffect(() => {
    if (!containerRef.current) return;

    // Seoul/KR center as default fallback
    const defaultCenter: [number, number] = [36.5, 127.8];
    const defaultZoom = 7;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false, // Custom styled zoom control placement
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;
    
    // Setup Layer Group for easy marker updates
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    // Set initial tile layer style
    let url = 'https://xdworld.vworld.kr/2d/Base/service/{z}/{x}/{y}.png';
    let attribution = '© 국토교통부 브이월드';
    
    const tileLayer = L.tileLayer(url, {
      maxZoom: 19,
      minZoom: 1,
      attribution,
      crossOrigin: 'anonymous',
    });
    
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Fit markers bounds initially if any exist
    if (markers.length > 0) {
      try {
        const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      } catch (err) {
        console.warn('Map boundary setup failed:', err);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      layerGroupRef.current = null;
      tileLayerRef.current = null;
      overlayLayerRef.current = null;
      heatLayerInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // React to Map Type (Tile layers switcher)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing tile layers
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    let url = '';
    let attribution = '';

    if (mapType === 'vworld-base') {
      url = 'https://xdworld.vworld.kr/2d/Base/service/{z}/{x}/{y}.png';
      attribution = '© 국토교통부 브이월드';
    } else if (mapType === 'vworld-sat') {
      url = 'https://xdworld.vworld.kr/2d/Satellite/service/{z}/{x}/{y}.gft';
      attribution = '© 국토교통부 브이월드 (항공사진)';

      // Overlay hybrid labeling map
      const hybridUrl = 'https://xdworld.vworld.kr/2d/Hybrid/service/{z}/{x}/{y}.png';
      const overlayLayer = L.tileLayer(hybridUrl, {
        maxZoom: 19,
        minZoom: 1,
        zIndex: 10,
        crossOrigin: 'anonymous',
      });
      overlayLayer.addTo(map);
      overlayLayerRef.current = overlayLayer;
    } else if (mapType === 'vworld-midnight') {
      url = 'https://xdworld.vworld.kr/2d/Midnight/service/{z}/{x}/{y}.png';
      attribution = '© 국토교통부 브이월드 (야간)';
    } else if (mapType === 'vworld-gray') {
      url = 'https://xdworld.vworld.kr/2d/gray/service/{z}/{x}/{y}.png';
      attribution = '© 국토교통부 브이월드 (그레이색조)';
    } else {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '© OpenStreetMap contributors';
    }

    const tileLayer = L.tileLayer(url, {
      maxZoom: 19,
      minZoom: 1,
      attribution,
      crossOrigin: 'anonymous',
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
  }, [mapType]);

  // React to Heatmap Toggle and dynamic density changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing heatmap layer if initialized
    if (heatLayerInstanceRef.current) {
      map.removeLayer(heatLayerInstanceRef.current);
      heatLayerInstanceRef.current = null;
    }

    if (showHeatmap && heatData.length > 0) {
      try {
        // Create heat layer with elegant rose/violet dark theme gradients matching our dark UI
        const heatLayer = (L as any).heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 14,
          gradient: {
            0.3: 'rgba(59, 130, 246, 0.4)',  // Blue-500 fading in
            0.55: 'rgba(139, 92, 246, 0.7)', // Purple-500
            0.8: 'rgba(236, 72, 153, 0.95)', // Pink-500
            1.0: 'rgba(244, 63, 94, 1.0)'    // Rose-500 core density
          }
        });
        heatLayer.addTo(map);
        heatLayerInstanceRef.current = heatLayer;
      } catch (err) {
        console.error('Heatmap initialization failed:', err);
      }
    }

    return () => {
      if (map && heatLayerInstanceRef.current) {
        map.removeLayer(heatLayerInstanceRef.current);
        heatLayerInstanceRef.current = null;
      }
    };
  }, [showHeatmap, heatData]);

  // Heatmap click tracking to auto-zoom onto hotspot clusters
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: any) => {
      // Only trigger if heatmap is active and we have markers/hotspots
      if (!showHeatmap || markers.length === 0) return;

      const clickPt = map.latLngToContainerPoint(e.latlng);
      let closestMarker: typeof markers[0] | null = null;
      let minDistance = Infinity;

      markers.forEach(m => {
        const markerPt = map.latLngToContainerPoint(L.latLng(m.lat, m.lng));
        const distance = Math.hypot(clickPt.x - markerPt.x, clickPt.y - markerPt.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestMarker = m;
        }
      });

      // Hit tolerance range (in screen pixels) tailored for typical density hotspot blobs
      if (closestMarker && minDistance < 50) {
        const targetZoom = Math.min(Math.max(map.getZoom() + 3, 13), map.getMaxZoom() || 18);
        map.setView([closestMarker.lat, closestMarker.lng], targetZoom, { animate: true });
        
        // Select the location as well for instant detailed gallery filtration
        onSelectLocation(closestMarker!.name);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [showHeatmap, markers, onSelectLocation]);

  // Handle markers plotting & interactive clicks reactive state
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    markers.forEach(m => {
      const isSelected = selectedLocations.includes(m.name);
      
      const markerHtml = `
        <div class="relative group cursor-pointer ${isSelected ? 'scale-125 z-[500]' : 'scale-100 hover:scale-110'} transition-transform duration-300">
          ${isSelected ? `
            <div class="absolute inset-0 flex items-center justify-center -translate-x-[6px] -translate-y-[6px]" style="pointer-events: none;">
              <div class="absolute w-12 h-12 bg-rose-500/20 rounded-full animate-ping"></div>
              <div class="absolute w-20 h-20 bg-rose-500/10 rounded-full animate-pulse blur-md"></div>
            </div>
          ` : ''}
          
          <div class="relative p-2 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center transition-all ${
            isSelected 
              ? 'bg-rose-600 border-rose-400 text-white shadow-rose-500/40' 
              : 'bg-slate-900/95 border-blue-500/30 text-blue-400 hover:border-blue-400'
          }" style="width: 36px; height: 36px; box-sizing: border-box;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.418-8.204 12-8.204 12S3.6 14.418 3.6 10a8.4 8.4 0 1 1 16.4 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            ${m.count > 1 ? `
              <div class="absolute -top-1.5 -right-1.5 bg-white text-slate-950 text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-950/20 shadow-md">
                ${m.count}
              </div>
            ` : ''}
          </div>
          
          <div class="absolute left-1/2 -translate-x-1/2 top-full mt-2 transition-all duration-200 pointer-events-none opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100 scale-105' : ''}" style="z-index: 10000;">
            <div class="bg-slate-950 border border-white/10 px-2.5 py-1.5 rounded-xl text-[9px] font-black text-white uppercase tracking-wider whitespace-nowrap shadow-2xl">
              ${m.name}
            </div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'bg-transparent border-transparent', // Neutralize Leaflet's default box layout
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([m.lat, m.lng], { icon: customIcon });
      
      marker.on('click', () => {
        onSelectLocation(m.name);
      });

      layerGroup.addLayer(marker);
    });
  }, [markers, selectedLocations, onSelectLocation]);

  // Keep camera centered nicely on last selected marker when selections update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedLocations.length === 0) return;

    const lastSelected = selectedLocations[selectedLocations.length - 1];
    const targetMarker = markers.find(m => m.name === lastSelected);
    if (targetMarker) {
      map.setView([targetMarker.lat, targetMarker.lng], Math.max(map.getZoom(), 10), { animate: true });
    }
  }, [selectedLocations, markers]);

  return (
    <div className="h-[500px] w-full rounded-[2.5rem] overflow-hidden border border-white/10 relative shadow-2xl bg-slate-950">
      {/* Map Element */}
      <div 
        ref={containerRef} 
        className={`w-full h-full z-0 ${(mapType !== 'vworld-sat' && mapType !== 'vworld-midnight') ? 'leaflet-dark-theme-override' : ''}`} 
      />

      {/* Floating Layer Selection Controller Bar */}
      <div className="absolute top-6 left-6 z-[1000] p-1.5 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex items-center gap-1.5 pointer-events-auto max-w-[calc(100%-3rem)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setMapType('vworld-base')}
          className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mapType === 'vworld-base' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles size={11} />
          {getMapLabel('base')}
        </button>
        <button
          onClick={() => setMapType('vworld-sat')}
          className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mapType === 'vworld-sat' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Box size={11} />
          {getMapLabel('sat')}
        </button>
        <button
          onClick={() => setMapType('vworld-midnight')}
          className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mapType === 'vworld-midnight' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Moon size={11} />
          {getMapLabel('midnight')}
        </button>
        <button
          onClick={() => setMapType('vworld-gray')}
          className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mapType === 'vworld-gray' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Mountain size={11} />
          {getMapLabel('gray')}
        </button>
        <button
          onClick={() => setMapType('osm')}
          className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mapType === 'osm' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MapPin size={11} />
          {getMapLabel('osm')}
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-1 shrink-0 self-center" />

        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
            showHeatmap 
              ? 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame size={11} className={showHeatmap ? "animate-pulse text-amber-300" : ""} />
          {locale === 'kr' ? '밀도 히트맵' : 'Density Heatmap'}
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-1 shrink-0 self-center" />

        <button
          onClick={handleExportPng}
          disabled={isExporting}
          className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
            isExporting 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
          }`}
        >
          {isExporting ? (
            <Loader2 size={11} className="animate-spin text-white" />
          ) : (
            <Camera size={11} />
          )}
          {locale === 'kr' ? '화면 캡처' : 'Snap View'}
        </button>
      </div>

      {/* Auxiliary Hybrid Layer Indicator Tag */}
      {mapType.startsWith('vworld-') && (
         <div className="absolute bottom-4 right-6 bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none z-[1000]">
            <Layers size={10} className="text-blue-400 animate-pulse" />
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">V-WORLD WMTS SERVICE</span>
         </div>
      )}

      {/* Filter Dismissal Badges */}
      <div className="absolute bottom-6 left-6 right-6 flex gap-2 overflow-x-auto pb-4 pt-10 px-2 pointer-events-none no-scrollbar z-[1000]">
         {selectedLocations.map((loc, idx) => (
           <div 
             key={`${loc}-${idx}`}
             className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-rose-500/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-4"
           >
             <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
             {loc}
             <button 
               onClick={() => onSelectLocation(loc)} 
               className="hover:text-rose-500 transition-colors cursor-pointer"
             >
                <X size={14} />
             </button>
           </div>
         ))}
      </div>
    </div>
  );
};
