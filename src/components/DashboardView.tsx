/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language, ProjectProfile, DimensionScore, Blocker } from '../types';
import { getTranslation } from '../localization';
import scoreExplanations from '../data/score_explanations.json';
import { 
  ShieldAlert, 
  HelpCircle, 
  AlertTriangle, 
  Leaf, 
  Search, 
  ChevronUp, 
  Activity, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  Compass,
  Award,
  TrendingUp,
  MapPin,
  Calendar,
  Check,
  ChevronDown
} from 'lucide-react';

const subScoreTranslations: Record<string, { fr: string; ar: string }> = {
  // Market
  customer_validation_evidence: {
    fr: "Preuve de validation client",
    ar: "أدلة التحقق من العملاء"
  },
  market_opportunity: {
    fr: "Opportunité de marché",
    ar: "فرصة السوق"
  },
  revenue_model_clarity: {
    fr: "Clarté du modèle de revenus",
    ar: "وضوح نموذج الإيرادات"
  },

  // Commercial
  value_proposition_clarity: {
    fr: "Clarté de la proposition de valeur",
    ar: "وضوح قيمة العرض"
  },
  product_maturity: {
    fr: "Maturité du produit (MVP)",
    ar: "نضج المنتج المتوفر"
  },
  pricing_strategy_coherence: {
    fr: "Cohérence de la stratégie tarifaire",
    ar: "تناسق استراتيجية التسعير"
  },
  offer_customer_alignment: {
    fr: "Alignement offre-client",
    ar: "ملاءمة العرض مع العميل"
  },

  // Innovation
  local_novelty_differentiation: {
    fr: "Nouveauté locale & Différenciation",
    ar: "الجدة والتميز محلياً"
  },
  technology_intensity: {
    fr: "Intensité technologique",
    ar: "الكثافة التكنولوجية"
  },
  barrier_to_entry: {
    fr: "Barrières à l'entrée",
    ar: "حواجز الدخول للسوق"
  },
  departure_from_existing_offerings: {
    fr: "Rupture avec les offres existantes",
    ar: "درجة الاختلاف عن العروض المتاحة"
  },

  // Scalability
  replicability_without_linear_cost: {
    fr: "Réplicabilité sans coûts linéaires",
    ar: "قابلية الاستنساخ دون تكلفة خطية"
  },
  manual_accompaniment_dependency: {
    fr: "Dépendance à l'accompagnement manuel",
    ar: "الاعتماد على المرافقة الفردية واليدوية"
  },
  deployment_cost_structure: {
    fr: "Structure des coûts de déploiement",
    ar: "هيكل تكاليف النشر والتوزيع"
  },
  geographic_expansion_potential: {
    fr: "Potentiel d'expansion géographique",
    ar: "إمكانيات التوسع الجغرافي"
  },

  // Green
  climat_air: {
    fr: "Impact Climat & Air",
    ar: "الأثر المترتب على المناخ والهواء"
  },
  eau: {
    fr: "Préservation de l'Eau",
    ar: "المحافظة على الموارد المائية"
  },
  sols_biodiversite: {
    fr: "Sols & Biodiversité",
    ar: "التربة والتنوع البيولوجي"
  },
  ressources_dechets: {
    fr: "Ressources & Gestion des déchets",
    ar: "إدارة الموارد والفضلات"
  }
};

const subScoreWeights: Record<string, number> = {
  customer_validation_evidence: 35,
  market_opportunity: 35,
  revenue_model_clarity: 30,

  value_proposition_clarity: 25,
  product_maturity: 30,
  pricing_strategy_coherence: 20,
  offer_customer_alignment: 25,

  local_novelty_differentiation: 30,
  technology_intensity: 30,
  barrier_to_entry: 20,
  departure_from_existing_offerings: 20,

  replicability_without_linear_cost: 30,
  manual_accompaniment_dependency: 15,
  deployment_cost_structure: 25,
  geographic_expansion_potential: 30,

  climat_air: 25,
  eau: 25,
  sols_biodiversite: 25,
  ressources_dechets: 25,
};

const subScorePlainDict: Record<string, { fr: string; ar: string }> = {
  customer_validation_evidence: {
    fr: "Avez-vous vraiment parlé à des clients potentiels pour confirmer qu'ils veulent ce produit ?",
    ar: "هل تحدثت فعلاً مع عملاء محتملين للتأكد من أنهم يريدون هذا المنتج؟"
  },
  market_opportunity: {
    fr: "Quelle est la taille du marché que vous visez, et combien de concurrents s'y trouvent déjà ?",
    ar: "ما هو حجم السوق الذي تستهدفه، وكم عدد المنافسين الموجودين فيه؟"
  },
  revenue_model_clarity: {
    fr: "Avez-vous une façon claire et réaliste de gagner de l'argent avec ce projet ?",
    ar: "هل لديك طريقة واضحة وواقعية لتحقيق الربح من هذا المشروع؟"
  },
  value_proposition_clarity: {
    fr: "Pouvez-vous expliquer en une phrase pourquoi quelqu'un vous choisirait plutôt qu'un concurrent ?",
    ar: "هل يمكنك أن تشرح في جملة واحدة لماذا سيختارك أحدهم بدل المنافسين؟"
  },
  product_maturity: {
    fr: "Votre produit est-il juste une idée, un prototype, ou quelque chose que les gens peuvent déjà acheter ?",
    ar: "هل منتجك مجرد فكرة، أم نموذج أولي، أم شيء يمكن للناس شراؤه فعلاً الآن؟"
  },
  pricing_strategy_coherence: {
    fr: "Votre prix couvre-t-il vos coûts et correspond-il à ce que les clients sont prêts à payer ?",
    ar: "هل يغطي سعرك تكاليفك ويتناسب مع ما يرغب العملاء في دفعه؟"
  },
  offer_customer_alignment: {
    fr: "Ce que vous proposez répond-il vraiment au problème que vos clients disent avoir ?",
    ar: "هل ما تقدمه يحل فعلاً المشكلة التي يقول عملاؤك أنهم يواجهونها؟"
  },
  local_novelty_differentiation: {
    fr: "Est-ce vraiment nouveau en Tunisie, ou quelque chose de similaire existe-t-il déjà ?",
    ar: "هل هذا جديد بالفعل في تونس، أم أن شيئاً مشابهاً موجود من قبل؟"
  },
  technology_intensity: {
    fr: "Y a-t-il une vraie technologie derrière ce projet, ou est-ce surtout un site/une appli simple ?",
    ar: "هل هناك تقنية حقيقية وراء هذا المشروع، أم أنه مجرد موقع أو تطبيق بسيط؟"
  },
  barrier_to_entry: {
    fr: "Serait-il facile pour quelqu'un d'autre de vous copier le mois prochain ?",
    ar: "هل سيكون من السهل على شخص آخر تقليدك الشهر المقبل؟"
  },
  departure_from_existing_offerings: {
    fr: "À quel point votre approche est-elle différente de ce qui existe déjà sur le marché ?",
    ar: "إلى أي مدى يختلف أسلوبك عن ما هو موجود حالياً في السوق؟"
  },
  replicability_without_linear_cost: {
    fr: "Si vous aviez 10 fois plus de clients demain, vos coûts seraient-ils aussi multipliés par 10 ?",
    ar: "إذا حصلت على 10 أضعاف العملاء غداً، هل ستتضاعف تكاليفك بنفس النسبة؟"
  },
  manual_accompaniment_dependency: {
    fr: "Le projet fonctionne-t-il plutôt seul, ou avez-vous besoin d'être impliqué dans chaque transaction ?",
    ar: "هل يعمل المشروع من تلقاء نفسه، أم أنك تحتاج للتدخل في كل عملية؟"
  },
  deployment_cost_structure: {
    fr: "Est-ce coûteux de s'installer dans une nouvelle ville ou un nouveau pays, ou c'est facile à étendre ?",
    ar: "هل التوسع إلى مدينة أو بلد جديد مكلف، أم يمكن القيام به بسهولة؟"
  },
  geographic_expansion_potential: {
    fr: "Ce projet pourrait-il vraiment grandir au-delà de votre région actuelle ?",
    ar: "هل يمكن لهذا المشروع أن ينمو فعلاً خارج منطقتك الحالية؟"
  },
  climat_air: {
    fr: "Votre activité produit-elle beaucoup d'émissions, et faites-vous quelque chose pour les réduire ?",
    ar: "هل ينتج نشاطك انبعاثات كثيرة، وهل تقوم بشيء لتقليلها؟"
  },
  eau: {
    fr: "Utilisez-vous beaucoup d'eau, et la réutilisez-vous ou l'économisez-vous ?",
    ar: "هل تستهلك كمية كبيرة من الماء، وهل تعيد استخدامه أو توفّره؟"
  },
  sols_biodiversite: {
    fr: "Votre activité affecte-t-elle les terres, le sol, ou les écosystèmes locaux ?",
    ar: "هل يؤثر نشاطك على الأرض أو التربة أو النظم البيئية المحلية؟"
  },
  ressources_dechets: {
    fr: "Gaspillez-vous beaucoup de matériaux, ou les réutilisez-vous / recyclez-vous ?",
    ar: "هل تهدر الكثير من المواد، أم تعيد استخدامها أو تدويرها؟"
  }
};

const benchmarks: Record<string, Record<string, number>> = {
  S1: { market: 30, commercial: 20, innovation: 40, scalability: 15, green: 25 },
  S2: { market: 45, commercial: 35, innovation: 45, scalability: 25, green: 30 },
  S3: { market: 55, commercial: 50, innovation: 55, scalability: 35, green: 40 },
  S4: { market: 70, commercial: 65, innovation: 65, scalability: 50, green: 45 },
  S5: { market: 75, commercial: 75, innovation: 70, scalability: 60, green: 50 },
  S6: { market: 85, commercial: 85, innovation: 80, scalability: 75, green: 60 },
};

