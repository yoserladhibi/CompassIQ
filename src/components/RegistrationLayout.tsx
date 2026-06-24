/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Language, ProjectProfile } from '../types';
import { getTranslation } from '../localization';
import { LOGO_SRC } from './Logo';
import {
  Lightbulb,
  CheckCircle2,
  Layers,
  Coins,
  Rocket,
  TrendingUp,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Building2,
  MapPin,
  Compass,
  AlertCircle
} from 'lucide-react';

const maturityStageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  S1: Lightbulb,
  S2: CheckCircle2,
  S3: Layers,
  S4: Coins,
  S5: Rocket,
  S6: TrendingUp
};

const STAGE_ID_TO_CODE: Record<string, string> = {
  'S1': 'IDEATION',
  'S2': 'MARKET_VALIDATION',
  'S3': 'STRUCTURATION',
  'S4': 'FUNDRAISING',
  'S5': 'LAUNCH_PLANNING',
  'S6': 'GROWTH',
};

interface RegistrationLayoutProps {
  language: Language;
  onRegistered: (profile: ProjectProfile) => void;
  onLanguageChange?: (lang: Language) => void;
}

export const RegistrationLayout: React.FC<RegistrationLayoutProps> = ({
  language,
  onRegistered,
  onLanguageChange
}) => {
  const [isLoginView, setIsLoginView] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Register
  const [promoterName, setPromoterName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [projectName, setProjectName] = useState('');
  const [governorate, setGovernorate] = useState('Tunis');
  const [sector, setSector] = useState('agritech');
  const [selfAssessed, setSelfAssessed] = useState('S1');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form State - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Errors State
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset errors when switching views
  useEffect(() => {
    setFormError('');
    setFieldErrors({});
  }, [isLoginView]);

  // Simple Password Strength Calculator
  const getPasswordStrength = (val: string) => {
    if (!val) return { label: '', color: 'bg-gray-200', score: 0 };
    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val) || /[a-z]/.test(val)) score += 1;
    if (/[0-9]/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;

    if (score <= 1) return { label: language === 'fr' ? 'Faible' : 'ضعيف', color: 'bg-red-500', score };
    if (score <= 3) return { label: language === 'fr' ? 'Moyen' : 'متوسط', color: 'bg-yellow-500', score };
    return { label: language === 'fr' ? 'Fort' : 'قوي', color: 'bg-green-500', score };
  };

  const strength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    // Inline Validation
    const errors: Record<string, string> = {};

    if (!promoterName.trim()) {
      errors.promoterName = getTranslation('common.required_field', language);
    }

    if (!email.trim()) {
      errors.email = getTranslation('common.required_field', language);
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = getTranslation('auth.invalid_email', language);
      }
    }

    if (!password) {
      errors.password = getTranslation('common.required_field', language);
    } else if (password.length < 8) {
      errors.password = getTranslation('auth.password_too_weak', language);
    }

    if (confirmPassword !== password) {
      errors.confirmPassword = getTranslation('auth.passwords_dont_match', language);
    }

    if (!projectName.trim()) {
      errors.projectName = getTranslation('common.required_field', language);
    }

    if (!termsAccepted) {
      errors.terms = getTranslation('auth.terms_required', language);
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: promoterName,
          email: email.trim(),
          password: password,
          language_preference: language,
          startup_name: projectName.trim(),
          region_code: governorate.toUpperCase(),
          sector_code: sector.toUpperCase(),
          self_assessed_stage_code: STAGE_ID_TO_CODE[selfAssessed]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error) {
          const translatedMsg = getTranslation(data.error, language);
          if (data.error === 'auth.email_already_used') {
            setFieldErrors({ email: translatedMsg });
          } else if (data.error === 'auth.invalid_email') {
            setFieldErrors({ email: translatedMsg });
          } else if (data.error === 'auth.password_too_weak') {
            setFieldErrors({ password: translatedMsg });
          } else {
            setFormError(translatedMsg);
          }
        } else {
          setFormError(language === 'fr' ? 'Une erreur est survenue lors de l’inscription.' : 'حدث خطأ أثناء التسجيل.');
        }
        return;
      }

      const { project_id } = data;
      const profileRep = await fetch(`/api/profile/${project_id}`);
      if (profileRep.ok) {
        const fullProfile = await profileRep.json() as ProjectProfile;
        onRegistered(fullProfile);
      } else {
        throw new Error('Failed to load registered profile');
      }
    } catch (err) {
      setFormError(language === 'fr' ? 'Impossible de se connecter au serveur.' : 'تعذر الاتصال بالخادم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!loginEmail.trim()) {
      errors.loginEmail = getTranslation('common.required_field', language);
    }
    if (!loginPassword) {
      errors.loginPassword = getTranslation('common.required_field', language);
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setFormError(getTranslation(data.error || 'auth.invalid_credentials', language));
        return;
      }

      const { project_id, language_preference } = data;
      if (onLanguageChange && language_preference && language_preference !== language) {
        onLanguageChange(language_preference as Language);
      }

      const profileRep = await fetch(`/api/profile/${project_id}`);
      if (profileRep.ok) {
        const fullProfile = await profileRep.json() as ProjectProfile;
        onRegistered(fullProfile);
      } else {
        throw new Error('Failed to load profile');
      }
    } catch (err) {
      setFormError(language === 'fr' ? 'E-mail ou mot de passe incorrect.' : 'البريد الإلكتروني أو كلمة السر غير صحيحة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectors = [
    { value: 'agritech', labelFr: 'AgriTech & Technologies Agricoles', labelAr: 'التكنولوجيا الفلاحية والزراعية' },
    { value: 'fintech', labelFr: 'FinTech & Services Financiers', labelAr: 'التكنولوجيا المالية والتأمين' },
    { value: 'healthtech', labelFr: 'HealthTech, MedTech & e-Santé', labelAr: 'التكنولوجيا الصحية والرقمية الطبية' },
    { value: 'edtech', labelFr: 'EdTech, E-Learning & Éducation', labelAr: 'تكنولوجيا التعليم والتدريب الرقمي' },
    { value: 'ecommerce', labelFr: 'E-Commerce & RetailTech', labelAr: 'التجارة الإلكترونية وحلول التجزئة' },
    { value: 'logistics', labelFr: 'Smart City, Transport & Logistique', labelAr: 'اللوجستيك ونقل البضائع والمدن الذكية' },
    { value: 'energy', labelFr: 'CleanTech & Management Énergétique', labelAr: 'الطاقة المتجددة والتكنولوجيا النظيفة' },
    { value: 'manufacturing', labelFr: 'Industrie 4.0 & Fabrication', labelAr: 'صناعة المستقبل والإنتاج الذكي' },
    { value: 'tourism', labelFr: 'Tourisme Durable & Patrimoine', labelAr: 'السياحة المستدامة وتثمين التراث' },
    { value: 'greentech', labelFr: 'GreenTech & Économie Circulaire', labelAr: 'التكنولوجيا البيئية والاقتصاد الدائري' },
    { value: 'deeptech', labelFr: 'DeepTech, IoT & Intelligence Artificielle', labelAr: 'التكنولوجيا العميقة، الذكاء الاصطناعي وإنترنت الأشياء' },
    { value: 'service', labelFr: 'Services Innovants aux Entreprises (SaaS B2B)', labelAr: 'الخدمات المبتكرة للمؤسسات' },
    { value: 'creative', labelFr: 'Industries Créatives, Médias & Gaming', labelAr: 'الصناعات الإبداعية، الإعلام والألعاب' },
    { value: 'social_impact', labelFr: 'CivicTech & Impact Social', labelAr: 'ريادة الأعمال الاجتماعية وحلول الأثر' },
    { value: 'other', labelFr: 'Autres Technologies & Softwares', labelAr: 'البرمجيات الرقمية والتقنيات الأخرى' }
  ];

  const maturityStages = [
    { id: 'S1', code: 'IDEATION' },
    { id: 'S2', code: 'MARKET_VALIDATION' },
    { id: 'S3', code: 'STRUCTURATION' },
    { id: 'S4', code: 'FUNDRAISING' },
    { id: 'S5', code: 'LAUNCH_PLANNING' },
    { id: 'S6', code: 'GROWTH' }
  ];

  const governorates = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Béja', 'Jendouba', 
    'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 
    'Gabès', 'Medenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kebili'
  ];

  const isRtl = language === 'ar';

  return (
    <div className="max-w-4xl mx-auto my-12 px-6" id="registration-onboarding-container" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-xl border border-brand-marble/30 overflow-hidden transform transition-all duration-300">
        
        {/* Hero — large centered logo watermark behind headline */}
        <div
          className="bg-gradient-to-br from-[#0B2847] via-brand-blue to-[#1e293b] px-6 py-12 sm:px-8 sm:py-14 md:px-10 md:py-16 text-white relative overflow-hidden"
          id="registration-hero"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-[length:min(88vw,280px)] sm:bg-[length:min(80vw,320px)] md:bg-[length:min(55vw,500px)] opacity-[0.35]"
            style={{ backgroundImage: `url('${LOGO_SRC}')` }}
            id="hero-logo-watermark"
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,40,71,0.15)_0%,rgba(11,40,71,0.55)_100%)]" />

          <div className="relative z-10 flex flex-col items-center justify-center text-center min-h-[9rem] sm:min-h-[10rem] md:min-h-[11rem]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-2 max-w-xl mx-auto px-2 drop-shadow-[0_1px_8px_rgba(11,40,71,0.85)]"
              id="hero-content"
            >
              <p className="text-base sm:text-lg md:text-xl font-semibold text-white leading-snug tracking-tight">
                {language === 'fr'
                  ? 'Diagnostic de Maturité Entrepreneuriale Adaptatif'
                  : 'مقياس ذكي ونموذجي لنضج المشاريع الريادية'}
              </p>
              <p className="text-sm sm:text-base text-brand-ivory/90 font-medium">
                {language === 'fr' ? 'Tunis 2026' : 'تونس 2026'}
              </p>
            </motion.div>
          </div>
        </div>

        {/* View Switch Tabs */}
        <div className="flex border-b border-brand-marble/25 bg-brand-ivory/40">
          <button
            id="tab-toggle-register"
            onClick={() => setIsLoginView(false)}
            className={`flex-1 py-4 text-center font-bold text-sm transition-all focus:outline-none ${
              !isLoginView ? 'text-brand-blue border-b-4 border-brand-blue bg-white' : 'text-gray-500 hover:text-brand-blue'
            }`}
          >
            {getTranslation('registerTitle', language)}
          </button>
          <button
            id="tab-toggle-login"
            onClick={() => setIsLoginView(true)}
            className={`flex-1 py-4 text-center font-bold text-sm transition-all focus:outline-none ${
              isLoginView ? 'text-brand-blue border-b-4 border-brand-blue bg-white' : 'text-gray-500 hover:text-brand-blue'
            }`}
          >
            {getTranslation('loginTitle', language)}
          </button>
        </div>

        <div className="p-8">
          {formError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 text-red-700 animate-slide-in">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{formError}</p>
              </div>
            </div>
          )}

          {!isLoginView ? (
            <form onSubmit={handleRegister} className="space-y-8" id="registration-form">
              
              {/* SECTION 1: VOTRE COMPTE */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-150 pb-2">
                  <User className="w-5 h-5 text-brand-blue" />
                  <h3 className="text-lg font-bold text-[#1e293b]">
                    {language === 'fr' ? "Votre compte" : "حسابك الشخصي"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nom complet */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                      {getTranslation('auth.name_label', language)} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-promoter-name"
                        type="text"
                        value={promoterName}
                        onChange={(e) => setPromoterName(e.target.value)}
                        placeholder={getTranslation('auth.name_placeholder', language)}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          fieldErrors.promoterName ? 'border-red-400 focus:ring-red-150' : 'border-gray-300 focus:ring-brand-blue/50'
                        } focus:outline-none focus:ring-2 text-gray-900 bg-brand-ivory/5`}
                      />
                    </div>
                    {fieldErrors.promoterName && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {fieldErrors.promoterName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                      {getTranslation('auth.email_label', language)} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={getTranslation('auth.email_placeholder', language)}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          fieldErrors.email ? 'border-red-400 focus:ring-red-150' : 'border-gray-300 focus:ring-brand-blue/50'
                        } focus:outline-none focus:ring-2 text-gray-900 bg-brand-ivory/5`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                      {getTranslation('auth.password_label', language)} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 ${isRtl ? 'pl-10' : 'pr-10'} rounded-xl border ${
                          fieldErrors.password ? 'border-red-400 focus:ring-red-150' : 'border-gray-300 focus:ring-brand-blue/50'
                        } focus:outline-none focus:ring-2 text-gray-900 bg-brand-ivory/5`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center text-gray-400 hover:text-gray-600`}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${(strength.score / 4) * 100}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-500 flex items-center justify-between">
                          <span>{language === 'fr' ? "Force du mot de passe" : "قوة كلمة السر"} :</span>
                          <span className="font-extrabold">{strength.label}</span>
                        </p>
                      </div>
                    )}
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                      {getTranslation('auth.confirm_password_label', language)} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 ${isRtl ? 'pl-10' : 'pr-10'} rounded-xl border ${
                          fieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-150' : 'border-gray-300 focus:ring-brand-blue/50'
                        } focus:outline-none focus:ring-2 text-gray-900 bg-brand-ivory/5`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center text-gray-400 hover:text-gray-600`}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: VOTRE STARTUP */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-150 pb-2">
                  <Building2 className="w-5 h-5 text-brand-blue" />
                  <h3 className="text-lg font-bold text-[#1e293b]">
                    {language === 'fr' ? "Votre startup" : "مشروعك الريادي"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Nom de la startup */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                      {getTranslation('auth.startup_name_label', language)} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="reg-project-name"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder={getTranslation('auth.startup_name_placeholder', language)}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        fieldErrors.projectName ? 'border-red-400 focus:ring-red-150' : 'border-gray-300 focus:ring-brand-blue/50'
                      } focus:outline-none focus:ring-2 text-gray-900 bg-brand-ivory/5`}
                    />
                    {fieldErrors.projectName && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {fieldErrors.projectName}
                      </p>
                    )}
                  </div>

                  {/* Governorate */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {getTranslation('auth.governorate_label', language)}
                    </label>
                    <select
                      id="reg-location"
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-gray-800 bg-white"
                    >
                      {governorates.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sector */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5" />
                      {getTranslation('sector', language)}
                    </label>
                    <select
                      id="reg-sector"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-gray-800 bg-white truncate"
                    >
                      {sectors.map((s) => (
                        <option key={s.value} value={s.value} className="whitespace-normal">
                          {language === 'fr' ? s.labelFr : s.labelAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Self-assessed Stage Radio list */}
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-4">
                    {getTranslation('selfAssessedStage', language)}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {maturityStages.map((stage) => {
                      const IconComponent = maturityStageIcons[stage.id] || Lightbulb;
                      const isSelected = selfAssessed === stage.id;
                      
                      // Pull centralized labels & descriptions we declared in localization
                      const stageLabel = getTranslation(`stages.${stage.code}.label`, language, stage.id);
                      const stageDesc = getTranslation(`stages.${stage.code}.desc`, language, '');

                      return (
                        <label
                          key={stage.id}
                          className={`flex items-start p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="self_assessed_stage_select"
                            id={`self-assess-${stage.id}`}
                            value={stage.id}
                            checked={isSelected}
                            onChange={() => setSelfAssessed(stage.id)}
                            className="mt-1 text-brand-blue focus:ring-brand-blue shrink-0"
                          />
                          <div className={`flex flex-col ${isRtl ? 'mr-3' : 'ml-3'}`}>
                            <span className="flex items-center gap-2 font-bold text-sm text-gray-900">
                              <IconComponent className={`w-4 h-4 ${isSelected ? 'text-brand-blue' : 'text-gray-400'}`} />
                              {stageLabel}
                            </span>
                            {stageDesc && (
                              <span className="mt-1 text-xs text-gray-500 leading-normal font-medium">
                                {stageDesc}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Terms of Service agreement checkbox */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 rounded text-brand-blue focus:ring-brand-blue focus:ring-2 w-4 h-4 shrink-0 transition-all border-gray-300"
                    />
                    <span className="text-sm text-gray-600 select-none leading-relaxed">
                      {getTranslation('auth.terms_agreement_text', language)}{' '}
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-brand-blue font-semibold hover:underline">
                        {getTranslation('auth.terms_link_label', language)}
                      </a>{' '}
                      {language === 'fr' ? 'et la' : 'و'}{' '}
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-brand-blue font-semibold hover:underline">
                        {getTranslation('auth.privacy_link_label', language)}
                      </a>.
                    </span>
                  </label>
                  {fieldErrors.terms && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {fieldErrors.terms}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                id="btn-register-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-4 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-blue/95 hover:shadow-md cursor-pointer text-center flex items-center justify-center transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{getTranslation('common.loading', language)}</span>
                  </div>
                ) : (
                  getTranslation('buttonStart', language)
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-6 max-w-md mx-auto" id="login-form">
              <p className="text-sm text-gray-500 text-center">
                {getTranslation('loginSubtitle', language)}
              </p>

              {/* Email */}
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                  {getTranslation('auth.email_label', language)} <span className="text-red-500">*</span>
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={getTranslation('auth.email_placeholder', language)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    fieldErrors.loginEmail ? 'border-red-400' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-gray-900 bg-brand-ivory/5`}
                />
                {fieldErrors.loginEmail && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.loginEmail}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                  {getTranslation('auth.password_label', language)} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 ${isRtl ? 'pl-10' : 'pr-10'} rounded-xl border ${
                      fieldErrors.loginPassword ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-gray-900 bg-brand-ivory/5`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center text-gray-400 hover:text-gray-600`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.loginPassword && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.loginPassword}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-4 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-blue/95 hover:shadow-md cursor-pointer transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{getTranslation('common.loading', language)}</span>
                  </div>
                ) : (
                  getTranslation('btnSubmit', language)
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationLayout;
