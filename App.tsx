
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldAlert, CheckCircle, History, X, MapPin, Info, Zap, FileText, User, Copy, Download, Scale, Calendar, CloudSun, Home, Settings, Clock, ChevronRight, Bell, AlertTriangle, FileSpreadsheet, Trash2, LogOut, Navigation, Sun, Volume2, Map as MapIcon, Tag } from 'lucide-react';
import { analyzeSidewalk } from './services/geminiService';
import { Investigation } from './types';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings'>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [investigatorName, setInvestigatorName] = useState(() => localStorage.getItem('investigator_name') || '');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // New Settings States
  const [brightness, setBrightness] = useState(() => Number(localStorage.getItem('app_brightness')) || 100);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('app_sound') !== 'false');
  
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
      setSelectedId(newId);
      setActiveTab('home');

      // Play sound if enabled
      if (soundEnabled) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
        audio.play().catch(() => {});
      }

      try {
        const result = await analyzeSidewalk(base64Image);
        setInvestigations(prev => prev.map(inv => inv.id === newId ? { ...inv, result, status: 'completed' } : inv));
        
        if (soundEnabled) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
          audio.play().catch(() => {});
        }
      } catch (err) {
        setInvestigations(prev => prev.map(inv => inv.id === newId ? { ...inv, status: 'error', errorMessage: '분석 중 오류 발생' } : inv));
      }
    };
    reader.readAsDataURL(file);
    if (event.target) event.target.value = '';
  };

  const currentInv = investigations.find(inv => inv.id === (selectedId || (investigations.length > 0 ? investigations[0].id : null)));

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
      setSelectedId(null);
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const showCurrentLocationOnMap = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      openInMaps(loc.latitude, loc.longitude);
    } else {
      alert("위치 정보를 가져올 수 없습니다. GPS 설정을 확인해주세요.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#F8F9FB] relative overflow-hidden">
      
      {/* Brightness Overlay (Simulation) */}
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

        {/* 2. Home Tab Content */}
        {activeTab === 'home' && (
          <>
            {/* Status Widget */}
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 card-shadow flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <CloudSun className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">날씨</p>
                  <p className="text-[14px] font-bold text-slate-800">2°C 맑음</p>
                </div>
              </div>
              <div className="h-6 w-px bg-slate-100"></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">GPS 연동</p>
                  <p className="text-[14px] font-bold text-[#28A745]">활성화됨</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-[#28A745]" />
                </div>
              </div>
            </div>

            {/* Analysis Action */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-[#28A745] text-white py-4 rounded-2xl font-bold text-lg btn-active shadow-xl shadow-green-100 flex items-center justify-center gap-2 mb-8"
            >
              <Camera className="w-5 h-5" />
              현장 사진 촬영/분석
            </button>

            {/* Live Result Display */}
            {currentInv && (
              <div className="space-y-4 mb-10 animate-slide-up">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#28A745]" />
                    {selectedId ? '기록 데이터 확인' : '최근 분석 리포트'}
                  </h3>
                  {selectedId && (
                    <button onClick={() => setSelectedId(null)} className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      최신글로 돌아가기 <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-[28px] border border-slate-100 card-shadow overflow-hidden">
                  <div className="p-4 border-b border-slate-50 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={currentInv.imageUrl} className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-300 uppercase">
                          {new Date(currentInv.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-[13px] font-bold text-slate-500 truncate">Gemini 3 Pro 정밀 분석</p>
                     </div>
                     <button onClick={copyResult} className="p-2 bg-slate-50 rounded-lg text-slate-400 btn-active">
                        <Copy className="w-4 h-4" />
                     </button>
                  </div>

                  <div className="p-6">
                    {/* GPS Info Section */}
                    {currentInv.location && (
                      <div className="mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-rose-500" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">현장 GPS 좌표</p>
                            <p className="text-[12px] font-medium text-slate-600">
                              {currentInv.location.latitude.toFixed(6)}, {currentInv.location.longitude.toFixed(6)}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => openInMaps(currentInv.location!.latitude, currentInv.location!.longitude)}
                          className="text-[11px] font-bold text-[#28A745] bg-green-50 px-3 py-1.5 rounded-lg border border-green-100"
                        >
                          지도보기
                        </button>
                      </div>
                    )}

                    {currentInv.status === 'analyzing' ? (
                      <div className="py-8 text-center space-y-4">
                        <div className="w-8 h-8 border-4 border-[#28A745]/20 border-t-[#28A745] rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm font-bold text-slate-400">Gemini 3 Pro 엔진 분석 중...</p>
                      </div>
                    ) : currentInv.status === 'error' ? (
                      <div className="py-6 text-center bg-rose-50 rounded-2xl">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-rose-800">분석 실패</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <Scale className="w-4 h-4 text-[#28A745]" />
                             <span className="text-[11px] font-black text-[#28A745] uppercase tracking-tighter">종합 분석 판정</span>
                           </div>
                           <p className="text-[15px] font-bold leading-relaxed text-slate-800 break-all">
                             {currentInv.result?.vulnerabilityReport}
                           </p>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-50">
                           <p className="text-[12px] font-bold text-slate-400 mb-2">상세 시정 권고</p>
                           <ul className="space-y-2">
                             {currentInv.result?.recommendations.map((rec, i) => (
                               <li key={i} className="flex gap-2 text-[13px] font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <span className="text-[#28A745] font-black">•</span>
                                 {rec}
                               </li>
                             ))}
                           </ul>
                        </div>

                        {showCopyFeedback && (
                          <div className="bg-[#28A745] text-white text-[11px] font-bold py-2 rounded-lg text-center animate-in fade-in zoom-in-95">
                            텍스트가 복사되었습니다!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 3. Settings Tab Content */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-slide-up pb-28">
             <div className="flex items-center gap-2 px-1 mb-2">
                <Settings className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800">조사 설정 및 도구</h3>
             </div>
             
             {/* General Info Card */}
             <div className="bg-white rounded-3xl border border-slate-100 card-shadow overflow-hidden">
                <div className="p-6 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-50 rounded-lg"><User className="w-4 h-4 text-slate-400" /></div>
                         <div>
                            <p className="text-[14px] font-bold text-slate-800">조사자 성함</p>
                            <p className="text-[11px] text-slate-400">리포트에 표시될 이름</p>
                         </div>
                      </div>
                      <p className="font-bold text-[#28A745]">{investigatorName}</p>
                   </div>
                   <div className="h-px bg-slate-50"></div>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-50 rounded-lg"><Tag className="w-4 h-4 text-slate-400" /></div>
                         <div>
                            <p className="text-[14px] font-bold text-slate-800">현재 버전</p>
                            <p className="text-[11px] text-slate-400">애플리케이션 정보</p>
                         </div>
                      </div>
                      <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold">v1.4.2</span>
                   </div>
                </div>
             </div>

             {/* UI Controls Card */}
             <div className="bg-white rounded-3xl border border-slate-100 card-shadow overflow-hidden">
                <div className="p-6 space-y-6">
                   {/* Brightness Control */}
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg"><Sun className="w-4 h-4 text-amber-500" /></div>
                            <p className="text-[14px] font-bold text-slate-800">화면 밝기</p>
                        </div>
                        <span className="text-[12px] font-bold text-slate-400">{brightness}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="20" 
                        max="100" 
                        value={brightness} 
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#28A745]"
                      />
                   </div>

                   <div className="h-px bg-slate-50"></div>

                   {/* Sound Control */}
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-50 rounded-lg"><Volume2 className="w-4 h-4 text-blue-500" /></div>
                         <div>
                            <p className="text-[14px] font-bold text-slate-800">알람 소리</p>
                            <p className="text-[11px] text-slate-400">분석 완료 시 효과음</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-[#28A745]' : 'bg-slate-200'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${soundEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                   </div>
                </div>
             </div>

             {/* Action List */}
             <div className="space-y-3">
                <button 
                  onClick={showCurrentLocationOnMap}
                  className="w-full bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between btn-active"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                         <MapIcon className="w-5 h-5 text-rose-500" />
                      </div>
                      <div className="text-left">
                         <p className="text-[14px] font-bold text-slate-800">내 현재 위치 보기</p>
                         <p className="text-[11px] text-slate-400">지도로 현위치 상세 확인</p>
                      </div>
                   </div>
                   <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>

                <button 
                  onClick={exportToExcel}
                  disabled={isExporting}
                  className="w-full bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between btn-active"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                         <FileSpreadsheet className="w-5 h-5 text-[#28A745]" />
                      </div>
                      <div className="text-left">
                         <p className="text-[14px] font-bold text-slate-800">데이터 엑셀 내보내기</p>
                         <p className="text-[11px] text-slate-400">GPS 좌표 포함 .xlsx 저장</p>
                      </div>
                   </div>
                   <Download className="w-5 h-5 text-slate-300" />
                </button>

                <button 
                  onClick={resetData}
                  className="w-full bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between btn-active"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                         <Trash2 className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="text-left">
                         <p className="text-[14px] font-bold text-slate-800">조사 데이터 초기화</p>
                         <p className="text-[11px] text-slate-400">모든 로컬 기록 영구 삭제</p>
                      </div>
                   </div>
                   <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
             </div>

             <div className="p-8 text-center space-y-2 opacity-30">
                <p className="text-[11px] font-bold tracking-tighter uppercase">Jaemi Majung Social Coop - Accessibility Monitoring System</p>
             </div>
          </div>
        )}
      </header>

      {/* History View Overlay */}
      {activeTab === 'history' && (
        <div className="fixed inset-0 z-[150] bg-[#F8F9FB] flex flex-col p-6 overflow-y-auto animate-slide-up no-scrollbar">
          <div className="flex justify-between items-center mb-8 pt-4">
            <h2 className="text-2xl font-bold">조사 기록</h2>
            <button onClick={() => setActiveTab('home')} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm"><X className="w-5 h-5" /></button>
          </div>
          
          <button 
            onClick={exportToExcel}
            className="w-full bg-[#28A745]/10 text-[#28A745] py-4 rounded-2xl font-bold text-sm mb-6 flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            기록물 엑셀 다운로드 (GPS 포함)
          </button>

          <div className="space-y-4 pb-20">
             {investigations.map(inv => (
               <div key={inv.id} onClick={() => { setSelectedId(inv.id); setActiveTab('home'); }} className="bg-white p-4 rounded-3xl card-shadow border border-slate-50 flex gap-4 btn-active items-center">
                 <img src={inv.imageUrl} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-0.5">
                     <p className="text-[10px] font-bold text-slate-300 uppercase">
                       {new Date(inv.timestamp).toLocaleDateString()}
                     </p>
                     {inv.location && (
                       <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-400">
                         <MapPin className="w-2.5 h-2.5" /> GPS 기록됨
                       </span>
                     )}
                   </div>
                   <p className="text-[14px] font-bold text-slate-700 line-clamp-1">
                     {inv.result?.vulnerabilityReport || '분석 진행 중...'}
                   </p>
                 </div>
                 <ChevronRight className="w-4 h-4 text-slate-200" />
               </div>
             ))}
             {investigations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-40 text-slate-300 space-y-4">
                   <History className="w-10 h-10 opacity-20" />
                   <p className="font-bold text-sm">기록이 비어있습니다.</p>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around z-[100] max-w-md mx-auto safe-area-bottom">
        <button onClick={() => {setActiveTab('home'); setSelectedId(null);}} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'home' ? 'text-[#28A745]' : 'text-slate-300'}`}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold">홈</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'history' ? 'text-[#28A745]' : 'text-slate-300'}`}>
          <FileText className="w-6 h-6" />
          <span className="text-[10px] font-bold">조사내역</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'settings' ? 'text-[#28A745]' : 'text-slate-300'}`}>
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold">설정</span>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </nav>

      {/* Setup Screen */}
      {investigatorName === '' && (
        <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center p-12 text-center gap-10">
           <div className="w-24 h-24 bg-green-50 rounded-[40px] flex items-center justify-center shadow-inner">
             <User className="w-10 h-10 text-[#28A745]" />
           </div>
           <div className="space-y-3">
             <h2 className="text-3xl font-bold text-slate-800">조사자 정보 등록</h2>
             <p className="text-[15px] text-slate-400 font-medium leading-relaxed">정확한 모니터링 분석 리포트를 위해<br/>성함을 입력해 주세요.</p>
           </div>
           <div className="w-full space-y-4">
             <input 
               type="text" 
               placeholder="성함 입력" 
               className="w-full bg-slate-50 border-none rounded-3xl px-8 py-5 text-center font-bold text-xl focus:ring-2 focus:ring-[#28A745] outline-none"
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                   setInvestigatorName((e.target as HTMLInputElement).value);
                 }
               }}
             />
             <button 
               onClick={() => {
                 const input = document.querySelector('input') as HTMLInputElement;
                 if (input.value) setInvestigatorName(input.value);
               }}
               className="w-full bg-[#28A745] text-white py-5 rounded-3xl font-bold text-lg shadow-2xl shadow-green-100 btn-active"
             >
               등록 후 시작하기
             </button>
           </div>
        </div>
      )}

      {/* Exporting Indicator */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[500] flex items-center justify-center">
           <div className="bg-white p-8 rounded-3xl card-shadow flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[#28A745]/20 border-t-[#28A745] rounded-full animate-spin"></div>
              <p className="font-bold text-slate-700">엑셀 파일 생성 중...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
