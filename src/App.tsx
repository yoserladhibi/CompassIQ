/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Language, ProjectProfile } from './types';
import { getTranslation } from './localization';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { RegistrationLayout } from './components/RegistrationLayout';
import { IntakeForm } from './components/IntakeForm';
import { DashboardView } from './components/DashboardView';
import { RoadmapView } from './components/RoadmapView';
import { ParcoursEvolution } from './components/ParcoursEvolution';
import { Logo } from './components/Logo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';

// Import client-side computation engines as fallback to ensure the app is bulletproof
import { classifyMaturity, detectPerceptionGap, identifyBlockers } from './engine/diagnosisEngine';
import { computeScores } from './engine/scoringEngine';
import {
  loadCompassSession,
  saveCompassSession,
  clearCompassSession,
  updateCompassSessionView,
  type AppView,
  type CompassSession
} from './authSession';
import { useScrollDirection } from './hooks/useScrollDirection';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('compass_language') as Language;
    return stored === 'ar' || stored === 'fr' ? stored : 'fr';
  });

  useEffect(() => {
    localStorage.setItem('compass_language', language);
  }, [language]);
  const [view, setView] = useState<AppView>('auth');
  const [profile, setProfile] = useState<ProjectProfile | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline'>('online');
  const [isComputing, setIsComputing] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const { scrollDir, isAtTop } = useScrollDirection();

  // F10 Save Toast Trigger
  const triggerSaveSuccessNotification = () => {
    setShowSaveToast(true);
    setTimeout(() => {
      setShowSaveToast(false);
    }, 3000);
  };

  // F2 & F5 Autosave Patch handler
  const handleUpdateProfile = async (updatedProfile: ProjectProfile) => {
    setProfile(updatedProfile);
    
    // Fallback store
    localStorage.setItem(`compass_profile_${updatedProfile.startup.name?.toLowerCase().trim()}`, JSON.stringify(updatedProfile));
    
    if (updatedProfile._meta?.profile_id) {
      try {
        const response = await fetch(`/api/projects/${updatedProfile._meta.profile_id}/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedProfile)
        });
        if (response.ok) {
          triggerSaveSuccessNotification();
        }
      } catch (err) {
        console.error("Failed to autosave updated profile state", err);
      }
    }
  };

  // Sync background health check
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setServerStatus('online'))
      .catch(() => setServerStatus('offline'));
  }, []);

  // Restore authenticated session after refresh or dev reload
  useEffect(() => {
    let cancelled = false;

    const resolveDefaultView = (restoredProfile: ProjectProfile): AppView => {
      if (restoredProfile._meta?.questionnaire_completed || restoredProfile.scores?.overall?.score !== null) {
        return 'dashboard';
      }
      return 'assessment';
    };

    const restoreSession = async () => {
      const session = loadCompassSession();
      if (!session) {
        if (!cancelled) setIsRestoringSession(false);
        return;
      }

      try {
        const response = await fetch(`/api/profile/${session.project_id}`);
        if (!response.ok) {
          throw new Error('Session profile not found');
        }

        const restoredProfile = await response.json() as ProjectProfile;
        if (cancelled) return;

        setProfile(restoredProfile);
        setView(session.view || resolveDefaultView(restoredProfile));

        const profileKey = restoredProfile.startup.name?.toLowerCase().trim();
        if (profileKey) {
          localStorage.setItem(`compass_profile_${profileKey}`, JSON.stringify(restoredProfile));
        }
      } catch (err) {
        console.warn('Failed to restore CompassIQ session, clearing stored auth.', err);
        clearCompassSession();
      } finally {
        if (!cancelled) setIsRestoringSession(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the active view in localStorage so navigation survives reloads
  useEffect(() => {
    if (!profile?._meta?.profile_id || view === 'auth') return;
    updateCompassSessionView(view);
  }, [view, profile?._meta?.profile_id]);

  // Sync theme text direction and localized title
  useEffect(() => {
    document.title = language === 'fr' 
      ? "CompassIQ — Évaluation de Maturité Entrepreneuriale" 
      : "CompassIQ — بوصلة تشخيص المشاريع الريادية";
  }, [language]);

  // Handle new project registration onboarding
  const handleOnboardingRegistered = (
    newProfile: ProjectProfile,
    auth?: Pick<CompassSession, 'user_id' | 'access_token'>
  ) => {
    setProfile(newProfile);
    setView('assessment');
    saveCompassSession({
      project_id: newProfile._meta.profile_id,
      user_id: auth?.user_id,
      access_token: auth?.access_token,
      view: 'assessment'
    });
    // Store in LocalStorage for persistence recovery
    localStorage.setItem(`compass_profile_${newProfile.startup.name?.toLowerCase().trim()}`, JSON.stringify(newProfile));
  };

  // Run full backend diagnosis processing (or robust client-side fallback)
  const executeDiagnostics = async (profilePayload: ProjectProfile) => {
    setIsComputing(true);
    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profilePayload)
      });

      if (response.ok) {
        const enrichedProfile = await response.json() as ProjectProfile;
        setProfile(enrichedProfile);
        // Persist
        localStorage.setItem(`compass_profile_${enrichedProfile.startup.name?.toLowerCase().trim()}`, JSON.stringify(enrichedProfile));
        setServerStatus('online');
        triggerSaveSuccessNotification();
      } else {
        throw new Error('Server payload diagnostic rejected');
      }
    } catch (err) {
      console.warn('Backend computation failed. Falling back to robust client-side calculation engines...', err);
      setServerStatus('offline');
      
      // Resilient client-side calculation fallback
      const mockProfile = { ...profilePayload };
      
      // 1. Classification
      const classResult = classifyMaturity(mockProfile);
      
      // 2. Gap analysis
      const gapResult = detectPerceptionGap(
        mockProfile.entrepreneur.stage_self_assessed,
        classResult.stageId
      );

      // 3. Blockers
      const blockers = identifyBlockers(mockProfile);

      mockProfile.diagnosis = {
        stage_assigned: classResult.stageId,
        stage_label: classResult.stageLabel,
        stage_self_assessed: mockProfile.entrepreneur.stage_self_assessed,
        perception_gap: gapResult,
        classification_evidence: classResult.evidence,
        confidence_score: 0.8,
        blockers_detected: blockers
      };

      mockProfile.blockers = blockers;

      // 4. Score recalculation
      const scores = computeScores(mockProfile);
      mockProfile.scores = scores;
      mockProfile.diagnosis.confidence_score = scores.overall.diagnosis_confidence;

      setProfile(mockProfile);
      localStorage.setItem(`compass_profile_${mockProfile.startup.name?.toLowerCase().trim()}`, JSON.stringify(mockProfile));
    } finally {
      setIsComputing(false);
      setView('dashboard');
    }
  };

  const handleFinishQuestionnaire = () => {
    if (profile) {
      executeDiagnostics(profile);
    }
  };

  const handleRestart = () => {
    clearCompassSession();
    setProfile(null);
    setView('auth');
  };

  return (
    <div className="min-h-screen bg-bg-ivory text-gray-900 font-sans selection:bg-brand-marble/35 selection:text-brand-blue flex flex-col justify-between">
      
      {/* GLOBAL HEAD NAVIGATION RAIL */}
      <header
  className={`
    bg-white border-b border-brand-marble/15 shadow-xs
    fixed top-0 left-0 w-full z-50 no-print
    h-16
    transition-transform duration-300 ease-in-out
    ${!isAtTop && scrollDir === 'down' ? '-translate-y-full' : 'translate-y-0'}
  `}
  id="global-navbar"
>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-14 md:min-h-16 py-2 flex items-center justify-between gap-3 sm:gap-4">
          
          <div
            className="flex items-center cursor-pointer shrink-0 pl-0.5 pr-2 sm:pr-3 py-0.5"
            onClick={handleRestart}
            id="brand-logo-container"
          >
            <Logo variant="header" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Tab selectors for active diagnostic sessions */}
            {profile && (
              <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse" id="main-nav-links">
                <button
                  id="btn-nav-assessment"
                  onClick={() => setView('assessment')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    view === 'assessment' ? 'bg-brand-blue/5 text-brand-blue' : 'text-gray-500 hover:text-brand-blue'
                  }`}
                >
                  {getTranslation('navAssessment', language)}
                </button>
                
                {profile.scores?.overall?.score !== null && (
                  <>
                    <button
                      id="btn-nav-dashboard"
                      onClick={() => setView('dashboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        view === 'dashboard' ? 'bg-brand-blue/5 text-brand-blue' : 'text-gray-500 hover:text-brand-blue'
                      }`}
                    >
                      {getTranslation('navDashboard', language)}
                    </button>

                    <button
                      id="btn-nav-roadmap"
                      onClick={() => setView('roadmap')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        view === 'roadmap' ? 'bg-brand-blue/5 text-brand-blue' : 'text-gray-500 hover:text-brand-blue'
                      }`}
                    >
                      {getTranslation('navRoadmap', language)}
                    </button>

                    <button
                      id="btn-nav-parcours"
                      onClick={() => setView('history')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        view === 'history' ? 'bg-brand-blue/5 text-brand-blue' : 'text-gray-500 hover:text-brand-blue'
                      }`}
                    >
                      {getTranslation('navParcours', language)}
                    </button>
                  </>
                )}
              </nav>
            )}

            <LanguageSwitcher 
              currentLanguage={language} 
              onLanguageChange={(lang) => {
                setLanguage(lang);
                if (profile) {
                  const refreshed = { ...profile };
                  refreshed._meta.language = lang;
                  setProfile(refreshed);
                }
              }} 
            />
          </div>

        </div>
      </header>

      {/* MOBILE SCATTERED HEADER MENU FOR COMPLETED SESSIONS */}
      {profile && profile.scores?.overall?.score !== null && (
        <div className="md:hidden bg-white border-b border-brand-marble/5 px-6 py-2.5 flex items-center justify-around text-xs font-bold font-sans no-print" id="mobile-inline-nav">
          <button onClick={() => setView('assessment')} className={view === 'assessment' ? 'text-brand-blue' : 'text-gray-400'}>
            Form
          </button>
          <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'text-brand-blue' : 'text-gray-400'}>
            Dashboard
          </button>
          <button onClick={() => setView('roadmap')} className={view === 'roadmap' ? 'text-brand-blue' : 'text-gray-400'}>
            Roadmap
          </button>
          <button onClick={() => setView('history')} className={view === 'history' ? 'text-brand-blue' : 'text-gray-400'}>
            Mon Parcours
          </button>
        </div>
      )}

      {/* MAIN VIEW CONTROLLER RENDER BLOCK */}
      <main
  className="
    flex-1 w-full flex flex-col justify-center no-print
    pt-24 md:pt-16
  "
>
        {isRestoringSession ? (
          <div className="text-center py-24 space-y-4 font-sans flex flex-col items-center justify-center" id="session-restore-loader">
            <div className="animate-bounce mb-2">
              <Logo size={96} />
            </div>
            <p className="text-brand-blue font-extrabold text-sm uppercase tracking-widest animate-pulse">
              {language === 'fr'
                ? 'Restauration de votre session...'
                : 'جاري استعادة جلستك...'}
            </p>
          </div>
        ) : isComputing ? (
          <div className="text-center py-24 space-y-4 font-sans flex flex-col items-center justify-center" id="computing-overlay-loader">
            <div className="animate-bounce mb-2">
              <Logo size={96} />
            </div>
            <p className="text-brand-blue font-extrabold text-sm uppercase tracking-widest animate-pulse">
              {language === 'fr' 
                ? "Analyse algorithmique clinique en cours..." 
                : "جاري تحليل المعطيات وحساب نتائج المقياس..."}
            </p>
          </div>
        ) : (
          <>
            {view === 'auth' && (
              <RegistrationLayout 
                language={language} 
                onRegistered={handleOnboardingRegistered} 
                onLanguageChange={setLanguage}
              />
            )}

            {view === 'assessment' && profile && (
              <ErrorBoundary key="assessment" language={language}>
                <IntakeForm
                  language={language}
                  profile={profile}
                  onUpdateProfile={handleUpdateProfile}
                  onDiagnose={handleFinishQuestionnaire}
                />
              </ErrorBoundary>
            )}

            {view === 'dashboard' && profile && (
              <ErrorBoundary key="dashboard" language={language}>
                <DashboardView
                  language={language}
                  profile={profile}
                  onRestart={handleRestart}
                  onNavigateRoadmap={() => setView('roadmap')}
                />
              </ErrorBoundary>
            )}

            {view === 'roadmap' && profile && (
              <ErrorBoundary key="roadmap" language={language}>
                <RoadmapView
                  language={language}
                  profile={profile}
                  onUpdateProfile={handleUpdateProfile}
                />
              </ErrorBoundary>
            )}

            {view === 'history' && profile && (
              <ErrorBoundary key="history" language={language}>
                <ParcoursEvolution
                  language={language}
                  profile={profile}
                  onRefreshProfile={(prof) => setProfile(prof)}
                />
              </ErrorBoundary>
            )}


          </>
        )}
      </main>



      {/* F10 Bottom right emerald save notification */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-600 border border-emerald-500 text-white font-bold text-sm px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-sans"
          >
            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</div>
            <span>
              {language === 'fr' 
                ? "Progrès sauvegardés avec succès !" 
                : "تم حفظ التقدم بنجاح!"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER BLOCK (Architectural Honesty: Minimal, no logs or port clutter) */}
      <footer className="bg-white border-t border-brand-marble/10 py-6 mt-12 bg-cover no-print" id="global-footer">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-400">
          <div className="space-y-1 text-center md:text-left rtl:md:text-right">
            <p className="font-bold text-gray-600 font-sans uppercase tracking-wider text-[10px]">
              CompassIQ © 2026
            </p>
            <p className="text-[9px] font-sans">
              Adaptive Maturity Evaluation Standard compliant layout. All rights reserved. Registered Tunisian IP.
            </p>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse" id="system-quality-indicators">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
            <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest">
              Security standard SSL • System {serverStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
