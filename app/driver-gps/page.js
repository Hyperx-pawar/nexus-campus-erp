'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/Providers';
import { 
  Bus, Navigation, Play, Square, CheckCircle, 
  AlertTriangle, Compass, Signal, RefreshCw, Copy, ChevronLeft,
  Key, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

function DriverGPSTelemetryClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sharedTransportRoutes, setSharedTransportRoutes } = useAuth();
  
  const routeId = searchParams.get('routeId');
  const token = searchParams.get('token');

  // Manual connection state
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [resolvedRouteId, setResolvedRouteId] = useState(null);
  const [resolvedToken, setResolvedToken] = useState(null);

  // Resolve target route
  const activeRoute = React.useMemo(() => {
    const targetRouteId = routeId || resolvedRouteId;
    if (!targetRouteId) return null;
    return sharedTransportRoutes.find(r => r.id === targetRouteId);
  }, [routeId, resolvedRouteId, sharedTransportRoutes]);

  // Authorization verification
  const isAuthorized = React.useMemo(() => {
    if (!activeRoute) return false;
    if (!activeRoute.gpsEnabled) return false;
    if (activeRoute.trackingMethod !== 'MOBILE') return false;
    const targetToken = token || resolvedToken;
    return activeRoute.gpsDeviceID?.toUpperCase() === targetToken?.toUpperCase();
  }, [activeRoute, token, resolvedToken]);

  const handleManualConnect = (e) => {
    if (e) e.preventDefault();
    const cleanedToken = manualTokenInput.trim().toUpperCase();
    if (!cleanedToken) {
      toast.error('Please enter your Driver Device Token.');
      return;
    }

    const matchedRoute = sharedTransportRoutes.find(r => 
      r.gpsEnabled && 
      r.trackingMethod === 'MOBILE' && 
      r.gpsDeviceID?.toUpperCase() === cleanedToken
    );

    if (matchedRoute) {
      setResolvedRouteId(matchedRoute.id);
      setResolvedToken(matchedRoute.gpsDeviceID);
      toast.success(`Successfully connected to ${matchedRoute.name}!`);
    } else {
      toast.error('Token not recognized. Please check and try again.');
    }
  };

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [currentLat, setCurrentLat] = useState(activeRoute?.latitude || 28.5276);
  const [currentLng, setCurrentLng] = useState(activeRoute?.longitude || 77.2100);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentEta, setCurrentEta] = useState(activeRoute?.etaMinutes || 12);
  const [pings, setPings] = useState([]);
  const [simStep, setSimStep] = useState(0);

  // Sync initial state if route changes
  useEffect(() => {
    if (activeRoute) {
      setCurrentLat(activeRoute.latitude || 28.5276);
      setCurrentLng(activeRoute.longitude || 77.2100);
      setCurrentEta(activeRoute.etaMinutes || 12);
    }
  }, [activeRoute]);

  // Telemetry Ping Loop
  useEffect(() => {
    if (!isBroadcasting || !activeRoute) {
      if (activeRoute) {
        // Stand down broadcasting flag when stopped
        setSharedTransportRoutes(prev => 
          prev.map(r => r.id === activeRoute.id ? { ...r, driverBroadcasting: false } : r)
        );
      }
      return;
    }

    const interval = setInterval(() => {
      // Simulate real-world driving coordinates progress
      // Move slowly towards campus (coordinate delta offsets)
      const latDelta = -0.00015 + (Math.random() * 0.0001);
      const lngDelta = 0.00018 + (Math.random() * 0.0001);
      
      const nextLat = Number((currentLat + latDelta).toFixed(6));
      const nextLng = Number((currentLng + lngDelta).toFixed(6));
      const nextSpeed = Math.floor(32 + Math.random() * 16); // 32 - 48 km/h
      
      let nextEta = currentEta;
      if (Math.random() > 0.6) {
        nextEta = currentEta > 1 ? currentEta - 1 : 15;
      }

      setCurrentLat(nextLat);
      setCurrentLng(nextLng);
      setCurrentSpeed(nextSpeed);
      setCurrentEta(nextEta);

      // Push telemetry payload to global state
      setSharedTransportRoutes(prev => 
        prev.map(r => {
          if (r.id === activeRoute.id) {
            return {
              ...r,
              latitude: nextLat,
              longitude: nextLng,
              etaMinutes: nextEta,
              lastUpdated: new Date().toISOString(),
              driverBroadcasting: true
            };
          }
          return r;
        })
      );

      const timestamp = new Date().toLocaleTimeString();
      setPings(prev => [
        `[${timestamp}] 📡 Packet sent | Lat: ${nextLat}, Lng: ${nextLng} | Spd: ${nextSpeed}km/h | Status: DELIVERED`,
        ...prev.slice(0, 49) // Keep last 50 pings
      ]);

    }, 4000);

    return () => clearInterval(interval);
  }, [isBroadcasting, currentLat, currentLng, currentEta, activeRoute, setSharedTransportRoutes]);

  const handleStartTrip = () => {
    setIsBroadcasting(true);
    toast.success('Mobile GPS broadcasting initialized! Coordinates are now streaming live.');
  };

  const handleStopTrip = () => {
    setIsBroadcasting(false);
    setCurrentSpeed(0);
    toast.info('GPS broadcast stopped. Telemetry is offline.');
  };

  // Simulate Location Jump/Shift for testing purposes
  const handleShiftLocation = () => {
    if (!activeRoute) return;
    
    // Define steps of a route to jump to
    const stops = [
      { name: "Leaving Depot", lat: 28.5250, lng: 77.2080, eta: 11 },
      { name: "Passed Stop A", lat: 28.5290, lng: 77.2150, eta: 8 },
      { name: "Approaching Stop B", lat: 28.5330, lng: 77.2220, eta: 4 },
      { name: "At Campus Gates", lat: 28.5376, lng: 77.2300, eta: 0 }
    ];

    const nextStep = (simStep + 1) % stops.length;
    setSimStep(nextStep);
    
    const stop = stops[nextStep];
    setCurrentLat(stop.lat);
    setCurrentLng(stop.lng);
    setCurrentEta(stop.eta);
    setCurrentSpeed(stop.eta === 0 ? 0 : 38);

    setSharedTransportRoutes(prev => 
      prev.map(r => {
        if (r.id === activeRoute.id) {
          return {
            ...r,
            latitude: stop.lat,
            longitude: stop.lng,
            etaMinutes: stop.eta,
            lastUpdated: new Date().toISOString(),
            driverBroadcasting: isBroadcasting
          };
        }
        return r;
      })
    );

    toast.success(`Location simulated: ${stop.name} (ETA: ${stop.eta}m)`);
  };

  if (!isAuthorized) {
    const showWarning = routeId || token;
    const mobileRoutes = sharedTransportRoutes.filter(r => r.gpsEnabled && r.trackingMethod === 'MOBILE');

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-outfit">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <Smartphone size={32} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-100">Driver Telemetry Portal</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your mobile device to start broadcasting live GPS coordinates for your assigned transit corridor.
            </p>
          </div>

          {showWarning && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-left">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-300 leading-normal">
                The connection link you used is invalid or expired. Please enter your device token manually below.
              </p>
            </div>
          )}

          <form onSubmit={handleManualConnect} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="deviceToken" className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Driver Device Token
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-600">
                  <Key size={14} />
                </span>
                <input
                  id="deviceToken"
                  type="text"
                  placeholder="Enter token (e.g. MOB-DRV-84920)"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs font-mono text-emerald-400 placeholder:text-slate-600 focus:outline-none transition-all uppercase tracking-wider"
                />
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl transition-all uppercase tracking-wider text-[11px] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98]"
            >
              Authenticate & Link Device
            </button>
          </form>

          {mobileRoutes.length > 0 ? (
            <div className="pt-4 border-t border-slate-800 text-left space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                Active Mobile Routes (Simulation Helpers)
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {mobileRoutes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => {
                      setManualTokenInput(route.gpsDeviceID || '');
                      setResolvedRouteId(route.id);
                      setResolvedToken(route.gpsDeviceID);
                      toast.success(`Connected to ${route.name}!`);
                    }}
                    className="w-full text-left p-2.5 bg-slate-950/40 hover:bg-slate-950 hover:border-slate-800/80 border border-transparent rounded-xl transition-all flex justify-between items-center text-[10px]"
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-300 block truncate">{route.name}</span>
                      <span className="text-slate-500 font-mono text-[9px]">{route.bus}</span>
                    </div>
                    <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0 font-bold">
                      {route.gpsDeviceID}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-800 text-left space-y-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                No Active Mobile Routes Found
              </span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Go to the <span className="underline cursor-pointer text-slate-400 hover:text-slate-300" onClick={() => router.push('/dashboard/transport')}>Transport Dashboard</span> and enable &quot;Driver Mobile GPS&quot; for a route to generate a token.
              </p>
            </div>
          )}

          <button 
            onClick={() => router.push('/login')} 
            className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800/60 text-[10px] font-bold rounded-xl text-slate-400 hover:text-slate-300 transition-all uppercase tracking-wider"
          >
            Return to Login Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-outfit p-4 justify-between max-w-md mx-auto relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
            <Compass className="animate-spin" style={{ animationDuration: '10s' }} size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-200">GPS Driver App</h2>
            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{activeRoute.bus}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {resolvedRouteId && (
            <button
              onClick={() => {
                setIsBroadcasting(false);
                setResolvedRouteId(null);
                setResolvedToken(null);
                toast.info('Disconnected manually.');
              }}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-bold text-slate-400 hover:text-slate-200 rounded-md transition-all uppercase tracking-wider"
            >
              Disconnect
            </button>
          )}
          <div className="flex items-center gap-0.5 text-slate-500">
            <Signal size={12} className={isBroadcasting ? "text-emerald-400" : ""} />
            <span className="text-[8px] font-bold font-mono">LTE</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-success animate-ping' : 'bg-slate-700'}`}></div>
        </div>
      </div>

      {/* Main Control Center */}
      <div className="my-auto py-8 space-y-6">
        {/* Route Details Card */}
        <div className="p-5 bg-slate-900/50 border border-slate-900 rounded-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Transit Corridor</span>
              <span className="text-xs font-bold text-slate-200 mt-1 block truncate">{activeRoute.name}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">License Plate</span>
              <span className="text-xs font-bold font-mono text-slate-200 mt-1 block">{activeRoute.bus}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Driver Assigned</span>
              <span className="text-xs font-bold text-slate-200 mt-1 block">{activeRoute.driver}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Device Token</span>
              <span className="text-xs font-bold font-mono text-slate-200 mt-1 block truncate">{activeRoute.gpsDeviceID}</span>
            </div>
          </div>

          {/* Current Broadcast Telemetry */}
          <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[7px] text-slate-500 uppercase font-black block">Latitude</span>
              <span className="text-xs font-bold font-mono text-emerald-400 mt-1 block">{currentLat.toFixed(5)}</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 uppercase font-black block">Longitude</span>
              <span className="text-xs font-bold font-mono text-emerald-400 mt-1 block">{currentLng.toFixed(5)}</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 uppercase font-black block">Speed</span>
              <span className="text-xs font-bold font-mono text-emerald-400 mt-1 block">{currentSpeed} km/h</span>
            </div>
          </div>
        </div>

        {/* Broadcasting Action Button */}
        <div className="space-y-3">
          {!isBroadcasting ? (
            <button
              onClick={handleStartTrip}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              <Play size={16} fill="currentColor" />
              <span>Start Commute & Broadcast</span>
            </button>
          ) : (
            <button
              onClick={handleStopTrip}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/10 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              <Square size={16} fill="currentColor" />
              <span>Stop GPS Telemetry</span>
            </button>
          )}

          {/* Simulation Jump Controls */}
          <button
            onClick={handleShiftLocation}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
            <span>Simulate Location Shift</span>
          </button>
        </div>
      </div>

      {/* Broadcast Log Box */}
      <div className="space-y-2">
        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block ml-1">Transmission Ping History</span>
        <div className="h-32 bg-slate-950 border border-slate-900 rounded-2xl p-3 font-mono text-[9px] text-slate-400 space-y-1.5 overflow-y-auto custom-scrollbar">
          {pings.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
              <Signal size={20} className="mb-1" />
              <span>App is offline. Telemetry inactive.</span>
            </div>
          )}
          {pings.map((ping, idx) => (
            <div key={idx} className="truncate">{ping}</div>
          ))}
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="pt-4 border-t border-slate-900 text-center">
        <span className="text-[8px] text-slate-600 uppercase tracking-widest font-black">Campus Telemetry Systems</span>
      </div>
    </div>
  );
}

export default function DriverGPSPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-outfit">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Loading Telemetry Client...</p>
        </div>
      </div>
    }>
      <DriverGPSTelemetryClient />
    </Suspense>
  );
}
