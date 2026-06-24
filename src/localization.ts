/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MultilingualText } from './types';

export const arTranslations = {
  "_meta": {
    "language_code": "ar",
    "language_name": "العربية",
    "direction": "rtl"
  },

  "common": {
    "app_name": "CompassIQ",
    "loading": "جارٍ التحميل...",
    "save": "حفظ",
    "cancel": "إلغاء",
    "next": "التالي",
    "back": "رجوع",
    "submit": "إرسال",
    "continue": "متابعة",
    "close": "إغلاق",
    "confirm": "تأكيد",
    "yes": "نعم",
    "no": "لا",
    "view_details": "عرض التفاصيل التقنية",
    "hide_details": "إخفاء التفاصيل التقنية",
    "see_more": "عرض المزيد",
    "see_less": "عرض أقل",
    "search": "بحث",
    "language_switch_label": "اللغة",
    "generic_error": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    "network_error": "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.",
    "not_found": "لا توجد نتائج.",
    "required_field": "هذا الحقل مطلوب.",
    "optional": "اختياري"
  },

  "nav": {
    "diagnostic": "التقييم",
    "scores": "نقاطي",
    "roadmap": "خارطة الطريق",
    "mon_parcours": "مساري",
    "profile": "ملفي",
    "logout": "تسجيل الخروج",
    "login": "تسجيل الدخول",
    "register": "إنشاء حساب"
  },

  "auth": {
    "register_title": "إنشاء حسابك في CompassIQ",
    "login_title": "تسجيل الدخول إلى CompassIQ",
    "name_label": "الاسم الكامل",
    "name_placeholder": "مثال: Mohamed Ali",
    "email_label": "البريد الإلكتروني",
    "email_placeholder": "you@example.com",
    "password_label": "كلمة السر",
    "language_preference_label": "اللغة",
    "register_button": "إنشاء حسابي",
    "login_button": "تسجيل الدخول",
    "already_have_account": "هل لديك حساب بالفعل؟",
    "no_account_yet": "ليس لديك حساب بعد؟",
    "invalid_email": "البريد الإلكتروني غير صالح.",
    "email_already_used": "هذا البريد الإلكتروني مستعمل من قبل.",
    "invalid_credentials": "البريد الإلكتروني أو كلمة السر غير صحيحة.",
    "confirm_password_label": "تأكيد كلمة السر",
    "startup_name_label": "اسم المشروع / الشركة الناشئة",
    "startup_name_placeholder": "مثال: BioSolar Tunisia",
    "governorate_label": "الولاية",
    "terms_agreement_text": "أوافق على",
    "terms_link_label": "شروط الخدمة",
    "privacy_link_label": "سياسة الخصوصية",
    "password_too_weak": "يجب أن تتكون كلمة السر من 8 رموز على الأقل.",
    "passwords_dont_match": "كلمتا السر غير متطابقتين.",
    "terms_required": "يجب عليك الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة."
  },
  "stages": {
    "IDEATION": {
      "label": "الفكرة / مشروع ناشئ",
      "desc": "أنت بصدد صياغة الفكرة والتحقق منها وتثبيتها."
    },
    "MARKET_VALIDATION": {
      "label": "التحقق من السوق والعملاء",
      "desc": "أنت بصدد اختبار ما إذا كانت فكرتك تلبي حاجة حقيقية."
    },
    "STRUCTURATION": {
      "label": "الهيكلة والنموذج الوظيفي (MVP)",
      "desc": "أنت بصدد بناء المنتج الأولي القابل للتطبيق."
    },
    "FUNDRAISING": {
      "label": "التمويل والبحث عن الاستثمار",
      "desc": "أنت بصدد تجهيز ملفاتك لإقناع الممولين والمستثمرين."
    },
    "LAUNCH_PLANNING": {
      "label": "الإطلاق التجاري والعائدات الأولى",
      "desc": "أنت بصدد الاستعداد للإطلاق الرسمي وتحقيق أولى مبيعاتك."
    },
    "GROWTH": {
      "label": "النمو والتوسع خارج الجهة",
      "desc": "أنت بصدد تطوير ونمو مشروع قائم وفعّال بالفعل."
    }
  },

  "intake": {
    "title": "تقييم مشروعك",
    "progress_label": "السؤال {current} من حوالي {total}",
    "next_question": "السؤال التالي",
    "previous_question": "السؤال السابق",
    "submit_intake": "إنهاء التقييم",
    "intake_complete_message": "شكراً لك! نقوم الآن بتحليل إجاباتك...",
    "skip_optional": "تجاوز هذا السؤال"
  },

  "diagnostic_result": {
    "title": "نتيجة تقييمك",
    "current_stage_label": "مرحلتك الحالية",
    "evidence_title": "أساس هذه النتيجة",
    "gap_card_title": "تم رصد فرق في التقييم",
    "no_gap_message": "تقييمك الذاتي يتطابق مع تحليلنا — إشارة جيدة على وضوح رؤيتك لمشروعك.",
    "blockers_title": "ما يعيق تقدمك",
    "blocker_domain_financial": "مالي",
    "blocker_domain_legal": "قانوني",
    "blocker_domain_market": "سوقي",
    "blocker_domain_technical": "تقني",
    "blocker_domain_organisational": "تنظيمي",
    "confidence_low_warning": "لا تزال بعض المعلومات ناقصة — أكمل ملفك للحصول على تقييم أكثر دقة."
  },

  "scoring_dashboard": {
    "title": "نقاطك",
    "dimension_market": "جاهزية السوق",
    "dimension_commercial": "الجاهزية التجارية",
    "dimension_innovation": "إمكانات الابتكار",
    "dimension_scalability": "إمكانات النمو",
    "dimension_green": "تأثير الاستدامة",
    "overall_score_label": "النقاط الإجمالية",
    "range_excellent": "ممتاز",
    "range_strong": "قوي",
    "range_good": "جيد",
    "range_needs_improvement": "يحتاج إلى تحسين",
    "range_critical": "أولوية حرجة",
    "improvement_guidance_title": "كيف تتقدم",
    "view_in_roadmap": "← عرض في خارطة الطريق",
    "score_evolution_label": "التطور منذ آخر تقييم",
    "status_label": "الحالة",
    "card_what_it_measures": "ما الذي يقيسه هذا المؤشر",
    "card_why": "لماذا حصلت على هذه النتيجة",
    "card_strengths": "نقاط القوة",
    "card_improve": "فرص التحسين",
    "card_next_action": "الإجراء الموصى به",
    "card_expected_impact": "الأثر المتوقع",
    "card_mentor_note": "نصيحة مرشدك",
    "limited_progress_title": "لماذا تقدمك محدود حالياً",
    "encouragement_default": "كل مشروع ناجح يبدأ بالتحقق من فرضياته مع عملاء حقيقيين. واصل التقدم بهذه الروح — كل خطوة مهمة."
  },

  "roadmap": {
    "title": "خارطة طريقك",
    "header_title": "خارطة طريقك الشخصية",
    "header_subtitle": "تم إنشاؤها بناءً على تقييم مشروعك وموارد ريادة الأعمال التونسية الموثوقة.",
    "verified_badge": "مصادر موثوقة",
    "trusted_resources_note": "استناداً إلى موارد موثوقة من منظومة ريادة الأعمال التونسية.",
    "intro_text": "بناءً على تقييمك، أعدّت CompassIQ خطة عمل شخصية لمساعدة مشروعك على التقدم نحو مرحلة النضج التالية.",
    "progress_title": "تقدم اليوم",
    "progress_completed_label": "{completed}/{total} منجزة",
    "horizon_immediate": "للقيام به الآن",
    "horizon_short_term": "خلال الأسابيع القادمة",
    "horizon_medium_term": "خلال الأشهر القادمة",
    "empty_state": "لا توجد توصيات متاحة في الوقت الحالي.",
    "partial_match_note": "موارد قليلة خاصة بقطاعك — هذه أكثرها أهمية بالنسبة لك حالياً.",
    "regenerate_button": "تحديث خارطة طريقي",
    "addresses_label": "يتعلق بـ:",
    "source_label": "المصدر:",
    "card_why_label": "لماذا؟",
    "card_expected_impact_label": "الأثر المتوقع",
    "card_estimated_time_label": "الوقت المقدر",
    "card_action_label": "الإجراء الموصى به",
    "card_resources_label": "الموارد",
    "card_learn_more": "معرفة المزيد",
    "card_eligibility_label": "متى ينطبق هذا؟",
    "completion_reward_title": "تهانينا!",
    "completion_reward_message": "أصبحت الآن جاهزاً للانتقال إلى مرحلة: {stage}.",
    "mark_done_button": "وضع علامة منجز"
  },

  "categories": {
    "funding": "تمويل",
    "training": "تكوين",
    "legal": "قانوني",
    "business": "أعمال",
    "market": "سوق",
    "sustainability": "استدامة"
  },

  "priority": {
    "label": "الأولوية",
    "critical": "حرجة",
    "important": "مهمة",
    "optional": "اختيارية"
  },

  "mon_parcours": {
    "page_title": "مساري وتطور النضج",
    "profile_section_title": "ملف الشركة الناشئة",
    "stage_description_ideation": "أنت في بداية رحلتك الريادية.",
    "stage_description_market_validation": "تختبر الآن إن كانت فكرتك تلبي حاجة حقيقية في السوق.",
    "stage_description_structuration": "تبني حالياً الأساس الصلب لمشروعك.",
    "stage_description_fundraising": "تُجهّز مشروعك لإقناع الممولين والمستثمرين.",
    "stage_description_launch_planning": "تستعد لإطلاق نشاطك بشكل رسمي.",
    "stage_description_growth": "تعمل على تطوير ونمو مشروع قائم وفعّال.",
    "journey_section_title": "مساري الريادي",
    "journey_today_label": "اليوم",
    "scores_section_title": "نقاطي",
    "scores_view_evolution_toggle": "عرض التطور عبر الزمن",
    "next_priority_section_title": "أولويتي القادمة",
    "next_priority_impact_label": "الأثر المتوقع",
    "next_priority_empty": "أنت متقدم في كل أولوياتك الحالية!",
    "simulator_section_title": "محاكي \"ماذا لو...؟\"",
    "simulator_intro": "جرّب تأثير بعض الإجراءات الملموسة على نقاطك.",
    "simulator_action_interviews": "إجراء 10 مقابلات مع العملاء",
    "simulator_action_prototype": "إنشاء نموذج أولي",
    "simulator_action_pricing": "التحقق من استراتيجية التسعير",
    "simulator_action_growth_plan": "بناء خطة نمو",
    "simulator_action_register_company": "تسجيل الشركة رسمياً",
    "simulator_before_label": "حالياً",
    "simulator_after_label": "بعد هذه الإجراءات",
    "simulator_stage_unlocked": "مرحلة جديدة بانتظارك: {stage}",
    "achievements_section_title": "إنجازاتي",
    "achievements_unlocked_on": "تم تحقيقه في {date}",
    "achievements_locked_requirement": "للحصول عليه:",
    "activity_log_section_title": "سجل النشاط",
    "activity_log_empty": "سيظهر سجلّك هنا بعد تقييمك القادم.",
    "motivation_banner_template": "تهانينا! تقدمت بمقدار {points} نقطة منذ آخر تقييم.",
    "single_assessment_note": "أكمل تقييماً جديداً لترى تقدمك هنا.",
    "confidence_label": "مؤشر الثقة في التقييم",
    "action_status_not_started": "لم يبدأ",
    "action_status_in_progress": "قيد التنفيذ",
    "action_status_done": "منتهٍ"
  },

  "chatbot": {
    "title": "مساعد CompassIQ",
    "input_placeholder": "اكتب سؤالك هنا...",
    "send_button": "إرسال",
    "thinking": "المساعد يفكر الآن...",
    "grounding_disclaimer": "تعتمد الإجابات على تقييمك ونقاطك وقاعدة الموارد الخاصة بنا.",
    "no_answer_found": "لم أجد معلومات موثوقة للإجابة عن هذا السؤال."
  },

  "errors": {
    "page_not_found": "الصفحة غير موجودة.",
    "session_expired": "انتهت صلاحية جلستك. يرجى تسجيل الدخول مجدداً.",
    "server_error": "حدث خطأ من جهة الخادم. حاول مرة أخرى لاحقاً.",
    "permission_denied": "لا تملك صلاحية الوصول إلى هذا المورد."
  }
};

