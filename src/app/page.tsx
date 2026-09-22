"use client";

import React, { useState, useEffect } from 'react';
import { 
  getUsers, 
  getStudents, 
  getSession, 
  createOrUpdateSession, 
  submitAttendance, 
  closeSession, 
  getHistorySessions 
} from '@/app/actions';

type Role = 'sardor' | 'oqituvchi';
type AbsenceStatus = 'kelmadi' | 'sababli' | 'kech_qoldi';

interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
}

interface Student {
  id: string;
  name: string;
  phone?: string;
  dob?: string;
  stats?: {
    absences: any[];
    lates: any[];
  }
}

interface AbsenceRecord {
  id: string;
  reason: string;
  status: AbsenceStatus;
  time?: string;
}

interface HistoryRecord {
  date: string;
  totalStudents: number;
  absentCount: number;
  details: AbsenceRecord[];
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history' | 'students'>('dashboard');
  
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const [absentStudents, setAbsentStudents] = useState<Record<string, { reason: string }>>({});
  const [todayAbsences, setTodayAbsences] = useState<AbsenceRecord[]>([]);
  const [isAttendanceDone, setIsAttendanceDone] = useState(false);
  const [isAttendanceClosed, setIsAttendanceClosed] = useState(false); 

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [statsViewDetail, setStatsViewDetail] = useState<'jami' | 'bor' | 'yoq' | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  // DB States
  const [isLoading, setIsLoading] = useState(true);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbStudents, setDbStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const users = await getUsers();
        setDbUsers(users);

        const studentsData = await getStudents();
        
        // Transform student attendances into stats
        const formattedStudents = studentsData.map((s: any) => {
          const absences = s.attendances
            .filter((a: any) => a.status === 'kelmadi' || a.status === 'sababli')
            .map((a: any) => ({ date: new Date(a.session.date).toLocaleDateString('uz-UZ'), reason: a.reason }));
            
          const lates = s.attendances
            .filter((a: any) => a.status === 'kech_qoldi')
            .map((a: any) => ({ date: new Date(a.session.date).toLocaleDateString('uz-UZ'), reason: a.reason, time: a.time }));

          return {
            ...s,
            stats: { absences, lates }
          };
        });
        setDbStudents(formattedStudents);

