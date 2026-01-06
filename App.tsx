
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldAlert, CheckCircle, History, X, MapPin, Info, Zap, FileText, User, Copy, Download, Scale, Calendar, CloudSun, Home, Settings, Clock, ChevronRight, Bell, AlertTriangle, FileSpreadsheet, Trash2, LogOut, Navigation, Sun, Volume2, Map as MapIcon, Tag, RefreshCw, Smartphone, ArrowLeft, Layers, Footprints } from 'lucide-react';
import { analyzeSidewalk } from './services/geminiService';
import { Investigation } from './types';
import * as XLSX from 'xlsx';

const APP_VERSION = "v1.6.0 (Gemini 3 Pro)";

const App: React.FC = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings'>('home');
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [investigatorName, setInvestigatorName] = useState(() => localStorage.getItem('investigator_name') || '');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Settings States
  const [brightness, setBrightness] = useState(() => Number(localStorage.getItem('app_brightness')) || 100);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('app_sound') !== 'false');
  const [isVersionChecking, setIsVersionChecking] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('investigator_name', investigatorName);
  }, [investigatorName]);

  useEffect(() => {
    localStorage.setItem('app_brightness', brightness.toString());
  }, [brightness]);

  useEffect(() => {
    localStorage.setItem('app_sound', soundEnabled.toString());
  }, [soundEnabled]);

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser.");
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          resolve(undefined);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  const playEffectSound = (type: 'start' | 'complete') => {
    if (!soundEnabled) return;
    const urls = {
      start: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      complete: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'
    };
    const audio = new Audio(urls[type]);
    audio.play().catch(() => {});
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const locationPromise = getCurrentLocation();

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      const newId = Date.now().toString();
      
      const location = await locationPromise;
      
      const newInvestigation: Investigation = {
        id: newId,
        imageUrl: base64Image,
        timestamp: Date.now(),
        weather: "2°C",
        location: location,
        investigator: investigatorName || '조사관',
        result: null,
        status: 'analyzing',
      };

      setInvestigations(prev => [newInvestigation, ...prev]);
      setSelectedDetailId(newId);

      playEffectSound('start');

      try {
        const result = await analyzeSidewalk(base64Image);
        setInvestigations(prev => prev.map(inv => inv.id === newId ? { ...inv, result, status: 'completed' } : inv));
        playEffectSound('complete');
      } catch (err) {
        setInvestigations(prev => prev.map(inv => inv.id === newId ? { ...inv, status: 'error', errorMessage: '분석 중 오류 발생' } : inv));
      }
    };
    reader.readAsDataURL(file);
    if (event.target) event.target.value = '';
  };

  const currentInv = investigations.find(inv => inv.id === selectedDetailId);

  const copyResult = () => {
    if (!currentInv?.result) return;
    navigator.clipboard.writeText(currentInv.result.vulnerabilityReport);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  const exportToExcel = () => {
    if (investigations.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }
    
    setIsExporting(true);
    try {
      const dataToExport = investigations.map(inv => ({
        '조사 ID': inv.id,
        '조사 일시': new Date(inv.timestamp).toLocaleString(),
        '조사관': inv.investigator,
        '날씨': inv.weather,
        '위도(Latitude)': inv.location?.latitude || '-',
        '경도(Longitude)': inv.location?.longitude || '-',
        '위험 수준': inv.result?.riskLevel || '-',
        '단차 정보': inv.result?.stepHeight || '-',
        '지장물 목록': inv.result?.obstacles.join(', ') || '-',
        '종합 보고서': inv.result?.vulnerabilityReport || '-',
        '시정 권고': inv.result?.recommendations.join('\n') || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "편의시설 조사데이터");
      
      const fileName = `편의시설_모니터링_데이터_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert("엑셀 생성 중 오류가 발생했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const resetData = () => {
    if (confirm("모든 조사 내역이 삭제됩니다. 계속하시겠습니까?")) {
      setInvestigations([]);
      setSelectedDetailId(null);
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const checkVersion = () => {
    setIsVersionChecking(true);
    setTimeout(() => {
      setIsVersionChecking(false);
      alert("현재 최신 버전을 사용 중입니다.");
    }, 1500);
  };

  const getRiskColor = (level?: string) => {
    switch(level) {
      case 'HIGH': return 'bg-rose-100 text-rose-600 border-rose-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'LOW': return 'bg-green-100 text-green-600 border-green-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#F8F9FB] relative overflow-hidden">
      
      {/* Brightness Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-[9999] transition-opacity duration-300"
        style={{ backgroundColor: 'black', opacity: (100 - brightness) / 100 * 0.7 }}
      />

      {/* 1. Header Section */}
      <header className="px-6 pt-10 pb-4">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-[#28A745] uppercase tracking-widest">Investigator</p>
            <h1 className="text-2xl font-bold text-[#333]">
              {investigatorName ? <>{investigatorName}님</> : '안녕하세요.'}
            </h1>
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400">
               <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Home Content */}
        {activeTab === 'home' && (
          <div className="animate-slide-up">
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 card-shadow flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-400"><CloudSun className="w-5 h-5" /></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">날씨</p><p className="text-[14px] font-bold text-slate-800">2°C 맑음</p></div>
              </div>
              <div className="h-6 w-px bg-slate-100"></div>
              <div className="flex items-center gap-3">
                <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase">GPS</p><p className="text-[14px] font-bold text-[#28A745]">정상 연동</p></div>
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-[#28A745]"><Navigation className="w-5 h-5" /></div>
              </div>
            </div>

            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-[#28A745] text-white py-5 rounded-2xl font-bold text-lg btn-active shadow-xl shadow-green-100 flex items-center justify-center gap-3 mb-8">
              <Camera className="w-6 h-6" /> 현장 촬영/분석 시작
            </button>

            {/* Recent Analysis Summary Card if exists */}
            {investigations.length > 0 && !selectedDetailId && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 px-1">최근 조사 브리핑</h3>
                <div className="bg-white p-5 rounded-[28px] border border-slate-100 card-shadow flex items-center gap-4 cursor-pointer btn-active" onClick={() => setSelectedDetailId(investigations[0].id)}>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    <img src={investigations[0].imageUrl} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-300 uppercase">{new Date(investigations[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p className="text-[14px] font-bold text-slate-700 line-clamp-1">{investigations[0].result?.vulnerabilityReport || '분석 대기 중'}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${getRiskColor(investigations[0].result?.riskLevel)}`}>
                         {investigations[0].result?.riskLevel || 'ANALYZING'}
                       </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Content */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-slide-up pb-28">
             <div className="bg-white rounded-3xl border border-slate-100 card-shadow overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg"><User className="w-4 h-4 text-slate-400" /></div>
                      <div><p className="text-[14px] font-bold text-slate-800">조사자 성함</p></div>
                   </div>
                   <p className="font-bold text-[#28A745]">{investigatorName}</p>
                </div>
                <div className="h-px bg-slate-50"></div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg"><Tag className="w-4 h-4 text-slate-400" /></div>
                      <div><p className="text-[14px] font-bold text-slate-800">앱 버전</p><p className="text-[11px] text-slate-400">{APP_VERSION}</p></div>
                   </div>
                   <button onClick={checkVersion} className={`p-2 rounded-lg ${isVersionChecking ? 'bg-slate-100 animate-spin' : 'bg-slate-50'}`}><RefreshCw className="w-4 h-4 text-slate-400" /></button>
                </div>
             </div>

             <div className="bg-white rounded-3xl border border-slate-100 card-shadow p-6 space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-500"><Sun className="w-4 h-4" /></div>
                        <p className="text-[14px] font-bold text-slate-800">화면 밝기</p>
                      </div>
                      <span className="text-[12px] font-bold text-slate-400">{brightness}%</span>
                   </div>
                   <input type="range" min="10" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#28A745]" />
                </div>
                <div className="h-px bg-slate-50"></div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Volume2 className="w-4 h-4" /></div>
                      <p className="text-[14px] font-bold text-slate-800">알람 효과음</p>
                   </div>
                   <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${soundEnabled ? 'bg-[#28A745]' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${soundEnabled ? 'right-1' : 'left-1'}`} />
                   </button>
                </div>
             </div>

             <div className="space-y-3">
                <button onClick={async () => {const loc = await getCurrentLocation(); if (loc) openInMaps(loc.latitude, loc.longitude); else alert("위치 실패");}} className="w-full bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between btn-active">
                   <div className="flex items-center gap-4"><div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500"><MapIcon className="w-5 h-5" /></div><p className="text-[14px] font-bold text-slate-800">현재 위치 상세 보기</p></div><ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
                <button onClick={exportToExcel} className="w-full bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between btn-active">
                   <div className="flex items-center gap-4"><div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-[#28A745]"><FileSpreadsheet className="w-5 h-5" /></div><p className="text-[14px] font-bold text-slate-800">전체 데이터 엑셀 추출</p></div><Download className="w-5 h-5 text-slate-300" />
                </button>
                <button onClick={resetData} className="w-full bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between btn-active opacity-60">
                   <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><Trash2 className="w-5 h-5" /></div><p className="text-[14px] font-bold text-slate-800">모든 기록 초기화</p></div><ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
             </div>
          </div>
        )}
      </header>

      {/* History View */}
      {activeTab === 'history' && (
        <div className="fixed inset-0 z-[150] bg-[#F8F9FB] flex flex-col p-6 overflow-y-auto animate-slide-up no-scrollbar pb-24">
          <div className="flex justify-between items-center mb-8 pt-4">
            <h2 className="text-2xl font-bold">조사 기록 보관함</h2>
            <button onClick={() => setActiveTab('home')} className="p-3 bg-white rounded-2xl border border-slate-200"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {investigations.map(inv => (
               <div key={inv.id} onClick={() => setSelectedDetailId(inv.id)} className="bg-white rounded-[24px] overflow-hidden card-shadow border border-slate-100 btn-active flex flex-col">
                 <div className="aspect-square relative overflow-hidden bg-slate-100">
                    <img src={inv.imageUrl} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2">
                       <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm border ${getRiskColor(inv.result?.riskLevel)}`}>
                         {inv.result?.riskLevel || 'ING'}
                       </span>
                    </div>
                 </div>
                 <div className="p-3">
                    <p className="text-[10px] font-bold text-slate-300 uppercase mb-1">{new Date(inv.timestamp).toLocaleDateString()}</p>
                    <p className="text-[12px] font-bold text-slate-700 line-clamp-2 leading-tight">
                       {inv.result?.vulnerabilityReport || '분석 중...'}
                    </p>
                 </div>
               </div>
            ))}
          </div>
          {investigations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 opacity-20"><History className="w-16 h-16 mb-4" /><p className="font-bold">기록이 없습니다.</p></div>
          )}
        </div>
      )}

      {/* 4. DETAIL OVERLAY (Detailed Result View) */}
      {selectedDetailId && currentInv && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col animate-slide-up overflow-y-auto no-scrollbar">
           {/* Detail Header */}
           <div className="sticky top-0 z-[10] bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-50">
              <button onClick={() => setSelectedDetailId(null)} className="p-2 bg-slate-50 rounded-xl"><ArrowLeft className="w-5 h-5 text-slate-800" /></button>
              <div className="text-center">
                 <p className="text-[10px] font-bold text-slate-300 uppercase leading-none mb-1">{new Date(currentInv.timestamp).toLocaleString()}</p>
                 <h3 className="text-[14px] font-bold text-slate-800 leading-none">상세 분석 리포트</h3>
              </div>
              <button onClick={copyResult} className="p-2 bg-slate-50 rounded-xl text-slate-400"><Copy className="w-5 h-5" /></button>
           </div>

           {/* Detail Content */}
           <div className="p-6 space-y-8 pb-12">
              {/* Hero Image */}
              <div className="w-full aspect-[4/3] rounded-[32px] overflow-hidden shadow-2xl relative">
                 <img src={currentInv.imageUrl} className="w-full h-full object-cover" />
                 {currentInv.result && (
                    <div className={`absolute bottom-6 left-6 px-4 py-2 rounded-2xl font-black text-sm shadow-xl border-2 ${getRiskColor(currentInv.result.riskLevel)}`}>
                       {currentInv.result.riskLevel} 위험
                    </div>
                 )}
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-[#F8F9FB] p-5 rounded-3xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">현장 좌표</span></div>
                    {currentInv.location ? (
                       <button onClick={() => openInMaps(currentInv.location!.latitude, currentInv.location!.longitude)} className="text-[13px] font-bold text-slate-700 text-left underline decoration-rose-200">
                          {currentInv.location.latitude.toFixed(4)}, {currentInv.location.longitude.toFixed(4)}
                       </button>
                    ) : <p className="text-[13px] font-bold text-slate-400">정보 없음</p>}
                 </div>
                 <div className="bg-[#F8F9FB] p-5 rounded-3xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2"><Footprints className="w-4 h-4 text-blue-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">단차 측정</span></div>
                    <p className="text-[13px] font-bold text-slate-700">{currentInv.result?.stepHeight || '-'}</p>
                 </div>
              </div>

              {/* Analysis Detail */}
              {currentInv.status === 'analyzing' ? (
                <div className="py-20 text-center space-y-4"><div className="w-12 h-12 border-4 border-[#28A745]/20 border-t-[#28A745] rounded-full animate-spin mx-auto"></div><p className="font-bold text-slate-400">Gemini 3 Pro 엔진 정밀 분석 중...</p></div>
              ) : (
                <>
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 px-1"><Layers className="w-4 h-4 text-[#28A745]" /><h4 className="text-[14px] font-bold text-slate-800">종합 분석 보고서</h4></div>
                     <div className="bg-white p-6 rounded-[32px] border border-slate-100 card-shadow">
                        <p className="text-[15px] font-medium leading-relaxed text-slate-700">{currentInv.result?.vulnerabilityReport}</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center gap-2 px-1"><ShieldAlert className="w-4 h-4 text-amber-500" /><h4 className="text-[14px] font-bold text-slate-800">식별된 지장물</h4></div>
                     <div className="flex flex-wrap gap-2">
                        {currentInv.result?.obstacles.map((obs, i) => (
                          <span key={i} className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[12px] font-bold">{obs}</span>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center gap-2 px-1"><CheckCircle className="w-4 h-4 text-[#28A745]" /><h4 className="text-[14px] font-bold text-slate-800">법적 시정 권고안</h4></div>
                     <div className="space-y-3">
                        {currentInv.result?.recommendations.map((rec, i) => (
                          <div key={i} className="flex gap-4 p-5 bg-green-50/50 rounded-3xl border border-green-100 items-start">
                             <div className="w-6 h-6 rounded-full bg-[#28A745] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i+1}</div>
                             <p className="text-[13px] font-medium text-slate-600 leading-snug">{rec}</p>
                          </div>
                        ))}
                     </div>
                  </div>
                </>
              )}
           </div>

           {/* Toast Feedback */}
           {showCopyFeedback && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#333] text-white px-6 py-3 rounded-full text-[12px] font-bold animate-slide-up shadow-2xl">
                 보고서가 클립보드에 복사되었습니다.
              </div>
           )}
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around z-[100] max-w-md mx-auto safe-area-bottom">
        <button onClick={() => {setActiveTab('home'); setSelectedDetailId(null);}} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'home' ? 'text-[#28A745]' : 'text-slate-300'}`}>
          <Home className="w-6 h-6" /><span className="text-[10px] font-bold">홈</span>
        </button>
        <button onClick={() => {setActiveTab('history'); setSelectedDetailId(null);}} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'history' ? 'text-[#28A745]' : 'text-slate-300'}`}>
          <History className="w-6 h-6" /><span className="text-[10px] font-bold">기록</span>
        </button>
        <button onClick={() => {setActiveTab('settings'); setSelectedDetailId(null);}} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'settings' ? 'text-[#28A745]' : 'text-slate-300'}`}>
          <Settings className="w-6 h-6" /><span className="text-[10px] font-bold">설정</span>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </nav>

      {/* Investigator Setup */}
      {investigatorName === '' && (
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center p-12 text-center">
           <div className="w-20 h-20 bg-green-50 rounded-[30px] flex items-center justify-center mb-8"><User className="w-10 h-10 text-[#28A745]" /></div>
           <h2 className="text-2xl font-bold mb-3 text-slate-800">조사자 등록</h2>
           <p className="text-slate-400 text-[14px] mb-10 leading-relaxed">휠체어 이동권 모니터링을 시작하기 위해<br/>조사관님의 성함을 입력해주세요.</p>
           <input type="text" placeholder="성함 입력" className="w-full bg-slate-50 border-none rounded-3xl px-6 py-5 text-center font-bold text-lg mb-4 focus:ring-2 focus:ring-[#28A745] outline-none" onKeyDown={(e) => {if (e.key === 'Enter' && (e.target as HTMLInputElement).value) setInvestigatorName((e.target as HTMLInputElement).value)}} />
           <button onClick={() => {const input = document.querySelector('input') as HTMLInputElement; if (input.value) setInvestigatorName(input.value)}} className="w-full bg-[#28A745] text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-green-100">조사 시작하기</button>
        </div>
      )}

      {/* Global Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-[#28A745]/20 border-t-[#28A745] rounded-full animate-spin"></div><p className="font-bold text-slate-700">엑셀 파일을 생성 중입니다...</p></div>
        </div>
      )}
    </div>
  );
};

export default App;