const getLevelInfo = (score: number, lang: 'fr' | 'ar') => {
  if (score >= 75) {
    return {
      level: lang === 'fr' ? 'Élevé' : 'قوي',
      icon: '✓',
      colorClass: 'text-emerald-700 bg-emerald-50/55 border-emerald-200'
    };
  }
  if (score >= 40) {
    return {
      level: lang === 'fr' ? 'Moyen' : 'متوسط',
      icon: '⚠️',
      colorClass: 'text-amber-700 bg-amber-50/55 border-amber-200'
    };
  }
  return {
    level: lang === 'fr' ? 'Faible' : 'ضعيف',
    icon: '🚨',
    colorClass: 'text-red-750 bg-red-50/55 border-red-200'
  };
};

const getBusinessImpactStatement = (dim: string, score: number, lang: 'fr' | 'ar') => {
  const statements: Record<string, { low: { fr: string, ar: string }, medium: { fr: string, ar: string }, high: { fr: string, ar: string } }> = {
    market: {
      low: {
        fr: "Le manque d'entretiens qualitatifs et de retours réels fragilise la clarté de votre positionnement marché.",
        ar: "يؤدي نقص المقابلات المنظمة والبيانات الملموسة إلى إضعاف دقة فهمك لاحتياجات السوق الحقيقية."
      },
      medium: {
        fr: "Vos bases d'interactions clients sont intéressantes mais doivent être formalisées pour soutenir votre expansion.",
        ar: "تواصلك مع العملاء جيد ولكن يحتاج لهيكلة ومتابعة منتظمة لضمان التوسع بنجاح."
      },
      high: {
        fr: "Votre parfaite maîtrise du besoin client valide solidement l'orientation stratégique de votre solution.",
        ar: "فهمك العميق والمنظم لاحتياجات العملاء يمنح مشروعك ميزة تنافسية قوية وواضحة."
      }
    },
    commercial: {
      low: {
        fr: "L'absence de validation d'un premier MVP payant ou d'une offre claire limite votre viabilité financière.",
        ar: "عدم إطلاق نموذج أولي قابل للدفع أو غياب استراتيجية تسعير واضحة يهدد الاستقرار المالي للمشروع."
      },
      medium: {
        fr: "Votre modèle de revenus et MVP sont définis mais la traction commerciale demande une consolidation commerciale.",
        ar: "تم تحديد نموذج الإيرادات والنموذج الأولي، غير أن تحقيق مبيعات متكررة يتطلب جهداً تجارياً إضافياً."
      },
      high: {
        fr: "Votre proposition de valeur génère une traction commerciale avérée et un modèle économique viable.",
        ar: "حقق نموذجك التجاري تفاعلاً وطلباً ملموساً في السوق يثبت ربحية مشروعك."
      }
    },
    innovation: {
      low: {
        fr: "Votre projet manque de différenciation technique ou d'actifs défendables face aux concurrents.",
        ar: "يفتقر مشروعك لمميزات ابتكارية فريدة أو آليات حماية تحميه من المنافسة السريعة."
      },
      medium: {
        fr: "Vous possédez un élément novateur mais les barrières à l'entrée doivent être renforcées pour durer.",
        ar: "لديك ميزة ابتكارية جيدة، ولكن يجب تعزيز حقوق الملكية أو التكنولوجيا لصد المنافسين."
      },
      high: {
        fr: "Votre technologie ou savoir-faire unique crée un fossé défensif majeur sur votre secteur.",
        ar: "تمنحك التكنولوجيا أو الأصول الفريدة خط دفاع قوي وحماية تنافسية ممتازة في السوق."
      }
    },
    scalability: {
      low: {
        fr: "La structure actuelle de coûts dépend encore trop fortement d'une intervention humaine linéaire.",
        ar: "تعتمد بنية التكاليف الحالية بشكل طردي مكثف على المجهود البشري مما يعوق التكرار بسهولة."
      },
      medium: {
        fr: "Le potentiel de réplication existe mais requiert un plan d'expansion géographique mieux formalisé.",
        ar: "إمكانية تكرار الخدمة متوفرة لكنها تتطلب توثيقاً دقيقاً ومحكماً لخطط التوسع الإقليمي."
      },
      high: {
        fr: "Votre modèle opérationnel permet une croissance exponentielle sans coûts de structure linéaires.",
        ar: "تسمح بنيتك التشغيلية بنمو العوائد بشكل مضاعf دون زيادة خطية موازية في التكاليف."
      }
    },
    green: {
      low: {
        fr: "Aucune intégration de pratiques d'économie circulaire ou de responsabilité écologique n'est documentée.",
        ar: "لم يتم توثيق أي ممارسات تدوير أو كفاءة بيئية مما قد يحد من فرص التمويل المسؤول."
      },
      medium: {
        fr: "Certaines initiatives écologiques sont amorcées mais manquent d'indicateurs de suivi structurés.",
        ar: "تم إطلاق بعض المبادرات البيئية الجيدة ولكنها تفتقر لمؤشرات قياس واضحة ومستدامة."
      },
      high: {
        fr: "Vos engagements RSE et écologiques sont au cœur de l'architecture de votre startup.",
        ar: "تعد المسؤولية البيئية والاجتماعية في صميم البنية التحتية والتشغيلية لمشروعك الريادي."
      }
    }
  };

  const level = score >= 75 ? 'high' : score >= 40 ? 'medium' : 'low';
  return statements[dim]?.[level]?.[lang] || "";
};

const getHelperConcreteStrength = (sKey: string, lang: 'fr' | 'ar') => {
  const dict: Record<string, { fr: string, ar: string }> = {
    customer_validation_evidence: {
      fr: "Confirmation directe et solide du besoin par des entretiens clients réels.",
      ar: "تأكيد مباشر وقوي للحاجة للمنتج من خلال مقابلات عملاء حقيقية."
    },
    market_opportunity: {
      fr: "Opportunité de marché claire avec un volume de cible qualifié et identifié.",
      ar: "فرصة سوقية واضحة المعالم مع تحديد دقيق لحجم الشريحة المستهدفة."
    },
    revenue_model_clarity: {
      fr: "Modèle de revenus clair, structuré et réaliste pour capter la valeur.",
      ar: "نموذج إيرادات واضح وهيكل مرن وقابل للتطبيق لتحقيق عوائد مجزية."
    },
    value_proposition_clarity: {
      fr: "Proposition de valeur limpide distinguant immédiatement votre offre.",
      ar: "أطروحة قيمة واضحة ومميزة تبرز تمايزك عن منافسيك فورا."
    },
    product_maturity: {
      fr: "Avancement technique et matériel permettant un test d'usage immédiat (MVP).",
      ar: "تقدم فني وملموس للمنتج يتيح اختبار الاستخدام الفوري والتشغيل."
    },
    pricing_strategy_coherence: {
      fr: "Stratégie tarifaire cohérente, validée vis-à-vis des coûts et de l'acceptibilité.",
      ar: "استراتيجية تسعير متزنة ومدروسة تتوافق مع التكلفة وتوقعات العميل."
    },
    offer_customer_alignment: {
      fr: "Alignement optimal de l'offre résolvant précisément le point de douleur client.",
      ar: "تطابق غني ومثالي يحل المشكلة الأساسية التي يعاني منها العميل بدقة."
    },
    local_novelty_differentiation: {
      fr: "Nouveauté marquée apportant une alternative fraîche sur le marché tunisien.",
      ar: "حداثة وتمايز حقيقي يقدم بديلاً جديداً كلياً في السوق التونسية."
    },
    technology_intensity: {
      fr: "Intensité technologique robuste garantissant une plus-value produit soutenue.",
      ar: "كثافة تقنية وحضور تكنولوجي يدعم جودة وتميز المنتج بصفة مستدامة."
    },
    barrier_to_entry: {
      fr: "Barrières à l'entrée solides protégeant durablement votre concept.",
      ar: "حواجز دخول قوية تحمي فكرتك ومجهودك ضد النسخ السريع."
    },
    departure_from_existing_offerings: {
      fr: "Rupture forte avec les solutions traditionnelles existantes.",
      ar: "انقطاع وتمايز تام عن الحلول الكلاسيكية المطروحة تجارياً."
    },
    replicability_without_linear_cost: {
      fr: "Excellente réplicabilité sans dépendance de coûts opérationnels linéaires.",
      ar: "قابلية تكرار فائقة ومتميزة دون حدوث تضخم مالي خطي للتكاليف."
    },
    manual_accompaniment_dependency: {
      fr: "Automatisation ou indépendance forte vis-à-vis d'interventions manuelles critiques.",
      ar: "أتمتة ذكية واستقلالية تامة للعمليات بعيداً عن التدخلات البشرية المعقدة."
    },
    deployment_cost_structure: {
      fr: "Coûts de déploiement ultra-légers favorisant un essaimage géographique agile.",
      ar: "تكاليف انتشار خفيفة للغاية تساعد على التوسع الجغرافي السريع المرن."
    },
    geographic_expansion_potential: {
      fr: "Fort potentiel d'extension évident à l'échelle nationale ou internationale.",
      ar: "إمكانات واضحة للتوسع الجغرافي السلس وطنياً ودولياً."
    },
    climat_air: {
      fr: "Pratiques claires pour limiter l'impact sur l'air et l'empreinte carbone.",
      ar: "ممارسات إيجابية وموثقة للحد من الانبعاثات والأثر الكربوني."
    },
    eau: {
      fr: "Gestion de l'eau responsable s'inscrivant dans une démarche d'économie.",
      ar: "ترشيد ممتاز للمياه والتزام فعلي بتبني تقنيات التوفير المستدام."
    },
    sols_biodiversite: {
      fr: "Préservation active des écosystèmes locaux et respect de la biodiversité.",
      ar: "مراعاة صحيحة وجلية للتربة والتنوع البيولوجي في محيط النشاط."
    },
    ressources_dechets: {
      fr: "Pratiques écoresponsables d'économie circulaire et de traitement des déchets.",
      ar: "سياسة بيئية مثالية لإعادة التدوير والحد من النفايات التشغيلية."
    }
  };
  return dict[sKey]?.[lang] || sKey.replace(/_/g, ' ');
};

