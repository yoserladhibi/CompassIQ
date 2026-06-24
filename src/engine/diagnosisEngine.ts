/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectProfile, Stage, StageRequirement, Blocker, PerceptionGap } from '../types';
import rulesData from '../data/maturity_rules.json';

const stages: Stage[] = rulesData.stages as unknown as Stage[];
const gapMessages = rulesData.gap_detection_messages;

// Helper to get nested value from profile path (e.g., "startup.problem_defined")
export function getProfileValue(profile: ProjectProfile, path: string): any {
  const parts = path.split('.');
  let current: any = profile;
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }
  return current;
}

// Map logical yes/no answers to boolean or use raw value
export function normalizeValue(val: any): any {
  if (val === 'yes' || val === 'Oui' || val === true) return true;
  if (val === 'no' || val === 'Non' || val === false) return false;
  return val;
}

// Evaluate requirement
export function evaluateRequirement(profile: ProjectProfile, req: StageRequirement): boolean {
  const rawVal = getProfileValue(profile, req.field);
  const left = normalizeValue(rawVal);
  const op = req.operator;
  // Make sure we compare normalized values
  const right = normalizeValue(req.value);

  let mainResult = false;

  switch (op) {
    case 'eq':
      mainResult = left === right;
      break;
    case 'neq':
      mainResult = left !== right;
      break;
    case 'gte':
      mainResult = left !== null && left !== undefined && Number(left) >= Number(right);
      break;
    case 'lte':
      mainResult = left !== null && left !== undefined && Number(left) <= Number(right);
      break;
    case 'gt':
      mainResult = left !== null && left !== undefined && Number(left) > Number(right);
      break;
    case 'lt':
      mainResult = left !== null && left !== undefined && Number(left) < Number(right);
      break;
    case 'in':
      if (Array.isArray(right)) {
        mainResult = right.includes(left);
      } else {
        mainResult = left === right;
      }
      break;
    case 'not_in':
      if (Array.isArray(right)) {
        mainResult = !right.includes(left);
      } else {
        mainResult = left !== right;
      }
      break;
    case 'is_null':
      mainResult = left === null || left === undefined;
      break;
    case 'is_not_null':
      mainResult = left !== null && left !== undefined;
      break;
    case 'contains':
      if (typeof left === 'string') {
        mainResult = left.includes(right);
      } else if (Array.isArray(left)) {
        mainResult = left.includes(right);
      }
      break;
    default:
      mainResult = false;
  }

  // Handle nested logical 'and' clause if present in the requirement
  if (req.and) {
    const andResult = evaluateRequirement(profile, {
      field: req.and.field,
      operator: req.and.operator as any,
      value: req.and.value,
      label: req.label // reuse same label
    });
    return mainResult && andResult;
  }

  return mainResult;
}

/**
 * Maturity Stage Classifier Engine (Feature 1)
 * Evaluates stages from S6 down to S1.
 * Returns classification trace and stage assignment.
 */
