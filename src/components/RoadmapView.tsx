/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Language, ProjectProfile } from '../types';
import { getTranslation } from '../localization';
import { 
  AlertCircle, 
  Clock, 
  Leaf, 
  BookOpen, 
  Cpu, 
  MessageSquare, 
  Send, 
  X, 
  Loader2, 
  CheckCircle, 
  TrendingUp, 
  Bot, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';

interface RoadmapViewProps {
  language: Language;
  profile: ProjectProfile;
  onUpdateProfile?: (updatedProfile: ProjectProfile) => void;
}

export interface StepItem {
  id: string;
  horizon: 'immediate' | 'short' | 'medium';
  titleFr: string;
  titleAr: string;
  actionFr: string;
  actionAr: string;
  resourceFr: string;
  resourceAr: string;
  resourceId: string;
  addressed_gate?: string;
  addressed_dimension?: string;
}

export const DIAGNOSTIC_STAGES = [
  { id: 'S1', labelFr: "Idéation", labelAr: "الفكرة" },
  { id: 'S2', labelFr: "Validation Marché", labelAr: "التحقق من السوق" },
  { id: 'S3', labelFr: "Structuration", labelAr: "الهيكلة" },
  { id: 'S4', labelFr: "Levée de Fonds", labelAr: "جمع التمويل" },
  { id: 'S5', labelFr: "Lancement", labelAr: "التخطيط للإطلاق" },
  { id: 'S6', labelFr: "Croissance", labelAr: "النمو" }
];

export const gateMap: Record<string, { fr: string; ar: string; bgClass: string; textClass: string; borderClass: string }> = {
  'G1': {
    fr: 'G1 — Validation Marché',
    ar: 'G1 — التحقق من السوق',
    bgClass: 'bg-amber-50 text-amber-800',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200'
  },
  'G2': {
    fr: 'G2 — Offre Commerciale',
    ar: 'G2 — العرض التجاري',
    bgClass: 'bg-red-50 text-red-800',
    textClass: 'text-red-800',
    borderClass: 'border-red-200'
  },
  'G3': {
    fr: 'G3 — Innovation & Techno',
    ar: 'G3 — الابتكار والتكنولوجيا',
    bgClass: 'bg-blue-50 text-blue-850',
    textClass: 'text-blue-850',
    borderClass: 'border-blue-200'
  },
  'G4': {
    fr: 'G4 — Scalabilité',
    ar: 'G4 — القابلية للتوسع',
    bgClass: 'bg-purple-50 text-purple-800',
    textClass: 'text-purple-800',
    borderClass: 'border-purple-200'
  },
  'G5': {
    fr: 'G5 — Alignement Vert',
    ar: 'G5 — التوافق البيئي والأخضر',
    bgClass: 'bg-emerald-50 text-emerald-800',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200'
  }
};

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  language,
  profile,
  onUpdateProfile
}) => {
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [groundednessRate, setGroundednessRate] = useState<number>(100);

  // Chat interface states
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: language === 'fr' 
        ? "Bonjour ! Je suis votre conseiller virtuel CompassIQ, dédié aux startups tunisiennes. Je suis là pour vous accompagner pas-à-pas et répondre à toutes vos questions sur la réglementation, le financement et le développement de votre projet. Comment puis-je vous aider aujourd'hui ?"
        : "مرحباً! أنا مرشدك الافتراضي من CompassIQ، المخصص لمرافقة المشاريع الناشئة في تونس. أنا هنا لمساعدتك خطوة بخطوة والإجابة على جميع استفساراتك حول القوانين والتمويل وتطوير مشروعك. كيف يمكنني مساعدتك اليوم؟"
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [highlightedDimension, setHighlightedDimension] = useState<string | null>(null);

  useEffect(() => {
    const dim = sessionStorage.getItem('highlight_dimension');
    if (dim) {
      setHighlightedDimension(dim);
      sessionStorage.removeItem('highlight_dimension');

      setTimeout(() => {
        const firstHighlighted = document.querySelector(`[data-addressed-dimension="${dim}"]`);
        if (firstHighlighted) {
          firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 800);
    }
  }, [steps]);

  // Fetch steps and completion status on mount
  useEffect(() => {
    let active = true;

    async function loadRoadmapData() {
      try {
        setLoading(true);
        const profileId = profile._meta.profile_id;
        
        // 1. Fetch roadmap steps
        const stepsRes = await fetch(`/api/roadmap?profile_id=${profileId}`);
        const stepsData = await stepsRes.json();
        
        // 2. Fetch history and pre-existing checked steps
        const progressRes = await fetch(`/api/progress/${profileId}`);
        let completedDataSteps: string[] = [];
        
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          if (progressData && progressData.completed_steps) {
            completedDataSteps = progressData.completed_steps;
          }
        } else {
          // Fallback to tracking data
          const trackingRes = await fetch(`/api/mon-parcours?profile_id=${profileId}`);
          const trackingData = await trackingRes.json();
          if (trackingData && trackingData.completed_steps) {
            completedDataSteps = trackingData.completed_steps;
          }
        }

        if (active) {
          if (stepsData && stepsData.status === 'ready' && stepsData.items) {
            setSteps(stepsData.items);
            
            // Calculate real-time grounding verification metrics (all ID should start with 'kb_' and belong to local base)
            const validCount = stepsData.items.filter((item: any) => item.resourceId && item.resourceId.startsWith('kb_')).length;
            const rate = stepsData.items.length > 0 ? (validCount / stepsData.items.length) * 100 : 100;
            setGroundednessRate(parseFloat(rate.toFixed(1)));
          }
          setCompletedSteps(Array.from(new Set(completedDataSteps)));
        }
      } catch (err) {
        console.error("Failed to fetch roadmap items or tracking data, falling back", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRoadmapData();

    return () => {
      active = false;
    };
  }, [profile._meta.profile_id]);

  // Handle step checkbox toggle with database persistence synchronization
  const toggleStepCompleted = async (stepId: string) => {
    try {
      const response = await fetch('/api/progress/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile._meta.profile_id,
          step_id: stepId
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.completed_steps) {
          const uniqueSteps = Array.from(new Set(data.completed_steps)) as string[];
          setCompletedSteps(uniqueSteps);
          if (onUpdateProfile) {
            const updatedProfile = { ...profile };
            (updatedProfile as any).completed_steps = uniqueSteps;
            onUpdateProfile(updatedProfile);
          }
        }
      }
    } catch (err) {
      console.error("Failed to post action status", err);
    }
  };

  // Chat message submission
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          profile_id: profile._meta.profile_id
        })
      });

      const data = await response.json();
      if (data && data.success && data.reply) {
        setChatMessages(prev => [...prev, { sender: 'assistant', text: data.reply }]);
      } else {
        throw new Error("Invalid reply content");
      }
    } catch (err) {
      console.error("Assistant exchange failed", err);
      const errMsg = language === 'fr'
        ? "Désolé, une perte de connexion temporaire est survenue avec le conseiller de Tunis. Veuillez réessayer."
        : "عذراً، حدث خطأ مؤقت في الاتصال بمرشد تونس. يرجى إعادة المحاولة.";
      setChatMessages(prev => [...prev, { sender: 'assistant', text: errMsg }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  const immediateSteps = steps.filter(s => s.horizon === 'immediate');
  const shortSteps = steps.filter(s => s.horizon === 'short');
  const mediumSteps = steps.filter(s => s.horizon === 'medium');

  const totalStepsLength = steps.length || 5;
  const completedCount = completedSteps.length;
  const completionRatio = Math.round((completedCount / totalStepsLength) * 100);

  const getStepCategory = (step: StepItem) => {
    const resId = step.resourceId || '';
    const dim = step.addressed_dimension || '';
    const gate = step.addressed_gate || '';
    if (resId === 'kb_001' || resId === 'kb_013' || gate === 'G2' || dim === 'legal') return 'legal';
    if (resId === 'kb_002' || resId === 'kb_005' || gate === 'G4' || dim === 'scalability') return 'funding';
    if (resId === 'kb_004' || dim === 'commercial') return 'training';
    if (resId === 'kb_003' || dim === 'innovation' || gate === 'G3') return 'business';
    if (dim === 'market' || gate === 'G1') return 'market';
    if (resId === 'kb_011' || dim === 'green' || gate === 'G5') return 'sustainability';
    return 'business';
  };

  const renderRecommendationCard = (s: StepItem) => {
    const isChecked = completedSteps.includes(s.id);
    const category = getStepCategory(s);
    const categoryLabel = getTranslation('categories.' + category, language) || category;
    
    let CategoryIcon = BookOpen;
    if (category === 'funding') CategoryIcon = TrendingUp;
    else if (category === 'training') CategoryIcon = BookOpen;
    else if (category === 'legal') CategoryIcon = Cpu;
    else if (category === 'business') CategoryIcon = Bot;
    else if (category === 'market') CategoryIcon = Clock;
    else if (category === 'sustainability') CategoryIcon = Leaf;

    let priorityKey: 'critical' | 'important' | 'optional' = 'optional';
    let priorityColor = 'text-blue-800 bg-blue-50 border-blue-200';
    let impactText = '+5 pt';
    let timeText = language === 'fr' ? '1 mois' : 'شهر واحد';

    if (s.horizon === 'immediate') {
      priorityKey = 'critical';
      priorityColor = 'text-brand-crimson bg-red-50 border-red-200';
      impactText = '+15 pt';
      timeText = language === 'fr' ? '1-3 jours' : '1-3 أيام';
    } else if (s.horizon === 'short') {
      priorityKey = 'important';
      priorityColor = 'text-amber-700 bg-amber-50 border-amber-200';
      impactText = '+10 pt';
      timeText = language === 'fr' ? '1-2 semaines' : '1-2 أسابيع';
    }

    const priorityLabel = getTranslation('priority.' + priorityKey, language) || priorityKey;

    let titleVal = language === 'fr' ? s.titleFr : s.titleAr;
    if (typeof titleVal === 'object' && titleVal !== null) {
      titleVal = (titleVal as any)[language] || (titleVal as any).fr || (titleVal as any).ar || '';
    }

    let actionVal = language === 'fr' ? s.actionFr : s.actionAr;
    if (typeof actionVal === 'object' && actionVal !== null) {
      actionVal = (actionVal as any)[language] || (actionVal as any).fr || (actionVal as any).ar || '';
    }

    let resourceVal = language === 'fr' ? s.resourceFr : s.resourceAr;
    if (typeof resourceVal === 'object' && resourceVal !== null) {
      resourceVal = (resourceVal as any)[language] || (resourceVal as any).fr || (resourceVal as any).ar || '';
    }

    let triggerConditionVal = language === 'fr' ? (s as any).triggerConditionFr : (s as any).triggerConditionAr;
    if (typeof triggerConditionVal === 'object' && triggerConditionVal !== null) {
      triggerConditionVal = (triggerConditionVal as any)[language] || (triggerConditionVal as any).fr || (triggerConditionVal as any).ar || '';
    }

    let rationaleVal = language === 'fr' ? (s as any).rationaleFr : (s as any).rationaleAr;
    if (typeof rationaleVal === 'object' && rationaleVal !== null) {
      rationaleVal = (rationaleVal as any)[language] || (rationaleVal as any).fr || (rationaleVal as any).ar || '';
    }

    let concreteStepVal = language === 'fr' ? (s as any).concreteStepFr : (s as any).concreteStepAr;
    if (typeof concreteStepVal === 'object' && concreteStepVal !== null) {
      concreteStepVal = (concreteStepVal as any)[language] || (concreteStepVal as any).fr || (concreteStepVal as any).ar || '';
    }

    return (
      <div 
        key={s.id}
        id={`roadmap-item-${s.id}`} 
        className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
          isChecked 
            ? 'bg-emerald-50/25 border-emerald-300 shadow-xs opacity-90' 
            : 'bg-white border-brand-marble/10 shadow-sm hover:border-brand-blue/30 hover:shadow-md'
        } flex flex-col gap-4 relative`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2 rounded-xl bg-brand-blue/5 text-brand-blue">
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {categoryLabel}
              </span>
              <h3 className={`text-base font-extrabold ${isChecked ? 'line-through text-gray-400 font-normal' : 'text-brand-blue'} font-sans leading-tight mt-0.5`}>
                {titleVal}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`check-${s.id}`}
              checked={isChecked}
              onChange={() => toggleStepCompleted(s.id)}
              className="w-5 h-5 cursor-pointer rounded border-gray-300 text-brand-blue focus:ring-brand-blue transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${priorityColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 rtl:mr-0 rtl:ml-1.5" />
            {getTranslation('priority.label', language)}: {priorityLabel}
          </span>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50/50 text-emerald-800">
            {getTranslation('roadmap.card_expected_impact_label', language)}: {impactText}
          </span>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 bg-blue-50/30 text-blue-800">
            <Clock className="w-3 h-3 mr-1 rtl:mr-0 rtl:ml-1" />
            {getTranslation('roadmap.card_estimated_time_label', language)}: {timeText}
          </span>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed font-sans">
          {actionVal}
        </p>

        {/* Structured why and recommended action */}
        <div className="bg-brand-ivory/15 rounded-xl p-4.5 space-y-3.5 border border-brand-marble/10 text-xs">
          {rationaleVal && (
            <div>
              <span className="font-extrabold text-brand-blue flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                {getTranslation('roadmap.card_why_label', language)}
              </span>
              <p className="text-gray-700 leading-relaxed mt-1 font-sans font-medium">
                {rationaleVal}
              </p>
            </div>
          )}

          {concreteStepVal && (
            <div className="pt-3 border-t border-brand-marble/5">
              <span className="font-bold text-brand-crimson flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-crimson" />
                {getTranslation('roadmap.card_action_label', language)}
              </span>
              <p className="text-gray-750 leading-relaxed mt-1 font-sans">
                {concreteStepVal}
              </p>
            </div>
          )}

          {triggerConditionVal && (
            <div className="pt-3 border-t border-brand-marble/5">
              <span className="font-bold text-gray-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
                {getTranslation('roadmap.card_eligibility_label', language)}
              </span>
              <p className="text-gray-500 mt-1 font-sans italic text-[11px]">
                {triggerConditionVal}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-3 border-t border-gray-100">
          <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse bg-brand-blue/5 text-brand-blue px-3 py-1.5 rounded-xl text-xs font-semibold">
            <BookOpen className="w-4 h-4 text-brand-blue shrink-0" />
            <span className="opacity-75">{getTranslation('roadmap.card_resources_label', language)}:</span>
            <span className="font-bold">{resourceVal}</span>
          </div>

          <button
            onClick={() => {
              setChatInput(
                language === 'fr'
                  ? `Pouvez-vous m'en dire plus sur "${resourceVal}" pour mon projet ?`
                  : `هل يمكن أن تخبرني المزيد عن "${resourceVal}" لمشروعي؟`
              );
              setChatOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg border border-brand-marble/30 text-brand-blue hover:bg-brand-blue hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 bg-white shadow-2xs"
          >
            <span>{getTranslation('roadmap.card_learn_more', language)}</span>
            <ExternalLink className="w-3 cursor-pointer" />
          </button>
        </div>
      </div>
    );
  };

  const isCompletedCurStage = steps.length > 0 && steps.every(st => completedSteps.includes(st.id));
  const currentStageId = profile.diagnosis.stage_assigned || 'S1';
  const currentStageIdx = DIAGNOSTIC_STAGES.findIndex(st => st.id === currentStageId);
  const nextStage = DIAGNOSTIC_STAGES[currentStageIdx + 1];
  const nextStageName = nextStage ? (language === 'fr' ? nextStage.labelFr : nextStage.labelAr) : '';

  return (
    <div className="max-w-4xl mx-auto my-8 px-6 space-y-8" id="roadmap-placeholder-view">
      
      {/* ELEGANTE BANNER HEADER */}
      <div className="bg-gradient-to-r from-brand-blue to-cyan-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden" id="rag-announcement-header">
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse bg-white/20 px-3 py-1 rounded-full text-xs font-semibold text-brand-ivory border border-white/10">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{getTranslation('roadmap.verified_badge', language)}</span>
          </div>

          <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 px-3 py-1 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{getTranslation('roadmap.trusted_resources_note', language)}</span>
          </div>
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight font-sans">
          {getTranslation('roadmap.header_title', language)}
        </h1>
        <p className="mt-2 text-sm text-brand-ivory/85 leading-relaxed max-w-2xl font-sans">
          {getTranslation('roadmap.header_subtitle', language)}
        </p>

        {/* Real-time interactive completion progress bar */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left rtl:md:text-right w-full md:w-auto">
            <span className="text-[10px] uppercase font-bold text-brand-ivory bg-white/15 px-2 py-0.5 rounded">
              {getTranslation('roadmap.progress_title', language)}
            </span>
            <p className="text-xs text-brand-ivory/70 pt-1 font-sans">
              {getTranslation('roadmap.progress_completed_label', language)
                .replace('{completed}', String(completedCount))
                .replace('{total}', String(totalStepsLength))
              }
            </p>
          </div>

          <div className="flex items-center space-x-4 rtl:space-x-reverse w-full md:w-48 bg-white/10 p-3 rounded-xl border border-white/10 shadow-inner">
            <span className="text-2xl font-black font-mono text-white leading-none">
              {completionRatio}%
            </span>
            <div className="flex-1 bg-white/20 h-2 rounded-full overflow-hidden">
              <div 
                id="parcours-sync-bar-fill"
                className="bg-emerald-400 h-full transition-all duration-300" 
                style={{ width: `${completionRatio}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Intro section */}
      <div className="bg-white rounded-2xl shadow-xs border border-brand-marble/10 p-6 no-print flex flex-col gap-4">
        <p className="text-sm text-gray-700 leading-relaxed font-sans mt-0">
          {getTranslation('roadmap.intro_text', language)}
        </p>

      </div>

      {/* Celebratory Completion Reward Banner */}
      {isCompletedCurStage && nextStageName && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4" id="celebratory-reward-banner">
          <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
            <div className="p-3 bg-white/15 rounded-2xl text-white">
              <Sparkles className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-black font-sans">
                {getTranslation('roadmap.completion_reward_title', language)}
              </h3>
              <p className="text-sm text-white/90 font-sans mt-0.5">
                {getTranslation('roadmap.completion_reward_message', language).replace('{stage}', nextStageName)}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              // Open chatbot with congratulatory dialog
              setChatInput(
                language === 'fr'
                  ? `J'ai terminé ma feuille de route ! Pouvez-vous me guider pour passer à la phase "${nextStageName}" ?`
                  : `لقد أكملت خطة العمل بنجاح! هل يمكنك إرشادي للانتقال إلى مرحلة "${nextStageName}"؟`
              );
              setChatOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shadow-sm hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
          >
            {language === 'fr' ? 'Débuter la suite ➔' : 'بدء المرحلة التالية ➔'}
          </button>
        </div>
      )}

      {/* Control Buttons row */}
      <div className="flex justify-between items-center no-print" id="roadmap-upper-controls">
        <div className="text-xs text-gray-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{getTranslation('roadmap.progress_completed_label', language)
            .replace('{completed}', String(completedCount))
            .replace('{total}', String(totalStepsLength))
          }</span>
        </div>
      </div>

      {/* SKELETON LOADER WHILE WAITING FROM RAG ENDPOINTS */}
      {loading ? (
        <div className="space-y-6 py-6" id="roadmap-skeleton-loading">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8" id="roadmap-main-content">
          {/* visual 'Mon Parcours' stepper component */}
          <div className="bg-white rounded-2xl shadow-md border border-brand-marble/10 p-6 space-y-6 animate-fade-in" id="mon-parcours-stepper">
            {/* Header of Stepper */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-black text-brand-blue uppercase tracking-wider flex items-center gap-1.5" id="stepper-title">
                  <TrendingUp className="w-5 h-5 text-brand-blue shrink-0 animate-pulse" />
                  <span>{language === 'fr' ? 'Mon Parcours : Évolution & Progression' : 'مساري: التطور والتقدم'}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed font-sans" id="stepper-subtitle">
                  {language === 'fr' 
                    ? "Visualisez votre position dans l'écosystème de Tunis et suivez vos jalons." 
                    : "تتبع تموقع مشروعك في منظومة تونس الريادية ومدى التقدم في المهام."}
                </p>
              </div>

              {/* Completion Status Ring/Bar inside the Stepper box */}
              <div className="flex items-center space-x-3 rtl:space-x-reverse bg-brand-ivory/20 px-3 py-2 rounded-xl border border-brand-marble/10 shrink-0" id="stepper-progress-box">
                <div className="text-right rtl:text-left">
                  <span className="block text-[9px] uppercase font-bold text-gray-400">
                    {language === 'fr' ? 'Actions Complétées' : 'المهام والخطوات'}
                  </span>
                  <span className="text-xs font-black text-brand-blue font-mono">
                    {completedCount} / {totalStepsLength}
                  </span>
                </div>
                <div className="relative w-10 h-10 flex items-center justify-center">
                  {/* Progress Circle SVG */}
                  <svg className="w-10 h-10 transform -rotate-90">
                    <circle 
                      cx="20" 
                      cy="20" 
                      r="16" 
                      className="stroke-gray-100" 
                      strokeWidth="3" 
                      fill="none" 
                    />
                    <circle 
                      cx="20" 
                      cy="20" 
                      r="16" 
                      className="stroke-emerald-500 transition-all duration-500" 
                      strokeWidth="3" 
                      fill="none" 
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - (totalStepsLength > 0 ? completedCount / totalStepsLength : 0))}`}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-black text-brand-blue font-mono">{completionRatio}%</span>
                </div>
              </div>
            </div>

            {/* Stepper Steps Row */}
            <div className="relative pt-4 pb-2" id="stepper-steps-container">
              {/* Background track line */}
              <div className="absolute top-[28px] left-4 right-4 h-1 bg-gray-250 rounded-full pointer-events-none" />
              
              {/* Active track line built with Cosmos Blue */}
              <div 
                className="absolute top-[28px] left-4 h-1 bg-brand-blue rounded-full pointer-events-none transition-all duration-500" 
                style={{ 
                  width: `${(DIAGNOSTIC_STAGES.findIndex(st => st.id === (profile.diagnosis.stage_assigned || 'S1')) / (DIAGNOSTIC_STAGES.length - 1)) * 90}%`
                }} 
              />

              <div className="relative flex justify-between items-start w-full">
                {DIAGNOSTIC_STAGES.map((st, idx) => {
                  const currentStageId = profile.diagnosis.stage_assigned || 'S1';
                  const currentStageIndex = DIAGNOSTIC_STAGES.findIndex(s => s.id === currentStageId);
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  let circleStyle = "bg-white border-2 border-gray-200 text-gray-400";
                  let textStyle = "text-gray-400";
                  if (isPast) {
                    circleStyle = "bg-brand-blue border-2 border-brand-blue text-white";
                    textStyle = "text-brand-blue font-extrabold";
                  } else if (isCurrent) {
                    circleStyle = "bg-brand-crimson border-2 border-brand-crimson text-white scale-110 ring-4 ring-brand-crimson/15";
                    textStyle = "text-brand-crimson font-black scale-105";
                  }

                  return (
                    <div key={st.id} className="flex flex-col items-center relative z-10 flex-1" id={`stepper-stage-${st.id}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm shadow-md transition-all duration-300 ${circleStyle}`}>
                        {idx + 1}
                      </div>
                      
                      {/* Stage text labels */}
                      <span className={`mt-2 text-[9px] md:text-xs text-center px-1 font-sans leading-tight select-none max-w-[80px] md:max-w-none ${textStyle}`}>
                        {language === 'fr' ? st.labelFr : st.labelAr}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ROADMAP HORIZONS SECTION GRID */}
          <div className="space-y-8" id="horizons-grid-panel">

            {/* 1. HORIZON IMMEDIAT */}
            <div className="bg-white rounded-2xl shadow-md border border-brand-marble/10 p-6 space-y-5" id="horizon-immediate-block">
              <h2 className="text-sm font-black text-brand-crimson uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <AlertCircle className="w-5 h-5 text-brand-crimson shrink-0" />
                <span>{getTranslation('roadmap.horizon_immediate', language) || getTranslation('horizonImmediate', language)}</span>
              </h2>
              <div className="space-y-6 pt-1">
                {immediateSteps.map((s) => renderRecommendationCard(s))}
                {immediateSteps.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-400 italic">
                    {language === 'fr' ? "Aucun jalon d'action immédiat pour cette phase." : "لا توجد مهام فورية لهذه المرحلة."}
                  </div>
                )}
              </div>
            </div>

            {/* 2. HORIZON COURT TERME */}
            <div className="bg-white rounded-2xl shadow-md border border-brand-marble/10 p-6 space-y-5" id="horizon-short-block">
              <h2 className="text-sm font-black text-brand-blue uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <Clock className="w-5 h-5 text-brand-blue shrink-0" />
                <span>{getTranslation('roadmap.horizon_short_term', language) || getTranslation('horizonShort', language)}</span>
              </h2>
              <div className="space-y-6 pt-1">
                {shortSteps.map((s) => renderRecommendationCard(s))}
                {shortSteps.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-400 italic">
                    {language === 'fr' ? "Aucun jalon à court terme pour cette phase." : "لا توجد مهام متوسطة لهذه المرحلة."}
                  </div>
                )}
              </div>
            </div>

            {/* 3. HORIZON MOYEN TERME */}
            <div className="bg-white rounded-2xl shadow-md border border-brand-marble/10 p-6 space-y-5" id="horizon-medium-block">
              <h2 className="text-sm font-black text-brand-marble uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <Leaf className="w-5 h-5 text-brand-marble shrink-0" />
                <span>{getTranslation('roadmap.horizon_medium_term', language) || getTranslation('horizonMedium', language)}</span>
              </h2>
              <div className="space-y-6 pt-1">
                {mediumSteps.map((s) => renderRecommendationCard(s))}
                {mediumSteps.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-400 italic">
                    {language === 'fr' ? "Aucun jalon à moyen terme pour cette phase." : "لا توجد مهام بعيدة لهذه المرحلة."}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING COLLAPSIBLE CHAT ASSISTANT WIDGET (Feature 3 grounded assistant) */}
      <div className="fixed bottom-6 right-6 z-50 no-print" id="floating-chat-widget">
        {chatOpen ? (
          /* ACTIVE EXPANDED CHAT PANEL */
          <div className="bg-white rounded-2xl shadow-2xl border border-brand-marble/25 w-[370px] max-w-[calc(100vw-32px)] h-[480px] flex flex-col overflow-hidden animate-fade-in animate-slide-up">
            
            {/* Header */}
            <div className="p-4 flex items-center justify-between text-white bg-brand-blue">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="bg-white/10 p-1.5 rounded-lg">
                  <Bot className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold leading-none font-sans flex items-center gap-1">
                    <span>CompassIQ Guide AI</span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-ping" />
                  </h3>
                  <span className="text-[9px] opacity-90 font-sans block pt-0.5">
                    {language === 'fr' ? "Garant d'accompagnement RAG" : 'مرشد تشخيص تونس المعتمد'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setChatOpen(false)}
                className="hover:bg-white/15 p-1 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages box */}
            <div className="flex-1 overflow-y-auto p-4 bg-brand-ivory/10 space-y-3 flex flex-col">
              {chatMessages.map((m, idx) => {
                const isAI = m.sender === 'assistant';
                return (
                  <div 
                    key={idx}
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-sans leading-relaxed ${
                      isAI 
                        ? 'bg-brand-ivory/40 text-gray-800 border border-brand-marble/10 self-start rounded-tl-none' 
                        : 'bg-brand-blue text-white self-end rounded-tr-none'
                    }`}
                  >
                    {m.text}
                  </div>
                );
              })}
              {chatLoading && (
                <div className="self-start rounded-2xl rounded-tl-none p-3 bg-brand-ivory/40 border border-brand-marble/10 flex items-center space-x-2 text-xs text-gray-400 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 text-brand-blue animate-spin shrink-0" />
                  <span>{language === 'fr' ? "Le conseiller compose..." : "جاري صياغة الرد..."}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-brand-marble/20 bg-white flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                placeholder={language === 'fr' ? "Poser une question sur mon immatriculation..." : "اسألني عن التسجيل والمنح بتونس..."}
                className="flex-1 bg-brand-ivory/30 border border-brand-marble/20 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-2 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue/95 text-white cursor-pointer disabled:opacity-35 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* FLOATING SHUT CHAT TRIGGER BUTTON */
          <button
            onClick={() => setChatOpen(true)}
            className="bg-brand-blue hover:bg-cyan-900 transition-all font-bold text-white text-xs py-3 px-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 duration-200 cursor-pointer flex items-center gap-2"
            id="chat-assistant-trigger"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{language === 'fr' ? "Besoin d'aide ? Poser une question" : "مرشد بوصلة الذكاء"}</span>
          </button>
        )}
      </div>

    </div>
  );
};

