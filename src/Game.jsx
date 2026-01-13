
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Trophy, Users, Timer, Plus, Minus, PlayCircle, 
  LogOut, RotateCcw, PartyPopper, Home, Award, Target, 
  Sparkles, CheckCircle2, MessageSquare, Crown, ArrowRight, 
  ArrowLeft, Pause, Play, Zap, ShieldAlert, X
} from 'lucide-react';
import { GamePhase, Team, Category, SelectedCategory, AuctionState } from './types';
import { CATEGORIES, POINT_VALUES, TIMER_CONFIG } from './constants';

// --- Context Definition ---

interface GameContextType {
  phase: GamePhase;
  teams: Team[];
  activeTeamIndex: number;
  selectedCategories: SelectedCategory[];
  answeredKeys: Set<string>;
  activePowerUp: 'double' | 'block' | null;
  auction: AuctionState | null;
  challengeScore: number;
  timeLeft: number;
  isTimerActive: boolean;
  timerStarted: boolean;
  
  // Actions
  setPhase: (phase: GamePhase) => void;
  updateTeamScore: (index: number, delta: number) => void;
  startGame: (names: string[]) => void;
  pickCategory: (cat: Category) => void;
  togglePowerUp: (type: 'double' | 'block') => void;
  initiateAuction: (cat: SelectedCategory, points: number, teamIndex: number) => void;
  raiseBid: () => void;
  withdraw: () => void;
  startChallenge: () => void;
  setChallengeScore: React.Dispatch<React.SetStateAction<number>>;
  setIsTimerActive: (active: boolean) => void;
  setTimerStarted: (started: boolean) => void;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  finalizeChallenge: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

// --- Provider Component ---

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [teams, setTeams] = useState<Team[]>([
    { name: '', score: 0, color: 'text-blue-800', borderColor: 'border-blue-700', shadowColor: 'blue', inventory: { double: 1, block: 1 } },
    { name: '', score: 0, color: 'text-lime-600', borderColor: 'border-lime-500', shadowColor: 'lime', inventory: { double: 1, block: 1 } }
  ]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategory[]>([]);
  const [answeredKeys, setAnsweredKeys] = useState<Set<string>>(new Set());
  const [activePowerUp, setActivePowerUp] = useState<'double' | 'block' | null>(null);
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [challengeScore, setChallengeScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  const updateTeamScore = (index: number, delta: number) => {
    setTeams(prev => prev.map((t, i) => i === index ? { ...t, score: Math.max(0, t.score + delta) } : t));
  };

  const startGame = (names: string[]) => {
    setTeams(prev => [
      { ...prev[0], name: names[0] || 'فريق الصقور', score: 0 },
      { ...prev[1], name: names[1] || 'فريق الأسود', score: 0 }
    ]);
    setPhase(GamePhase.DRAFT);
  };

  const pickCategory = (cat: Category) => {
    if (selectedCategories.length >= 6) return;
    setSelectedCategories(prev => [...prev, { ...cat, ownerIndex: activeTeamIndex }]);
    if (selectedCategories.length < 5) {
      setActiveTeamIndex(prev => (prev === 0 ? 1 : 0));
    } else {
      setPhase(GamePhase.BOARD);
      setActiveTeamIndex(0);
    }
  };

  const togglePowerUp = (type: 'double' | 'block') => {
    if (phase !== GamePhase.BOARD) return;
    if (teams[activeTeamIndex].inventory[type] <= 0) return;
    setActivePowerUp(activePowerUp === type ? null : type);
  };

  const initiateAuction = (cat: SelectedCategory, points: number, teamIndex: number) => {
    const isDoubled = activePowerUp === 'double';
    const isBlocked = activePowerUp === 'block';
    
    if (activePowerUp) {
      setTeams(prev => prev.map((t, idx) => 
        idx === activeTeamIndex ? { ...t, inventory: { ...t.inventory, [activePowerUp]: t.inventory[activePowerUp] - 1 } } : t
      ));
    }

    setAuction({
      categoryId: cat.id,
      categoryName: cat.name,
      basePoints: points,
      points: points,
      currentBid: 1,
      activeBidderIndex: teamIndex,
      lastBidderIndex: null,
      withdrawnIndices: [],
      winnerIndex: isBlocked ? teamIndex : null,
      missionText: `اذكر مجموعة من ${cat.name} المتعلقة بهذا التحدي`,
      isDoubled,
      isBlocked,
      powerUpOwnerIndex: activePowerUp ? activeTeamIndex : null,
      categoryOwnerIndex: cat.ownerIndex
    });
    setActivePowerUp(null);
    setPhase(GamePhase.AUCTION);
  };

  const raiseBid = () => {
    setAuction(prev => {
      if (!prev || prev.isBlocked) return prev;
      return {
        ...prev,
        currentBid: prev.currentBid + 1,
        lastBidderIndex: prev.activeBidderIndex,
        activeBidderIndex: prev.activeBidderIndex === 0 ? 1 : 0
      };
    });
  };

  const withdraw = () => {
    setAuction(prev => {
      if (!prev || prev.isBlocked) return prev;
      return { ...prev, withdrawnIndices: [...prev.withdrawnIndices, prev.activeBidderIndex], winnerIndex: prev.activeBidderIndex === 0 ? 1 : 0 };
    });
  };

  const startChallenge = () => {
    if (!auction) return;
    setTimeLeft(TIMER_CONFIG[auction.basePoints as keyof typeof TIMER_CONFIG] || 30);
    setChallengeScore(0);
    setTimerStarted(false);
    setIsTimerActive(false);
    setPhase(GamePhase.CHALLENGE);
  };

  const finalizeChallenge = () => {
    if (!auction || auction.winnerIndex === null) return;
    const success = challengeScore >= auction.currentBid;
    const finalWinnerIndex = success ? auction.winnerIndex : (auction.winnerIndex === 0 ? 1 : 0);
    let pointsToAdd = auction.basePoints;
    if (success && auction.isDoubled && finalWinnerIndex === auction.powerUpOwnerIndex) pointsToAdd *= 2;

    setTeams(prev => prev.map((t, idx) => idx === finalWinnerIndex ? { ...t, score: t.score + pointsToAdd } : t));
    setAnsweredKeys(prev => new Set(prev).add(`${auction.categoryId}-${activeTeamIndex === 0 ? 0 : 1}-${auction.basePoints}`));
    setActiveTeamIndex(prev => (prev === 0 ? 1 : 0));
    setPhase(answeredKeys.size + 1 >= 18 ? GamePhase.FINALE : GamePhase.BOARD);
    setAuction(null);
    setIsTimerActive(false);
    setTimerStarted(false);
  };

  const resetGame = () => {
    setPhase(GamePhase.SETUP);
    setTeams(prev => prev.map(t => ({ ...t, score: 0, inventory: { double: 1, block: 1 } })));
    setAnsweredKeys(new Set());
    setSelectedCategories([]);
    setActiveTeamIndex(0);
  };

  useEffect(() => {
    let interval: number;
    if (isTimerActive && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  return (
    <GameContext.Provider value={{
      phase, teams, activeTeamIndex, selectedCategories, answeredKeys, activePowerUp, auction, challengeScore, timeLeft, isTimerActive, timerStarted,
      setPhase, updateTeamScore, startGame, pickCategory, togglePowerUp, initiateAuction, raiseBid, withdraw, startChallenge, setChallengeScore, setIsTimerActive, setTimerStarted, setTimeLeft, finalizeChallenge, resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
};

// --- Sub-Components ---

const Leaderboard: React.FC = () => {
  const { teams, activeTeamIndex, phase, updateTeamScore, togglePowerUp, activePowerUp } = useGame();
  return (
    <div className="sticky top-0 z-50 w-full milk-glass border-b border-white/50 px-8 py-4 flex justify-between items-center transition-all">
      {/* Team 1 */}
      <div className={`flex items-center gap-4 transition-all duration-500 ${activeTeamIndex === 0 ? 'scale-105' : 'opacity-60'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-800 border border-blue-100 shadow-sm ${activeTeamIndex === 0 ? 'ring-4 ring-blue-700/20 shadow-blue-800/10' : ''}`}><Target className="w-6 h-6" /></div>
        <div>
          <div className="text-[10px] text-blue-800 font-black uppercase tracking-widest">فريق {teams[0].name}</div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-slate-800 leading-none tabular-nums">{teams[0].score}</div>
            {phase === GamePhase.BOARD && (
              <div className="flex gap-1">
                <button onClick={() => updateTeamScore(0, 100)} className="w-7 h-7 rounded-full bg-blue-800/10 border border-blue-800/20 flex items-center justify-center text-blue-800 hover:bg-blue-800 hover:text-white transition-all active:scale-90"><Plus className="w-4 h-4" /></button>
                <button onClick={() => updateTeamScore(0, -100)} className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all active:scale-90"><Minus className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          <div className="flex gap-1.5 mt-2">
            <button onClick={() => activeTeamIndex === 0 && togglePowerUp('double')} disabled={activeTeamIndex !== 0 || teams[0].inventory.double <= 0} className={`p-1 rounded-lg border transition-all flex items-center gap-0.5 ${activePowerUp === 'double' && activeTeamIndex === 0 ? 'bg-amber-400 border-amber-500' : (teams[0].inventory.double > 0 && activeTeamIndex === 0 ? 'bg-white border-amber-100' : 'bg-slate-50 opacity-30 grayscale')}`} title="مضاعفة (X2)"><Zap className="w-3 h-3 text-amber-500" /><span className="text-[8px] font-black">X2</span></button>
            <button onClick={() => activeTeamIndex === 0 && togglePowerUp('block')} disabled={activeTeamIndex !== 0 || teams[0].inventory.block <= 0} className={`p-1 rounded-lg border transition-all flex items-center gap-0.5 ${activePowerUp === 'block' && activeTeamIndex === 0 ? 'bg-slate-800 border-slate-900 text-white' : (teams[0].inventory.block > 0 && activeTeamIndex === 0 ? 'bg-white border-slate-200' : 'bg-slate-50 opacity-30 grayscale')}`} title="حجب"><ShieldAlert className="w-3 h-3 text-slate-800" /><span className="text-[8px] font-black">حجب</span></button>
          </div>
        </div>
      </div>
      {/* Title */}
      <div className="text-center relative">
        <h1 className="text-2xl font-black text-gradient-gold">المزاد الفاخر</h1>
        <div className="text-[9px] text-slate-400 font-bold tracking-[0.3em] uppercase">Premium Trivia Experience</div>
      </div>
      {/* Team 2 */}
      <div className={`flex items-center gap-4 text-left transition-all duration-500 ${activeTeamIndex === 1 ? 'scale-105' : 'opacity-60'}`}>
        <div>
          <div className="text-[10px] text-lime-600 font-black uppercase tracking-widest text-left">فريق {teams[1].name}</div>
          <div className="flex items-center gap-3 justify-end">
            {phase === GamePhase.BOARD && (
              <div className="flex gap-1">
                <button onClick={() => updateTeamScore(1, -100)} className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all active:scale-90"><Minus className="w-4 h-4" /></button>
                <button onClick={() => updateTeamScore(1, 100)} className="w-7 h-7 rounded-full bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-600 hover:bg-lime-500 hover:text-slate-900 transition-all active:scale-90"><Plus className="w-4 h-4" /></button>
              </div>
            )}
            <div className="text-3xl font-black text-slate-800 leading-none tabular-nums">{teams[1].score}</div>
          </div>
          <div className="flex gap-1.5 mt-2 justify-end">
             <button onClick={() => activeTeamIndex === 1 && togglePowerUp('block')} disabled={activeTeamIndex !== 1 || teams[1].inventory.block <= 0} className={`p-1 rounded-lg border transition-all flex items-center gap-0.5 ${activePowerUp === 'block' && activeTeamIndex === 1 ? 'bg-slate-800 border-slate-900 text-white' : (teams[1].inventory.block > 0 && activeTeamIndex === 1 ? 'bg-white border-slate-200' : 'bg-slate-50 opacity-30 grayscale')}`} title="حجب"><span className="text-[8px] font-black">حجب</span><ShieldAlert className="w-3 h-3 text-slate-800" /></button>
             <button onClick={() => activeTeamIndex === 1 && togglePowerUp('double')} disabled={activeTeamIndex !== 1 || teams[1].inventory.double <= 0} className={`p-1 rounded-lg border transition-all flex items-center gap-0.5 ${activePowerUp === 'double' && activeTeamIndex === 1 ? 'bg-amber-400 border-amber-500' : (teams[1].inventory.double > 0 && activeTeamIndex === 1 ? 'bg-white border-amber-100' : 'bg-slate-50 opacity-30 grayscale')}`} title="مضاعفة (X2)"><span className="text-[8px] font-black">X2</span><Zap className="w-3 h-3 text-amber-500" /></button>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-lime-50 text-lime-600 border border-lime-100 shadow-sm ${activeTeamIndex === 1 ? 'ring-4 ring-lime-500/20 shadow-lime-600/10' : ''}`}><Sparkles className="w-6 h-6" /></div>
      </div>
    </div>
  );
};

const SetupScreen: React.FC = () => {
  const { startGame } = useGame();
  const [names, setNames] = useState(['', '']);
  return (
    <div className="max-w-xl w-full milk-glass p-12 rounded-[3rem] animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-100"><Trophy className="w-10 h-10 text-amber-500" /></div>
        <h2 className="text-4xl font-black text-slate-800 mb-2">مرحباً بك في المزاد</h2>
        <p className="text-slate-500 font-medium">تجربة مسابقات عربية استثنائية وبسيطة</p>
      </div>
      <div className="space-y-6">
        <div className="group"><label className="text-xs font-black text-blue-800 uppercase tracking-widest block mb-2 pr-1">اسم الفريق الأول</label><input type="text" placeholder="مثال: الصقور" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:outline-none focus:border-blue-700 focus:bg-white transition-all shadow-inner" onChange={(e) => setNames([e.target.value, names[1]])} /></div>
        <div className="group"><label className="text-xs font-black text-lime-600 uppercase tracking-widest block mb-2 pr-1">اسم الفريق الثاني</label><input type="text" placeholder="مثال: الأسود" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:outline-none focus:border-lime-500 focus:bg-white transition-all shadow-inner" onChange={(e) => setNames([names[0], e.target.value])} /></div>
        <button onClick={() => startGame(names)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xl py-5 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"><span>ابدأ التحدي</span><PlayCircle className="w-6 h-6" /></button>
      </div>
    </div>
  );
};

const DraftScreen: React.FC = () => {
  const { teams, activeTeamIndex, pickCategory, selectedCategories } = useGame();
  return (
    <div className="w-full max-w-5xl animate-in fade-in duration-700">
      <div className="text-center mb-10">
        <div className={`inline-flex items-center gap-3 px-8 py-3 rounded-full milk-glass border-2 ${activeTeamIndex === 0 ? 'border-blue-700' : 'border-lime-500'} mb-6 shadow-lg`}><span className="text-xl font-bold">دور فريق: <span className={activeTeamIndex === 0 ? 'text-blue-800' : 'text-lime-600'}>{teams[activeTeamIndex].name}</span></span></div>
        <h3 className="text-3xl font-black">اختر فئات المسابقة</h3>
        <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-xs">المتبقي {6 - selectedCategories.length} فئات</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategories.find(s => s.id === cat.id);
          return (<button key={cat.id} disabled={!!isSelected} onClick={() => pickCategory(cat)} className={`p-6 rounded-[2rem] text-lg font-black transition-all border-2 ${isSelected ? (isSelected.ownerIndex === 0 ? 'bg-blue-800 text-white border-blue-900 scale-95 shadow-inner opacity-60' : 'bg-lime-500 text-slate-900 border-lime-600 scale-95 shadow-inner opacity-60') : 'milk-glass text-slate-700 hover:border-slate-300 hover:bg-white hover:-translate-y-1'}`}>{cat.name}</button>);
        })}
      </div>
    </div>
  );
};

const BoardScreen: React.FC = () => {
  const { selectedCategories, activeTeamIndex, initiateAuction, answeredKeys } = useGame();
  return (
    <div className="w-full max-w-7xl animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-8">
        {selectedCategories.map((cat, idx) => (
          <div key={cat.id} className="flex flex-col animate-in slide-in-from-bottom-12 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="bg-white rounded-t-[2rem] p-5 text-center border-x border-t border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 group-hover:h-2 transition-all"></div>
              <span className="text-lg font-black text-slate-800 tracking-tight">{cat.name}</span>
            </div>
            <div className="flex bg-white/40 backdrop-blur-sm rounded-b-[2rem] border-x border-b border-slate-100 totem-shadow overflow-hidden">
              {[0, 1].map(teamIdx => (
                <div key={teamIdx} className={`flex-1 p-2 space-y-4 ${teamIdx === 0 ? 'border-l border-slate-100/50' : ''} ${activeTeamIndex === teamIdx ? (teamIdx === 0 ? 'bg-blue-50/20' : 'bg-lime-50/20') : ''}`}>
                  {POINT_VALUES.map(pts => {
                    const key = `${cat.id}-${teamIdx}-${pts}`;
                    const isDone = answeredKeys.has(key);
                    const canClick = activeTeamIndex === teamIdx && !isDone;
                    return (
                      <button key={key} disabled={!canClick} onClick={() => initiateAuction(cat, pts, teamIdx)} className={`soft-pill w-full py-5 rounded-2xl font-black text-xl shadow-sm border-2 ${isDone ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-30 shadow-none' : (canClick ? (teamIdx === 0 ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-blue-200 text-blue-800 hover:-translate-y-1 hover:shadow-md' : 'bg-gradient-to-b from-lime-50 to-lime-100 border-lime-200 text-lime-600 hover:-translate-y-1 hover:shadow-md') : 'bg-white text-slate-300 border-slate-50 cursor-default')}`}>{pts}</button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AuctionOverlay: React.FC = () => {
  const { auction, teams, raiseBid, withdraw, startChallenge } = useGame();
  if (!auction) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="max-w-4xl w-full milk-glass p-10 rounded-[4rem] shadow-3xl border border-white relative animate-in zoom-in-95 duration-500 overflow-hidden text-center">
        <div className="mb-6">
          <div className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mb-4">Live Auction Mode</div>
          <h2 className="text-6xl font-black text-slate-800 mb-2">{auction.categoryName}</h2>
          <div className="flex justify-center gap-4 mb-4">
            <div className="inline-flex items-center gap-2 bg-slate-50 px-6 py-2 rounded-full border border-slate-100"><Award className="w-5 h-5 text-amber-500" /><span className="text-xl font-bold text-slate-600">الجائزة: {auction.basePoints} نقطة</span></div>
            {auction.isBlocked && <div className="inline-flex items-center gap-2 bg-slate-800 px-6 py-2 rounded-full border border-slate-900 text-white font-black"><ShieldAlert className="w-5 h-5" />مهمة محجوبة</div>}
          </div>
          <div className="bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 max-w-2xl mx-auto"><div className="flex items-center justify-center gap-2 mb-2"><MessageSquare className="w-5 h-5 text-blue-800" /><span className="text-xs font-black text-blue-800 uppercase tracking-widest">المهمة المطلوبة</span></div><p className="text-2xl font-bold text-slate-600 leading-relaxed">{auction.missionText}</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 mb-12">
          {/* Team Boxes */}
          {[0, 1].map(teamIdx => (
            <div key={teamIdx} className={`p-8 rounded-[3rem] border-2 relative transition-all duration-500 ${auction.activeBidderIndex === teamIdx ? (teamIdx === 0 ? 'bg-blue-50 border-blue-700 shadow-2xl scale-105' : 'bg-lime-50 border-lime-500 shadow-2xl scale-105') : 'bg-slate-50 opacity-80'}`}>
              {auction.isBlocked && auction.activeBidderIndex !== teamIdx && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-30 flex items-center justify-center text-white"><X className="w-12 h-12" /></div>}
              <div className={`text-sm font-black mb-4 uppercase tracking-widest ${teamIdx === 0 ? 'text-blue-800' : 'text-lime-600'}`}>{teams[teamIdx].name}</div>
              {teamIdx === 0 ? <Users className="w-12 h-12 mx-auto" /> : <Sparkles className="w-12 h-12 mx-auto" />}
            </div>
          ))}
          <div className="flex flex-col items-center order-first md:order-none">
            <div className="w-44 h-44 rounded-full bg-white flex flex-col items-center justify-center golden-ring animate-float shadow-2xl"><span className="text-7xl font-black text-slate-800 tabular-nums">{auction.currentBid}</span></div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6">
          {auction.winnerIndex === null ? (
            <div className="flex justify-center items-center gap-6">
              <button onClick={raiseBid} className={`soft-pill px-16 py-8 rounded-[2.5rem] text-4xl font-black flex items-center gap-4 shadow-2xl transition-all transform hover:scale-110 active:scale-95 ${auction.activeBidderIndex === 0 ? 'bg-blue-800 text-white shadow-blue-800/20 hover:bg-blue-700' : 'bg-lime-500 text-slate-900 shadow-lime-500/20 hover:bg-lime-400'}`}><Plus className="w-8 h-8" />رفع المزايدة</button>
              <button onClick={withdraw} className="soft-pill px-10 py-8 rounded-[2.5rem] text-2xl font-black bg-slate-100 text-slate-400 border border-slate-200 hover:bg-red-50 hover:text-red-500 transition-all"><LogOut className="w-6 h-6" />انسحاب</button>
            </div>
          ) : (
            <button onClick={startChallenge} className="soft-pill bg-slate-900 text-white px-24 py-10 rounded-[3rem] text-4xl font-black flex items-center gap-6 shadow-2xl hover:scale-105 transition-all"><PlayCircle className="w-12 h-12 text-amber-400" />بدء التحدي لـ {teams[auction.winnerIndex].name}</button>
          )}
        </div>
      </div>
    </div>
  );
};

const ChallengeScreen: React.FC = () => {
  const { auction, teams, challengeScore, setChallengeScore, timeLeft, isTimerActive, timerStarted, setIsTimerActive, setTimerStarted, finalizeChallenge } = useGame();
  if (!auction || auction.winnerIndex === null) return null;
  return (
    <div className="w-full max-w-5xl animate-in fade-in duration-700">
      <div className="text-center mb-8">
        <h2 className="text-5xl font-black text-slate-800 mb-4">{auction.categoryName}</h2>
        <div className="text-2xl font-bold text-slate-500">المهمة: اذكر <span className="text-amber-500 text-5xl px-2 font-black tabular-nums">{auction.currentBid}</span> إجابة صحيحة</div>
        <div className="text-sm font-black text-slate-400 mt-4 uppercase tracking-[0.3em]">الفريق المزايد: <span className={auction.winnerIndex === 0 ? 'text-blue-800' : 'text-lime-600'}>{teams[auction.winnerIndex!].name}</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
        <div className={`relative milk-glass p-12 rounded-[3.5rem] flex flex-col items-center shadow-xl border-2 transition-all duration-500 ${isTimerActive ? 'border-amber-400 shadow-amber-200/20' : 'border-white opacity-90'}`}>
          {!isTimerActive && timerStarted && timeLeft > 0 && <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] rounded-[3.5rem] z-20 flex items-center justify-center animate-in fade-in duration-300"><div className="bg-white/80 px-6 py-2 rounded-full text-slate-800 font-black text-lg shadow-sm border border-white">متوقف مؤقتاً</div></div>}
          <Timer className={`w-8 h-8 mb-4 ${isTimerActive && timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} /><div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">الوقت المتبقي</div><div className={`text-9xl font-black font-mono leading-none tabular-nums ${isTimerActive && timeLeft < 10 ? 'text-red-500' : 'text-slate-800'}`}>{timeLeft}</div>
        </div>
        <div className={`milk-glass p-12 rounded-[3.5rem] flex flex-col items-center shadow-xl border-2 transition-all duration-500 ${challengeScore >= auction.currentBid ? 'border-emerald-400 bg-emerald-50/10' : 'border-white'}`}>
          <CheckCircle2 className={`w-8 h-8 mb-4 ${challengeScore >= auction.currentBid ? 'text-emerald-500' : 'text-emerald-400'}`} /><div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">الإجابات الصحيحة</div><div className={`text-9xl font-black font-mono leading-none tabular-nums ${challengeScore >= auction.currentBid ? 'text-emerald-500' : 'text-slate-800'}`}>{challengeScore}</div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-12">
        <div className="flex items-center gap-6">
          {!timerStarted ? (
            <button onClick={() => { setIsTimerActive(true); setTimerStarted(true); }} className="soft-pill bg-amber-400 text-blue-900 px-24 py-10 rounded-[2.5rem] text-5xl font-black shadow-2xl hover:bg-amber-300">بدء العداد</button>
          ) : (
            <>{timeLeft > 0 && challengeScore < auction.currentBid ? (<button onClick={() => setIsTimerActive(!isTimerActive)} className={`soft-pill px-12 py-8 rounded-[2rem] text-3xl font-black flex items-center gap-4 shadow-xl ${isTimerActive ? 'bg-slate-100 text-slate-600' : 'bg-amber-400 text-blue-900 animate-pulse'}`}>{isTimerActive ? <><Pause className="w-8 h-8" /> إيقاف مؤقت</> : <><Play className="w-8 h-8" /> استئناف</>}</button>) : null}{(timeLeft === 0 || challengeScore >= auction.currentBid) && (<button onClick={finalizeChallenge} className="soft-pill bg-slate-900 text-white px-20 py-8 rounded-[2rem] text-3xl font-black shadow-xl hover:bg-slate-800">تأكيد النتيجة النهائية</button>)}</>
          )}
        </div>
        {timerStarted && (<div className="flex gap-12"><button disabled={!isTimerActive} onClick={() => setChallengeScore(s => s + 1)} className={`w-44 h-44 rounded-full soft-pill flex items-center justify-center text-white transition-all shadow-xl ${isTimerActive ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-90 cursor-pointer' : 'bg-emerald-500/40 cursor-not-allowed opacity-50 grayscale-[0.5]'}`}><Plus className="w-20 h-20" /></button><button disabled={!isTimerActive} onClick={() => setChallengeScore(s => Math.max(0, s - 1))} className={`w-44 h-44 rounded-full soft-pill flex items-center justify-center text-white transition-all shadow-xl ${isTimerActive ? 'bg-red-500 hover:bg-red-400 active:scale-90 cursor-pointer' : 'bg-red-500/40 cursor-not-allowed opacity-50 grayscale-[0.5]'}`}><Minus className="w-20 h-20" /></button></div>)}
      </div>
    </div>
  );
};

const FinaleScreen: React.FC = () => {
  const { teams, resetGame } = useGame();
  const winner = teams[0].score > teams[1].score ? teams[0] : teams[1];
  const isDraw = teams[0].score === teams[1].score;
  return (
    <div className="w-full max-w-4xl text-center animate-in zoom-in duration-700">
      <div className="milk-glass p-20 rounded-[4rem] border-2 border-amber-200 shadow-3xl relative overflow-hidden">
        <PartyPopper className="w-28 h-28 text-amber-500 mx-auto mb-8 animate-bounce" />
        <h2 className="text-7xl font-black text-slate-800 mb-6">انتهت اللعبة!</h2>
        <div className="bg-slate-50/50 rounded-[3rem] p-16 border border-slate-100 mb-12">
          {isDraw ? <div className="text-5xl font-black text-slate-400">النتيجة: تعادل مثالي!</div> : <><div className="text-xl font-black text-amber-600 mb-4">لقب البطل يذهب إلى</div><div className={`text-8xl font-black mb-8 ${winner === teams[0] ? 'text-blue-800' : 'text-lime-600'}`}>{winner.name}</div><div className="inline-block bg-white px-10 py-4 rounded-3xl text-3xl font-bold border border-slate-100 tabular-nums">بمجموع {winner.score} نقطة</div></>}
        </div>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button onClick={resetGame} className="soft-pill bg-slate-900 text-white px-14 py-7 rounded-[2rem] text-3xl font-black flex items-center gap-4 hover:bg-slate-800 shadow-xl"><RotateCcw className="w-8 h-8" />لعبة جديدة</button>
          <button onClick={() => window.location.reload()} className="soft-pill bg-white text-slate-500 px-14 py-7 rounded-[2rem] text-3xl font-black border border-slate-200 flex items-center gap-4 hover:bg-slate-50 transition-all"><Home className="w-8 h-8" />الرئيسية</button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const AppContent: React.FC = () => {
  const { phase } = useGame();
  return (
    <div className="min-h-screen flex flex-col text-slate-800 select-none overflow-x-hidden">
      {phase !== GamePhase.SETUP && phase !== GamePhase.FINALE && <Leaderboard />}
      <main className="container mx-auto px-6 py-8 flex-1 flex flex-col items-center justify-center">
        {phase === GamePhase.SETUP && <SetupScreen />}
        {phase === GamePhase.DRAFT && <DraftScreen />}
        {phase === GamePhase.BOARD && <BoardScreen />}
        {phase === GamePhase.AUCTION && <AuctionOverlay />}
        {phase === GamePhase.CHALLENGE && <ChallengeScreen />}
        {phase === GamePhase.FINALE && <FinaleScreen />}
      </main>
      <footer className="w-full py-10 text-center text-slate-300 font-black text-xs uppercase tracking-[0.5em] opacity-80">Premium Game Production &copy; 2025</footer>
    </div>
  );
};

const App: React.FC = () => (
  <GameProvider>
    <AppContent />
  </GameProvider>
);

export default App;