export function classifyMaturity(profile: ProjectProfile): {
  stageId: string;
  stageName: { fr: string; ar: string };
  stageLabel: { fr: string; ar: string };
  evidence: Array<{ criteria: { fr: string; ar: string }; status: boolean; is_hard: boolean }>;
  explanation: { fr: string; ar: string };
  priorityActions: { fr: string[]; ar: string[] };
} {
  // We evaluate S6 first down to S1
  const sortedStages = [...stages].sort((a, b) => b.id.localeCompare(a.id));

  for (const stage of sortedStages) {
    const evidence: Array<{ criteria: { fr: string; ar: string }; status: boolean; is_hard: boolean }> = [];
    
    // 1. Evaluate hard requirements
    let hardPassed = true;
    for (const req of stage.hard_requirements) {
      const passed = evaluateRequirement(profile, req);
      evidence.push({
        criteria: req.label,
        status: passed,
        is_hard: true
      });
      if (!passed) {
        hardPassed = false;
      }
    }

    // 2. Evaluate soft requirements
    let softCount = 0;
    for (const req of stage.soft_requirements) {
      const passed = evaluateRequirement(profile, req);
      evidence.push({
        criteria: req.label,
        status: passed,
        is_hard: false
      });
      if (passed) {
        softCount++;
      }
    }

    const softPassed = softCount >= stage.min_soft_met;

    // 3. Evaluate blocker conditions
    let blockerTriggered = false;
    for (const req of stage.blocker_conditions) {
      const triggered = evaluateRequirement(profile, req);
      if (triggered) {
        blockerTriggered = true;
        break;
      }
    }

    // If all requirements are met and no blockers are triggered, or if it's S1 (the fallback Stage)
    if ((hardPassed && softPassed && !blockerTriggered) || stage.is_fallback) {
      return {
        stageId: stage.id,
        stageName: stage.name,
        stageLabel: stage.label,
        evidence: evidence,
        explanation: stage.explanation,
        priorityActions: stage.priority_actions
      };
    }
  }

  // Fallback to S1 (Idéation)
  const fallbackStage = stages.find(s => s.id === 'S1') || stages[0];
  return {
    stageId: fallbackStage.id,
    stageName: fallbackStage.name,
    stageLabel: fallbackStage.label,
    evidence: [],
    explanation: fallbackStage.explanation,
    priorityActions: fallbackStage.priority_actions
  };
}

/**
 * Handles perception gap detection between self-assessment and computed stage.
 */
export function detectPerceptionGap(
  selfAssessedIdValue: string | null,
  actualStageId: string
): PerceptionGap {
  if (!selfAssessedIdValue) {
    return {
      detected: false,
      self_assessed_stage: null,
      actual_stage: actualStageId,
      gap_direction: null,
      gap_explanation: null
    };
  }

  // Map self-assessed string code to S1-S6 index-equivalent for comparison
  const stageMap: Record<string, string> = {
    'idea': 'S1',
    'validation': 'S2',
    'structuration': 'S3',
    'fundraising': 'S4',
    'launch': 'S5',
    'growth': 'S6',
    'S1': 'S1',
    'S2': 'S2',
    'S3': 'S3',
    'S4': 'S4',
    'S5': 'S5',
    'S6': 'S6'
  };

  const selfStageId = stageMap[selfAssessedIdValue] || 'S1';
  const selfIndex = parseInt(selfStageId.replace('S', ''), 10);
  const actualIndex = parseInt(actualStageId.replace('S', ''), 10);

  const selfNameMap: Record<string, { fr: string; ar: string }> = {
    'S1': { fr: 'Idéation', ar: 'الفكرة' },
    'S2': { fr: 'Validation Marché', ar: 'التحقق من السوق' },
    'S3': { fr: 'Structuration', ar: 'الهيكلة' },
    'S4': { fr: 'Levée de Fonds', ar: 'جمع التمويل' },
    'S5': { fr: 'Lancement', ar: 'الإطلاق' },
    'S6': { fr: 'Croissance', ar: 'النمو' }
  };

  const actualName = selfNameMap[actualStageId] || { fr: actualStageId, ar: actualStageId };
  const selfName = selfNameMap[selfStageId] || { fr: selfStageId, ar: selfStageId };

  let direction: 'overestimation' | 'underestimation' | 'aligned' = 'aligned';
  let frMsg = '';
  let arMsg = '';

  if (selfIndex > actualIndex) {
    direction = 'overestimation';
    frMsg = gapMessages.overestimation.fr
      .replace('{self_assessed}', selfName.fr)
      .replace('{actual}', actualName.fr);
    arMsg = gapMessages.overestimation.ar
      .replace('{self_assessed}', selfName.ar)
      .replace('{actual}', actualName.ar);
  } else if (selfIndex < actualIndex) {
    direction = 'underestimation';
    frMsg = gapMessages.underestimation.fr
      .replace('{self_assessed}', selfName.fr)
      .replace('{actual}', actualName.fr);
    arMsg = gapMessages.underestimation.ar
      .replace('{self_assessed}', selfName.ar)
      .replace('{actual}', actualName.ar);
  } else {
    direction = 'aligned';
    frMsg = gapMessages.aligned.fr;
    arMsg = gapMessages.aligned.ar;
  }

  return {
    detected: direction !== 'aligned',
    self_assessed_stage: selfStageId,
    actual_stage: actualStageId,
    gap_direction: direction,
    gap_explanation: {
      fr: frMsg,
      ar: arMsg
    }
  };
}