const getGatingBusinessExplanation = (ruleKey: string | null, dimKey: string, lang: 'fr' | 'ar') => {
  const explanations: Record<string, { title: { fr: string, ar: string }, body: { fr: string, ar: string }, action: { fr: string, ar: string } }> = {
    G1: {
      title: {
        fr: "Votre score est temporairement limité car les entretiens clients qualitatifs sont insuffisants.",
        ar: "تم تحديد رصيد النقاط مؤقتاً لعدم استكمال الحد الأدنى من المقابلات الميدانية مع العملاء."
      },
      body: {
        fr: "Même si vos estimations de marché sont optimistes, CompassIQ considère qu'un projet ne peut asseoir sa crédibilité sans recueillir l'avis direct de clients réels tunisiens (au moins 5 entretiens menés).",
        ar: "رغم تطلعاتك الواعدة في السوق، فإن إثبات جدية فكرتك يتطلب الاستماع المباشر لآراء عملائك الحقيقيين بتونس (5 مقابلات على الأقل) لتقليل المخاطر."
      },
      action: {
        fr: "Allez sur le terrain et réalisez un minimum de 5 entretiens approfondis avec vos cibles pour débloquer cette limite.",
        ar: "بادر بإجراء 5 مقابلات تفصيلية على الأقل مع شريحة عملائك وتوثيق احتياجاتهم لإلغاء هذا القيد تلقائياً."
      }
    },
    G2: {
      title: {
        fr: "Votre validation commerciale est temporairement limitée par l'absence d'affaires ou de clients payants.",
        ar: "تقدمك التجاري معلق مؤقتاً لغياب معاملات مالية أو إثبات نية الدفع."
      },
      body: {
        fr: "Même si votre proposition de valeur est pertinente, la viabilité réelle de votre offre ne sera confirmée qu'avec l'obtention de clients payants ou de premiers revenus tangibles.",
        ar: "مهما كانت قيمتك المضافة مقنعة، لن يثبت نجاح مشروعك فعلياً إلا بحصولك على مشترين مستعدين لإنفاق المال للحصول على خدمتك."
      },
      action: {
        fr: "Sécurisez vos premières lettres d'intention d'achat, des précommandes ou déclenchez votre première vente pour lever cette retenue.",
        ar: "احرص على تأمين طلبات مسبقة، رسائل نية بالشراء، أو تحقيق أول مبيعات فعلية لتذليل هذا الحاجز فوراً."
      }
    },
    G3: {
      title: {
        fr: "Votre score d'innovation est temporairement limité car aucun produit fonctionnel (MVP) n'a été validé.",
        ar: "مستوى الابتكار والتميز محدد بسقف مؤقت لعدم التحقق من نموذج تشغيلي أولي."
      },
      body: {
        fr: "Un concept théorique unique ne suffit pas. L'innovation sincère doit s'appuyer sur une concrétisation technique fonctionnelle pour bâtir de vraies barrières défensives.",
        ar: "لا يكفي مجرد وضع تصور نظري للابتكار. فالتميز الحقيقي يتطلب بناء نموذج عملي وظيفي يبرهن على جدوى الحل التكنولوجي المقترح."
      },
      action: {
        fr: "Finalisez le développement ou le test de votre version de démonstration (MVP) pour libérer le plein potentiel de votre score d'innovation.",
        ar: "قم بإنهاء وتطوير النموذج الأولي التشغيلي وتقديمه للتجربة والتقييم لفتح الآفاق الكاملة للابتكار."
      }
    },
    G4: {
      title: {
        fr: "Votre score de changement d'échelle est temporairement limité car aucun plan de croissance structuré n'a été identifié.",
        ar: "القدرة على التوسع والنمو محدودة مؤقتاً لغياب خطة انتشار جغرافية واضحة."
      },
      body: {
        fr: "Même si plusieurs indicateurs opérationnels sont positifs, CompassIQ considère qu'un projet ne peut démontrer un fort potentiel de croissance sans vision claire d'expansion.",
        ar: "على الرغم de إيجابية أدائك الحالي، إلا أن القدرة الحقيقية على التوسع تتطلب رؤية مسطرة تضمن تكرار الخدمة دون تضخم تكاليف التشغيل اليدوي للضعف."
      },
      action: {
        fr: "Rédigez un plan de croissance sur 2 ans détaillant vos étapes d'expansion géographique pour lever automatiquement cette restriction.",
        ar: "قم بصياغة خطة توسيع جغرافية وتشغيلية تغطي العامين القادمين لإلغاء هذا التحديد التقديري تلقائياً."
      }
    }
  };

  const key = ruleKey || (dimKey === 'market' ? 'G1' : dimKey === 'commercial' ? 'G2' : dimKey === 'innovation' ? 'G3' : dimKey === 'scalability' ? 'G4' : 'G4');
  return explanations[key] || explanations['G4'];
};

const getActionPriorityInfo = (score: number, lang: 'fr' | 'ar') => {
  if (score < 40) return {
    label: lang === 'fr' ? 'Critique' : 'حرجة',
    color: 'bg-rose-100 text-rose-850 border-rose-200'
  };
  if (score < 75) return {
    label: lang === 'fr' ? 'Élevée' : 'عالية',
    color: 'bg-amber-100 text-amber-850 border-amber-200'
  };
  return {
    label: lang === 'fr' ? 'Moyenne' : 'متوسطة',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  };
};

const getPourquoiConsequence = (dim: string, lang: 'fr' | 'ar') => {
  const consequences: Record<string, { fr: string, ar: string }> = {
    market: {
      fr: "Sans retours clients directs, vous risquez de gaspiller votre temps et vos économies en construisant une solution dont personne ne veut réellement.",
      ar: "دون الحصول على ردود أفعال مباشرة من الفئة المستهدفة، فإنك تخاطر بإنفاق أوقاتك وأموالك في بناء حل لا وجود لطلب حقيقي عليه بالواقع."
    },
    commercial: {
      fr: "Le manque d'un modèle de prix cohérent et d'un MVP testé commercialement rend impossible l'atteinte du point mort et empêche d'attirer des investisseurs.",
      ar: "غياب تسعير مدروس ونموذج تجاري مجرّب يحول دون تحقيق نقطة التعادل، مما ينعكس سلباً على فرص جذب ممولين لتغطية المصاريف."
    },
    innovation: {
      fr: "Faute d'offres innovantes ou d'avantages défendables, les concurrents tunisiens établiront de copier facilement et rapidement votre service sur le marché.",
      ar: "في حال غياب حواجز حماية أو ابتكار مغاير، سيسهل على المنافسين نسخ مفهوم مشروعك والحلول الخاصة بك في ظرف وجيز."
    },
    scalability: {
      fr: "Sans plan stratégique et sans mécanisme d'expansion, votre startup stagnera et dépendra de ressources manuelles hautement coûteuses.",
      ar: "دون رؤية واضحة ونموذج تشغيلي مرن، سيقتصر مشروعك على حدودك الجغرافية الحالية مع تضخم تكاليف التشغيل اليدوي المستمر."
    },
    green: {
      fr: "La non-intégration d'un impact respectueux écoresponsable vous prive de financements d'impact et d'une conformité réglementaire de plus en plus stricte en Tunisie.",
      ar: "إغفال الأبعاد البيئية والاجتماعية يضيق من دائرة التمويلات المسؤولة وقد يعرض مشروعك للمساءلة التنظيمية مستقبلاً."
    }
  };
  return consequences[dim]?.[lang] || "";
};

const mapSubScoreKeyToExplanationId = (key: string): string => {
  if (key === 'market_opportunity') return 'market_share_analysis';
  if (key === 'product_maturity') return 'product_service_maturity';
  if (key === 'local_novelty_differentiation') return 'local_novelty';
  if (key === 'manual_accompaniment_dependency') return 'manual_dependency';
  return key;
};

const getSubScoreExplanation = (sKey: string, val: number | null, language: Language) => {
  if (val === null) return null;
  const mappedId = mapSubScoreKeyToExplanationId(sKey);
  
  // Find criteria in any dimension
  let foundCriteria: any = null;
  Object.values(scoreExplanations.score_dimensions).forEach((dim: any) => {
    const matched = dim.criteria.find((c: any) => c.id === mappedId);
    if (matched) {
      foundCriteria = matched;
    }
  });

  if (!foundCriteria) return null;

  let bandKey: 'low' | 'medium' | 'high' = 'low';
  if (val >= 75) bandKey = 'high';
  else if (val >= 50) bandKey = 'medium';

  const bandInfo = foundCriteria.bands[bandKey];
  if (!bandInfo) return null;

  return {
    plainQuestion: foundCriteria.plain_question?.[language] || foundCriteria.plain_question?.fr,
    explanation: bandInfo?.[language] || bandInfo?.fr,
    nextAction: bandInfo?.next_action?.[language] || bandInfo?.next_action?.fr || null
  };
};