export const frTranslations = {
  "_meta": {
    "language_code": "fr",
    "language_name": "Français",
    "direction": "ltr"
  },

  "common": {
    "app_name": "CompassIQ",
    "loading": "Chargement...",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "next": "Suivant",
    "back": "Retour",
    "submit": "Soumettre",
    "continue": "Continuer",
    "close": "Fermer",
    "confirm": "Confirmer",
    "yes": "Oui",
    "no": "Non",
    "view_details": "Voir le détail technique",
    "hide_details": "Masquer le détail technique",
    "see_more": "Voir plus",
    "see_less": "Voir moins",
    "search": "Rechercher",
    "language_switch_label": "Langue",
    "generic_error": "Une erreur s'est produite. Veuillez réessayer.",
    "network_error": "Impossible de se connecter au serveur. Vérifiez votre connexion internet.",
    "not_found": "Aucun résultat trouvé.",
    "required_field": "Ce champ est obligatoire.",
    "optional": "Facultatif"
  },

  "nav": {
    "diagnostic": "Diagnostic",
    "scores": "Mes Scores",
    "roadmap": "Feuille de Route",
    "mon_parcours": "Mon Parcours",
    "profile": "Mon Profil",
    "logout": "Déconnexion",
    "login": "Connexion",
    "register": "Inscription"
  },

  "auth": {
    "register_title": "Créer votre compte CompassIQ",
    "login_title": "Se connecter à CompassIQ",
    "name_label": "Nom complet",
    "name_placeholder": "Ex: Mohamed Ali",
    "email_label": "Adresse e-mail",
    "email_placeholder": "vous@exemple.com",
    "password_label": "Mot de passe",
    "language_preference_label": "Langue",
    "register_button": "Créer mon compte",
    "login_button": "Se connecter",
    "already_have_account": "Vous avez déjà un compte ?",
    "no_account_yet": "Pas encore de compte ?",
    "invalid_email": "Adresse e-mail invalide.",
    "email_already_used": "Cette adresse e-mail est déjà utilisée.",
    "invalid_credentials": "E-mail ou mot de passe incorrect.",
    "confirm_password_label": "Confirmer le mot de passe",
    "startup_name_label": "Nom du projet / de la startup",
    "startup_name_placeholder": "Ex: BioSolar Tunisia",
    "governorate_label": "Gouvernorat",
    "terms_agreement_text": "J'accepte les",
    "terms_link_label": "Conditions d'utilisation",
    "privacy_link_label": "Politique de confidentialité",
    "password_too_weak": "Le mot de passe doit contenir au moins 8 caractères.",
    "passwords_dont_match": "Les mots de passe ne correspondent pas.",
    "terms_required": "Vous devez accepter les conditions d'utilisation et la politique de confidentialité pour continuer."
  },
  "stages": {
    "IDEATION": {
      "label": "Idéation / Projet naissant",
      "desc": "Vous structurez et validez encore votre idée."
    },
    "MARKET_VALIDATION": {
      "label": "Validation Marché / Recherche de preuves",
      "desc": "Vous testez si votre idée répond à un besoin réel."
    },
    "STRUCTURATION": {
      "label": "Structuration / MVP fonctionnel",
      "desc": "Vous bâtissez les bases de votre premier produit minimal viable."
    },
    "FUNDRAISING": {
      "label": "Levée de Fonds / Financements requis",
      "desc": "Vous préparez vos dossiers financiers pour convaincre des investisseurs."
    },
    "LAUNCH_PLANNING": {
      "label": "Lancement Commercial et premiers revenus",
      "desc": "Vous préparez l'introduction officielle et les premières ventes."
    },
    "GROWTH": {
      "label": "Croissance & Expansion d'échelle",
      "desc": "Vous cherchez à développer ou passer votre entreprise à l'échelle supérieure."
    }
  },

  "intake": {
    "title": "Diagnostic de votre projet",
    "progress_label": "Question {current} sur environ {total}",
    "next_question": "Question suivante",
    "previous_question": "Question précédente",
    "submit_intake": "Terminer le diagnostic",
    "intake_complete_message": "Merci ! Nous analysons vos réponses...",
    "skip_optional": "Passer cette question"
  },

  "diagnostic_result": {
    "title": "Résultat de votre diagnostic",
    "current_stage_label": "Votre stade actuel",
    "evidence_title": "Sur quoi se base ce résultat",
    "gap_card_title": "Un écart a été détecté",
    "no_gap_message": "Votre propre évaluation correspond à notre analyse — bon signe de lucidité sur votre projet.",
    "blockers_title": "Ce qui freine votre avancement",
    "blocker_domain_financial": "Financier",
    "blocker_domain_legal": "Juridique",
    "blocker_domain_market": "Marché",
    "blocker_domain_technical": "Technique",
    "blocker_domain_organisational": "Organisationnel",
    "confidence_low_warning": "Certaines informations manquent encore — complétez votre profil pour un diagnostic plus précis."
  },

  "scoring_dashboard": {
    "title": "Vos Scores",
    "dimension_market": "Préparation du Marché",
    "dimension_commercial": "Préparation Commerciale",
    "dimension_innovation": "Potentiel d'Innovation",
    "dimension_scalability": "Potentiel de Croissance",
    "dimension_green": "Impact de Durabilité",
    "overall_score_label": "Score Global",
    "range_excellent": "Excellent",
    "range_strong": "Solide",
    "range_good": "Prometteur",
    "range_needs_improvement": "À améliorer",
    "range_critical": "Priorité critique",
    "improvement_guidance_title": "Comment progresser",
    "view_in_roadmap": "Voir dans la feuille de route →",
    "score_evolution_label": "Évolution depuis le dernier diagnostic",
    "status_label": "Statut",
    "card_what_it_measures": "Ce que mesure ce score",
    "card_why": "Pourquoi ce score",
    "card_strengths": "Points forts",
    "card_improve": "Pistes d'amélioration",
    "card_next_action": "Action recommandée",
    "card_expected_impact": "Impact attendu",
    "card_mentor_note": "Le conseil de votre coach",
    "limited_progress_title": "Pourquoi votre progression est actuellement limitée",
    "encouragement_default": "Chaque startup qui réussit commence par valider ses hypothèses auprès de vrais clients. Continuez sur cette lancée — chaque étape compte."
  },

  "roadmap": {
    "title": "Votre Feuille de Route",
    "header_title": "Votre Feuille de Route Personnalisée",
    "header_subtitle": "Générée à partir de votre diagnostic et de ressources entrepreneuriales tunisiennes vérifiées.",
    "verified_badge": "Sources Vérifiées",
    "trusted_resources_note": "Basé sur des ressources fiables de l'écosystème entrepreneurial tunisien.",
    "intro_text": "Sur la base de votre diagnostic, CompassIQ a élaboré un plan d'action personnalisé pour faire progresser votre startup vers le prochain stade de maturité.",
    "progress_title": "Progression du jour",
    "progress_completed_label": "{completed}/{total} terminées",
    "horizon_immediate": "À faire maintenant",
    "horizon_short_term": "Dans les prochaines semaines",
    "horizon_medium_term": "Dans les prochains mois",
    "empty_state": "Aucune recommandation disponible pour le moment.",
    "partial_match_note": "Peu de ressources spécifiques à votre secteur — voici les plus pertinentes disponibles.",
    "regenerate_button": "Mettre à jour ma feuille de route",
    "addresses_label": "Concerne :",
    "source_label": "Source :",
    "card_why_label": "Pourquoi ?",
    "card_expected_impact_label": "Impact attendu",
    "card_estimated_time_label": "Temps estimé",
    "card_action_label": "Action recommandée",
    "card_resources_label": "Ressources",
    "card_learn_more": "En savoir plus",
    "card_eligibility_label": "Quand cela s'applique-t-il ?",
    "completion_reward_title": "Félicitations !",
    "completion_reward_message": "Vous êtes maintenant prêt à passer à l'étape : {stage}.",
    "mark_done_button": "Marquer comme terminé"
  },

  "categories": {
    "funding": "Financement",
    "training": "Formation",
    "legal": "Juridique",
    "business": "Entreprise",
    "market": "Marché",
    "sustainability": "Durabilité"
  },

  "priority": {
    "label": "Priorité",
    "critical": "Critique",
    "important": "Important",
    "optional": "Optionnel"
  },

  "mon_parcours": {
    "page_title": "Mon Parcours & Évolution de Maturité",
    "profile_section_title": "Profil Startup",
    "stage_description_ideation": "Vous êtes au début de votre parcours entrepreneurial.",
    "stage_description_market_validation": "Vous testez si votre idée correspond à un vrai besoin du marché.",
    "stage_description_structuration": "Vous construisez les bases solides de votre entreprise.",
    "stage_description_fundraising": "Vous préparez votre projet pour convaincre des investisseurs.",
    "stage_description_launch_planning": "Vous vous préparez à lancer officiellement votre activité.",
    "stage_description_growth": "Vous développez et faites grandir une entreprise en activité.",
    "journey_section_title": "Mon Parcours Entrepreneurial",
    "journey_today_label": "Aujourd'hui",
    "scores_section_title": "Mes Scores",
    "scores_view_evolution_toggle": "Voir l'évolution dans le temps",
    "next_priority_section_title": "Ma Prochaine Priorité",
    "next_priority_impact_label": "Impact estimé",
    "next_priority_empty": "Vous êtes à jour sur toutes vos priorités actuelles !",
    "simulator_section_title": "Simulateur \"Et si... ?\"",
    "simulator_intro": "Simulez l'effet de quelques actions concrètes sur vos scores.",
    "simulator_action_interviews": "Réaliser 10 entretiens clients",
    "simulator_action_prototype": "Créer un prototype",
    "simulator_action_pricing": "Valider la stratégie de prix",
    "simulator_action_growth_plan": "Construire un plan de croissance",
    "simulator_action_register_company": "Enregistrer l'entreprise",
    "simulator_before_label": "Actuellement",
    "simulator_after_label": "Après ces actions",
    "simulator_stage_unlocked": "Prochaine étape débloquée : {stage}",
    "achievements_section_title": "Mes Réussites",
    "achievements_unlocked_on": "Débloqué le {date}",
    "achievements_locked_requirement": "À débloquer :",
    "activity_log_section_title": "Historique d'Activité",
    "activity_log_empty": "Votre historique apparaîtra ici après votre prochain diagnostic.",
    "motivation_banner_template": "Félicitations ! Vous avez progressé de {points} points depuis votre dernier diagnostic.",
    "single_assessment_note": "Complétez un nouveau diagnostic pour voir votre progression ici.",
    "confidence_label": "Indice de confiance du diagnostic",
    "action_status_not_started": "Non commencé",
    "action_status_in_progress": "En cours",
    "action_status_done": "Terminé"
  },

  "chatbot": {
    "title": "Assistant CompassIQ",
    "input_placeholder": "Posez votre question...",
    "send_button": "Envoyer",
    "thinking": "L'assistant réfléchit...",
    "grounding_disclaimer": "Les réponses sont basées sur votre diagnostic, vos scores et notre base de ressources.",
    "no_answer_found": "Je n'ai pas trouvé d'information fiable pour répondre à cette question."
  },

  "errors": {
    "page_not_found": "Page introuvable.",
    "session_expired": "Votre session a expiré. Veuillez vous reconnecter.",
    "server_error": "Une erreur est survenue du côté du serveur. Réessayez plus tard.",
    "permission_denied": "Vous n'avez pas accès à cette ressource."
  }
};

