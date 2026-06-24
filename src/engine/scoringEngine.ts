/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectProfile, DimensionScore, ScoresInfo, MultilingualText } from '../types';

/**
 * Normalizes YES/NO/Boolean values
 */
function isYes(val: any): boolean {
  return val === 'yes' || val === 'Oui' || val === true;
}

/**
 * Scoring Methodology Engine - CompassIQ (Feature 2)
 */
export function computeScores(profile: ProjectProfile): ScoresInfo {
  const s = profile.startup;
  const answeredCount = profile.assessment?.questions_answered?.length || 0;
  // Total answerable questions is around 41
  const totalQuestions = 41;
  const qCompleteness = Math.min(1, answeredCount / totalQuestions);

  // ------------------------------------------------------------------------
  // 1. DIMENSION: MARKET SCORE (Weight: 25%)
  // Sub-criteria: Validation Evidence (35%), Market Opportunities/TAM-SAM-SOM + competition (35%), Revenue Model Clarity & Viability (30%)
  // ------------------------------------------------------------------------
  
  // Validation Evidence (35%)
  let marketValEvidenceSub = 0;
  if (isYes(s.customer_interviews_conducted)) marketValEvidenceSub += 15;
  const intCount = s.customer_interviews_count || 0;
  if (intCount >= 15) marketValEvidenceSub += 45;
  else if (intCount >= 10) marketValEvidenceSub += 35;
  else if (intCount >= 5) marketValEvidenceSub += 20;
  else if (intCount > 0) marketValEvidenceSub += 5;

  if (isYes(s.has_survey_data)) marketValEvidenceSub += 20;
  if (isYes(s.has_pilot_users)) marketValEvidenceSub += 20;
  marketValEvidenceSub = Math.min(100, marketValEvidenceSub);

  // Market Opportunities (35%)
  let marketOppSub = 0;
  if (s.target_customer && s.target_customer.length > 10) marketOppSub += 30;
  const comp = s.local_competition_level;
  if (comp === 'none') marketOppSub += 50;
  else if (comp === 'partial') marketOppSub += 40;
  else if (comp === 'strong') marketOppSub += 15;
  if (isYes(s.pricing_defined)) marketOppSub += 20;

  // Revenue Model Clarity (30%)
  let revClaritySub = 0;
  if (isYes(s.has_business_model)) revClaritySub += 30;
  if (s.revenue_model && s.revenue_model !== 'not_defined') revClaritySub += 40;
  if (isYes(s.has_paying_customers)) revClaritySub += 30;

  const rawMarketScore = Math.round(
    marketValEvidenceSub * 0.35 + marketOppSub * 0.35 + revClaritySub * 0.30
  );

  // Gating rule G1: Customer interviews < 5 => Market Score <= 50
  let marketGatingApplied = false;
  let marketCapValue: number | null = null;
  let marketGatingRule: string | null = null;
  let finalMarketScore = rawMarketScore;

  if (intCount < 5) {
    marketGatingApplied = true;
    marketCapValue = 50;
    marketGatingRule = 'G1';
    if (finalMarketScore > 50) {
      finalMarketScore = 50;
    }
  }

  // FIX: cap-language should only fire when the gate actually truncated the score.
  // When rawMarketScore <= 50 the low score is purely a function of sub-criteria,
  // not the gate — so the explanation must reflect that instead.
  const marketCapIsBinding = marketGatingApplied && rawMarketScore > 50;

  // Explainability Layer for Market
  let marketGap: MultilingualText;
  let marketExpl: MultilingualText;
  let marketRec: MultilingualText;

  if (intCount < 5) {
    marketGap = {
      fr: "Preuves de validation client critiques manquantes (< 5 entretiens)",
      ar: "نقص حاد في أدلة مراجعة العملاء (من المقابلات الأقل من 5)"
    };
    marketExpl = marketCapIsBinding ? {
      // Gate IS the limiting factor: raw exceeded the cap.
      fr: "Votre score est plafonné à 50 par la règle d'exclusion G1 car vous n'avez pas mené au moins 5 entretiens qualitatifs. La confiance du marché repose sur des faits réels plutôt que des suppositions.",
      ar: "تم سقف درجتك بـ 50 بموجب قاعدة الحظر G1 لأنك لم تقم بـ 5 مقابلات نوعية على الأقل. تستند ثقة السوق على وقائع ملموسة وليست فرضيات."
    } : {
      // Gate is triggered but NOT the limiting factor: sub-criteria drove the score below the cap.
      fr: `La règle G1 est active (< 5 entretiens), mais votre score brut (${rawMarketScore}/100) était déjà sous le plafond de 50. La faiblesse provient directement de vos sous-critères de validation — le plafond ne contraint pas votre score dans ce cas.`,
      ar: `قاعدة الحظر G1 مفعّلة (أقل من 5 مقابلات)، لكن درجتك الخام (${rawMarketScore}/100) كانت أصلاً دون سقف 50. يعكس الانخفاض ضعف المعايير الفرعية للتحقق مباشرةً — السقف لم يُقيّد نتيجتك هنا.`
    };
    marketRec = {
      fr: "Conduire au moins 10 vrais entretiens individuels en face-à-face avec des clients cibles tunisiens.",
      ar: "إجراء 10 مقابلات فردية حقيقية وجهاً لوجه مع عملاء تونسيين مستهدفين."
    };
  } else if (!isYes(s.has_business_model)) {
    marketGap = {
      fr: "Incertitude quant au modèle de revenus",
      ar: "عدم يقين بشأن نموذج الإيرادات"
    };
    marketExpl = {
      fr: "Vous possédez des preuves clients mais votre modèle de capture de valeur commerciale n'est pas encore modélisé.",
      ar: "تملك أدلة من العملاء ولكن نموذج تحصيل القيمة التجارية غير مُمثل بعد."
    };
    marketRec = {
      fr: "Définir précisément le canal de facturation (ex. abonnement, vente directe, commission).",
      ar: "تحديد قناة الفوترة بدقة (مثل الاشتراك، البيع المباشر، أو العمولات)."
    };
  } else {
    marketGap = {
      fr: "Faible densité d'opportunité d'échelle",
      ar: "كثافة منخفضة لفرص التوسع"
    };
    marketExpl = {
      fr: "Votre score montre une saine validation, mais requiert une meilleure définition de la taille de votre opportunité.",
      ar: "تظهر درجتك موثوقية جيدة، لكنها تتطلب تحسيناً في حجم الفرصة المتاحة."
    };
    marketRec = {
      fr: "Profiler précisément votre TAM-SAM-SOM pour attirer des financeurs.",
      ar: "توصيف حجم السوق الكلي والمتاح والمستهدف بدقة لجذب الممولين."
    };
  }

  // ------------------------------------------------------------------------
  // 2. DIMENSION: COMMERCIAL OFFER SCORE (Weight: 20%)
  // Sub-criteria: Value Prop Clarity (30%), Product Maturity (25%), Pricing Coherence (25%), Offer-Customer Alignment (20%)
  // ------------------------------------------------------------------------
  
  // Value Prop Clarity (30%)
  let valPropSub = 0;
  if (isYes(s.problem_defined)) valPropSub += 40;
  if (s.solution_description && s.solution_description.length > 10) valPropSub += 40;
  if (comp !== 'strong') valPropSub += 20;

  // Product Maturity (25%)
  let prodMaturitySub = 0;
  if (isYes(s.has_prototype)) prodMaturitySub += 30;
  const pStage = s.product_stage;
  if (pStage === 'market_ready') prodMaturitySub += 70;
  else if (pStage === 'beta') prodMaturitySub += 50;
  else if (pStage === 'mvp') prodMaturitySub += 30;
  else if (pStage === 'proof_of_concept') prodMaturitySub += 15;

  // Pricing Coherence (25%)
  let pricingSub = 0;
  if (isYes(s.pricing_defined)) pricingSub += 60;
  if (s.revenue_model && s.revenue_model !== 'not_defined') pricingSub += 40;

  // Offer-Customer Alignment (20%)
  let offerAlignSub = 0;
  if (isYes(s.has_pilot_users)) offerAlignSub += 40;
  if (isYes(s.has_loi)) offerAlignSub += 40;
  if (isYes(s.launched_to_market)) offerAlignSub += 20;

  const rawCommScore = Math.round(
    valPropSub * 0.30 + prodMaturitySub * 0.25 + pricingSub * 0.25 + offerAlignSub * 0.20
  );

  // Gating rule G2: Revenue = 0 AND paying customers = 0 => Commercial Offer <= 50
  let commGatingApplied = false;
  let commCapValue: number | null = null;
  let commGatingRule: string | null = null;
  let finalCommScore = rawCommScore;

  const revenueIsZero = s.monthly_revenue === '0' || !s.monthly_revenue || s.monthly_revenue_numeric === 0;
  const customersIsZero = s.paying_customers_count === null || s.paying_customers_count === 0 || !isYes(s.has_paying_customers);

  if (revenueIsZero && customersIsZero) {
    commGatingApplied = true;
    commCapValue = 50;
    commGatingRule = 'G2';
    if (finalCommScore > 50) {
      finalCommScore = 50;
    }
  }

  // FIX: only invoke cap-language when the gate actually truncated the score.
  const commCapIsBinding = commGatingApplied && rawCommScore > 50;

  // Explainability Layer for Commercial Offer
  let commGap: MultilingualText;
  let commExpl: MultilingualText;
  let commRec: MultilingualText;

  if (commGatingApplied) {
    commGap = {
      fr: "Absence de traction commerciale financière (Revenu = 0 et clients payants = 0)",
      ar: "غياب الجرار المالي التجاري (العائد = 0 والعملاء الدافعين = 0)"
    };
    commExpl = commCapIsBinding ? {
      // Gate IS the limiting factor: raw exceeded the cap.
      fr: "Votre score est plafonné à 50 par la règle G2. Malgré un concept mûr, la viabilité de votre offre commerciale ne sera prouvée qu'au moment du premier dinar encaissé.",
      ar: "تم سقف درجتك بـ 50 بموجب قاعدة الحظر G2. على الرغم من نضج الفكرة، فإن نجاعة عرضك التجاري لن تثبت إلا مع تحصيل أول دينار مالي."
    } : {
      // Gate is triggered but NOT the limiting factor: sub-criteria drove the score below the cap.
      fr: `La règle G2 est active (revenu nul et aucun client payant), mais votre score brut (${rawCommScore}/100) était déjà sous le plafond de 50. La faiblesse provient directement de vos sous-critères de maturité produit et d'alignement offre-client — le plafond ne contraint pas votre score dans ce cas.`,
      ar: `قاعدة الحظر G2 مفعّلة (لا إيراد ولا عملاء دافعون)، لكن درجتك الخام (${rawCommScore}/100) كانت دون سقف 50 أصلاً. يعكس الانخفاض معايير نضج المنتج والتوافق مع العملاء مباشرةً — السقف لم يؤثر على نتيجتك هنا.`
    };
    commRec = {
      fr: "Recruter des utilisateurs pilotes prêts à tester une formule payante ou pré-acheter votre solution.",
      ar: "استقطاب مستخدمين تجريبين مستعدين للاشتراك في نسخة مدفوعة أو طلب شراء مسبق لحلك."
    };
  } else if (!isYes(s.has_prototype)) {
    commGap = {
      fr: "Offre à l'état théorique sans prototype concret",
      ar: "العرض في الإطار النظري دون نموذج أولي ملموس"
    };
    commExpl = {
      fr: "Votre proposition de valeur est bien rédigée, mais les clients ne peuvent pas toucher ou manipuler l'offre.",
      ar: "مقترح القيمة مبني بشكل جيد، لكن العملاء لا يستطيعون تجربة أو معاينة العرض الملموس."
    };
    commRec = {
      fr: "Construire un MVP (Minimum Viable Product) simplifié et visuel.",
      ar: "بناء منتج بحد أدنى من المتطلبات (MVP) بصري ومبسط."
    };
  } else {
    commGap = {
      fr: "Cohérence tarifaire en cours d'évaluation",
      ar: "اتساق التسعير قيد التقييم"
    };
    commExpl = {
      fr: "Votre offre est fonctionnelle mais nécessite des itérations de prix pour maximiser la rentabilité opérationnelle.",
      ar: "عرضك وظيفي ولكنه يحتاج إلى مراجعة مستمرة للأسعار لتعظيم الجدوى التشغيلية."
    };
    commRec = {
      fr: "Tester scientifiquement des grilles de tarifs différenciées (B2B vs B2C).",
      ar: "اختبار قوائم أسعار مختلفة بشكل علمي (B2B مقابل B2C)."
    };
  }

  // ------------------------------------------------------------------------
  // 3. DIMENSION: INNOVATION SCORE (Weight: 20%)
  // Sub-criteria: Local Novelty (30%), Tech Intensity (25%), Barrier to Entry (25%), Departure Degree (20%)
  // ------------------------------------------------------------------------
  
  // Local Novelty (30%)
  let noveltySub = 0;
  if (comp === 'none') noveltySub = 100;
  else if (comp === 'partial') noveltySub = 60;
  else if (comp === 'strong') noveltySub = 15;

  // Tech Intensity (25%)
  let techIntensitySub = 0;
  const tInt = s.technology_intensity;
  if (tInt === 'advanced') techIntensitySub = 100;
  else if (tInt === 'intermediate') techIntensitySub = 70;
  else if (tInt === 'basic') techIntensitySub = 40;
  else if (tInt === 'none') techIntensitySub = 10;

  // Barrier to Entry (25%)
  let barrierSub = 0;
  if (tInt === 'intermediate' || tInt === 'advanced') barrierSub += 50;
  if (s.team_skills.includes('tech') && s.team_skills.includes('domain')) barrierSub += 50;
  else if (s.team_skills.includes('tech') || s.team_skills.includes('domain')) barrierSub += 30;
  else barrierSub += 10;

  // Departure Degree (20%)
  let departureSub = 0;
  if (isYes(s.problem_defined) && s.solution_description) departureSub += 50;
  if (comp !== 'strong') departureSub += 50;
  else departureSub += 10;

  const rawInnovScore = Math.round(
    noveltySub * 0.30 + techIntensitySub * 0.25 + barrierSub * 0.25 + departureSub * 0.20
  );

  // Gating rule G3: Prototype = No => Innovation <= 60
  let innovGatingApplied = false;
  let innovCapValue: number | null = null;
  let innovGatingRule: string | null = null;
  let finalInnovScore = rawInnovScore;

  if (!isYes(s.has_prototype)) {
    innovGatingApplied = true;
    innovCapValue = 60;
    innovGatingRule = 'G3';
    if (finalInnovScore > 60) {
      finalInnovScore = 60;
    }
  }

  // FIX: only invoke cap-language when the gate actually truncated the score.
  const innovCapIsBinding = innovGatingApplied && rawInnovScore > 60;

  // Explainability Layer for Innovation
  let innovGap: MultilingualText;
  let innovExpl: MultilingualText;
  let innovRec: MultilingualText;

  if (innovGatingApplied) {
    innovGap = {
      fr: "Aucune matérialisation physique de l'innovation (Pas de prototype)",
      ar: "عدم وجود تجسيد مادي للابتكار (لا يوجد نموذج أولي)"
    };
    innovExpl = innovCapIsBinding ? {
      // Gate IS the limiting factor: raw exceeded the cap.
      fr: "L'innovation n'est jugée sincère qu'à travers une concrétisation fonctionnelle. Votre score est plafonné à 60 par la règle G3.",
      ar: "لا يُحكم بجدية الابتكار إلا بتطبيقه العملي الوظيفي. تم سقف درجتك بـ 60 وفق القاعدة G3."
    } : {
      // Gate is triggered but NOT the limiting factor: sub-criteria drove the score below the cap.
      fr: `La règle G3 est active (pas de prototype), mais votre score brut (${rawInnovScore}/100) était déjà sous le plafond de 60. La faiblesse provient directement de vos sous-critères d'innovation — le plafond ne contraint pas votre score dans ce cas.`,
      ar: `قاعدة الحظر G3 مفعّلة (لا نموذج أولي)، لكن درجتك الخام (${rawInnovScore}/100) كانت دون سقف 60 أصلاً. يعكس الانخفاض ضعف معايير الابتكار الفرعية مباشرةً — السقف لم يُؤثر على نتيجتك هنا.`
    };
    innovRec = {
      fr: "Concevoir une preuve de concept (POC) technique démontrant la faisabilité de l'innovation.",
      ar: "تصميم إثبات للمفهوم (POC) تقنياً يثبت جدوى ابتكارك المزعوم."
    };
  } else if (tInt === 'none' || tInt === 'basic') {
    innovGap = {
      fr: "Faible intensité technologique ou technologique traditionnelle",
      ar: "كثافة تكنولوجية ضعيفة أو تقليدية"
    };
    innovExpl = {
      fr: "Votre projet utilise des technologies courantes, ce qui limite vos barrières à l'entrée défendables devant la concurrence tunisienne.",
      ar: "يستخدم مشروعك تقنيات شائعة، مما يحد من الحواجز الحمائية لشركتك أمام المنافسة التونسية."
    };
    innovRec = {
      fr: "Explorer l'intégration de couche logicielle propriétaire ou enrichir votre expérience utilisateur par de l'automatisation intelligente.",
      ar: "استكشاف دمج برمجيات ملكية خاصة أو إثراء تجربة المستخدمين بالأتمتة الذكية."
    };
  } else {
    innovGap = {
      fr: "Barrières à l'entrée défendables partielles",
      ar: "حواجز حمائية دفاعية جزئية"
    };
    innovExpl = {
      fr: "Votre intensité technologique est solide, mais l'absence de brevet ou d'expertise métier croisée limite votre avance d'innovation.",
      ar: "كثافة التكنولوجيا قوية، ولكن غياب الحماية ب براءة اختراع يحد من صدارة مشروعك الابتكارية."
    };
    innovRec = {
      fr: "Déposer une demande de protection intellectuelle de votre code source auprès de l'INNORPI.",
      ar: "تقديم طلب لحماية الملكية الفكرية لشيفرتك البرمجية لدى INNORPI التونسية."
    };
  }

  // ------------------------------------------------------------------------
  // 4. DIMENSION: SCALABILITY SCORE (Weight: 20%)
  // Sub-criteria: Replicability (30%), Manual dependency inverted (25%), Deployment Cost (20%), Geographic potential (25%)
  // ------------------------------------------------------------------------
  
  // Replicability (30%)
  let replicabilitySub = isYes(s.solution_replicable) ? 100 : 15;

  // Manual dependency inverted (25%)
  let manualDepSub = 20;
  const dep = s.manual_dependency_level;
  if (dep === 'fully_automated') manualDepSub = 100;
  else if (dep === 'mostly_automated') manualDepSub = 80;
  else if (dep === 'mixed') manualDepSub = 50;
  else if (dep === 'mostly_manual') manualDepSub = 25;
  else if (dep === 'fully_manual') manualDepSub = 10;

  // Deployment cost structure (20%)
  let deploymentSub = 0;
  if (isYes(s.solution_replicable)) deploymentSub += 60;
  if (isYes(s.has_growth_plan)) deploymentSub += 40;

  // Geographic potential (25%)
  let geoPotentialSub = 0;
  if (isYes(s.international_expansion)) geoPotentialSub += 60;
  if (s.team_skills.includes('marketing') && s.team_skills.includes('business')) geoPotentialSub += 40;
  else if (s.team_skills.includes('marketing') || s.team_skills.includes('business')) geoPotentialSub += 20;

  const rawScalScore = Math.round(
    replicabilitySub * 0.30 + manualDepSub * 0.25 + deploymentSub * 0.20 + geoPotentialSub * 0.25
  );

  // Gating rule G4: Growth plan = Missing => Scalability <= 60
  let scalGatingApplied = false;
  let scalCapValue: number | null = null;
  let scalGatingRule: string | null = null;
  let finalScalScore = rawScalScore;

  if (!isYes(s.has_growth_plan)) {
    scalGatingApplied = true;
    scalCapValue = 60;
    scalGatingRule = 'G4';
    if (finalScalScore > 60) {
      finalScalScore = 60;
    }
  }

  // FIX: only invoke cap-language when the gate actually truncated the score.
  const scalCapIsBinding = scalGatingApplied && rawScalScore > 60;

  // Explainability Layer for Scalability
  let scalGap: MultilingualText;
  let scalExpl: MultilingualText;
  let scalRec: MultilingualText;

  if (scalGatingApplied) {
    scalGap = {
      fr: "Feuille de route stratégique manquante (Pas de plan de croissance)",
      ar: "غياب خارطة الطريق الاستراتيجية (لا وجود لخطة نمو)"
    };
    scalExpl = scalCapIsBinding ? {
      // Gate IS the limiting factor: raw exceeded the cap.
      fr: "La capitalisation sur la scalabilité exige une documentation claire des étapes d'expansion. Score plafonné à 60 par la règle G4.",
      ar: "يتطلب الاستثمار في التوسع توثيقاً واضحاً لخطوات النمو. تم سقف درجتك بـ 60 وفق القاعدة G4."
    } : {
      // Gate is triggered but NOT the limiting factor: sub-criteria drove the score below the cap.
      fr: `La règle G4 est active (pas de plan de croissance), mais votre score brut (${rawScalScore}/100) était déjà sous le plafond de 60. La faiblesse provient directement de vos sous-critères de réplicabilité et de dépendance opérationnelle — le plafond ne contraint pas votre score dans ce cas.`,
      ar: `قاعدة الحظر G4 مفعّلة (لا خطة نمو)، لكن درجتك الخام (${rawScalScore}/100) كانت دون سقف 60 أصلاً. يعكس الانخفاض ضعف معايير قابلية التكرار والاعتماد التشغيلي مباشرةً — السقف لم يُؤثر على نتيجتك هنا.`
    };
    scalRec = {
      fr: "Rédiger un plan de croissance sur 2 ans intégrant les hypothèses d'extension de canaux d'acquisition.",
      ar: "كتابة خطة نمو لسنتين تغطي فرضيات قنوات الاستقطاب للتوسع."
    };
  } else if (dep === 'fully_manual' || dep === 'mostly_manual') {
    scalGap = {
      fr: "Forte dépendance à l'accompagnement humain manuel",
      ar: "اعتماد مفرط على المرافقة والتدخل البشري اليدوي"
    };
    scalExpl = {
      fr: "Chaque livraison de service exige un effort horaire important, ce qui engendre une structure de coûts linéaires peu scalable.",
      ar: "يتطلب كل تسليم للخدمة مجهوداً بشرياً كبيراً، مما يؤدي إلى هيكل تكاليف خطي يمنع التوسع."
    };
    scalRec = {
      fr: "Standardiser et automatiser les processus de livraison client (ex. FAQ intelligente, portail libre-service).",
      ar: "نمذجة وأتمتة عمليات تسليم الخدمة للعملاء (مثل بوابة الخدمة الذاتية)."
    };
  } else {
    scalGap = {
      fr: "Potentiel d'expansion internationale non structuré",
      ar: "فرص التوسع الدولي غير مهيكلة بعد"
    };
    scalExpl = {
      fr: "Votre architecture est scalable, mais l'exécution vers d'autres marchés reste floue ou manque de compétences dédiées.",
      ar: "بنيتك قابلة للتوسع، لكن آليات غزو الأسواق الأخرى تظل غير واضحة وتفتقر للكفاءات المخصصة."
    };
    scalRec = {
      fr: "Nouer des relations territoriales de distribution ou intégrer un profil international de Business Dev.",
      ar: "بناء علاقات توزيع إقليمية أو ضم ملف مهني دولي لتطوير الأعمال."
    };
  }

  // ------------------------------------------------------------------------
  // 5. DIMENSION: GREEN SCORE (Weight: 15%)
  // Sub-criteria: Climat/Air (30%), Eau (25%), Sols/Biodiv (20%), Ressources/Déchets (25%)
  // ------------------------------------------------------------------------
  
  const hasImpact = isYes(s.has_env_impact);
  const practices = s.env_practices || [];

  let climatSub = 0;
  let eauSub = 0;
  let solsSub = 0;
  let dechetsSub = 0;

  if (hasImpact) {
    if (practices.includes('carbon_reduction')) climatSub += 50;
    if (practices.includes('ghg_monitoring')) climatSub += 50;
    if (practices.includes('renewable_energy')) climatSub += 20;
    climatSub = Math.min(100, climatSub);

    if (practices.includes('water_efficiency')) eauSub += 50;
    if (practices.includes('water_recycling')) eauSub += 50;
    if (isYes(s.agri_water_efficiency)) eauSub += 30;
    eauSub = Math.min(100, eauSub);

    if (practices.includes('land_preservation')) solsSub += 50;
    if (practices.includes('biodiversity')) solsSub += 50;
    if (isYes(s.agri_land_use)) solsSub += 20;
    solsSub = Math.min(100, solsSub);

    if (practices.includes('waste_reduction')) dechetsSub += 50;
    if (practices.includes('circular_economy')) dechetsSub += 50;
    dechetsSub = Math.min(100, dechetsSub);
  } else {
    // Standard baseline when they declare no direct impacts
    climatSub = 60;
    eauSub = 60;
    solsSub = 60;
    dechetsSub = 60;
  }

  const rawGreenScore = Math.round(
    climatSub * 0.30 + eauSub * 0.25 + solsSub * 0.20 + dechetsSub * 0.25
  );

  // Gating rule G5: No environmental assessment AND sector = high-impact => Green <= 40
  let greenGatingApplied = false;
  let greenCapValue: number | null = null;
  let greenGatingRule: string | null = null;
  let finalGreenScore = rawGreenScore;

  const highImpactSectors = ['manufacturing', 'energy', 'agritech', 'logistics', 'greentech'];
  const isHighImpact = profile.entrepreneur?.sector && highImpactSectors.includes(profile.entrepreneur.sector);
  const noAssessment = !isYes(s.has_env_assessment);

  if (isHighImpact && noAssessment) {
    greenGatingApplied = true;
    greenCapValue = 40;
    greenGatingRule = 'G5';
    if (finalGreenScore > 40) {
      finalGreenScore = 40;
    }
  }

  // FIX: only invoke cap-language when the gate actually truncated the score.
  const greenCapIsBinding = greenGatingApplied && rawGreenScore > 40;

  // Explainability Layer for Green Score
  let greenGap: MultilingualText;
  let greenExpl: MultilingualText;
  let greenRec: MultilingualText;

  if (greenGatingApplied) {
    greenGap = {
      fr: "Conformité d'évaluation d'impact manquante pour secteur clé",
      ar: "غياب تقييم الأثر البيئي المفترض لقطاع حيوي"
    };
    greenExpl = greenCapIsBinding ? {
      // Gate IS the limiting factor: raw exceeded the cap.
      fr: "Opérer dans la CleanTech, l'AgriTech ou l'industrie nécessite une vigilance stricte. Gating G5 appliqué : score fixé à un maximum de 40.",
      ar: "يتطلب العمل في التكنولوجيا الزراعية أو النظيفة يقظة بيئية حاسمة. تم تطبيق البند G5 وسقف درجتك بـ 40."
    } : {
      // Gate is triggered but NOT the limiting factor: sub-criteria drove the score below the cap.
      fr: `La règle G5 est active (secteur à fort impact sans évaluation environnementale), mais votre score brut (${rawGreenScore}/100) était déjà sous le plafond de 40. La faiblesse provient directement de l'absence de pratiques durables dans vos sous-critères — le plafond ne contraint pas votre score dans ce cas.`,
      ar: `قاعدة الحظر G5 مفعّلة (قطاع عالي التأثير دون تقييم بيئي)، لكن درجتك الخام (${rawGreenScore}/100) كانت دون سقف 40 أصلاً. يعكس الانخفاض غياب الممارسات المستدامة في معاييرك الفرعية مباشرةً — السقف لم يُؤثر على نتيجتك هنا.`
    };
    greenRec = {
      fr: "Faire valider votre plan par une auto-évaluation formelle d'impact écologique.",
      ar: "إجراء تقييم ذاتي رسمي للأثر البيئي والبيولوجي لمشروعك."
    };
  } else if (!hasImpact) {
    greenGap = {
      fr: "Engagement écologique neutre par défaut",
      ar: "التزام بيئي محايد افتراضياً"
    };
    greenExpl = {
      fr: "Votre profil n'affiche pas d'impact environnemental majeur, votre score reflète une conformité basique neutre.",
      ar: "لم يشخص ملفك أي أثر بيئي حاد، وتعكس درجتك استجابة تنظيمية محايدة."
    };
    greenRec = {
      fr: "Rechercher des pratiques d'éco-conception ou de compensation carbone (SDG 13).",
      ar: "اعتماد ممارسات الاقتصاد الدائري والفرز لفرص ريادية خضراء."
    };
  } else if (practices.length < 3) {
    greenGap = {
      fr: "Mise en œuvre limitée de gestes durables",
      ar: "تطبيق محدود للممارسات البيئية المستدامة"
    };
    greenExpl = {
      fr: "Vous possédez un bon niveau environnemental mais le nombre de gestes actifs reste faible devant les enjeux écologiques actuels.",
      ar: "لديك وعي بيئي جيد ولكن الممارسات المفعلة تظل غير شاملة أمام التحديات المناخية."
    };
    greenRec = {
      fr: "Intégrer le tri sélectif ou la valorisation de déchets organiques au sein de votre boucle métier.",
      ar: "تفعيل فرز النفايات أو تثمين الموارد داخل الدورة التشغيلية لعملك."
    };
  } else {
    greenGap = {
      fr: "Excellence d'impact environnemental",
      ar: "امتياز وتفوق في الأثر البيئي"
    };
    greenExpl = {
      fr: "Votre score est excellent. Votre startup démontre une conscience écologique remarquable sur l'ensemble de ses piliers.",
      ar: "درجتك ممتازة. تظهر شركتك وعياً وإسهاماً بيئياً متميزاً للغاية عبر مختلف الجوانب."
    };
    greenRec = {
      fr: "Valoriser votre bilan carbone pour accéder à des subventions régionales vertes (PNUD / UE).",
      ar: "توظيف تقريرك البيئي لطلب تمويلات ومنح خضراء ممتازة (PNUD / الاتحاد الأوروبي)."
    };
  }

  // ------------------------------------------------------------------------
  // 6. METRIC: OVERALL SCORE & CONFIDENCE
  // ------------------------------------------------------------------------
  
  // Weights: Market (25%), Commercial (20%), Innovation (20%), Scalability (20%), Green (15%)
  const overallWeightedScore = Math.round(
    finalMarketScore * 0.25 +
    finalCommScore * 0.20 +
    finalInnovScore * 0.20 +
    finalScalScore * 0.20 +
    finalGreenScore * 0.15
  );

  // Diagnosis Confidence Score (from Questionnaire Completeness 50%, Validation evidence 30%, consistency 20%)
  // Per methodology spec (Section 12): evidence = documents, interviews, revenue data.
  // BUGFIX: revenue/paying-customer data was never read here (has_survey_data was
  // substituted for it). Each of the 4 evidence signals below is worth 7.5 pts,
  // capped at the documented 30 max, so adding "revenue data" doesn't inflate the cap.
  let evidenceBonus = 0;
  if (intCount >= 5) evidenceBonus += 7.5;                 // interviews
  if (isYes(s.has_loi)) evidenceBonus += 7.5;               // documents (LOI)
  if (isYes(s.has_survey_data)) evidenceBonus += 7.5;       // documents (survey data)
  if (isYes(s.has_paying_customers) || (s.monthly_revenue_numeric ?? 0) > 0) {
    evidenceBonus += 7.5;                                   // revenue data ✅ now included
  }
  evidenceBonus = Math.min(30, evidenceBonus);

  let consistencyBonus = 20;
  // Anomaly 1: claims market launch without minimum validation.
  // BUGFIX: threshold changed from "intCount === 0" to "intCount < 5" to match
  // the G1 gating rule used everywhere else in this engine — a project with
  // 1-4 interviews is still below the validation bar and was previously
  // slipping through this consistency check undetected.
  if (isYes(s.launched_to_market) && intCount < 5) {
    consistencyBonus -= 10;
  }
  // Anomaly 2: High scalability, heavy dependency
  if (isYes(s.solution_replicable) && dep === 'fully_manual') {
    consistencyBonus -= 10;
  }
  consistencyBonus = Math.max(0, consistencyBonus);

  const confidenceScore = Math.round(
    (qCompleteness * 50) + evidenceBonus + consistencyBonus
  );

  return {
    market: {
      score: finalMarketScore,
      raw_score: rawMarketScore,
      gating_applied: marketGatingApplied,
      cap_value: marketCapValue,
      gating_rule: marketGatingRule,
      sub_scores: {
        customer_validation_evidence: marketValEvidenceSub,
        market_opportunity: marketOppSub,
        revenue_model_clarity: revClaritySub
      },
      primary_gap: marketGap,
      explanation: marketExpl,
      recommendation: marketRec
    },
    commercial: {
      score: finalCommScore,
      raw_score: rawCommScore,
      gating_applied: commGatingApplied,
      cap_value: commCapValue,
      gating_rule: commGatingRule,
      sub_scores: {
        value_proposition_clarity: valPropSub,
        product_maturity: prodMaturitySub,
        pricing_strategy_coherence: pricingSub,
        offer_customer_alignment: offerAlignSub
      },
      primary_gap: commGap,
      explanation: commExpl,
      recommendation: commRec
    },
    innovation: {
      score: finalInnovScore,
      raw_score: rawInnovScore,
      gating_applied: innovGatingApplied,
      cap_value: innovCapValue,
      gating_rule: innovGatingRule,
      sub_scores: {
        local_novelty_differentiation: noveltySub,
        technology_intensity: techIntensitySub,
        barrier_to_entry: barrierSub,
        departure_from_existing_offerings: departureSub
      },
      primary_gap: innovGap,
      explanation: innovExpl,
      recommendation: innovRec
    },
    scalability: {
      score: finalScalScore,
      raw_score: rawScalScore,
      gating_applied: scalGatingApplied,
      cap_value: scalCapValue,
      gating_rule: scalGatingRule,
      sub_scores: {
        replicability_without_linear_cost: replicabilitySub,
        manual_accompaniment_dependency: manualDepSub,
        deployment_cost_structure: deploymentSub,
        geographic_expansion_potential: geoPotentialSub
      },
      primary_gap: scalGap,
      explanation: scalExpl,
      recommendation: scalRec
    },
    green: {
      score: finalGreenScore,
      raw_score: rawGreenScore,
      gating_applied: greenGatingApplied,
      cap_value: greenCapValue,
      gating_rule: greenGatingRule,
      sub_scores: {
        climat_air: climatSub,
        eau: eauSub,
        sols_biodiversite: solsSub,
        ressources_dechets: dechetsSub
      },
      primary_gap: greenGap,
      explanation: greenExpl,
      recommendation: greenRec
    },
    overall: {
      score: overallWeightedScore,
      diagnosis_confidence: confidenceScore,
      computed_at: new Date().toISOString()
    }
  };
}