const getAdvancedScoreInterpretation = (score: number) => {
  if (score >= 90) {
    return {
      label: { fr: "Excellent", ar: "ممتاز" },
      colorTheme: "text-emerald-750 bg-emerald-50/50 border-emerald-200",
      progressBarColor: "bg-emerald-600",
      badgeColor: "bg-emerald-100 text-emerald-800",
      textContext: {
        fr: "Votre projet démontre des indicateurs de maturité exceptionnels.",
        ar: "يُظهر مشروعك مؤشرات نضج استثنائية وجاهزية تامة."
      }
    };
  }
  if (score >= 75) {
    return {
      label: { fr: "Solide - Strong", ar: "قوي" },
      colorTheme: "text-green-750 bg-green-50/50 border-green-250",
      progressBarColor: "bg-green-600",
      badgeColor: "bg-green-100 text-green-850",
      textContext: {
        fr: "Votre projet dispose de bases claires et de validations substantielles.",
        ar: "يتمتع مشروعك بأسس قوية وتحقيقات ملموسة ومثبتة."
      }
    };
  }
  if (score >= 60) {
    return {
      label: { fr: "En développement", ar: "جاري التطوير" },
      colorTheme: "text-amber-700 bg-amber-50/55 border-amber-200",
      progressBarColor: "bg-amber-500",
      badgeColor: "bg-amber-100 text-amber-800",
      textContext: {
        fr: "Plusieurs critères clés sont en cours d'acquisition ou de validation.",
        ar: "تتطور مؤشراتك بشكل جيد مع تطلبات أساسية إضافية قيد التحقق."
      }
    };
  }
  if (score >= 40) {
    return {
      label: { fr: "Phase initiale", ar: "مرحلة أولية" },
      colorTheme: "text-orange-700 bg-orange-50/40 border-orange-200",
      progressBarColor: "bg-orange-500",
      badgeColor: "bg-orange-100 text-orange-850",
      textContext: {
        fr: "Le projet commence sa validation terrain et se structure stratégiquement.",
        ar: "يبدأ المشروع عملية التحقق الميداني وبناء الهياكل الأولية."
      }
    };
  }
  return {
    label: { fr: "Attention immédiate", ar: "يحتاج عناية عاجلة" },
    colorTheme: "text-red-750 bg-red-50/50 border-red-200",
    progressBarColor: "bg-red-500",
    badgeColor: "bg-red-100 text-red-800",
    textContext: {
      fr: "Certaines bases critiques nécessitent des mesures correctives rapides.",
      ar: "Toutes les bases critiques nécessitent des mesures."
    }
  };
};

const getConfidenceBand = (score: number) => {
  if (score >= 80) {
    return {
      label: { fr: "Confiance Élevée", ar: "ثقة عالية" },
      colorClass: "text-emerald-700 bg-emerald-50 border-emerald-150",
      desc: {
        fr: "Vos données actuelles permettent un diagnostic robuste.",
        ar: "البيانات الحالية كافية وتوفر درجة تشخيص ممتازة ومثبتة."
      }
    };
  } else if (score >= 55) {
    return {
      label: { fr: "Confiance Moyenne", ar: "ثقة متوسطة" },
      colorClass: "text-amber-700 bg-amber-50 border-amber-100",
      desc: {
        fr: "Augmentez la confiance en précisant vos réponses d'évaluation.",
        ar: "مواصلة الإجابة عن بقية المؤشرات ستجعل التشخيص أكثر دقة."
      }
    };
  } else {
    return {
      label: { fr: "Fiabilité Limitée", ar: "موثوقية محدودة" },
      colorClass: "text-rose-700 bg-rose-50 border-rose-150",
      desc: {
        fr: "Complétez votre profil pour un diagnostic fiable.",
        ar: "يرجى ملء كافة تفاصيل مشروعك لضمان موثوقية التشخيص."
      }
    };
  }
};

