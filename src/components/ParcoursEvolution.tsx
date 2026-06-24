/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Language, ProjectProfile, ScoresInfo, Blocker } from '../types';
import { getTranslation } from '../localization';
import { 
  Building2, 
  TrendingUp, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Calendar, 
  ChevronRight, 
  Info, 
  RefreshCw, 
  Award, 
  ChevronDown,
  Sparkles,
  Trophy,
  Activity,
  Check,
  Zap,
  Tag,
  Gauge,
  Lock,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ParcoursEvolutionProps {
  language: Language;
  profile: ProjectProfile;
  onRefreshProfile: (updatedProfile: ProjectProfile) => void;
}

interface ScoreEntry {
  date: string;
  market_score: number;
  commercial_score: number;
  innovation_score: number;
  scalability_score: number;
  green_score: number;
}

interface StageEntry {
  stage: string;
  reached_at: string;
  self_assessed_at_time: string;
}

interface ActivityEvent {
  date: string;
  change: { fr: string; ar: string };
  score_deltas: Record<string, number>;
}

interface TrackingData {
  entrepreneur_name: string;
  current_stage: string;
  diagnosis_confidence: number;
  stage_history: StageEntry[];
  score_history: ScoreEntry[];
  roadmap_status: string;
  items: any[];
  progress_summary: {
    completed: number;
    total: number;
  };
  activity_log?: ActivityEvent[];
  motivational_banner?: string | null;
}

const stagesList = [
  { key: 'Ideation', nameFr: 'Idéation / Projet naissant', nameAr: 'الفكرة والابتكار' },
  { key: 'Market Validation', nameFr: 'Validation Marché', nameAr: 'التحقق من صحة السوق' },
  { key: 'Structuration', nameFr: 'Structuration / Prototype', nameAr: 'الهيكلة والنموذج' },
  { key: 'Fundraising', nameFr: 'Levée de Fonds / Startup Act', nameAr: 'الاستعداد للتمويل' },
  { key: 'Launch Planning', nameFr: 'Lancement Commercial', nameAr: 'إطلاق المنتج والعملاء' },
  { key: 'Growth', nameFr: 'Croissance / Expansion', nameAr: 'التوسع والنمو المستمر' }
];

const dimensionLabels = {
  market: { fr: "Adéquation Marché", ar: "ملائمة السوق" },
  commercial: { fr: "Offre Commerciale", ar: "العرض التجاري" },
  innovation: { fr: "Innovation & Technologie", ar: "الابتكار والتقنية" },
  scalability: { fr: "Scalabilité & Croissance", ar: "النمو والانتشار" },
  green: { fr: "Impact Environnemental / RSE", ar: "الأثر البيئي والمجتمعي" }
};

const dimensionColors = {
  market: '#E63946',      // Vibrant Crimson Red
  commercial: '#F77F00',  // Vibrant Deep Amber Orange
  innovation: '#8338EC',  // Electric Purple
  scalability: '#00B4D8', // Bright Ocean Blue
  green: '#2E7D32'        // Deep Emerald Green
};

export const ParcoursEvolution: React.FC<ParcoursEvolutionProps> = ({
  language,
  profile,
  onRefreshProfile
}) => {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // What-If Simulator state
  const [simulating, setSimulating] = useState<boolean>(false);
  const [hypotheticalActions, setHypotheticalActions] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<Record<string, boolean>>({});

  // Fetch tracking and roadmap stats
  const loadTrackerData = async () => {
    try {
      const res = await fetch(`/api/mon-parcours?profile_id=${profile._meta.profile_id}`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch (e) {
      console.error("Failed to load parcours history", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTrackerData();
  }, [profile._meta.profile_id]);

  // Execute Simulation on Checked Hypothetical Items
  const handleToggleSimulationAction = async (actionId: string) => {
    const isSelected = hypotheticalActions.includes(actionId);
    let updatedActions = [...hypotheticalActions];
    if (isSelected) {
      updatedActions = updatedActions.filter(id => id !== actionId);
    } else {
      updatedActions.push(actionId);
    }
    setHypotheticalActions(updatedActions);

    if (updatedActions.length === 0) {
      setSimulationResult(null);
      return;
    }

    setSimulating(true);
    try {
      const res = await fetch('/api/diagnostic/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profile._meta.profile_id,
          hypothetical_actions: updatedActions
        })
      });
      if (res.ok) {
        const payload = await res.json();
        setSimulationResult(payload);
      }
    } catch (err) {
      console.error("Failed to run simulation:", err);
    } finally {
      setSimulating(false);
    }
  };

  const handleToggleTechnicalDetails = (dim: string) => {
    setShowTechnicalDetails(prev => ({
      ...prev,
      [dim]: !prev[dim]
    }));
  };

  if (loading || !data) {
    return (
      <div className="max-w-4xl mx-auto my-12 text-center py-12 space-y-4" id="mon-parcours-loading">
        <RefreshCw className="w-8 h-8 text-brand-blue animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-mono">
          {language === 'fr' ? "Chargement de votre courbe d'évolution..." : "جاري تحميل سجل مسار نضج مشروعك..."}
        </p>
      </div>
    );
  }

  const { stage_history, score_history, current_stage,
        entrepreneur_name, activity_log, motivational_banner } = data;
  const diagnosis_confidence = profile.scores.overall.diagnosis_confidence;

  // Stepper helper index
  const currentStageIndex = stagesList.findIndex(st => st.key === current_stage);
  const activeStageIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

  const getStageDateStr = (stageKey: string) => {
    const match = stage_history.find(sh => sh.stage === stageKey);
    if (match) {
      const d = new Date(match.reached_at);
      return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'ar-TN', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return null;
  };

  // Pre-configured simulation check options
  const simulationOptions = [
    {
      id: 'interviews_10',
      label: { fr: "Réaliser 10 entretiens clients qualitatifs", ar: "إجراء 10 مقابلات نوعية مع العملاء" },
      benefit: { fr: "Améliore la validation du marché", ar: "يعزز من مستوى التحقق من صحة السوق" }
    },
    {
      id: 'prototype',
      label: { fr: "Concevoir et finaliser le prototype (MVP)", ar: "ابتكار وبناء النموذج الأولي (MVP)" },
      benefit: { fr: "Débloque de précieux indices d'innovation", ar: "يحرر ويفتح مؤشرات الابتكار والتقنية" }
    },
    {
      id: 'pricing',
      label: { fr: "Définir la politique tarifaire & modèle d'affaires", ar: "تحديد نموذج التسعير وهيكل الإيرادات" },
      benefit: { fr: "Optimise la structure commerciale", ar: "يحسن من الهيكلة التجارية" }
    },
    {
      id: 'growth_plan',
      label: { fr: "Planifier l'échelle commerciale (Plan de Croissance)", ar: "صياغة خطة نمو للتوسع والانتشار لمشروعك" },
      benefit: { fr: "Augmente l'indice de scalabilité", ar: "يرفع من مؤشر قابلية التوسع" }
    },
    {
      id: 'register_company',
      label: { fr: "Créer officiellement la société (Enregistrement légal)", ar: "تأسيس الشركة قانونياً وتسجيلها" },
      benefit: { fr: "Confirme la maturité règlementaire", ar: "يؤكد الجاهزية اللائحية والتنظيمية" }
    }
  ];

  // Achievements evaluation helper
  const achievements = [
    {
      id: 'pionnier',
      title: { fr: "Pionnier de l'Écoute", ar: "رائد الاستماع للعملاء" },
      description: { fr: "A réalisé des entretiens approfondis avec sa cible commerciale.", ar: "أجرى مقابلات مفصلة لفهم احتياجات السوق المستهدف." },
      unlocked: !!profile.startup.customer_interviews_conducted
    },
    {
      id: 'createur',
      title: { fr: "Créateur de Solution", ar: "صانع الحل والمنتج" },
      description: { fr: "A développé un prototype fonctionnel ou un MVP concret.", ar: "قام ببناء وتطوير نموذج أولي عملي لمخرجات الفكرة." },
      unlocked: !!profile.startup.has_prototype
    },
    {
      id: 'premier_client',
      title: { fr: "Premier de Cordée", ar: "مكتسب الفواتير الأولى" },
      description: { fr: "A généré des revenus auprès de premiers clients payants.", ar: "حصل على أول عميل يدفع بنجاح لتأكيد نموذج الإيرادات." },
      unlocked: !!profile.startup.has_paying_customers
    },
    {
      id: 'stratege',
      title: { fr: "Ambitieux Structuré", ar: "المخطط الاستراتيجي" },
      description: { fr: "A structuré un plan de croissance à moyen terme.", ar: "أعد خطة نمو واضحة لتوسيع انتشار المشروع مستقبلاً." },
      unlocked: !!profile.startup.has_growth_plan
    },
    {
      id: 'eco_responsable',
      title: { fr: "Éco-Responsable Engagé", ar: "الملتزم البيئي" },
      description: { fr: "A mené une évaluation ou mis en place des actions d'impact environnemental.", ar: "أجرى تقييماً للأثر البيئي لمنتجاته أو عملياته." },
      unlocked: !!profile.startup.has_env_assessment
    },
    {
      id: 'legal',
      title: { fr: "Citoyen Startup Act", ar: "المؤسسة القانونية المهيكلة" },
      description: { fr: "A légalement constitué sa société.", ar: "أتم بنجاح الإجراءات القانونية لتأسيس مشروعه الناشئ." },
      unlocked: profile.startup.legal_form !== 'not_registered' && !!profile.startup.legal_form
    }
  ];

  // Determine Next Priority from highest blockers detected
  const nextPriorityBlocker = profile.blockers && profile.blockers.length > 0 ? profile.blockers[0] : null;

  return (
    <div className="max-w-4xl mx-auto my-6 px-4 space-y-8 no-print" id="parcours-redesign-view">
      
      {/* MOTIVATIONAL BANNER */}
      {motivational_banner && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 flex items-center gap-3 shadow-xs"
        >
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold leading-relaxed">
            {motivational_banner}
          </p>
        </motion.div>
      )}

      {/* 👤 1. PROFIL STARTUP */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs relative overflow-hidden" id="section-profil-startup">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-blue/5 rounded-full blur-2xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-brand-blue/10 text-brand-blue text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                {language === 'fr' ? "Fiche Diagnostic Actuelle" : "بطاقة التقييم الحالية"}
              </span>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-mono px-2 py-0.5 rounded">
                Secteur: {profile.entrepreneur.sector || 'Général'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-brand-blue shrink-0" />
              <span>{profile.startup.name || entrepreneur_name}</span>
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
              {language === 'fr' 
                ? "Représentation consolidée des progrès et de l'avancement global de votre projet d'entreprise. Ces indicateurs sont mis à jour dynamiquement à chaque modification de diagnostic."
                : "عرض موحد لمستويات نمو مشروعك ودرجات تطوره الإجمالية. يتم تحديث هذه الواجهة بصفة تلقائية وتفاعلية مع كل تعديل."}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl shrink-0 self-start md:self-auto">
            <div className="w-10 h-10 rounded-full bg-brand-crimson/10 flex items-center justify-center text-brand-crimson">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block leading-none mb-1">
                {language === 'fr' ? "Niveau de Confiance" : "مستوى ثقة التقييم"}
              </span>
              <span className="text-lg font-black text-slate-800 font-mono leading-none">
                {Math.min(100, diagnosis_confidence ?? 0)}%
              </span>
              <span className="text-[9px] text-gray-400 block leading-none mt-1">
                {language === 'fr' ? "Précision des réponses" : "دقة المدخلات الحالية"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🛤 2. MON PARCOURS ENTREPRENEURIAL (Journey Timeline) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4" id="section-parcours-stepper">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <TrendingUp className="w-5 h-5 text-brand-blue" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
            {language === 'fr' ? "Chronologie de mon Parcours" : "المخطط الزمني لمسار نضج المشروع"}
          </h3>
        </div>

        {/* Desktop timeline view */}
        <div className="hidden md:block pt-4 pb-6">
          <div className="relative flex justify-between items-start">
            
            {/* Horizontal timeline line background */}
            <div className="absolute top-[18px] left-[8%] right-[8%] h-[3px] bg-slate-100 -z-0">
              <div 
                className="h-full bg-brand-blue transition-all duration-500 rounded" 
                style={{ width: `${(activeStageIndex / 5) * 100}%` }}
              />
            </div>

            {stagesList.map((st, index) => {
              const isCompleted = index < activeStageIndex;
              const isCurrent = index === activeStageIndex;
              const dStr = getStageDateStr(st.key);

              return (
                <div key={st.key} className="flex flex-col items-center text-center w-[16%] relative z-10">
                  <div 
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 ${
                      isCurrent
                        ? 'border-brand-crimson bg-white text-brand-crimson font-black shadow-md scale-110'
                        : isCompleted
                          ? 'border-brand-blue bg-brand-blue text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-450'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white stroke-[3.5px]" />
                    ) : (
                      <span className="text-xs font-mono font-bold">{index + 1}</span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1">
                    <span className={`text-[10px] block font-extrabold leading-tight ${isCurrent ? 'text-brand-crimson' : isCompleted ? 'text-brand-blue' : 'text-slate-400'}`}>
                      {language === 'fr' ? st.nameFr.split(' / ')[0] : st.nameAr.split(' / ')[0]}
                    </span>
                    {dStr && (
                      <span className="text-[9px] inline-block text-gray-450 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded font-mono font-bold leading-none select-none">
                        {dStr}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile timeline view */}
        <div className="block md:hidden space-y-4">
          {stagesList.map((st, index) => {
            const isCompleted = index < activeStageIndex;
            const isCurrent = index === activeStageIndex;
            const dStr = getStageDateStr(st.key);

            return (
              <div key={st.key} className="flex gap-4 relative">
                {index < 5 && (
                  <div className={`absolute top-8 bottom-0 left-[15px] w-0.5 ${isCompleted ? 'bg-brand-blue' : 'bg-slate-100'}`} />
                )}

                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 z-10 ${
                    isCurrent
                      ? 'border-brand-crimson bg-white text-brand-crimson font-black shadow-sm scale-105'
                      : isCompleted
                        ? 'border-brand-blue bg-brand-blue text-white'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                  ) : (
                    <span className="text-xs font-mono font-extrabold">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-extrabold ${isCurrent ? 'text-brand-crimson' : isCompleted ? 'text-brand-blue' : 'text-slate-400'}`}>
                      {language === 'fr' ? st.nameFr : st.nameAr}
                    </h4>
                    {dStr && (
                      <span className="text-[9px] font-mono bg-gray-50 border border-gray-150 px-1.5 py-0.5 rounded font-bold">
                        {dStr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📊 3. MES SCORES (Progress Bars) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5" id="section-mes-scores">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              {language === 'fr' ? "Mes Scores de Maturité" : "درجات نضج الهيكلة والأداء لمشروعك"}
            </h3>
            <p className="text-[11px] text-gray-400">
              {language === 'fr' ? "Indice de performance consolidé pour chaque dimension clé du projet." : "مستويات الأداء الإجمالية المحتسبة لكل بعد حيوي في مؤسستك."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
            {Object.keys(dimensionColors).map((dim) => (
              <span key={dim} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (dimensionColors as any)[dim] }} />
                {(dimensionLabels as any)[dim]?.[language]}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {Object.keys(dimensionLabels).map((dimKey) => {
            const rawScore = (profile.scores as any)[dimKey]?.score ?? 0;
            const originalMax = (profile.scores as any)[dimKey]?.highest_unlocked_value ?? 100;
            const isCapped = rawScore === originalMax && rawScore < 100; // Capped or restricted
            const label = (dimensionLabels as any)[dimKey]?.[language];
            const color = (dimensionColors as any)[dimKey];
            const detailsOpen = showTechnicalDetails[dimKey];

            return (
              <div key={dimKey} className="bg-slate-50/50 hover:bg-slate-50/80 transition-colors border border-slate-100 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono" style={{ color: color }}>
                      {rawScore}%
                    </span>
                    {isCapped && (
                      <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider snap-none">
                        {language === 'fr' ? "STABILISÉ" : "مستقر"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out" 
                    style={{ backgroundColor: color, width: `${rawScore}%` }}
                  />
                </div>

                {/* Instructive explanation with explicit toggle detail */}
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-450">
                    {isCapped 
                      ? (language === 'fr' ? "Score ajusté (attente de jalons)" : "الدرجة مستقرة مؤقتا")
                      : (language === 'fr' ? "Progression normale" : "معدل نمو اعتيادي")
                    }
                  </span>
                  <button 
                    type="button"
                    onClick={() => handleToggleTechnicalDetails(dimKey)}
                    className="text-brand-blue font-bold flex items-center gap-0.5 hover:underline focus:outline-hidden"
                  >
                    <span>{detailsOpen ? (language === 'fr' ? "Masquer" : "إخفاء") : (language === 'fr' ? "Voir les détails" : "عرض التفاصيل")}</span>
                    {detailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <AnimatePresence>
                  {detailsOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 text-[9.5px] leading-relaxed text-gray-500 border-t border-slate-100/80 mt-1">
                        {isCapped ? (
                          language === 'fr' 
                            ? `Ce score de ${rawScore}% a atteint un palier de structuration. Pour débloquer la suite de vos indices sur cette dimension, vous devez prioritairement compléter les actions recommandées et consolider votre phase de maturité actuelle.`
                            : `وصلت هذه الدرجة (${rawScore}%) إلى سقف نضج معين. لفتح الإمكانيات الكاملة على هذا البعد، يرجى استكمال الخطوات المتأخرة أولاً في خارطة طريقك.`
                        ) : (
                          language === 'fr'
                            ? `Cette dimension est calculée librement sur l'ensemble de vos réponses accumulées. La note maximale théorique est de 100%. Procédez aux simulations pour évaluer de futurs bonds.`
                            : `يتم احتساب هذا المؤشر بحرية وفق مدخلات التشخيص الحالية. حدد خيارات المحاكاة بالأسفل لتلاحظ ارتفاع منسوب درجات القياس.`
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🎯 4. MA PROCHAINE PRIORITÉ (Next Objective Card) */}
      <div className="bg-gradient-to-br from-brand-blue to-blue-900 text-white rounded-2xl p-6 shadow-xs relative overflow-hidden" id="section-prochaine-priorite">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -z-10" />
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-brand-crimson text-white text-[9px] font-black px-2 py-0.5 rounded font-mono uppercase tracking-wider select-none">
              {language === 'fr' ? "MA PROCHAINE PRIORITÉ" : "الأولوية القادمة لمشروعي"}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-brand-crimson shrink-0 self-center md:self-auto">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div className="space-y-1.5 flex-1">
              {nextPriorityBlocker ? (
                <>
                  <h4 className="text-base font-black tracking-tight leading-snug">
                    {language === 'fr' ? nextPriorityBlocker.title?.fr : nextPriorityBlocker.title?.ar}
                  </h4>
                  <p className="text-xs text-blue-100 leading-relaxed">
                    {language === 'fr' ? nextPriorityBlocker.description?.fr : nextPriorityBlocker.description?.ar}
                  </p>
                  <div className="pt-1.5 flex items-center gap-1 text-[10px] text-blue-200 font-bold uppercase tracking-wide">
                    <Info className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? "Résoudre cet élément débloquera de nouveaux scores de maturité" : "معالجة هذا العائق سيفتح درجات نضج إضافية على الفور"}</span>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="text-base font-black tracking-tight leading-snug">
                    {language === 'fr' ? "Consolider vos bases de maturité" : "تعزيز وترسيخ أسس القياس الحالية"}
                  </h4>
                  <p className="text-xs text-blue-100 leading-relaxed">
                    {language === 'fr'
                      ? "Vous n'avez aucun bloqueur immédiat restrictif répertorié. Votre priorité actuelle est d'utiliser le simulateur ou de compléter vos actions d'accompagnement."
                      : "لا توجد أي عوائق مانعة معوقة مسجلة في ملف مشروعك. الأولوية المقترحة هي استخدام أداة السيميلاطور لمحاكاة البنود."}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🧪 5. SIMULATEUR "ET SI... ?" (What-If Simulator) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="section-what-if-simulator">
        <div className="bg-slate-900 text-white p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold bg-brand-crimson px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider block w-fit">
              {language === 'fr' ? "LABORATOIRE DE CRÉATION" : "مختبر التطوير والمحاكاة"}
            </span>
            <h3 className="text-base font-black font-sans">
              {language === 'fr' ? "Simulateur interactif : \"Et si... ?\"" : "أداة المحاكاة التفاعلية: \"ماذا لو... ؟\""}
            </h3>
          </div>
          
          <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-mono font-bold border border-white/5 flex items-center gap-2">
            <span>Overall Score:</span>
            <span className="text-brand-crimson font-black text-sm">
              {profile.scores.overall.score}%
            </span>
            {simulationResult && (
              <span className="text-emerald-400">
                ➔ {simulationResult.predicted_overall_score}%
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-gray-500 leading-relaxed">
            {language === 'fr'
              ? "Sélectionnez fictivement la réalisation des milestones ci-dessous. Notre moteur de calcul ré-analysera en temps réel les règles de limitation structurelles pour vous révéler instantanément vos gains potentiels de compétences."
              : "حدد البنود التالية بصفة افتراضية لتشاهد في الحين كيف ينعكس إنجازها على مؤشرات النضج الكلية ويحرر مشروعك للتمويل."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Simulation checklist checkboxes */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
                {language === 'fr' ? "Milestones à simuler" : "الإنجازات المراد محاكاتها"}
              </span>
              <div className="space-y-2.5">
                {simulationOptions.map((opt) => {
                  const checked = hypotheticalActions.includes(opt.id);
                  return (
                    <label 
                      key={opt.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                        checked 
                          ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950 font-medium'
                          : 'border-slate-150 text-gray-700 hover:bg-slate-50/50'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleSimulationAction(opt.id)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold block leading-tight">
                          {opt.label[language]}
                        </span>
                        <span className="text-[9.5px] text-gray-400 block leading-none">
                          {opt.benefit[language]}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Simulation feedback console */}
            <div className="bg-slate-900 text-slate-100 rounded-xl p-5 flex flex-col justify-between border border-slate-800 relative min-h-[220px]">
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#00B4D8] font-mono block">
                  {language === 'fr' ? "OUTPUT CONSOLE" : "شاشة مخرجات المحاكاة"}
                </span>

                {hypotheticalActions.length === 0 ? (
                  <div className="text-center py-6 mx-auto max-w-xs space-y-2">
                    <Gauge className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-[11px] text-slate-400">
                      {language === 'fr' 
                        ? "Cochez des actions pour simuler le recalcul de maturité."
                        : "حدد أياً من الخيارات الجانبية لتنشيط المحاكاة."}
                    </p>
                  </div>
                ) : simulating ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 text-[#00B4D8] animate-spin mx-auto" />
                    <span className="text-[11px] text-slate-400 mt-2 block font-mono">Recalculating...</span>
                  </div>
                ) : simulationResult ? (
                  <div className="space-y-4 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Overall Lift:</span>
                      <span className="font-bold text-emerald-400">
                        {simulationResult.current_overall_score}% ➔ {simulationResult.predicted_overall_score}% 
                        ({simulationResult.predicted_overall_score - simulationResult.current_overall_score > 0 ? '+' : ''}
                        {simulationResult.predicted_overall_score - simulationResult.current_overall_score} pts)
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-slate-450 block text-[9px] uppercase font-bold tracking-wide">Dimension Deltas:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(simulationResult.score_deltas as Record<string, number>).map(([dim, deltaVal]) => {
                          const dimLabel = (dimensionLabels as any)[dim]?.[language] || dim;
                          return (
                            <div key={dim} className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                              <span className="text-slate-400 truncate pr-1 text-[10px]">{dimLabel.split(' ')[0]}:</span>
                              <span className={`font-bold ${deltaVal > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {deltaVal > 0 ? `+${deltaVal}` : deltaVal}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {simulationResult.stage_unlocked && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-lg text-[10.5px] leading-relaxed flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          {language === 'fr'
                            ? `Nouveau Stade débloqué : ${simulationResult.predicted_stage} !`
                            : `مرحلة نضج جديدة مفتوحة وتأهلت إليها: ${simulationResult.predicted_stage} !`}
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {hypotheticalActions.length > 0 && !simulating && (
                <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[9px] text-slate-500">
                  <span>Calculations ground on clinical formulas</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setHypotheticalActions([]);
                      setSimulationResult(null);
                    }}
                    className="text-brand-crimson font-bold hover:underline"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🏆 6. MES RÉUSSITES (Achievements) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5" id="section-mes-reussites">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Trophy className="w-5 h-5 text-brand-crimson" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
            {language === 'fr' ? "Mes Réussites Débloquées" : "سجل لوحة الإنجازات والجوائز المكتسبة"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((ach) => {
            return (
              <div 
                key={ach.id}
                className={`relative p-5 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                  ach.unlocked 
                    ? 'border-brand-crimson bg-gradient-to-br from-brand-crimson/5 to-white shadow-2xs' 
                    : 'border-slate-100 bg-gray-50/40 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      ach.unlocked ? 'bg-brand-crimson/15 text-brand-crimson' : 'bg-slate-205 text-slate-400 bg-slate-150'
                    }`}>
                      {ach.unlocked ? <Trophy className="w-4 h-4 fill-brand-crimson" /> : <Lock className="w-3.5 h-3.5" />}
                    </div>
                    {ach.unlocked && (
                      <span className="bg-brand-crimson/10 text-brand-crimson text-[8px] font-black font-mono px-1.5 py-0.5 rounded leading-none">
                        UNLOCKED
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className={`text-xs font-black ${ach.unlocked ? 'text-slate-800' : 'text-gray-400'}`}>
                      {ach.title[language]}
                    </h4>
                    <p className="text-[10px] text-gray-500 leading-normal font-sans">
                      {ach.description[language]}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📜 7. HISTORIQUE D’ACTIVITÉ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4" id="section-historique-activite">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Activity className="w-5 h-5 text-brand-blue" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
            {language === 'fr' ? "Historique d'Activité" : "سجل النشاط ووقائع التقدم لتطوير الفكرة"}
          </h3>
        </div>

        <div className="space-y-4 pt-1 font-sans">
          {activity_log && activity_log.length > 0 ? (
            activity_log.map((log, index) => {
              const d = new Date(log.date);
              const dateStr = d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'ar-TN', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div key={index} className="flex gap-4 items-start text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="w-24 font-mono font-bold text-slate-400 shrink-0 pt-0.5 leading-none">
                    {dateStr}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-700 font-extrabold text-xs">
                        {log.change[language]}
                      </span>
                    </div>
                    {/* Render score deltas nicely if available */}
                    {Object.keys(log.score_deltas || {}).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-3.5">
                        {Object.entries(log.score_deltas).map(([dim, val]) => {
                          const label = (dimensionLabels as any)[dim]?.[language] || dim;
                          return (
                            <span key={dim} className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 rounded py-0.5 font-mono">
                              {label.split(' ')[0]} : +{val} pts
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-8 text-gray-400 bg-gray-50/30 rounded-xl text-xs border border-dashed border-gray-200">
              <Calendar className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-600 mb-0.5">
                {language === 'fr' ? "Diagnostic initié" : "تم فتح وبدء التشخيص"}
              </p>
              <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                {language === 'fr'
                  ? "Vos événements d'avancement mûris s'accumuleront dynamiquement à cet endroit au fur et à mesure que vous compléterez vos jalons diagnostiques."
                  : "ستظهر في هذه المساحة جميع وقائع تطور كفاءات وركائز أبعاد مشروعك تدريجياً وبصفة تلقائية."}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ParcoursEvolution;
