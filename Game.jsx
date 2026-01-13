import React, { useState, useEffect } from 'react';
import { Trophy, Timer, Plus, Minus, Play, Pause, Zap, Shield, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  "أمثال شعبية", "كرة قدم", "ماركات سيارات", "سبيستون", "عواصم", "أكلات", 
  "تقنية", "Gaming", "علوم", "تاريخ", "جغرافيا", "أفلام"
];

export default function Game() {
  const [gameState, setGameState] = useState('setup'); 
  const [team1, setTeam1] = useState({ name: 'فريق 1', score: 0, powerups: { double: 1, block: 1 } });
  const [team2, setTeam2] = useState({ name: 'فريق 2', score: 0, powerups: { double: 1, block: 1 } });
  const [draft, setDraft] = useState({ turn: 1, selected: [] });
  const [selectionTurn, setSelectionTurn] = useState(1);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [auction, setAuction] = useState({ bid: 3, leader: null, turn: null, settled: false });
  const [timer, setTimer] = useState({ seconds: 0, active: false, paused: false });
  const [answers, setAnswers] = useState(0);

  const handleStart = (n1, n2) => {
    if(n1) setTeam1(t => ({...t, name: n1}));
    if(n2) setTeam2(t => ({...t, name: n2}));
    setGameState('draft');
  };

  if (gameState === 'setup') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-right" dir="rtl">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border-t-8 border-blue-600">
        <Trophy className="w-16 h-16 mx-auto mb-6 text-amber-500" />
        <h2 className="text-3xl font-black mb-8 text-center text-slate-800">لعبة المزاد</h2>
        <input id="n1" placeholder="اسم الفريق الأول" className="w-full p-4 mb-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none text-right" />
        <input id="n2" placeholder="اسم الفريق الثاني" className="w-full p-4 mb-8 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none text-right" />
        <button 
          onClick={() => handleStart(document.getElementById('n1').value, document.getElementById('n2').value)}
          className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-blue-700 transition-all text-xl"
        >دخول الاستوديو</button>
      </div>
    </div>
  );

  if (gameState === 'draft') return (
    <div className="min-h-screen bg-slate-50 p-8 text-right" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-black mb-4 text-center text-blue-900">اختيار الفئات</h2>
        <p className="text-center mb-10 text-xl text-slate-500">الدور عند: <span className="text-blue-600 font-bold">{draft.turn === 1 ? team1.name : team2.name}</span></p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => {
                const newSelected = [...draft.selected, { name: cat, owner: draft.turn }];
                setDraft({ selected: newSelected, turn: draft.turn === 1 ? 2 : 1 });
                if (newSelected.length === 6) setGameState('board');
              }}
              disabled={draft.selected.find(s => s.name === cat)}
              className="bg-white p-8 rounded-3xl font-bold text-2xl shadow-sm border-2 border-transparent hover:border-blue-500 disabled:opacity-30 transition-all text-slate-700"
            >{cat}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-10" dir="rtl">
      <div className="text-center">
        <h1 className="text-4xl font-black text-blue-900 mb-4">لوحة المسابقة جاهزة</h1>
        <p className="text-slate-600">تم اختيار الفئات بنجاح. اللعبة ستبدأ الآن!</p>
        <div className="mt-8 flex gap-10 justify-center">
            <div className="bg-white p-6 rounded-3xl shadow-xl min-w-[200px]">
                <div className="text-slate-400 text-sm font-bold mb-1">{team1.name}</div>
                <div className="text-4xl font-black text-blue-800">{team1.score}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-xl min-w-[200px]">
                <div className="text-slate-400 text-sm font-bold mb-1">{team2.name}</div>
                <div className="text-4xl font-black text-lime-600">{team2.score}</div>
            </div>
        </div>
      </div>
    </div>
  );
}