interface DashboardViewProps {
  language: Language;
  profile: ProjectProfile;
  onRestart: () => void;
  onNavigateRoadmap?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  language,
  profile,
  onRestart,
  onNavigateRoadmap
}) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<Record<string, boolean>>({});

  const d = profile.diagnosis;
  const s = profile.scores;
  
  const overall = s.overall;
  const overallScore = Math.min(100, overall.score || 0);  
  const confidenceScore = Math.min(100, overall.diagnosis_confidence || 0); 

  let roadmapSteps: any[] = [];
  const rawRoadmap = (profile as any).roadmap;
  if (Array.isArray(rawRoadmap)) {
    roadmapSteps = rawRoadmap;
  } else if (rawRoadmap && typeof rawRoadmap === 'object' && Array.isArray((rawRoadmap as any).steps)) {
    roadmapSteps = (rawRoadmap as any).steps;
  }

  const totalSteps = roadmapSteps.length || 5;
  const completedRaw = (profile as any).completed_steps || [];
  // Keep only steps that belong to the current roadmap to prevent stale items showing up
  const validIds = new Set(roadmapSteps.map((item: any) => item.id || item.step_id || ''));
  const uniqueCompleted = Array.from(new Set(completedRaw.filter((id: string) => validIds.has(id))));
  const completedStepsCount = Math.min(uniqueCompleted.length, totalSteps);
  const progressPercent = totalSteps > 0 ? Math.min(100, Math.round((completedStepsCount / totalSteps) * 105)) : 0; // Wait, actually standard round percent is better: Math.round((completedStepsCount / totalSteps) * 100)
  const actualPercent = totalSteps > 0 ? Math.min(100, Math.round((completedStepsCount / totalSteps) * 100)) : 0;

  // Range-based styling for overall score
  const getScoreBand = (score: number) => {
    if (score >= 90) return { color: 'text-green-600 bg-green-50 border-green-200', label: { fr: 'Maturité Excellente', ar: 'نضج ممتاز' } };
    if (score >= 75) return { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: { fr: 'Maturité Importante', ar: 'نضج هام' } };
    if (score >= 60) return { color: 'text-amber-600 bg-amber-50 border-amber-200', label: { fr: 'Maturité Satisfaisante', ar: 'نضج مقنع' } };
    if (score >= 40) return { color: 'text-orange-600 bg-orange-50 border-orange-200', label: { fr: 'Maturité Améliorables', ar: 'نضج قابل للتحسين' } };
    return { color: 'text-brand-crimson bg-red-50 border-red-200', label: { fr: 'Priorité Critique', ar: 'أولوية حرجة' } };
  };

  const scoreBand = getScoreBand(overallScore);

  const toggleTechnicalDetails = (dimKey: string) => {
    setShowTechnicalDetails(prev => ({
      ...prev,
      [dimKey]: !prev[dimKey]
    }));
  };

  // Helper render for subscores bar
  const renderSubScores = (dimKey: string, sub: Record<string, number | null>) => {
    const showTech = !!showTechnicalDetails[dimKey];
    
    // Compute raw, weighted results for math
    let sumWeights = 0;
    let sumWeightedScores = 0;
    Object.entries(sub).forEach(([sKey, val]) => {
      const w = subScoreWeights[sKey] || 0;
      if (val !== null) {
        sumWeights += w;
        sumWeightedScores += (val * w);
      }
    });
    const rawResultValue = sumWeights > 0 ? (sumWeightedScores / sumWeights) : 0;
    const roundedResultValue = Math.round(rawResultValue);

    return (
      <div className="mt-2 pt-2 border-t border-brand-marble/10 text-xs space-y-4">
        {/* Tier 1: Plain language questions (default) */}
        <div className="space-y-3">
          {Object.entries(sub).map(([sKey, val]) => {
            const plainQuestion = subScorePlainDict[sKey]?.[language] || sKey.replace(/_/g, ' ');
            const dotColor = val === null ? 'bg-gray-300' : val >= 75 ? 'bg-emerald-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500';
            const explanationData = getSubScoreExplanation(sKey, val, language);
            
            return (
              <div 
                key={sKey} 
                className={`flex flex-col gap-2.5 p-3 rounded-xl border transition-all ${
                  val === null 
                    ? 'bg-gray-50/50 border-gray-150 text-gray-700' 
                    : val >= 75 
                      ? 'bg-emerald-50/25 border-emerald-150 text-emerald-950' 
                      : val >= 50 
                        ? 'bg-amber-50/20 border-amber-100 text-amber-950' 
                        : 'bg-rose-50/30 border-rose-100 text-rose-950'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      {subScoreTranslations[sKey]?.[language] || sKey.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-800 font-bold leading-normal text-[11.5px] font-sans">
                      {explanationData?.plainQuestion || plainQuestion}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                    <span className="font-extrabold font-mono text-brand-blue text-[12px]">
                      {val !== null ? `${val}/100` : 'N/A'}
                    </span>
                  </div>
                </div>

                {explanationData && (
                  <div className="mt-1 pt-2 border-t border-dashed border-gray-200/60 space-y-2 text-[11.5px] text-gray-600 font-sans leading-relaxed">
                    <p className="text-gray-700 font-medium">
                      {explanationData.explanation}
                    </p>
                    {explanationData.nextAction && (
                      <div className="flex items-start gap-1.5 bg-white/70 border border-gray-150/70 rounded-lg p-2.5 shadow-2xs">
                        <span className="text-emerald-600 font-black shrink-0 text-xs">🎯</span>
                        <div className="text-[10px] leading-relaxed text-emerald-950">
                          <strong className="font-extrabold text-emerald-900 block">
                            {language === 'fr' ? 'Action recommandée :' : 'الإجراء المقترح :'}
                          </strong>
                          <span className="font-medium pt-0.5 block">{explanationData.nextAction}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Toggle Button for Tier 2 */}
        <button
          onClick={() => toggleTechnicalDetails(dimKey)}
          type="button"
          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-brand-blue bg-gray-100/60 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <span>
            {language === 'fr' 
              ? (showTech ? "Masquer le détail de l'évaluation professionnelle ▴" : "Voir le détail de l'évaluation professionnelle ▾")
              : (showTech ? "إخفاء تفاصيل التقييم المهني ▴" : "إظهار تفاصيل التقييم المهني ▾")
            }
          </span>
        </button>

        {/* Tier 2: Technical breakdown */}
        {showTech && (
          <div className="p-4 bg-slate-950 text-slate-200 rounded-2xl font-sans text-[11px] space-y-3.5 border border-slate-800 animate-fade-in shadow-inner">
            <div className="pb-2 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] flex justify-between items-center">
              <span>{language === 'fr' ? "Coefficients & Algorithme de Calcul" : "معاملات ومعادلة الحساب التقني"}</span>
              <span className="font-mono text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded text-[9px] lowercase border border-brand-blue/20">
                {language === 'fr' ? `Somme pondérée : ${roundedResultValue}%` : `المجموع الموزون: ${roundedResultValue}%`}
              </span>
            </div>
            
            <div className="space-y-2">
              {Object.entries(sub).map(([sKey, val]) => {
                const weight = subScoreWeights[sKey] || 0;
                const weightedContribution = val !== null ? Math.round((val * weight) / sumWeights) : 0;
                return (
                  <div key={sKey} className="flex justify-between items-center text-[10.5px] font-mono leading-relaxed group hover:bg-slate-900/50 p-1.5 rounded-lg transition-colors">
                    <div className="text-slate-400">
                      <span className="font-bold text-slate-300 block text-[10px]">
                        {subScoreTranslations[sKey]?.[language] || sKey}
                      </span>
                      <span className="text-[9.5px] text-slate-500">
                        {language === 'fr' 
                          ? `Contribution : ${weightedContribution}% sur le score total` 
                          : `المساهمة: ${weightedContribution}% من النتيجة الإجمالية`
                        }
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-100">{val !== null ? `${val}` : '0'} × {weight}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  };

  const currentInterpretation = getAdvancedScoreInterpretation(overallScore);
  const confidenceBand = getConfidenceBand(confidenceScore);

  const stagesTimeline = [
    { id: 'S1', label: { fr: "Idéation", ar: "الفكرة" }, rawDescFr: "Validation de l'idée" },
    { id: 'S2', label: { fr: "Validation Marché", ar: "التحقق من السوق" }, rawDescFr: "Validation du besoin marché" },
    { id: 'S3', label: { fr: "Structuration", ar: "Prototype / MVP", rawDescFr: "Création du MVP" }, isPrototype: true },
    { id: 'S4', label: { fr: "Levée de Fonds", ar: "Financement", rawDescFr: "Modèle & Financement" } },
    { id: 'S5', label: { fr: "Lancement", ar: "Lancement", rawDescFr: "Lancement officiel" } },
    { id: 'S6', label: { fr: "Croissance", ar: "Croissance", rawDescFr: "Mise à l'échelle" } }
  ];

  const assignedStageId = d.stage_assigned || 'S1';
  const assignedStageIndex = stagesTimeline.findIndex(st => st.id === assignedStageId);

  // Dynamic priorities generator (D14)
  const getTopPriorities = () => {
    const list: Array<{ rank: number; title: { fr: string; ar: string }; duration: { fr: string; ar: string }; impact: { fr: string; ar: string }; detail: { fr: string; ar: string } }> = [];
    
    if (profile.blockers && profile.blockers.length > 0) {
      profile.blockers.forEach((blk, idx) => {
        let estTime = { fr: "1 semaine", ar: "أسبوع واحد" };
        let estImpact = { fr: "Score +15, Confiance +10", ar: "تجاوز عائق حرج" };
        
        const bId = (blk.id || '').toLowerCase();
        if (bId.includes('interview') || bId.includes('customer') || bId.includes('client')) {
          estTime = { fr: "5 jours", ar: "5 أيام" };
          estImpact = { fr: "Score Marché +18 · Confiance +12", ar: "نقاط السوق +18 · الثقة +12" };
        } else if (bId.includes('prototype') || bId.includes('mvp')) {
          estTime = { fr: "2 semaines", ar: "أسبوعان" };
          estImpact = { fr: "Score Innovation +20 · Produit +15", ar: "نقاط الابتكار +20" };
        } else if (bId.includes('price') || bId.includes('prix') || bId.includes('revenue')) {
          estTime = { fr: "3 jours", ar: "3 أيام" };
          estImpact = { fr: "Score Commercial +15", ar: "الجانب التجاري +15" };
        } else if (bId.includes('growth') || bId.includes('croissance') || bId.includes('plan')) {
          estTime = { fr: "1 semaine", ar: "أسبوع واحد" };
          estImpact = { fr: "Score Scalabilité +20", ar: "نقاط التوسع +20" };
        }
        
        list.push({
          rank: idx + 1,
          title: {
            fr: blk.title?.fr || "Résoudre l'impasse stratégique",
            ar: blk.title?.ar || "حل العقبة الاستراتيجية"
          },
          duration: estTime,
          impact: estImpact,
          detail: {
            fr: blk.action?.fr || "Action recommandée",
            ar: blk.action?.ar || "الإجراء المقترح"
          }
        });
      });
    }

    if (list.length < 3) {
      const remainingNeeded = 3 - list.length;
      const staticFallbacks = [
        {
          title: { fr: "Réaliser 10 entretiens clients qualitatifs", ar: "إجراء 10 مقابلات نوعية مع العملاء" },
          duration: { fr: "5 jours", ar: "5 أيام" },
          impact: { fr: "Marché +18 · Confiance +12", ar: "نقاط السوق +18 · الثقة +12" },
          detail: { fr: "Valider l'adéquation problème-solution auprès d'utilisateurs réels.", ar: "التحقق من تفاعل الجمهور وتناسب الحل مع المشكلة الحقيقية." }
        },
        {
          title: { fr: "Valider la sensibilité au prix", ar: "التحقق من استراتيجية التسعر" },
          duration: { fr: "3 jours", ar: "3 أيام" },
          impact: { fr: "Commercial +15", ar: "نقاط الجانب التجاري +15" },
          detail: { fr: "Construire un modèle de revenus structuré et cohérent.", ar: "صياغة وتأكيد هيكلية تسعير واضحة." }
        },
        {
          title: { fr: "Rédiger un plan de croissance structuré", ar: "صياغة خطة نمو وهيكلة عملية" },
          duration: { fr: "1 semaine", ar: "أسبوع واحد" },
          impact: { fr: "Scalabilité +20", ar: "نقاط القابلية للتوسع +20" },
          detail: { fr: "Définir la réplicabilité de votre produit sans coût linéaire élevé.", ar: "رسم خطة دقيقة للتكرار العالي دون تضخيم بالتكاليف الخطية." }
        }
      ];

      staticFallbacks.slice(0, remainingNeeded).forEach((cand) => {
        list.push({
          rank: list.length + 1,
          title: cand.title,
          duration: cand.duration,
          impact: cand.impact,
          detail: cand.detail
        });
      });
    }

    return list.slice(0, 3);
  };

  const topPriorities = getTopPriorities();

  return (
    <div className="max-w-6xl mx-auto my-8 px-6 space-y-12" id="diagnostic-dashboard-view">
      
      {/* SECTION 1: "Where am I?" (Where am I?) */}
      <section className="space-y-8" id="part-where-am-i">
        
        {/* Profile Card & Action Bar — Clean of developer logs (D1) */}
        <div className="bg-white rounded-3xl shadow-xs border border-brand-marble/20 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6" id="startup-profile-card">
          <div className="flex items-center gap-4 text-center md:text-left rtl:md:text-right">
            <div className="w-14 h-14 rounded-2xl bg-brand-blue flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-100">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-marble tracking-widest block">
                {language === 'fr' ? "PROFIL ENTREPRENEUR" : "ملف رائد الأعمال"}
              </span>
              <h1 className="text-3xl font-black text-brand-blue tracking-tight font-sans mt-1">
                {profile.startup.name || "Startup Project"}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 font-sans">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="font-semibold text-gray-700 capitalize">Tunis, TN</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span className="font-semibold text-gray-750 capitalize">{profile.entrepreneur.sector || "Technologique"}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-semibold text-gray-550">{language === 'fr' ? 'Dernière mise à jour aujourd’hui à 14:30' : 'آخر تحديث اليوم'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 no-print">
            <button
              id="btn-recommencer-diagnostic"
              onClick={onRestart}
              className="px-5 py-2.5 rounded-xl border border-brand-marble/50 text-brand-blue font-bold text-sm bg-white hover:bg-brand-ivory/30 cursor-pointer transition-all flex items-center gap-2"
            >
              <span>⬅</span>
              <span>{language === 'fr' ? 'Recommencer le Diagnostic' : 'إعادة إجراء التشخيص'}</span>
            </button>
          </div>
        </div>

        {/* Global score & confidence summaries (D2 & D3 & D9) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Global score card (D2 & D12) */}
          <div className="md:col-span-4 bg-white rounded-3xl border border-brand-marble/25 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                {getTranslation('overallScore', language)}
              </span>
              <div className="flex items-baseline gap-2">
                <span id="overall-score-indicator" className="text-5xl font-black font-mono text-brand-blue">
                  {overallScore}%
                </span>
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${currentInterpretation.colorTheme}`}>
                  {language === 'fr' ? currentInterpretation.label.fr : currentInterpretation.label.ar}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-3 mb-4">
                <div className={`${currentInterpretation.progressBarColor} h-full transition-all duration-1000`} style={{ width: `${overallScore}%` }} />
              </div>
            </div>
            <p className="text-sm text-gray-650 leading-relaxed font-sans font-medium py-1">
              {language === 'fr' ? currentInterpretation.textContext.fr : currentInterpretation.textContext.ar}
            </p>
          </div>

          {/* Assessment Confidence card (D3 & D12) */}
          <div className="md:col-span-4 bg-white rounded-3xl border border-brand-marble/25 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                {getTranslation('confidenceScore', language)}
              </span>
              <div className="flex items-baseline gap-2">
                <span id="confidence-score-indicator" className="text-5xl font-black font-mono text-brand-marble">
                  {confidenceScore}%
                </span>
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${confidenceBand.colorClass}`}>
                  {language === 'fr' ? confidenceBand.label.fr : confidenceBand.label.ar}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-3 mb-4">
                <div className="bg-brand-marble h-full transition-all duration-1000" style={{ width: `${confidenceScore}%` }} />
              </div>
            </div>
            <p className="text-sm text-gray-650 leading-relaxed font-sans font-medium py-1">
              {language === 'fr' ? confidenceBand.desc.fr : confidenceBand.desc.ar}
            </p>
          </div>

          {/* F8: Active Dashboard Progress Widget */}
          <div className="md:col-span-4 bg-gradient-to-br from-slate-900 via-brand-blue to-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-gray-300 tracking-wider block mb-3">
                {language === 'fr' ? "Progression de la Feuille de Route" : "تقدم خارطة الطريق"}
              </span>
              <div className="flex items-center gap-4 mt-2">
                {/* SVG Circular Progress Tracker */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      className="text-white/15"
                      strokeWidth="6"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      className="text-emerald-400 transition-all duration-500"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={2 * Math.PI * 32 - (actualPercent / 100) * (2 * Math.PI * 32)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-lg text-white">
                    {actualPercent}%
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-black font-mono">
                    {completedStepsCount} / {totalSteps}
                  </span>
                  <span className="text-[11px] font-medium text-gray-350 block mt-0.5 leading-tight animate-pulse">
                    {language === 'fr' 
                      ? "actions prioritaires complétées" 
                      : "من الإجراءات ذات الأولوية المنجزة"}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-[11px] text-gray-350 leading-relaxed pt-3 border-t border-white/10 mt-3 italic text-center md:text-left rtl:md:text-right">
              {language === 'fr' 
                ? "Mis à jour en temps réel lors de l'exécution" 
                : "تم تحديث التقدم تلقائياً أثناء المتابعة"}
            </p>
          </div>

        </div>

        {/* Horizontal Stage Timeline (D17 & D4) */}
        <div className="bg-white rounded-3xl border border-brand-marble/25 p-6 md:p-8 space-y-4" id="stage-progress-timeline-block">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4 gap-2">
            <div>
              <span className="text-[10px] font-extrabold text-brand-marble uppercase tracking-widest block">
                {language === 'fr' ? "STADE DE MATURITÉ ACTUEL" : "المستوى الحالي للمشروع"}
              </span>
              <h2 id="assigned-stage-heading" className="text-xl font-black text-brand-blue font-sans mt-0.5 flex items-center gap-2">
                <span className="inline-block">💡</span>
                <span>{language === 'fr' ? d.stage_label?.fr : d.stage_label?.ar}</span>
              </h2>
            </div>
            <div className="text-xs text-gray-550 leading-relaxed font-sans max-w-md md:text-right rtl:md:text-left italic">
              {language === 'fr' 
                ? "Votre startup valide actuellement ses fondations clés d'après les critères d'éligibilité tunisiens."
                : "تتحقق شركتك الناشئة حالياً من أسسها المنهجية المعتمدة محلياً."}
            </div>
          </div>

          <p id="assigned-stage-desc" className="text-sm text-gray-750 leading-relaxed bg-brand-ivory/15 p-4 rounded-2xl border border-brand-marble/10 font-semibold font-sans">
            {language === 'fr' ? d.perception_gap.gap_explanation?.fr : d.perception_gap.gap_explanation?.ar}
          </p>

          {/* Interactive Progress Timeline (D17) */}
          <div className="pt-6 pb-2">
            <div className="relative flex justify-between items-center max-w-4xl mx-auto" id="timeline-rail">
              {/* Timeline Connector Line */}
              <div className="absolute left-4 right-4 top-5 h-1 bg-gray-150 -z-10 rounded" />
              <div 
                className="absolute left-4 top-5 h-1 bg-brand-blue -z-10 rounded transition-all duration-1000" 
                style={{ 
                  width: `${(assignedStageIndex / (stagesTimeline.length - 1)) * 100}%`,
                  right: language === 'ar' ? 'auto' : 'none' 
                }} 
              />

              {stagesTimeline.map((st, idx) => {
                const isCompleted = idx < assignedStageIndex;
                const isActive = idx === assignedStageIndex;
                const isComing = idx > assignedStageIndex;

                return (
                  <div key={st.id} className="flex flex-col items-center relative text-center w-16" id={`timeline-step-${st.id}`}>
                    {/* Circle Node */}
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 font-bold ${
                        isCompleted
                          ? 'bg-brand-blue border-brand-blue text-white shadow-sm'
                          : isActive
                          ? 'bg-white border-brand-blue text-brand-blue shadow-md ring-4 ring-brand-blue/10 animate-pulse'
                          : 'bg-white border-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <span className="text-xs font-mono">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step label */}
                    <span 
                      className={`text-[10px] font-sans font-bold mt-2.5 block whitespace-nowrap overflow-visible ${
                        isActive 
                          ? 'text-brand-blue font-extrabold max-w-[120px]' 
                          : 'text-gray-500 font-medium'
                      }`}
                    >
                      {language === 'fr' ? st.label.fr : st.label.ar}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic perception gap widget card & Criteria Checking (D8 & D18 & D19) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="coherence-analysis-block">
          
          {/* Section Criteria status d'éligibilité (D6 & D7 & D18) */}
          <div className="md:col-span-7 bg-white rounded-3xl border border-brand-marble/25 p-6 md:p-8 space-y-4">
            <h3 className="text-xs font-black text-brand-blue uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-brand-blue" />
              <span>{getTranslation('evidenceSection', language)}</span>
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {getTranslation('evidenceDesc', language)}
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-2" id="criteria-status-list">
              {d.classification_evidence && d.classification_evidence.length > 0 ? (
                d.classification_evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 text-xs font-medium hover:border-gray-200 transition-colors"
                  >
                    <span className="text-gray-700 flex items-center gap-2 font-sans">
                      <span className="text-[9px] bg-brand-marble/15 text-brand-marble px-2 py-0.5 rounded font-mono font-bold uppercase">
                        {ev.is_hard ? 'Hard' : 'Soft'}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {language === 'fr' ? ev.criteria.fr : ev.criteria.ar}
                      </span>
                    </span>
                    <span className={`font-black uppercase text-[10px] tracking-wider px-3 py-1 rounded-full ${
                      ev.status
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-rose-50 text-brand-crimson border border-rose-100'
                    }`}>
                      {ev.status 
                        ? (language === 'fr' ? 'Validé' : 'مؤكد') 
                        : (language === 'fr' ? 'À consolider' : 'قيد التأكيد')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic py-4 text-center">No criteria details found. Please take diagnostic form to complete.</div>
              )}
            </div>
          </div>

          {/* Perception Gap Box (D8 & D19) */}
          <div className={`md:col-span-5 rounded-3xl p-6 md:p-8 border flex flex-col justify-between ${
            d.perception_gap.gap_direction === 'overestimation'
              ? 'bg-amber-50/40 border-amber-200 text-amber-950'
              : d.perception_gap.gap_direction === 'underestimation'
              ? 'bg-emerald-50/30 border-emerald-250 text-emerald-950'
              : 'bg-brand-blue/5 border-brand-blue/15 text-brand-blue'
          }`} id="perception-gap-clarity-card">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{getTranslation('perceptionGapHeader', language)}</span>
              </h3>

              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex justify-between items-center pb-2.5 border-b border-black/10">
                  <span className="opacity-80 font-semibold">{getTranslation('actualDiagnosed', language)}</span>
                  <span className="font-extrabold px-2.5 py-1 rounded-lg bg-white/80 shadow-3xs text-brand-blue">
                    {language === 'fr' ? getTranslation(d.stage_assigned || 'S1', 'fr') : getTranslation(d.stage_assigned || 'S1', 'ar')}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-black/10">
                  <span className="opacity-80 font-semibold">{getTranslation('selfEstimated', language)}</span>
                  <span className="font-extrabold px-2.5 py-1 rounded-lg bg-white/80 shadow-3xs text-brand-marble">
                    {language === 'fr' ? getTranslation(d.stage_self_assessed || 'S1', 'fr') : getTranslation(d.stage_self_assessed || 'S1', 'ar')}
                  </span>
                </div>
              </div>

              <div className="text-xs leading-relaxed font-semibold italic bg-white/40 p-4 rounded-xl mt-3">
                {language === 'fr' 
                  ? "Comment progresser : Les écarts d'analyse soulignent des hypothèses à stabiliser. Utilisez notre feuille de route pour valider rigoureusement chaque étape de structuration avant d'aborder des phases de forte accélération commerciale."
                  : "مفاتيح التقدم: تسليط الضوء على الفجوات يساعدك في تأمين فرضياتك التشغيلية. استخدم خارطة الطريق لتأكيد كل مؤشرات النمو تدريجياً وبثقة."}
              </div>
            </div>

            <p id="perception-gap-paragraph" className="text-xs font-medium leading-relaxed opacity-90 mt-4 pt-4 border-t border-black/5">
              {language === 'fr' ? d.perception_gap.gap_explanation?.fr : d.perception_gap.gap_explanation?.ar}
            </p>
          </div>

        </div>

      </section>

      {/* SECTION 2: "Why am I here?" (Scores Redesign) */}
      <section className="space-y-6" id="part-why-am-i-here">
        <div className="border-b border-gray-150 pb-4">
          <span className="text-[10px] font-black uppercase text-brand-marble tracking-widest block">
            {language === 'fr' ? "RÉSULTATS PAR COMPOSANTE" : "تحليل نتائج الأبعاد الخمسة"}
          </span>
          <h2 className="text-2xl font-black text-brand-blue tracking-tight font-sans mt-1">
            {language === 'fr' ? "Diagnostic Multi-dimensionnel" : "التشخيص الهيكلي للأبعاد"}
          </h2>
          <p className="text-sm text-gray-500 font-sans mt-1">
            {language === 'fr' ? "Chaque dimension ci-dessous est évaluée d'après ses sous-critères spécifiques." : "يتم تحليل كل مؤشر بناء على استقصاء المعايير التفصيلية Mكتملة مسبقاً."}
          </p>
        </div>

        {/* Bento Grid score cards (D10 & D11 & D12 & D13) */}
        <div id="multidimensional-explainability-bento-grid" className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {Object.entries({
            market: s.market,
            commercial: s.commercial,
            innovation: s.innovation,
            scalability: s.scalability,
            green: s.green
          }).map(([key, item]) => {
            const val = item as DimensionScore;
            if (!val) return null;

            const isExpanded = expandedCard === key;
            const cardScore = val.score || 0;
            const interpretation = getAdvancedScoreInterpretation(cardScore);

            const getDimensionDescriptionMap = (k: string, lang: 'fr' | 'ar') => {
              const descriptions: Record<string, { fr: string, ar: string }> = {
                market: {
                  fr: "Évaluation de la clarté de votre cible, la pertinence de l'interaction directe avec des clients réels tunisiens, et l'éligibilité aux opportunités de marché.",
                  ar: "يقيس مدى ووضوح العينة المستهدفة ومشاركتها الفعلية لمشروعك، ولقاء الجمهور تونسياً."
                },
                commercial: {
                  fr: "Analyse de la proposition de valeur, l'état d'avancement de votre produit MVP et l'alignement cohérent de vos choix de pricing.",
                  ar: "تحليل القيمة المضافة ومستوى نضج النموذج الأولي وقابلية تسعيره تجارياً."
                },
                innovation: {
                  fr: "Analyse de la singularité de votre offre locale, de la complexité technologique, et des barrières de défense établies.",
                  ar: "قياس تمايز الخدمة محلياً والابتكار التقني ووجود حماية عملية."
                },
                scalability: {
                  fr: "Aptitude de réplication automatique sans croissance proportionnelle des charges opérationnelles et potentiel d'expansion géographique.",
                  ar: "مدى مرونة تكرار الخدمة دون تضخم التكاليف وإمكانيات التوسع الجغرافي."
                },
                green: {
                  fr: "Cohérence environnementale, gestion des déchets, action climat, et responsabilité écologique sectorielle.",
                  ar: "التوافق مع البيئة وإعادة التدوير وترشيد المياه لتقييم الأثر الأخضر."
                }
              };
              return descriptions[k]?.[lang] || "";
            };

            const getCleanMentorWhy = (v: DimensionScore, lang: 'fr' | 'ar') => {
              const rawText = lang === 'fr' ? v.explanation?.fr : v.explanation?.ar;
              if (!rawText) return "";
              return rawText
                .replace(/Plafonné à max \d+%/gi, "Ajusté temporairement")
                .replace(/Plafonné à \d+ par la règle d'exclusion [A-Z0-9]+/gi, "Pour consolider d'abord les étapes de validation fondamentales avant de progresser")
                .replace(/par la règle d'exclusion [A-Z0-9]+/gi, "afin de sécuriser d'abord vos fondations")
                .replace(/dans le cadre de la règle d'exclusion [A-Z0-9]+/gi, "")
                .replace(/règle d'exclusion/gi, "précondition clé")
                .replace(/règle/gi, "étape")
                .replace(/قاعدة الحظر [A-Z0-9]+/gi, "لتأمين أسس المشروع والتحقق من العملاء")
                .replace(/محدد بسقف أقصى %\d+/gi, "معدل مؤقتاً")
                .replace(/بموجب قاعدة الحظر/gi, "لتأمين ركائز مشروعك الميدانية أولاً")
                .replace(/قاعدة/gi, "خطوة رئيسية");
            };

            const levelInfo = getLevelInfo(cardScore, language);
            const stageObj = stagesTimeline.find(st => st.id === assignedStageId);
            const stageLabel = stageObj ? (language === 'fr' ? stageObj.label.fr : stageObj.label.ar) : 'Structuration';

            return (
              <div
                key={key}
                id={`score-card-${key}`}
                className={`bg-white rounded-3xl shadow-sm border transition-all duration-300 p-6 flex flex-col justify-between ${
                  isExpanded 
                    ? 'md:col-span-5 border-brand-blue ring-4 ring-brand-blue/10 animate-scale-up' 
                    : 'md:col-span-1 hover:shadow-md hover:border-brand-blue/30 hover:-translate-y-0.5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-gray-150/70">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-brand-blue flex items-center gap-1">
                        <span className="text-sm shrink-0">{levelInfo.icon}</span>
                        {key === 'market' && <TrendingUp className="w-4 h-4" />}
                        {key === 'commercial' && <Award className="w-4 h-4" />}
                        {key === 'innovation' && <Compass className="w-4 h-4" />}
                        {key === 'scalability' && <Activity className="w-4 h-4" />}
                        {key === 'green' && <Leaf className="w-4 h-4 text-emerald-655" />}
                      </span>
                      <h3 className="text-xs font-black text-brand-blue uppercase tracking-wide">
                        {getTranslation(key, language)}
                      </h3>
                    </div>
                    <span className={`text-sm font-black font-mono px-2.5 py-0.5 rounded-lg border ${levelInfo.colorClass}`}>
                      {cardScore}%
                    </span>
                  </div>

                  {/* Redesigned Info Area: Common layout for levels and benchmarks */}
                  <div className="mt-4 space-y-3">
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${interpretation.progressBarColor} rounded-full transition-all duration-750`}
                        style={{ width: `${cardScore}%` }}
                      />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold text-gray-500">
                      <span>{language === 'fr' ? 'Niveau :' : 'المستوى :'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${interpretation.badgeColor}`}>
                        {levelInfo.level}
                      </span>
                    </div>

                    <p className="text-[11.5px] text-gray-750 leading-relaxed font-semibold font-sans mt-1">
                      {getBusinessImpactStatement(key, cardScore, language)}
                    </p>

                    <div className="text-[10.5px] text-gray-500 font-semibold bg-gray-50/70 p-2.5 rounded-xl border border-gray-150/45 leading-relaxed font-sans mb-1">
                      {language === 'fr' 
                        ? `Moyenne pour votre stade (${stageLabel}) : `
                        : `المعدل لمرحلتك (${stageLabel}) : `}
                      <span className="font-extrabold text-brand-blue font-mono">{benchmarks[assignedStageId]?.[key] || 40}%</span>
                    </div>

                    {!isExpanded && (
                      <p className="text-[11px] text-gray-455 leading-relaxed font-sans line-clamp-3 italic pt-1 border-t border-dashed border-gray-100/80">
                        {language === 'fr' ? val.primary_gap?.fr : val.primary_gap?.ar}
                      </p>
                    )}
                  </div>

                  {/* Expanded block view elements (D10 & D13) */}
                  {isExpanded && (
                    <div className="mt-6 space-y-6 animate-fade-in text-xs font-sans">
                      
                      {/* What it measures explanation (D10) */}
                      <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block mb-1">
                          {getTranslation('scoring_dashboard.card_what_it_measures', language) || 'Ce que mesure ce score'}
                        </span>
                        <p className="text-xs text-gray-655 leading-relaxed font-sans font-semibold">
                          {getDimensionDescriptionMap(key, language)}
                        </p>
                      </div>

                      {/* Explicit capped exclusion handling in humanized plain layout */}
                      {val.gating_applied && (() => {
                        const gateExp = getGatingBusinessExplanation(val.gating_rule, key, language);
                        return (
                          <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs text-amber-955 space-y-2">
                            <span className="font-extrabold flex items-center gap-1.5 text-amber-900 text-[12px]">
                              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>{gateExp.title[language]}</span>
                            </span>
                            <p className="leading-relaxed font-semibold opacity-90 font-sans">
                              {gateExp.body[language]}
                            </p>
                            <div className="mt-2.5 pt-2 border-t border-dashed border-amber-200/80">
                              <strong className="text-amber-955 font-black block">
                                {language === 'fr' ? '💡 Comment débloquer ce plafond :' : '💡 كيفية فك سقف النقاط :'}
                              </strong>
                              <span className="font-medium pt-0.5 block opacity-95">
                                {gateExp.action[language]}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Mentorship assessment overview */}
                      <div className="bg-brand-ivory/20 p-4 rounded-xl border border-brand-marble/10">
                        <span className="text-[10px] uppercase font-black text-brand-blue tracking-wide block mb-1">
                          {getTranslation('scoring_dashboard.card_why', language) || 'Pourquoi ce score'}
                        </span>
                        <p className="text-xs text-gray-700 leading-relaxed font-semibold font-sans">
                          {getCleanMentorWhy(val, language)}
                        </p>
                      </div>

                      {/* Strengths & gaps breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block mb-2">
                            {getTranslation('scoring_dashboard.card_strengths', language) || 'Points forts'}
                          </span>
                          <ul className="space-y-1.5 text-xs text-emerald-955 list-none font-sans font-semibold">
                            {Object.entries(val.sub_scores).some(([_, v]) => (v || 0) >= 70) ? (
                              Object.entries(val.sub_scores)
                                .filter(([_, v]) => (v || 0) >= 70)
                                .map(([sKey, sVal]) => (
                                  <li key={sKey} className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                                    <span>{getHelperConcreteStrength(sKey, language)} ({sVal}/100)</span>
                                  </li>
                                ))
                            ) : (
                              <li className="text-gray-455 italic font-medium">
                                {language === 'fr' 
                                  ? "Aucun point fort identifié actuellement — c'est l'opportunité de progrès." 
                                  : "لا توجد نقاط قوة كافية مبرهنة حالياً — هذا يمثل فرصة للارتقاء والتحسين."}
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* areas to improve / weakness */}
                        <div className="bg-rose-50/20 p-4 rounded-xl border border-rose-100">
                          <span className="text-[10px] uppercase font-bold text-brand-crimson tracking-wider block mb-2">
                            {getTranslation('scoring_dashboard.card_improve', language) || "Pistes d'amélioration"}
                          </span>
                          <ul className="space-y-1.5 text-xs text-gray-700 list-none font-sans font-semibold">
                            {Object.entries(val.sub_scores).some(([_, v]) => (v || 0) < 70) ? (
                              Object.entries(val.sub_scores)
                                .filter(([_, v]) => (v || 0) < 70)
                                .map(([sKey, sVal]) => (
                                  <li key={sKey} className="flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-crimson mt-1.5 shrink-0" />
                                    <span>{subScoreTranslations[sKey]?.[language] || sKey.replace(/_/g, ' ')} ({sVal}/100)</span>
                                  </li>
                                ))
                            ) : (
                              <li className="text-emerald-700 font-bold flex items-center gap-1">
                                <span>✓</span>
                                <span>{language === 'fr' ? "Félicitations, tous les sous-critères sont au vert !" : "تهانينا، كافة المعايير متينة!"}</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>


                      {/* Recommend steps and score gain impact card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100/70 justify-center flex flex-col">
                          <span className="text-[10px] uppercase font-block text-blue-800 tracking-wider block mb-1">
                            {getTranslation('scoring_dashboard.card_expected_impact', language) || 'Impact attendu'}
                          </span>
                          <p className="text-2xl font-black text-brand-blue font-mono">
                            {cardScore < 50 ? '+18 à +25 Points' : '+12 Points'}
                          </p>
                          <span className="text-[10.5px] text-gray-500 leading-relaxed font-sans pt-0.5 font-medium">
                            {language === 'fr' ? "Amélioration estimée après application des actions recommandées." : "نسبة التحسين المتوقعة لنقاطك بمجرد تنفيذ التوصية."}
                          </span>
                        </div>

                        <div className="bg-emerald-55/10 border border-emerald-150 p-4 rounded-2xl flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-850 tracking-wider block mb-1">
                              {getTranslation('scoring_dashboard.card_next_action', language) || 'Action recommandée'}
                            </span>
                            <p className="text-xs text-emerald-950 font-black leading-normal font-sans">
                              {language === 'fr' ? val.recommendation?.fr : val.recommendation?.ar}
                            </p>
                          </div>
                          {onNavigateRoadmap && (
                            <button
                              onClick={() => {
                                sessionStorage.setItem('highlight_dimension', key);
                                onNavigateRoadmap();
                              }}
                              className="mt-3 text-[10px] font-black text-brand-blue hover:underline cursor-pointer flex items-center gap-1.5 bg-white border border-brand-blue/15 px-3 py-1.5 rounded-xl shadow-3xs self-start"
                            >
                              <ExternalLink className="w-3" />
                              <span>{language === 'fr' ? 'Consulter la Roadmap' : 'عرض خارطة الطريق'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sub-scores detailed interactive expansion */}
                      <div className="mt-4 pt-4 border-t border-gray-150/70">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2.5">
                          {language === 'fr' ? 'Détail d\'évaluation professionnelle' : 'تفاصيل التقييم المهني'}
                        </span>
                        {val.sub_scores ? renderSubScores(key, val.sub_scores) : null}
                      </div>

                    </div>
                  )}

                </div>

                {/* Collapsible toggle buttons (D13) */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                  {!isExpanded ? (
                    <button
                      id={`btn-expand-explain-${key}`}
                      onClick={() => setExpandedCard(key)}
                      className="w-full text-center text-[10px] font-black text-brand-marble hover:text-brand-blue uppercase cursor-pointer py-1 transition-colors flex items-center justify-center gap-1"
                    >
                      <span>{language === 'fr' ? "Pourquoi ce score ?" : "لماذا هذه النتيجة ؟"}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      id={`btn-collapse-explain-${key}`}
                      onClick={() => setExpandedCard(null)}
                      className="w-full text-center text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase cursor-pointer py-1 transition-colors flex items-center justify-center gap-1 animate-pulse"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Fermer les détails' : 'طي التفاصيل'}</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: "What should I do next?" (Action Priorities) */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8" id="part-what-should-i-do-next">
        
        {/* Dynamic ranked actionable list of top 3 priorities (D14) */}
        <div className="md:col-span-7 space-y-5" id="top-priorities-block">
          <div className="border-b border-gray-150 pb-2">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest block">
              {language === 'fr' ? "ACTIONS CONCRÈTES PRIORITAIRES" : "الإجراءات الموصى بها مسبقاً"}
            </span>
            <h2 className="text-xl font-black text-brand-blue font-sans mt-0.5">
              {language === 'fr' ? "Votre Plan d'Action à Court Terme" : "خطتك التنفيذية قصيرة المدى"}
            </h2>
          </div>

          <div className="space-y-3.5" id="ranked-priorities-list">
            {topPriorities.map((item, index) => (
              <div 
                key={index} 
                className="bg-white border border-gray-150/70 rounded-2xl p-4.5 flex gap-4 hover:border-brand-blue/30 transition-all shadow-3xs"
              >
                <div className="w-8 h-8 rounded-full bg-brand-blue/5 border border-brand-blue/15 flex items-center justify-center text-brand-blue font-extrabold text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-brand-blue font-sans leading-tight">
                      {language === 'fr' ? item.title.fr : item.title.ar}
                    </h3>
                    <div className="flex items-center gap-3 text-[10.5px] font-bold text-gray-500">
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                        <Clock className="w-3 h-3" />
                        <span>{language === 'fr' ? item.duration.fr : item.duration.ar}</span>
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-sans">
                    {language === 'fr' ? item.detail.fr : item.detail.ar}
                  </p>
                  <p className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block">
                    🎯 {language === 'fr' ? 'Impact estimé :' : 'الأثر المتوقع :'} <span className="font-extrabold">{language === 'fr' ? item.impact.fr : item.impact.ar}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Closing details: Critical Blockers display & "Your Next Mission" (D16) */}
        <div className="md:col-span-5 space-y-6">
          <div className="border-b border-gray-150 pb-2">
            <span className="text-[10px] font-black uppercase text-brand-crimson tracking-widest block">
              {language === 'fr' ? "VERROUS TECHNIQUES ET FINANCIERS" : "العوائق الهيكلية الأكثر إلحاحاً"}
            </span>
            <h2 className="text-xl font-black text-brand-blue font-sans mt-0.5">
              {getTranslation('blockersHeader', language)}
            </h2>
          </div>

          <div className="space-y-4" id="blockers-cards-display">
            {profile.blockers && profile.blockers.length > 0 ? (
              profile.blockers.map((blk) => (
                <div
                  key={blk.id}
                  className="p-5 border border-brand-crimson/15 bg-rose-50/15 rounded-2xl space-y-3 shadow-3xs"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-rose-100/50 pb-2">
                    <span className="text-[9.5px] uppercase font-black tracking-widest text-brand-crimson bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md">
                      {language === 'fr' ? 'Attention prioritaire' : 'انتباه فوري'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 capitalize">
                      {blk.dimension || 'Marché'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-brand-blue font-sans">
                      {language === 'fr' ? blk.title?.fr : blk.title?.ar}
                    </h4>
                    <p className="text-[11.5px] text-gray-650 leading-relaxed font-sans pt-1">
                      {language === 'fr' ? blk.description?.fr : blk.description?.ar}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-rose-100/70 rounded-xl leading-normal text-xs text-brand-blue font-sans font-bold">
                    <span className="text-[9.5px] font-black text-brand-crimson block uppercase tracking-wider mb-0.5">
                      {getTranslation('concreteAction', language)}
                    </span>
                    {language === 'fr' ? blk.action?.fr : blk.action?.ar}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-5 text-center text-emerald-800 bg-emerald-50 rounded-2xl font-bold border border-emerald-100 font-sans flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{getTranslation('noBlockers', language)}</span>
              </div>
            )}
          </div>

          {/* "Your Next Mission" premium closing section wrapper (D16) */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-sm space-y-4" id="mission-action-cta-card">
            <div>
              <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest block mb-1">
                {language === 'fr' ? 'VOTRE PROCHAINE MISSION' : 'مهمتك الريادية القادمة'}
              </span>
              <h3 className="text-lg font-extrabold font-sans leading-tight">
                {language === 'fr' ? "Réaliser 10 entretiens clients qualitatifs" : "الانتهاء من أول 10 لقاءات للعملاء"}
              </h3>
              <p className="text-[11.5px] text-gray-400 pt-1 leading-relaxed">
                {language === 'fr' 
                  ? "C'est l'action prioritaire absolue pour débloquer votre score Marché et guider votre MVP." 
                  : "الشروع فوراً في المقابلات المباشرة لتشبيك مشروعك وتنمية مؤشر السوق بشكل علمي للرائد."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800/80">
              <div>
                <span className="text-gray-400 block text-[10px]">{language === 'fr' ? 'Impact estimé :' : 'الأثر المتوقع :'}</span>
                <span className="font-bold text-emerald-400 font-mono text-[12.5px]">Market +18 / Conf +12</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">{language === 'fr' ? 'Temps conseillé :' : 'الوقت المقدر :'}</span>
                <span className="font-bold text-amber-300 font-mono text-[12.5px]">5 jours</span>
              </div>
            </div>

            {onNavigateRoadmap && (
              <button
                onClick={onNavigateRoadmap}
                className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold text-xs hover:bg-opacity-95 shadow-sm transition-all flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 to-brand-blue cursor-pointer"
              >
                <span>{language === 'fr' ? 'Ouvrir ma Feuille de Route' : 'ابدأ خارطة الطريق'}</span>
                <span>➔</span>
              </button>
            )}
          </div>

        </div>

      </section>

    </div>
  );
};

export default DashboardView;