// Map old keys to the new dot-notation paths for full backward compatibility
export const legacyTranslations: Record<string, MultilingualText> = {
  appName: { fr: "CompassIQ", ar: "CompassIQ" },
  appSubtitle: {
    fr: "Diagnostic de Maturité Entrepreneuriale Adaptatif — Tunis 2026",
    ar: "مقياس ذكي ونموذجي لنضج المشاريع الريادية — تونس 2026"
  },
  sponsors: {
    fr: "Propulsé par PNUD | GEWEET | ODC | IEEE | APII",
    ar: "بدعم من برنامج الأمم المتحدة الإنمائي | GEWEET | فودافون/ODC | IEEE | APII"
  },
  registerTitle: { fr: "Créer un profil de projet", ar: "إنشاء ملف مشروع جديد" },
  registerSubtitle: {
    fr: "Commencez votre diagnostic de maturité entrepreneuriale en quelques étapes.",
    ar: "ابدأ عملية تشخيص ونضج مشروعك الريادي في خطوات بسيطة."
  },
  loginSubtitle: {
    fr: "Accédez à votre diagnostic existant et suivez votre parcours.",
    ar: "الولوج إلى تشخيصك الحالي ومسار تطور مشروعك."
  },
  projectName: { fr: "Nom de la startup / projet", ar: "اسم الشركة الناشئة / المشروع" },
  governorate: { fr: "Gouvernorat de Tunis ou région", ar: "الولاية / الجهة بتونس" },
  sector: { fr: "Secteur d'activité", ar: "قطاع النشاط" },
  selectSector: { fr: "Sélectionnez votre secteur", ar: "اختر القطاع المناسب" },
  selfAssessedStage: { fr: "Auto-évaluation : Stade estimé", ar: "التقييم الذاتي: المرحلة التقديرية" },
  selectStage: { fr: "Sélectionnez votre stade estimé", ar: "اختر المرحلة التقديرية" },
  orRegister: {
    fr: "Je n'ai pas de compte — Créer un profil",
    ar: "ليس لدي حساب — إنشاء ملف مشروع"
  },
  orLogin: {
    fr: "Déjà enregistré — Accéder au tableau de bord",
    ar: "مسجل بالفعل — الانتقال إلى لوحة التحكم"
  },
  S1: { fr: "Idéation", ar: "الفكرة (Idéation)" },
  S2: { fr: "Validation Marché", ar: "التحقق من السوق (Validation Marché)" },
  S3: { fr: "Structuration", ar: "الهيكلة (Structuration)" },
  S4: { fr: "Levée de Fonds", ar: "جمع التمويل (Levée de Fonds)" },
  S5: { fr: "Lancement", ar: "الإطلاق (Lancement)" },
  S6: { fr: "Croissance", ar: "النمو (Croissance)" },
  G1: {
    fr: "[Règle G1] Moins de 5 entretiens clients limitent le score Marché à 50%.",
    ar: "[قاعدة G1] إجراء أقل من 5 مقابلات عملاء يحد من تقييم السوق عند 50%."
  },
  G2: {
    fr: "[Règle G2] Sans revenus ni clients payants actifs, le score Offre Commerciale est limité à 50%.",
    ar: "[قاعدة G2] دون عائدات مستمرة أو عملاء دافعين، يُسقف تقييم العرض عند 50%."
  },
  G3: {
    fr: "[Règle G3] L'absence totale de prototype limite le score Innovation commerciale à 60%.",
    ar: "[قاعدة G3] غياب وجود نموذج أولي يحد من تقييم الابتكار عند 60%."
  },
  G4: {
    fr: "[Règle G4] Sans plan de croissance documenté, le score de Scalabilité globale est limité à 60%.",
    ar: "[قاعدة G4] دون خطة نمو وهيكلة واضحة، يُسقف تقييم التوسع عند 60%."
  },
  G5: {
    fr: "[Règle G5] Secteur à fort impact (AgriTech/Industrie/Énergie) sans diagnostic environnemental limite le score vert à 40%.",
    ar: "[قاعدة G5] قطاع ذو تأثير بيئي حرج دون تقييم بيئي مسبق يحد من تقييم التأثير الأخضر عند 40%."
  },
  evidenceSection: {
    fr: "Synthèse de l'Évaluation & Statut des Critères",
    ar: "ملخص التقييم وحالة معايير النضج"
  },
  evidenceDesc: {
    fr: "Ci-dessous le statut de validation de chaque critère d'éligibilité requis pour la validation de ce stade.",
    ar: "فيما يلي توضيح لمدى مطابقة شروط النضج حسب المعايير المعتمدة وطرق التقييم."
  },
  perceptionGapHeader: {
    fr: "Analyse de Cohérence & Écart de Perception",
    ar: "تحليل تناسق ووضوح الرؤية الريادية"
  },
  actualDiagnosed: {
    fr: "Stade Réel Diagnostiqué",
    ar: "مرحلة النضج الفعلية"
  },
  selfEstimated: {
    fr: "Votre Auto-évaluation Spontanée",
    ar: "التقييم الذاتي للمشروع"
  },
  severityHigh: {
    fr: "Impact Critique",
    ar: "تأثير حرج للعاطل"
  },
  roadmapHeader: {
    fr: "Actions Immédiates issues de votre Feuille de Route",
    ar: "الإجراءات العاجلة من خارطة الطريق"
  },
  horizonImmediate: {
    fr: "À faire immédiatement",
    ar: "إجراءات عاجلة للقيام بها الآن"
  },
  horizonShort: {
    fr: "À court terme (quelques semaines)",
    ar: "إجراءات قصيرة المدى (أسابيع)"
  },
  horizonMedium: {
    fr: "À moyen terme (quelques mois)",
    ar: "إجراءات متوسطة المدى (أشهر)"
  }
};