export function getTailoredSteps(profile: any): any[] {
  const sector = profile?.entrepreneur?.sector || 'services';
  return [
    {
      id: 'STEP_01',
      horizon: 'immediate',
      titleFr: "Validation légale de l'entreprise - APII Tunis",
      titleAr: "التسجيل القانوني للمشروع بالوكالة الوطنية للنهوض بالصناعة APII",
      actionFr: "Dépôt légal du dossier administratif auprès du guichet unique de Tunis pour le secteur " + sector + ".",
      actionAr: "إيداع الملف والتسجيل بـ APII قطاع " + sector + ".",
      resourceFr: "APII - Agence de Promotion de l'Industrie et de l'Innovation",
      resourceAr: "وكالة النهوض بالصناعة والابتكار APII",
      resourceId: 'kb_001'
    },
    {
      id: 'STEP_02',
      horizon: 'immediate',
      titleFr: "Soumission de la candidature Startup Act",
      titleAr: "طلب الحصول على علامة مؤسسة ناشئة (Startup Act)",
      actionFr: "Préparation du dossier technologique pour le comité d'attribution du Ministère des TIC.",
      actionAr: "تقديم الملف التقني للجنة المتخصصة بوزارة تكنولوجيات الاتصال.",
      resourceFr: "Startup Act - Collège de Labellisation Smart Capital",
      resourceAr: "الشركة الذكية (Smart Capital)",
      resourceId: 'kb_003'
    },
    {
      id: 'STEP_03',
      horizon: 'short',
      titleFr: "Financement d'amorçage - Banque Tunisienne",
      titleAr: "تمويل الانطلاق - البنك التونسي للتضامن BTS",
      actionFr: "Dépôt d'un plan d'affaires pour l'octroi d'un crédit de restructuration d'activité.",
      actionAr: "تقديم مخطط مالي مدروس للحصول على خط مالي مدعوم للمشروع.",
      resourceFr: "BTS - Banque Tunisienne de Solidarité / BFPME",
      resourceAr: "البنك التونسي للتضامن (BTS)",
      resourceId: 'kb_005'
    },
    {
      id: 'STEP_04',
      horizon: 'short',
      titleFr: "Immatriculation au Registre National des Entreprises (RNE)",
      titleAr: "التسجيل بالسجل الوطني للمؤسسات (RNE)",
      actionFr: "Création légale simplifiée en ligne pour l'obtention du matricule fiscal.",
      actionAr: "إنشاء رقم جبائي في غضون أيام قليلة تماشيا مع قواعد RNE تونس.",
      resourceFr: "RNE - Registre National des Entreprises de Tunis",
      resourceAr: "السجل الوطني للمؤسسات (RNE)",
      resourceId: 'kb_013'
    },
    {
      id: 'STEP_05',
      horizon: 'medium',
      titleFr: "Validation d'impact Environnemental et Technologique",
      titleAr: "التحقق من الأثر البيئي والتكنولوجي",
      actionFr: "Participer aux appels à projets innovants tunisiens pour consolider les scores d'économie verte.",
      actionAr: "الانضمام لبرامج تسريع النمو الأخضر تماشياً مع معايير PNUD تونس.",
      resourceFr: "CITET - Centre International des Technologies de l'Environnement de Tunis",
      resourceAr: "مركز تونس الدولي لتكنولوجيا البيئة (CITET)",
      resourceId: 'kb_011'
    }
  ];
}

export default RoadmapView;