        const session = await getSession();
        if (session) {
          setSessionId(session.id);
          setIsAttendanceClosed(session.isClosed);
          
          if (session.attendances && session.attendances.length > 0) {
            setIsAttendanceDone(true);
            const loadedAbsences = session.attendances.map((a: any) => ({
              id: a.studentId,
              reason: a.reason || "",
              status: a.status as AbsenceStatus,
              time: a.time || ""
            }));
            setTodayAbsences(loadedAbsences);
          }
        }
      } catch (e) {
        console.error("Data load error:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const loadHistory = async () => {
    const historyData = await getHistorySessions();
    const formattedHistory = historyData.map((h: any) => ({
      date: new Date(h.date).toLocaleDateString('uz-UZ'),
      totalStudents: dbStudents.length,
      absentCount: h.attendances.filter((a: any) => a.status === 'kelmadi').length,
      details: h.attendances.map((a: any) => ({
        id: a.student.id,
        reason: a.reason || "",
        status: a.status,
        time: a.time || ""
      }))
    }));
    setHistory(formattedHistory);
  };

  useEffect(() => {
    if (currentTab === 'history') {
      loadHistory();
    }
  }, [currentTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = dbUsers.find(u => u.username === loginUsername && u.password === loginPassword);
    if (user) {
      setCurrentUser({ id: user.id, username: user.username, role: user.role as Role, name: user.name });
      setLoginError("");
    } else {
      setLoginError("Login yoki parol noto'g'ri!");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUsername("");
    setLoginPassword("");
    setCurrentTab('dashboard');
    setIsTakingAttendance(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-blue-600 font-bold text-xl flex items-center gap-2">
           <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
           Ma'lumotlar bazadan yuklanmoqda...
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-blue-700 tracking-wider">E-Starssa</h1>
            <p className="text-gray-500 mt-2 font-medium">Tizimga kirish</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Login</label>
              <input 
                type="text" 
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="Loginni kiriting"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Parol</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="Parolni kiriting"
                required
              />
            </div>
            
            {loginError && <p className="text-red-500 text-sm font-medium">{loginError}</p>}
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-95">
              Kirish
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredStudents = dbStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAbsent = (id: string) => {
    setAbsentStudents(prev => {
      const newState = { ...prev };
      if (newState[id]) delete newState[id];
      else newState[id] = { reason: "" };
      return newState;
    });
  };

  const updateReason = (id: string, reason: string) => {
    setAbsentStudents(prev => ({ ...prev, [id]: { ...prev[id], reason } }));
  };

  const sendToTelegram = async () => {
    setIsSending(true);
    
    // DB Session
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const session = await createOrUpdateSession();
      activeSessionId = session.id;
      setSessionId(session.id);
    }

    const finalizedAbsences: AbsenceRecord[] = Object.keys(absentStudents).map(idStr => ({
      id: idStr,
      reason: absentStudents[idStr].reason,
      status: 'kelmadi'
    }));

    // DB Submission
    await submitAttendance(activeSessionId, finalizedAbsences.map(a => ({
      studentId: a.id,
      status: a.status,
      reason: a.reason,
      time: a.time
    })));

    // Telegram
    const absentData = Object.keys(absentStudents).map(id => {
      const student = dbStudents.find(s => s.id === id);
      return { id: student?.id, name: student?.name, reason: absentStudents[id].reason };
    });

    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalStudents: dbStudents.length, absentStudents: absentData })
      });
      if (res.ok) {
        alert("Ma'lumotlar muvaffaqiyatli saqlandi va Telegramga yuborildi!");
        setTodayAbsences(finalizedAbsences);
        setIsAttendanceDone(true);
        setIsTakingAttendance(false);
        setAbsentStudents({});
        setSearchTerm("");
      }
    } catch (error) {} finally { setIsSending(false); }
  };

  const sendCommandMessage = async (msg: string) => {
    setIsSending(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCommand: true, commandMessage: msg })
      });
      if (res.ok) alert("Xabar botga yuborildi!");
    } catch (error) {} finally { setIsSending(false); }
  };

  const sendUpdateToTelegram = async () => {
    if (!sessionId) return;
    setIsSending(true);

    // Update DB
    await submitAttendance(sessionId, todayAbsences.map(a => ({
      studentId: a.id,
      status: a.status,
      reason: a.reason,
      time: a.time
    })));

    const updatedData = todayAbsences.map(record => {
      const student = dbStudents.find(s => s.id === record.id);
      return { id: student?.id, name: student?.name, reason: record.reason, status: record.status, time: record.time };
    });

    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUpdate: true, totalStudents: dbStudents.length, updatedStudents: updatedData })
      });
      if (res.ok) alert("O'zgarishlar Telegramga yuborildi!");
    } catch (error) {} finally { setIsSending(false); }
  };

  const closeAttendanceAction = async () => {
    if (!sessionId) return;
    const confirmClose = window.confirm("Davomatni yopmoqchimisiz?");
    if (!confirmClose) return;

    // Yopish so'rovi (DB)
    await closeSession(sessionId);

    setIsAttendanceClosed(true);
    alert("Davomat tasdiqlandi va yopildi!");
    setCurrentTab('history');
  };

  const updateStatus = (id: string, newStatus: AbsenceStatus) => {
    setTodayAbsences(prev => prev.map(record => {
      if (record.id === id) {
        return {
          ...record,
          status: newStatus,
          time: newStatus === 'kech_qoldi' ? new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : record.time
        };
      }
      return record;
    }));
  };

  const updateExistingReason = (id: string, newReason: string) => {
    setTodayAbsences(prev => prev.map(record => record.id === id ? { ...record, reason: newReason } : record));
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-blue-700 text-white md:min-h-screen md:sticky md:top-0 flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-4 md:p-6 flex justify-between items-center md:block border-b border-blue-600 md:border-b-0">
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-wide">E-Starssa</h1>
            <p className="text-blue-200 text-xs md:text-sm mt-1 font-medium">{currentUser.name}</p>
          </div>
          
          <button onClick={handleLogout} className="md:hidden bg-white text-blue-700 px-3 py-1 rounded text-xs font-bold shadow-sm">
            Chiqish
          </button>
        </div>

        <nav className="flex md:flex-col p-2 md:p-4 gap-2 md:gap-3 overflow-x-auto md:flex-1 shadow-inner md:shadow-none bg-blue-800 md:bg-transparent">
          <button 
            onClick={() => setCurrentTab('dashboard')} 
            className={`flex items-center px-4 py-3 rounded-lg text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${currentTab === 'dashboard' ? 'bg-white text-blue-700 shadow-md transform scale-105 md:scale-100' : 'text-blue-100 hover:bg-blue-600'}`}
          >
            📊 Asosiy Panel
          </button>
          <button 
            onClick={() => setCurrentTab('students')} 
            className={`flex items-center px-4 py-3 rounded-lg text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${currentTab === 'students' ? 'bg-white text-blue-700 shadow-md transform scale-105 md:scale-100' : 'text-blue-100 hover:bg-blue-600'}`}
          >
            🧑‍🎓 O'quvchilar
          </button>
          <button 
            onClick={() => setCurrentTab('history')} 
            className={`flex items-center px-4 py-3 rounded-lg text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${currentTab === 'history' ? 'bg-white text-blue-700 shadow-md transform scale-105 md:scale-100' : 'text-blue-100 hover:bg-blue-600'}`}
          >
            🕰 Davomatlar Tarixi
          </button>
        </nav>

        <div className="hidden md:block p-4 mt-auto">
          <button onClick={handleLogout} className="w-full bg-blue-800 hover:bg-blue-900 text-white border border-blue-500 px-4 py-3 rounded-lg text-sm font-bold shadow transition">
            🚪 Tizimdan chiqish
          </button>
        </div>
      </aside>

      {/* Kontent */}
      <main className="flex-1 w-full pb-10">
        <div className="max-w-5xl mx-auto p-4 sm:p-8">
          
          {currentTab === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="mb-6 sm:mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  {currentUser.role === 'oqituvchi' ? "O'qituvchi Paneli" : "Sardor Paneli"}
                </h2>
                {isAttendanceClosed && (
                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold border border-green-300 shadow-sm inline-block">
                    ✅ Bugungi davomat yopilgan
                  </span>
                )}
              </div>

              {!isTakingAttendance ? (
                <>
                  {!isAttendanceDone && !isAttendanceClosed && currentUser.role === 'sardor' && (
                    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-100">
                      <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-700">Tezkor amallar</h3>
                      <button 
                        onClick={() => setIsTakingAttendance(true)}
                        className="bg-blue-600 text-white w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-md hover:shadow-lg text-center"
                      >
                        + Bugungi davomatni kiritish
                      </button>
                    </div>
                  )}

                  {!isAttendanceDone && !isAttendanceClosed && currentUser.role === 'oqituvchi' && (
                     <div className="bg-yellow-50 rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-yellow-200">
                       <p className="text-yellow-800 font-bold text-lg text-center mb-4">Sinf sardori hali davomatni kiritmadi.</p>
                       
                       <div className="flex flex-col sm:flex-row gap-4 mt-6">
                         <a href="tel:+998901234567" className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-center font-bold shadow transition">
                           📞 Xumoyunmirzo
                         </a>
                         <a href="tel:+998909876543" className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-center font-bold shadow transition">
                           📞 Ruxshona
                         </a>
                       </div>
                       
                       <div className="mt-6 pt-4 border-t border-yellow-200">
                         <p className="text-sm font-bold text-gray-600 mb-3">Bot orqali sardorga tezkor xabar yuborish:</p>
                         <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                           <button onClick={() => sendCommandMessage("Davomat qilinganmi?")} className="bg-white border-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100 px-4 py-2 rounded-lg text-sm font-semibold transition">
                             Davomat qilinganmi?
                           </button>
                           <button onClick={() => sendCommandMessage("Menga yozvor tezda")} className="bg-white border-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100 px-4 py-2 rounded-lg text-sm font-semibold transition">
                             Menga yozvor
                           </button>
                           <button onClick={() => sendCommandMessage("Ustozingga ayt, telefon qilsin!")} className="bg-white border-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100 px-4 py-2 rounded-lg text-sm font-semibold transition">
                             Ustozga tel qilsin
                           </button>
                         </div>

                         <div className="flex gap-2">
                           <input 
                             type="text" 
                             value={customMessage}
                             onChange={(e) => setCustomMessage(e.target.value)}
                             placeholder="Yoki o'zingiz xabar yozing..."
                             className="flex-1 p-3 text-sm border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-sm"
                           />
                           <button 
                             onClick={() => {
                               if (customMessage.trim()) {
                                 sendCommandMessage(customMessage);
                                 setCustomMessage("");
                               }
                             }}
                             className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg text-sm font-bold shadow transition"
                           >
                             Yuborish
                           </button>
                         </div>
                       </div>
                     </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div 
                      onClick={() => setStatsViewDetail('jami')}
                      className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border-l-4 border-blue-500 cursor-pointer hover:bg-blue-50 transition transform hover:-translate-y-1"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-gray-500 uppercase tracking-wide">Jami O'quvchilar</h3>
                      <p className="text-3xl sm:text-4xl font-black mt-2 text-gray-800">{dbStudents.length} <span className="text-lg font-normal text-gray-400">ta</span></p>
                    </div>
                    <div 
                      onClick={() => { if (isAttendanceDone || isAttendanceClosed) setStatsViewDetail('bor'); else alert("Avval davomat kiritilishi kerak!") }}
                      className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border-l-4 border-green-500 cursor-pointer hover:bg-green-50 transition transform hover:-translate-y-1"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-gray-500 uppercase tracking-wide">Bugun ishtirok etyapti</h3>
                      <p className="text-3xl sm:text-4xl font-black mt-2 text-green-600">
                        {isAttendanceDone || isAttendanceClosed ? dbStudents.length - todayAbsences.filter(a => a.status === 'kelmadi').length : '-'} 
                      </p>
                    </div>
                    <div 
                      onClick={() => { if (isAttendanceDone || isAttendanceClosed) setStatsViewDetail('yoq'); else alert("Avval davomat kiritilishi kerak!") }}
                      className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border-l-4 border-red-500 cursor-pointer hover:bg-red-50 transition transform hover:-translate-y-1"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-gray-500 uppercase tracking-wide">Bugun kelmaganlar</h3>
                      <p className="text-3xl sm:text-4xl font-black mt-2 text-red-600">
                        {isAttendanceDone || isAttendanceClosed ? todayAbsences.filter(a => a.status === 'kelmadi').length : '-'} 
                      </p>
                    </div>
                  </div>

                  {isAttendanceDone && !isAttendanceClosed && (
                    <div className="bg-white rounded-xl shadow-md border overflow-hidden">
                      <div className="bg-red-50 p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3">
                        <h3 className="text-lg sm:text-xl font-bold text-red-800 flex items-center gap-2">
                          📋 Bugungi kelmaganlar va holatlar
                        </h3>
                        {currentUser.role === 'sardor' && (
                          <button 
                            onClick={() => setIsTakingAttendance(true)}
                            className="text-xs sm:text-sm bg-white border border-gray-300 font-semibold w-full sm:w-auto px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm"
                          >
                            Davomatni qayta yozish
                          </button>
                        )}
                      </div>
                      
                      {todayAbsences.length === 0 ? (
                        <div className="p-8 text-center bg-green-50">
                          <p className="text-green-700 font-bold text-lg sm:text-xl">Barcha o'quvchilar kelgan! 🎉</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {todayAbsences.map(record => {
                            const student = dbStudents.find(s => s.id === record.id);
                            if (!student) return null;
                            return (
                              <div key={record.id} className="p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition hover:bg-gray-50">
                                <div className="w-full">
                                  <h4 className="font-bold text-lg sm:text-xl text-gray-800">{student.name}</h4>
                                  <p className="text-xs sm:text-sm text-gray-500 font-medium">{student.phone}</p>
                                  
                                  {currentUser.role === 'sardor' ? (
                                    <input 
                                      type="text" 
                                      placeholder="Sababni kiritish (ixtiyoriy)..." 
                                      value={record.reason}
                                      onChange={(e) => updateExistingReason(record.id, e.target.value)}
                                      className="mt-3 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full xl:w-72 bg-white px-3 py-2"
                                    />
                                  ) : (
                                    <p className="text-sm mt-2 text-gray-600 italic">{record.reason ? `Sabab: ${record.reason}` : "Sabab ko'rsatilmagan"}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                                  <button disabled={currentUser.role !== 'sardor'} onClick={() => updateStatus(record.id, 'kelmadi')} className={`flex-1 xl:flex-none px-3 sm:px-4 py-2 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-sm ${record.status === 'kelmadi' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>Kelmadi</button>
                                  <button disabled={currentUser.role !== 'sardor'} onClick={() => updateStatus(record.id, 'sababli')} className={`flex-1 xl:flex-none px-3 sm:px-4 py-2 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-sm ${record.status === 'sababli' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>Sababli</button>
                                  <button disabled={currentUser.role !== 'sardor'} onClick={() => updateStatus(record.id, 'kech_qoldi')} className={`flex-1 xl:flex-none px-3 sm:px-4 py-2 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-sm ${record.status === 'kech_qoldi' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{record.status === 'kech_qoldi' && record.time ? `Kech keldi (${record.time})` : 'Kechikib keldi'}</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="p-4 sm:p-5 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                        {currentUser.role === 'sardor' ? (
                          <button 
                            onClick={sendUpdateToTelegram}
                            disabled={isSending}
                            className={`w-full sm:w-auto text-sm sm:text-base ${isSending ? 'bg-gray-400' : 'bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-50'} px-6 py-3 rounded-lg shadow-sm transition font-bold`}
                          >
                            {isSending ? 'Yuborilmoqda...' : "O'zgarishni Telegramga yuborish va Saqlash"}
                          </button>
                        ) : (
                          <div></div>
                        )}

                        {currentUser.role === 'oqituvchi' ? (
                          <button 
                            onClick={closeAttendanceAction}
                            className="w-full sm:w-auto text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg shadow-md transition font-bold border-b-4 border-green-800 active:border-b-0 active:mt-1"
                          >
                            ✅ Davomatni tasdiqlash va Yopish
                          </button>
                        ) : (
                          <span className="text-gray-500 text-sm font-medium italic">Tasdiqlash uchun ustozni kuting...</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 gap-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-blue-700">Davomatni belgilash</h3>
                    <button onClick={() => setIsTakingAttendance(false)} className="text-sm sm:text-base text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition">← Orqaga</button>
                  </div>
                  <div className="mb-6">
                    <input type="text" placeholder="O'quvchini ismi bo'yicha qidirish..." className="w-full sm:w-1/2 p-3 sm:p-4 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 max-h-[60vh] overflow-y-auto pr-1 sm:pr-2">
                    {filteredStudents.map(student => {
                      const isAbsent = !!absentStudents[student.id];
                      return (
                        <div key={student.id} className={`p-4 rounded-xl border-2 transition-all ${isAbsent ? 'border-red-400 bg-red-50 shadow-sm' : 'border-gray-100 hover:border-blue-200'}`}>
                          <div className="flex justify-between items-center gap-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-base sm:text-lg text-gray-800">{student.name}</h4>
                              <p className="text-xs sm:text-sm text-gray-500 mt-1">{student.phone}</p>
                            </div>
                            <button onClick={() => toggleAbsent(student.id)} className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-sm shrink-0 ${isAbsent ? 'bg-red-500 text-white border-b-4 border-red-700 active:border-b-0 active:mt-1' : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'}`}>{isAbsent ? "✓ Kelmadi" : "Kelmadi"}</button>
                          </div>
                          {isAbsent && (
                            <div className="mt-4 pt-4 border-t border-red-200">
                              <input type="text" placeholder="Sababni yozing (ixtiyoriy)..." className="w-full p-3 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 shadow-inner" value={absentStudents[student.id].reason} onChange={(e) => updateReason(student.id, e.target.value)} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t pt-5 sm:pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 sm:p-6 rounded-b-xl">
                    <p className="text-gray-600 font-semibold text-sm sm:text-lg">
                      Jami belgilandi: <span className="text-red-600 font-black bg-red-100 px-3 py-1 rounded-full ml-2">{Object.keys(absentStudents).length}</span>
                    </p>
                    <button onClick={sendToTelegram} disabled={isSending} className={`w-full sm:w-auto ${isSending ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-8 py-3.5 rounded-xl font-bold shadow-md transition-all text-sm sm:text-base`}>Saqlash va Yuborish</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTab === 'students' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">🧑‍🎓 O'quvchilar ro'yxati</h2>
              <div className="space-y-3">
                {dbStudents.map(student => {
                  const isExpanded = expandedStudentId === student.id;
                  
                  return (
                    <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200">
                      <button 
                        onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                        className="w-full text-left p-4 sm:p-5 flex justify-between items-center bg-white hover:bg-gray-50 transition"
                      >
                        <h3 className="font-bold text-lg text-gray-800">{student.name}</h3>
                        <span className="text-gray-400">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50">
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-bold">📱 {student.phone || 'Kiritilmagan'}</span>
                            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-sm font-bold">🎂 {student.dob || 'Kiritilmagan'}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                              <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="text-red-500 font-black text-lg">{student.stats?.absences.length} marta</span> Kelmagan
                              </h4>
                              {student.stats && student.stats.absences.length > 0 ? (
                                <ul className="space-y-2">
                                  {student.stats.absences.map((abs, i) => (
                                    <li key={i} className="text-sm border-l-2 border-red-400 pl-3">
                                      <span className="font-bold block text-gray-800">{abs.date}</span>
                                      <span className="text-gray-500">{abs.reason || "Sababi yo'q"}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-400 italic">Dars umuman qoldirmagan.</p>
                              )}
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                              <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="text-yellow-500 font-black text-lg">{student.stats?.lates.length} marta</span> Kech qolgan
                              </h4>
                              {student.stats && student.stats.lates.length > 0 ? (
                                <ul className="space-y-2">
                                  {student.stats.lates.map((lat, i) => (
                                    <li key={i} className="text-sm border-l-2 border-yellow-400 pl-3">
                                      <span className="font-bold block text-gray-800">{lat.date} <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">{lat.time}</span></span>
                                      <span className="text-gray-500">{lat.reason || "Sababi yo'q"}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-400 italic">Hech qachon kechikmagan.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentTab === 'history' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">Davomatlar Tarixi</h2>
              
              {history.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-200 border-dashed">
                  <div className="text-4xl mb-4">🕰</div>
                  <p className="text-gray-500 text-lg font-medium">Hali yopilgan davomatlar yo'q.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {history.map((record, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 p-4 sm:p-5 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 text-lg sm:text-xl">📅 {record.date} holatiga</h3>
                        <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-md text-sm font-bold border border-red-200">
                          Jami qatnashmadi: {record.absentCount}
                        </span>
                      </div>
                      <div className="p-4 sm:p-5">
                        {record.details.length === 0 ? (
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-green-700 font-bold">Bu kuni barcha o'quvchilar darsda ishtirok etgan! 🎉</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm sm:text-base border-collapse">
                              <thead>
                                <tr className="border-b-2 text-gray-400 uppercase text-xs tracking-wider">
                                  <th className="pb-3 font-bold pl-2">O'quvchi</th>
                                  <th className="pb-3 font-bold">Holati</th>
                                  <th className="pb-3 font-bold hidden sm:table-cell">Sabab</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.details.map((detail, idx) => {
                                  const student = dbStudents.find(s => s.id === detail.id);
                                  return (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50 transition">
                                      <td className="py-4 font-bold text-gray-800 pl-2">{student?.name}</td>
                                      <td className="py-4">
                                        {detail.status === 'kelmadi' && <span className="text-red-700 bg-red-100 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm border border-red-200">Kelmadi</span>}
                                        {detail.status === 'sababli' && <span className="text-yellow-800 bg-yellow-100 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm border border-yellow-300">Sababli</span>}
                                        {detail.status === 'kech_qoldi' && <span className="text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm border border-blue-200">Kech keldi {detail.time && `(${detail.time})`}</span>}
                                      </td>
                                      <td className="py-4 hidden sm:table-cell text-gray-600 font-medium">
                                        {detail.reason || <span className="text-gray-300 italic">Kiritilmagan</span>}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Statistika Modali */}
          {statsViewDetail && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in">
                <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                  <h3 className="font-bold text-lg text-gray-800">
                    {statsViewDetail === 'jami' && "Jami O'quvchilar Ro'yxati"}
                    {statsViewDetail === 'bor' && "Bugun Ishtirok Etyotganlar"}
                    {statsViewDetail === 'yoq' && "Bugun Kelmaganlar"}
                  </h3>
                  <button onClick={() => setStatsViewDetail(null)} className="text-gray-400 hover:text-red-500 font-bold text-2xl transition">
                    &times;
                  </button>
                </div>
                <div className="p-4 sm:p-5 overflow-y-auto">
                  <ul className="divide-y divide-gray-100">
                    {dbStudents
                      .filter(s => {
                        if (statsViewDetail === 'jami') return true;
                        
                        const isAbsent = todayAbsences.some(a => a.id === s.id && a.status === 'kelmadi');
                        if (statsViewDetail === 'yoq') return isAbsent;
                        if (statsViewDetail === 'bor') return !isAbsent;
                        
                        return true;
                      })
                      .map((student, i) => (
                        <li key={student.id} className="py-3 flex items-center gap-3">
                          <span className="text-gray-400 font-bold w-6">{i + 1}.</span>
                          <span className="font-bold text-gray-700">{student.name}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