export function getTranslation(key: string, lang: 'fr' | 'ar', fallback: string = ""): string {
  // Try resolving with path-based lookup (e.g. "common.app_name")
  const lookup = (obj: any, path: string): string | undefined => {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return typeof current === 'string' ? current : undefined;
  };

  // Modern keys and direct flat resolutions
  const legacyMap: Record<string, string> = {
    appName: "common.app_name",
    loading: "common.loading",
    btnNext: "common.next",
    btnPrev: "common.back",
    btnSkip: "intake.skip_optional",
    btnSubmit: "intake.submit_intake",
    btnBack: "common.back",
    btnSave: "common.save",
    navAssessment: "nav.diagnostic",
    navDashboard: "nav.scores",
    navRoadmap: "nav.roadmap",
    navParcours: "nav.mon_parcours",
    overallScore: "scoring_dashboard.overall_score_label",
    confidenceScore: "mon_parcours.confidence_label",
    whyExplain: "scoring_dashboard.card_why",
    primaryGap: "scoring_dashboard.card_improve",
    concreteAction: "scoring_dashboard.card_next_action",
    market: "scoring_dashboard.dimension_market",
    commercial: "scoring_dashboard.dimension_commercial",
    innovation: "scoring_dashboard.dimension_innovation",
    scalability: "scoring_dashboard.dimension_scalability",
    green: "scoring_dashboard.dimension_green",
    blockersHeader: "diagnostic_result.blockers_title",
    registerTitle: "auth.register_title",
    loginTitle: "auth.login_title",
    userName: "auth.name_label",
    projectName: "auth.name_placeholder",
    emailLabel: "auth.email_label",
    passwordLabel: "auth.password_label",
    registrationBtn: "auth.register_button",
    loginBtn: "auth.login_button",
    buttonStart: "common.continue",
    buttonLogin: "auth.login_button",
    noBlockers: "mon_parcours.next_priority_empty"
  };

  const resolvedPath = legacyMap[key] || key;
  const langObj = lang === 'ar' ? arTranslations : frTranslations;

  const value = lookup(langObj, resolvedPath);
  if (value !== undefined) {
    return value;
  }

  // Fallback to legacy dictionary
  if (legacyTranslations[key]) {
    return legacyTranslations[key][lang];
  }

  return fallback || key;
}