/**
 * Blocker Identification & Ranking Engine (Feature 1)
 */
export function identifyBlockers(profile: ProjectProfile): Blocker[] {
  const blockers: Blocker[] = [];
  const s = profile.startup;

  // Domain Blockers mapping
  // 1. Legal Form blocker
  if (s.legal_form === 'not_registered' && (s.launched_to_market || s.has_paying_customers)) {
    blockers.push({
      id: 'B_LEGAL_01',
      dimension: 'legal',
      severity: 'high',
      title: {
        fr: "Structure juridique manquante pour le lancement commercial",
        ar: "غياب الهيكل القانوني للإطلاق التجاري"
      },
      description: {
        fr: "Votre produit est lancé ou génère des revenus, mais la startup n'est pas encore enregistrée moralement. Cela pose un risque réglementaire critique et vous empêche de postuler au label Startup Act ou de lever des fonds auprès de BFPME / BTS.",
        ar: "تم إطلاق منتجك أو توليد إيرادات، لكن الشركة غير مسجلة قانونياً حتى الآن. يمثل هذا مخاطرة تنظيمية حاسمة ويمنعك من التقدم للحصول على علامة قانون الشركات الناشئة أو جمع التمويل من BFPME / BTS."
      },
      action: {
        fr: "Entamez immédiatement l'enregistrement de votre entreprise (SARL/SUARL) auprès de l'APII et du Registre National des Entreprises (RNE).",
        ar: "ابدأ على الفور بتسجيل شركتك (SARL/SUARL) لدى APII والسجل الوطني للمؤسسات (RNE)."
      }
    });
  }

  // 2. Customer validation evidence gap
  if (normalizeValue(s.customer_interviews_conducted) && (s.customer_interviews_count || 0) < 5) {
    blockers.push({
      id: 'B_MARKET_01',
      dimension: 'market',
      severity: 'high',
      title: {
        fr: "Validation client insuffisante",
        ar: "تحقق غير كافٍ من العملاء"
      },
      description: {
        fr: "Vous avez mené moins de 5 entretiens clients significatifs. Sans un volume représentatif de contacts directs, vous risquez de construire une solution hors-sujet par rapport aux réels besoins terrain.",
        ar: "لقد أجريت أقل من 5 مقابلات عملاء مهمة. بدون حجم ممثل من الاتصالات المباشرة، هناك خطر بناء حل غير متوافق مع الاحتياجات الميدانية الحقيقية."
      },
      action: {
        fr: "Réalisez au moins 10 entretiens qualitatifs supplémentaires de découverte auprès de votre cible.",
        ar: "قم بإجراء ما لا يقل عن 10 مقابلات اكتشاف نوعية إضافية مع فئتك المستهدفة."
      }
    });
  }

  // 3. Technical competency gap
  if (!s.team_skills.includes('tech') && (s.technology_intensity === 'intermediate' || s.technology_intensity === 'advanced')) {
    blockers.push({
      id: 'B_TEAM_01',
      dimension: 'team',
      severity: 'high',
      title: {
        fr: "Manque d'expertise technique interne pour projet Deep/Intermediate Tech",
        ar: "غياب الخبرة التقنية الداخلية لمشروع تكنولوجي متوسط أو عميق"
      },
      description: {
        fr: "Votre intensité technologique est qualifiée de moyenne/avancée, mais votre équipe ne comprend aucun profil technique ou développeur interne. L'externalisation totale présente des risques majeurs d'exécution.",
        ar: "كثافة التكنولوجيا المتطلبة لمشروعك متوسطة أو متقدمة، لكن فريقك لا يضم أي شريك تقني أو مطور داخلي. الاعتماد الكامل على طرف خارجي يمثل خطورة كبرى على التنفيذ."
      },
      action: {
        fr: "Recrutez un associé ou directeur technique (CTO) ou nouez un partenariat fort avec un expert en ingénierie informatique.",
        ar: "قم بتوظيف شريك مؤسس تقني أو مدير تقني (CTO) أو قم ببناء شراكة قوية مع خبير في هندسة البرمجيات."
      }
    });
  }

  // 4. Financial Projection Blocker for Fundraising S4
  if (s.has_business_model && !s.has_financial_projection) {
    blockers.push({
      id: 'B_FIN_01',
      dimension: 'commercial',
      severity: 'medium',
      title: {
        fr: "Absence de projections financières sur 12-24 mois",
        "ar": "غياب التوقعات المالية لـ 12-24 شهراً مقبلة"
      },
      description: {
        fr: "Vous visez un modèle structuré mais vous ne disposez d'aucune projection de trésorerie ou de revenus à moyen terme. C'est un obstacle incontournable pour obtenir un prêt auprès de la BTS/BFPME ou mobiliser un investisseur providentiel.",
        "ar": "أنت تسعى لبناء نموذج مهيكل ولكنك لا تملك توقعات للسيولة المالية أو الإيرادات على المدى المتوسط. هذا يمثل عائقاً حتمياً للحصول على قرض من BTS/BFPME أو جذب مستثمر ملائكي."
      },
      action: {
        fr: "Construisez un tableau financier prévisionnel simple comptabilisant vos coûts fixes, variables, et hypothèses de vente.",
        "ar": "قم ببناء جدول مالي تقديري بسيط يوضح تكاليفك الثابتة والمتغيرة وافتراضات المبيعات."
      }
    });
  }

  // 5. Environmental evaluation missing for high impact sectors
  const highImpactSectors = ['manufacturing', 'energy', 'agritech', 'logistics', 'greentech'];
  if (profile.entrepreneur.sector && highImpactSectors.includes(profile.entrepreneur.sector) && !s.has_env_assessment) {
    blockers.push({
      id: 'B_GREEN_01',
      dimension: 'green',
      severity: 'medium',
      title: {
        fr: "Examen de conformité environnementale absent pour secteur à fort impact",
        "ar": "غياب تقييم الأثر البيئي لقطاع عالي التأثير"
      },
      description: {
        fr: "Votre startup opère dans un secteur à engagement environnemental élevé (par exemple AgriTech, Énergie, Industrie) mais n'a initié aucune évaluation écologique formelle. Cela risque de bloquer des subventions PNUD ou devancer les exigences du ANPE.",
        "ar": "تعمل شركتك في قطاع ذي وزن بيئي كبير (مثل التكنولوجيا الزراعية، الطاقة، الصناعة) ولكنك لم تبدأ أي تقييم بيئي رسمي مما قد يعيق منح PNUD أو يخالف معايير ANPE."
      },
      action: {
        fr: "Documentez sommairement vos impacts et planifiez une réflexion d'éco-conception ou contactez un consultant en impact vert.",
        "ar": "قم بتوثيق تأثيراتك الحالية وخطط لإدماج التصميم الإيكولوجي في حلك ou تواصل مع مستشار في التأثير الأخضر."
      }
    });
  }

  // Rank high severity blockers first
  return blockers.sort((a, b) => {
    if (a.severity === 'high' && b.severity !== 'high') return -1;
    if (a.severity !== 'high' && b.severity === 'high') return 1;
    return 0;
  });
}
