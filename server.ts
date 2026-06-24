/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { ProjectProfile } from './src/types.js'; // Use type definition
import { classifyMaturity, detectPerceptionGap, identifyBlockers } from './src/engine/diagnosisEngine.js';
import { computeScores } from './src/engine/scoringEngine.js';
import { RagEngine } from './src/engine/ragEngine.js';
import chatRouter from './src/backend/routes/chat.routes.js';
import roadmapRouter from './src/backend/routes/roadmap.routes.js';
import {
  initializeStore,
  loadProfile,
  saveProfile,
  createProfile,
  getProfileIdByEmail,
  withProfileLock,
  hashPassword,
  verifyPassword,
  loadUsersIndex,
  createUserAndProject,
  loadDiskUserFile,
  saveDiskUserFile,
  fromFrontendProfile,
  toFrontendProfile
} from './src/backend/profileStore.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

// Helper function to execute a function with exponential backoff on transient errors
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 4,
  initialDelayMs = 500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;
      const errMsg = String(err?.message || err || '').toLowerCase();
      const isQuotaExceeded = errMsg.includes('quota') ||
                              errMsg.includes('billing') ||
                              errMsg.includes('plan');

      const isTransient = !isQuotaExceeded && (
                          errMsg.includes('503') ||
                          errMsg.includes('unavailable') ||
                          errMsg.includes('high demand') ||
                          errMsg.includes('429') ||
                          errMsg.includes('rate limit') ||
                          errMsg.includes('limit exceeded') ||
                          errMsg.includes('overloaded')
      );

      if (isTransient && attempt <= maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Server Retry] Gemini temporary error (attempt ${attempt}/${maxRetries}): '${errMsg.substring(0, 100)}...'. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

// Reframe chronological feed messages based on raw diagnostics changes
const FIELD_CHANGE_MESSAGES: Record<string, { label: { fr: string; ar: string }; affects: string[] }> = {
  "startup.has_prototype": {
    label: { fr: "Prototype complété", ar: "اكتمال النموذج الأولي" },
    affects: ["innovation"],
  },
  "startup.customer_interviews_conducted": {
    label: { fr: "Entretiens clients ajoutés", ar: "إضافة مقابلات مع العملاء" },
    affects: ["market"],
  },
  "startup.has_paying_customers": {
    label: { fr: "Premier client payant obtenu", ar: "الحصول على أول عميل يدفع" },
    affects: ["commercial"],
  },
  "startup.has_growth_plan": {
    label: { fr: "Plan de croissance ajouté", ar: "إضافة خطة نمو" },
    affects: ["scalability"],
  },
  "startup.has_env_assessment": {
    label: { fr: "Évaluation environnementale réalisée", ar: "إجراء تقييم بيئي" },
    affects: ["green"],
  },
};

function getNested(obj: any, pathStr: string): any {
  if (!obj) return undefined;
  const keys = pathStr.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

function buildActivityLog(assessments: any[]) {
  const log: any[] = [];
  if (!assessments || assessments.length === 0) return log;

  for (let i = 1; i < assessments.length; i++) {
    const prev = assessments[i - 1];
    const curr = assessments[i];
    const prevSnap = prev.profile_snapshot;
    const currSnap = curr.profile_snapshot;

    for (const [field, meta] of Object.entries(FIELD_CHANGE_MESSAGES)) {
      const prevVal = getNested(prevSnap, field);
      const currVal = getNested(currSnap, field);

      if (prevVal !== currVal && currVal === true) {
        const deltas: Record<string, number> = {};
        for (const dim of meta.affects) {
          const prevScore = prev.scores?.[dim]?.score ?? 0;
          const currScore = curr.scores?.[dim]?.score ?? 0;
          deltas[dim] = currScore - prevScore;
        }

        log.push({
          date: curr.date,
          change: meta.label,
          score_deltas: deltas
        });
      }
    }
  }

  if (log.length === 0 && assessments.length > 0) {
    const firstAss = assessments[0];
    const firstSnap = firstAss.profile_snapshot;
    for (const [field, meta] of Object.entries(FIELD_CHANGE_MESSAGES)) {
      if (getNested(firstSnap, field) === true) {
        log.push({
          date: firstAss.date,
          change: meta.label,
          score_deltas: {
            [meta.affects[0]]: 10
          }
        });
      }
    }
  }

  return log.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getMotivationBanner(assessments: any[], language: "fr" | "ar") {
  if (!assessments || assessments.length < 2) return null;
  const last = assessments[assessments.length - 1];
  const secondLast = assessments[assessments.length - 2];
  const delta = (last.scores?.overall?.score || 0) - (secondLast.scores?.overall?.score || 0);
  if (delta <= 0) return null;
  return {
    fr: `Félicitations ! Vous avez progressé de ${delta} points depuis votre dernier diagnostic.`,
    ar: `تهانينا! تقدمت بمقدار ${delta} نقطة منذ آخر تقييم.`,
  }[language];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Physical dynamic folder based store directories
  await initializeStore();

  // In-memory profiles and users registry cache
  const profilesDb: Record<string, ProjectProfile> = {};
  const usersDb: Record<string, { user_id: string; email: string; name: string; profile_id: string; language_preference: string }> = {};
  const previousScoresDb: Record<string, any> = {};

  // Backfill memory database cache with stored accounts from disk files at startup
  try {
    const usersIndex = await loadUsersIndex();
    for (const [email, entry] of Object.entries(usersIndex)) {
      const pId = entry.profile_id;
      try {
        const prof = await loadProfile(pId);
        profilesDb[pId] = prof;
        usersDb[email] = {
          user_id: `USER-${pId.split('-')[1] || Date.now()}`,
          email: email,
          name: entry.name,
          profile_id: pId,
          language_preference: prof._meta.language || 'fr'
        };
      } catch (err) {
        console.warn(`Could not load physical profile ${pId} into server memory:`, err);
      }
    }
  } catch (err) {
    console.error("Failed to populate user cache at startup:", err);
  }

  // Helper with exclusive locked atomic IO profile writes
  async function saveProfileState(profileId: string, profile: ProjectProfile) {
    profilesDb[profileId] = profile;
    await withProfileLock(profileId, async () => {
      await saveProfile(profileId, profile);
    });
  }

  const ragEngine = new RagEngine();

  // Helper: Create default clean profile
  function createDefaultProfile(profileId: string, name: string, language: string): ProjectProfile {
    return {
      _meta: {
        schema_version: '1.1',
        description: 'Profile created at registration',
        profile_id: profileId,
        session_id: `SESSION-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completion_rate: 0.0,
        questionnaire_completed: false,
        language: language === 'ar' ? 'ar' : 'fr'
      },
      entrepreneur: {
        sector: 'agritech',
        location: 'Tunis',
        stage_self_assessed: 'S1'
      },
      startup: {
        name: name,
        problem_defined: null,
        target_customer: null,
        solution_description: null,
        legal_form: null,
        prior_accompaniment: null,
        team_size: null,
        has_cofounders: null,
        team_skills: [],
        has_mentors: null,
        has_prototype: null,
        product_stage: null,
        launched_to_market: null,
        active_users: null,
        customer_interviews_conducted: null,
        customer_interviews_count: 0,
        has_survey_data: null,
        has_pilot_users: null,
        has_loi: null,
        has_business_model: null,
        revenue_model: null,
        pricing_defined: null,
        has_business_plan: null,
        has_financial_projection: null,
        monthly_revenue: null,
        monthly_revenue_numeric: 0,
        has_paying_customers: null,
        paying_customers_count: 0,
        has_funding: null,
        funding_type: null,
        has_growth_plan: null,
        solution_replicable: null,
        manual_dependency_level: null,
        international_expansion: null,
        local_competition_level: null,
        technology_intensity: null,
        has_env_impact: null,
        has_env_assessment: null,
        env_practices: [],
        agri_land_use: null,
        agri_water_efficiency: null
      },
      assessment: {
        questions_answered: [],
        questions_skipped: [],
        branching_path: [],
        completion_rate: 0.0,
        last_question_id: null
      },
      diagnosis: {
        stage_assigned: null,
        stage_label: null,
        stage_self_assessed: 'S1',
        perception_gap: {
          detected: false,
          self_assessed_stage: 'S1',
          actual_stage: null,
          gap_direction: null,
          gap_explanation: null
        },
        classification_evidence: [],
        confidence_score: 0,
        blockers_detected: []
      },
      scores: {
        market: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
        commercial: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
        innovation: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
        scalability: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
        green: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
        overall: { score: null, diagnosis_confidence: null, computed_at: null }
      },
      blockers: [],
      answers: {
        'Q1': 'agritech',
        'Q01': 'agritech',
        'Q02': 'Tunis',
        'Q03': 'S1'
      }
    };
  }

  // Helper to set nested values (like the frontend IntakeForm logic)
  function setNestedValue(obj: any, pathStr: string, value: any) {
    const keys = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey === 'customer_interviews_count' || lastKey === 'monthly_revenue_numeric' || lastKey === 'paying_customers_count') {
      current[lastKey] = value === null ? null : Number(value);
    } else {
      current[lastKey] = value;
    }
  }

  // Recursive branching solver for questions.json
  function getNextQuestionId(profile: ProjectProfile): string | null {
    try {
      const qData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'questions.json'), 'utf-8'));
      const questions = qData.questions;
      
      let currentId = 'Q02'; // default starting question ID
      const visited = new Set<string>();
      
      while (currentId && currentId !== 'END') {
        if (visited.has(currentId)) {
          return null;
        }
        visited.add(currentId);

        const q = questions.find((item: any) => item.id === currentId);
        if (!q) return null;
        
        const ans = profile.answers[currentId];
        if (ans === undefined || ans === null) {
          return currentId;
        }
        
        const branching = q.branching;
        let nextId: string | null = null;
        
        if (branching.type === 'linear') {
          nextId = branching.next || branching.default_next || null;
        } else if (branching.type === 'conditional') {
          let ansStr = '';
          if (ans === true || ans === 'yes') ansStr = 'yes';
          else if (ans === false || ans === 'no') ansStr = 'no';
          else ansStr = String(ans || '');
          
          const matchedRule = branching.rules?.find((r: any) => r.condition.answer === ansStr);
          if (matchedRule) {
            nextId = matchedRule.next;
          } else {
            nextId = branching.default_next || null;
          }
        }
        
        if (!nextId || nextId === 'END') {
          return null;
        }
        currentId = nextId;
      }
      return null;
    } catch {
      return null;
    }
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Serve questions directly from questions.json
  app.get('/api/questions', (req, res) => {
    try {
      const questionsData = fs.readFileSync(path.join(process.cwd(), 'questions.json'), 'utf-8');
      res.json(JSON.parse(questionsData));
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to read questions', details: err.message });
    }
  });

  // Serve rules directly from maturity_rules.json
  app.get('/api/rules', (req, res) => {
    try {
      const rulesData = fs.readFileSync(path.join(process.cwd(), 'maturity_rules.json'), 'utf-8');
      res.json(JSON.parse(rulesData));
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to read rules', details: err.message });
    }
  });

  // Backend Diagnostic Route - processes answers and computes full scoring and taxonomy
  app.post('/api/diagnose', async (req, res) => {
    try {
      const profile = req.body as ProjectProfile;
      if (!profile) {
        return res.status(400).json({ error: 'Profile data is required' });
      }

      // 1. Run Classification
      const classResult = classifyMaturity(profile);
      
      // 2. Detect perception gap
      const gapResult = detectPerceptionGap(
        profile.entrepreneur.stage_self_assessed,
        classResult.stageId
      );

      // 3. Identify and rank blockers
      const blockers = identifyBlockers(profile);

      // Assemble updated diagnosis section
      profile.diagnosis = {
        stage_assigned: classResult.stageId,
        stage_label: classResult.stageLabel,
        stage_self_assessed: profile.entrepreneur.stage_self_assessed,
        perception_gap: gapResult,
        classification_evidence: classResult.evidence,
        confidence_score: 1.0, // recalculated below in overall
        blockers_detected: blockers
      };

      profile.blockers = blockers;

      // 4. Compute composite scores & gating caps
      const scoreResults = computeScores(profile);
      profile.scores = scoreResults;
      profile.diagnosis.confidence_score = scoreResults.overall.diagnosis_confidence;

      // Update or increment diagnostic version to ensure robust cache busting for subsequent roadmap generations
      if (!(profile as any).diagnostic_version) {
        (profile as any).diagnostic_version = 1;
      } else {
        (profile as any).diagnostic_version += 1;
      }

      recordDiagnosticHistory(profile);

      // Update timestamps
      profile._meta.updated_at = new Date().toISOString();

      // Save to memory storage and physical files securely
      if (profile._meta.profile_id) {
        await saveProfileState(profile._meta.profile_id, profile);
      }

      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: 'Diagnostics computation failed', details: err.message });
    }
  });

  // Save profile state endpoint
  app.post('/api/profile/save', async (req, res) => {
    try {
      const profile = req.body as ProjectProfile;
      if (!profile || !profile._meta || !profile._meta.profile_id) {
        return res.status(400).json({ error: 'Invalid profile payload' });
      }
      await saveProfileState(profile._meta.profile_id, profile);
      res.json({ success: true, profile_id: profile._meta.profile_id });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save profile state', details: err.message });
    }
  });

  // Load profile state endpoint
  app.get('/api/profile/:id', async (req, res) => {
    try {
      const id = req.params.id;
      let profile = profilesDb[id];
      if (!profile) {
        try {
          profile = await loadProfile(id);
          profilesDb[id] = profile;
        } catch {
          return res.status(404).json({ error: 'Profile not found' });
        }
      }
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load profile state', details: err.message });
    }
  });

  // F2: PATCH profile endpoint
  app.patch('/api/projects/:project_id/profile', async (req, res) => {
    try {
      const { project_id } = req.params;
      const updatedProfile = req.body;
      if (!project_id || !updatedProfile) {
        return res.status(400).json({ error: 'project_id and profile data are required' });
      }

      const diskData = await loadDiskUserFile(project_id);
      const mergedDiskData = fromFrontendProfile(updatedProfile, diskData);
      await saveDiskUserFile(project_id, mergedDiskData);
      
      // Update memory cache
      profilesDb[project_id] = toFrontendProfile(mergedDiskData);
      
      res.json({ success: true, profile_id: project_id });
    } catch (err: any) {
      res.status(500).json({ error: 'Autosave patch failed', details: err.message });
    }
  });

  // F5: PATCH roadmap action status endpoint
  app.patch('/api/projects/:project_id/roadmap/:action_id', async (req, res) => {
    try {
      const { project_id, action_id } = req.params;
      const { status } = req.body;

      if (!project_id || !action_id || !status) {
        return res.status(400).json({ error: 'project_id, action_id, and status are required' });
      }

      const isCompleted = status === 'completed';
      const diskData = await loadDiskUserFile(project_id);

      diskData.progress = diskData.progress || {};
      let completedActions = diskData.progress.completed_actions || [];
      let inProgressActions = diskData.progress.in_progress_actions || [];

      if (isCompleted) {
        completedActions = Array.from(new Set([...completedActions, action_id]));
        inProgressActions = inProgressActions.filter((id: string) => id !== action_id);
      } else {
        completedActions = completedActions.filter((id: string) => id !== action_id);
        inProgressActions = Array.from(new Set([...inProgressActions, action_id]));
      }

      diskData.progress.completed_actions = completedActions;
      diskData.progress.in_progress_actions = inProgressActions;

      // Log/Journal activity
      const step = (diskData.roadmap?.steps || []).find((s: any) => s.id === action_id);
      const stepTitleFr = step?.titleFr || step?.title?.fr || step?.actionFr || action_id;
      const stepTitleAr = step?.titleAr || step?.title?.ar || step?.actionAr || action_id;

      const textFr = isCompleted
        ? `Action complétée : "${stepTitleFr}"`
        : `Action marquée en cours : "${stepTitleFr}"`;
      const textAr = isCompleted
        ? `تم إكمال الإجراء: "${stepTitleAr}"`
        : `تم تعليم الإجراء كقيد التنفيذ: "${stepTitleAr}"`;

      diskData.progress.activity_log = diskData.progress.activity_log || [];
      diskData.progress.activity_log.push({
        event_id: `evt-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        timestamp: new Date().toISOString(),
        text: { fr: textFr, ar: textAr },
        type: isCompleted ? "completion" : "status_change",
        dimension: "roadmap"
      });

      await saveDiskUserFile(project_id, diskData);

      // Save in cache as well
      profilesDb[project_id] = toFrontendProfile(diskData);

      res.json({ success: true, completed_steps: completedActions });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update roadmap item status', details: err.message });
    }
  });

  // HELPER FOR PROGRESS COMPUTATION AND SANITIZATION
  function computeProgress(completedSteps: string[], totalSteps: number): {
    completed: number;
    total: number;
    percent: number;
  } {
    const unique = Array.from(new Set(completedSteps));
    const completed = Math.min(unique.length, totalSteps); // never exceed total
    const percent = totalSteps > 0
      ? Math.min(100, Math.round((completed / totalSteps) * 100))
      : 0;
    return { completed, total: totalSteps, percent };
  }

  function cleanupStaleCompletedSteps(profile: ProjectProfile) {
    const roadmapItems = (profile as any).roadmap || [];
    const completedSteps = (profile as any).completed_steps || [];
    const validIds = new Set(roadmapItems.map((item: any) => item.id));
    
    // Keep only completed step IDs that still exist in the current roadmap
    const cleanedCompletedSteps = completedSteps.filter((id: string) => validIds.has(id));
    
    // Deduplicate
    (profile as any).completed_steps = Array.from(new Set(cleanedCompletedSteps));
  }

  async function getOrLoadProfile(id: string): Promise<ProjectProfile | null> {
    let profile = profilesDb[id] || Object.values(profilesDb).find(p => p._meta.session_id === id || p._meta.profile_id === id);
    if (!profile) {
      try {
        profile = await loadProfile(id);
        profilesDb[profile._meta.profile_id] = profile;
      } catch {
        return null;
      }
    }
    return profile;
  }

  const userStorage = {
    async toggleRoadmapStep(userId: string, stepId: string): Promise<{
      completed_steps: string[];
      completed: number;
      total: number;
      percent: number;
    }> {
      const profile = await getOrLoadProfile(userId);
      if (!profile) {
        throw new Error(`Profile not found for ID ${userId}`);
      }

      let completedSteps = (profile as any).completed_steps || [];
      completedSteps = Array.from(new Set(completedSteps));

      const isCompletedNow = !completedSteps.includes(stepId);
      if (isCompletedNow) {
        completedSteps = Array.from(new Set([...completedSteps, stepId]));
      } else {
        completedSteps = completedSteps.filter((id: string) => id !== stepId);
      }

      (profile as any).completed_steps = completedSteps;
      cleanupStaleCompletedSteps(profile);

      // Save using profile state manager
      await saveProfileState(profile._meta.profile_id, profile);

      const finalCompletedSteps = (profile as any).completed_steps || [];
      const totalSteps = ((profile as any).roadmap || []).length;
      const progress = computeProgress(finalCompletedSteps, totalSteps);

      // Log/Journal activity
      const diskData = await loadDiskUserFile(profile._meta.profile_id).catch(() => null);
      if (diskData) {
        diskData.progress = diskData.progress || {};
        const step = (diskData.roadmap?.steps || []).find((s: any) => s.id === stepId) || 
                     ((profile as any).roadmap || []).find((s: any) => s.id === stepId);
        const stepTitleFr = step?.titleFr || step?.title?.fr || step?.actionFr || stepId;
        const stepTitleAr = step?.titleAr || step?.title?.ar || step?.actionAr || stepId;

        const textFr = isCompletedNow
          ? `Action complétée : "${stepTitleFr}"`
          : `Action marquée en cours : "${stepTitleFr}"`;
        const textAr = isCompletedNow
          ? `تم إكمال الإجراء: "${stepTitleAr}"`
          : `تم تعليم الإجراء كقيد التنفيذ: "${stepTitleAr}"`;

        diskData.progress.activity_log = diskData.progress.activity_log || [];
        diskData.progress.activity_log.push({
          event_id: `evt-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          timestamp: new Date().toISOString(),
          text: { fr: textFr, ar: textAr },
          type: isCompletedNow ? "completion" : "status_change",
          dimension: "roadmap"
        });
        
        // Synchronize and write
        diskData.progress.completed_actions = finalCompletedSteps;
        await saveDiskUserFile(profile._meta.profile_id, diskData);
      }

      return {
        completed_steps: finalCompletedSteps,
        ...progress
      };
    },

    async getUser(userId: string): Promise<{
      completed_steps: string[];
      completed: number;
      total: number;
      percent: number;
    }> {
      const profile = await getOrLoadProfile(userId);
      if (!profile) {
        throw new Error(`Profile not found for ID ${userId}`);
      }

      cleanupStaleCompletedSteps(profile);
      const completedSteps = (profile as any).completed_steps || [];
      const totalSteps = ((profile as any).roadmap || []).length;
      const progress = computeProgress(completedSteps, totalSteps);

      return {
        completed_steps: completedSteps,
        ...progress
      };
    }
  };

  // Add roads for progress tracking
  app.post('/api/progress/toggle', async (req, res) => {
    try {
      const { user_id, step_id } = req.body;
      if (!user_id || !step_id) {
        return res.status(400).json({ error: 'user_id and step_id are required' });
      }

      const result = await userStorage.toggleRoadmapStep(user_id, step_id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to toggle progress', details: err.message });
    }
  });

  app.get('/api/progress/:user_id', async (req, res) => {
    try {
      const { user_id } = req.params;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const result = await userStorage.getUser(user_id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve progress', details: err.message });
    }
  });

  // F6: GET log endpoint
  app.get('/api/projects/:project_id/log', async (req, res) => {
    try {
      const { project_id } = req.params;
      if (!project_id) {
        return res.status(400).json({ error: 'project_id is required' });
      }

      const diskData = await loadDiskUserFile(project_id);
      res.json(diskData.progress?.activity_log || []);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch logs', details: err.message });
    }
  });

  // 7.1 Auth / Registration endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        language_preference,
        startup_name,
        region_code,
        sector_code,
        self_assessed_stage_code
      } = req.body;

      if (!name || !email || !password || !startup_name || !region_code || !sector_code || !self_assessed_stage_code) {
        return res.status(400).json({ error: 'common.required_field' });
      }

      const emailKey = email.toLowerCase().trim();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailKey)) {
        return res.status(400).json({ error: 'auth.invalid_email' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'auth.password_too_weak' });
      }

      const existingProfileId = await getProfileIdByEmail(emailKey);
      if (existingProfileId) {
        return res.status(400).json({ error: 'auth.email_already_used' });
      }

      // Generate secure hash
      const passwordHash = await hashPassword(password);
      
      // Create user and startup project
      const { user_id, project_id } = await createUserAndProject(
        name,
        emailKey,
        passwordHash,
        language_preference || 'fr',
        startup_name,
        region_code,
        sector_code,
        self_assessed_stage_code
      );

      // Cache it in profilesDb and usersDb
      const profile = await loadProfile(project_id);
      profilesDb[project_id] = profile;
      usersDb[emailKey] = {
        user_id,
        email: emailKey,
        name,
        profile_id: project_id,
        language_preference: language_preference || 'fr'
      };

      res.json({
        user_id,
        project_id,
        access_token: `MT-JWT-TOKEN-${project_id}`,
        language_preference: language_preference || 'fr'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Registration failed', details: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'common.required_field' });
      }

      const emailKey = email.toLowerCase().trim();

      // Retrieve and check password securely
      const index = await loadUsersIndex();
      const entry = index[emailKey];
      if (!entry) {
        return res.status(401).json({ error: 'auth.invalid_credentials' });
      }

      const isValid = await verifyPassword(password, entry.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'auth.invalid_credentials' });
      }

      const pId = entry.profile_id;
      // Get or assign a user_id from our usersDb/cache or generate a deterministic one
      let uId = usersDb[emailKey]?.user_id || `USER-${pId.split('-')[1] || Date.now()}`;
      
      // Load language preference
      let lang = 'fr';
      const profile = profilesDb[pId] || await loadProfile(pId).catch(() => null);
      if (profile) {
        profilesDb[pId] = profile;
        lang = profile._meta.language || 'fr';
      }

      res.json({
        user_id: uId,
        project_id: pId,
        access_token: `MT-JWT-TOKEN-${pId}`,
        language_preference: lang
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Login failed', details: err.message });
    }
  });

  // 7.2 Feature 1 — Adaptive Intake endpoints
  app.get('/api/intake/next-question', (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      if (!sessionId) {
        return res.status(400).json({ error: 'session_id is required' });
      }

      let profile = Object.values(profilesDb).find(p => p._meta.session_id === sessionId || p._meta.profile_id === sessionId);
      if (!profile) {
        const profileId = `PROFILE-GUEST-${Date.now()}`;
        profile = createDefaultProfile(profileId, 'Guest Startup', 'fr');
        profile._meta.session_id = sessionId;
        profilesDb[profileId] = profile;
      }

      const nextId = getNextQuestionId(profile);
      if (!nextId) {
        return res.json({ status: 'complete' });
      }

      const qData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'questions.json'), 'utf-8'));
      const q = qData.questions.find((item: any) => item.id === nextId);
      if (!q) {
        return res.status(404).json({ error: 'Question not found' });
      }

      const progressEstimate = Math.min(99, Math.round((Object.keys(profile.answers).length / qData.questions.length) * 100));

      res.json({
        question_id: q.id,
        type: q.type,
        options: q.options,
        text: q.text,
        progress_estimate: progressEstimate
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to seek next question', details: err.message });
    }
  });

  app.post('/api/intake/answer', async (req, res) => {
    try {
      const { session_id, question_id, answer } = req.body;
      if (!session_id || !question_id) {
        return res.status(400).json({ error: 'session_id and question_id are required' });
      }

      let profile = Object.values(profilesDb).find(p => p._meta.session_id === session_id || p._meta.profile_id === session_id);
      if (!profile) {
        const profileId = `PROFILE-GUEST-${Date.now()}`;
        profile = createDefaultProfile(profileId, 'Guest Startup', 'fr');
        profile._meta.session_id = session_id;
        await saveProfileState(profileId, profile);
      }

      const qData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'questions.json'), 'utf-8'));
      const q = qData.questions.find((item: any) => item.id === question_id);

      profile.answers[question_id] = answer;
      if (q) {
        setNestedValue(profile, q.maps_to, answer);
        if (!profile.assessment.questions_answered.includes(question_id)) {
          profile.assessment.questions_answered.push(question_id);
        }
      }

      const nextId = getNextQuestionId(profile);
      if (!nextId) {
        profile._meta.questionnaire_completed = true;
        profile.assessment.completion_rate = 1.0;

        const classResult = classifyMaturity(profile);
        const gapResult = detectPerceptionGap(
          profile.entrepreneur.stage_self_assessed,
          classResult.stageId
        );
        const blockers = identifyBlockers(profile);

        profile.diagnosis = {
          stage_assigned: classResult.stageId,
          stage_label: classResult.stageLabel,
          stage_self_assessed: profile.entrepreneur.stage_self_assessed,
          perception_gap: gapResult,
          classification_evidence: classResult.evidence,
          confidence_score: 1.0,
          blockers_detected: blockers
        };
        profile.blockers = blockers;

        const scoreResults = computeScores(profile);
        profile.scores = scoreResults;
        profile.diagnosis.confidence_score = scoreResults.overall.diagnosis_confidence;

        recordDiagnosticHistory(profile);

        profile._meta.updated_at = new Date().toISOString();

        await saveProfileState(profile._meta.profile_id, profile);
        return res.json({ status: 'complete' });
      }

      const nextQ = qData.questions.find((item: any) => item.id === nextId);
      const progressEstimate = Math.min(99, Math.round((Object.keys(profile.answers).length / qData.questions.length) * 100));

      await saveProfileState(profile._meta.profile_id, profile);

      res.json({
        question_id: nextQ.id,
        type: nextQ.type,
        options: nextQ.options,
        text: nextQ.text,
        progress_estimate: progressEstimate
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to submit answer', details: err.message });
    }
  });

  app.get('/api/diagnostic/result', (req, res) => {
    try {
      const profileId = req.query.profile_id as string;
      if (!profileId) {
        return res.status(400).json({ error: 'profile_id is required' });
      }

      let profile = profilesDb[profileId] || Object.values(profilesDb).find(p => p._meta.session_id === profileId);
      if (!profile) {
        profile = createDefaultProfile(profileId, 'Guest Startup', 'fr');
        profilesDb[profileId] = profile;
      }

      const classResult = classifyMaturity(profile);
      const gapResult = detectPerceptionGap(
        profile.entrepreneur.stage_self_assessed,
        classResult.stageId
      );
      const blockers = identifyBlockers(profile);

      profile.diagnosis = {
        stage_assigned: classResult.stageId,
        stage_label: classResult.stageLabel,
        stage_self_assessed: profile.entrepreneur.stage_self_assessed,
        perception_gap: gapResult,
        classification_evidence: classResult.evidence,
        confidence_score: 1.0,
        blockers_detected: blockers
      };

      const overallScore = computeScores(profile);
      profile.scores = overallScore;
      recordDiagnosticHistory(profile);

      const formattedBlockers = blockers.map((b: any, index: number) => ({
        id: b.id || `b${index + 1}`,
        domain: b.dimension || 'unknown',
        rank: index + 1,
        reason: b.description || { fr: 'Non spécifié', ar: 'غير محدد' }
      }));

      const formattedEvidence = (classResult.evidence || []).map((ev: any) => ({
        field: ev.criteria?.fr || 'critere',
        value: ev.status ? 'Validé' : 'Non validé'
      }));

      res.json({
        maturity_stage: classResult.stageLabel?.fr || 'Structuration',
        self_assessed_stage: profile.entrepreneur.stage_self_assessed || 'S1',
        gap_detected: gapResult.detected,
        gap_explanation: gapResult.gap_explanation || { fr: 'Aucun écart détecté', ar: 'لم يتم العثور على أي فجوة' },
        evidence: formattedEvidence,
        blockers: formattedBlockers,
        confidence: overallScore.overall.diagnosis_confidence || 84
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to compile diagnostics', details: err.message });
    }
  });

  // 7.3 Feature 2 — Scoring endpoints
  app.get('/api/scoring/result', (req, res) => {
    try {
      const profileId = req.query.profile_id as string;
      if (!profileId) {
        return res.status(400).json({ error: 'profile_id is required' });
      }

      let profile = profilesDb[profileId] || Object.values(profilesDb).find(p => p._meta.session_id === profileId);
      if (!profile) {
        profile = createDefaultProfile(profileId, 'Guest Startup', 'fr');
        profilesDb[profileId] = profile;
      }

      const scores = computeScores(profile);
      profile.scores = scores;

      const rebuildBreakdown = (dimensionKey: string, dScore: any) => {
        const subs = Object.entries(dScore.sub_scores || {}).map(([key, val]: [string, any]) => {
          let weight = 0.25;
          if (dimensionKey === 'market') {
            if (key.includes('validation')) weight = 0.35;
            else if (key.includes('opportunity')) weight = 0.35;
            else if (key.includes('revenue')) weight = 0.30;
          } else if (dimensionKey === 'commercial') {
            if (key.includes('proposal')) weight = 0.30;
            else if (key.includes('maturity')) weight = 0.25;
            else if (key.includes('pricing')) weight = 0.25;
            else weight = 0.20;
          } else if (dimensionKey === 'innovation') {
            if (key.includes('novelty')) weight = 0.35;
            else if (key.includes('technology')) weight = 0.30;
            else if (key.includes('barrier')) weight = 0.20;
            else weight = 0.15;
          } else if (dimensionKey === 'scalability') {
            if (key.includes('replicability')) weight = 0.30;
            else if (key.includes('manual')) weight = 0.25;
            else if (key.includes('deployment')) weight = 0.25;
            else weight = 0.20;
          } else if (dimensionKey === 'green') {
            if (key.includes('climat')) weight = 0.30;
            else if (key.includes('eau')) weight = 0.25;
            else if (key.includes('sols')) weight = 0.20;
            else weight = 0.25;
          }
          return {
            criterion: key,
            weight: weight,
            value: val !== null ? val : 50
          };
        });

        return {
          sub_scores: subs,
          primary_gap: dScore.primary_gap?.fr || 'Aucun écart majeur',
          justification: dScore.explanation || { fr: 'Score calculé selon le modèle de maturité.', ar: 'تم حساب النتيجة بناءً على نموذج النضج.' },
          recommendation: dScore.recommendation || { fr: 'Continuer à consolider vos acquis.', ar: 'مواصلة تعزيز مكتسباتك.' }
        };
      };

      const blockers = identifyBlockers(profile);
      const mainBlockerText = blockers.length > 0
        ? `${blockers[0].dimension?.toUpperCase()} — ${blockers[0].title?.fr}`
        : 'Aucun point de blocage détecté';

      const gatingRules: string[] = [];
      ['market', 'commercial', 'innovation', 'scalability', 'green'].forEach((dk) => {
        const ds = (scores as any)[dk];
        if (ds && ds.gating_applied && ds.gating_rule) {
          gatingRules.push(ds.gating_rule);
        }
      });

      res.json({
        maturity_stage: profile.diagnosis.stage_label?.fr || 'Structuration',
        market_score: scores.market.score || 0,
        commercial_score: scores.commercial.score || 0,
        innovation_score: scores.innovation.score || 0,
        scalability_score: scores.scalability.score || 0,
        green_score: scores.green.score || 0,
        diagnosis_confidence: scores.overall.diagnosis_confidence || 84,
        main_blocker: mainBlockerText,
        gating_rules_triggered: gatingRules,
        breakdown: {
          market_score: rebuildBreakdown('market', scores.market),
          commercial_score: rebuildBreakdown('commercial', scores.commercial),
          innovation_score: rebuildBreakdown('innovation', scores.innovation),
          scalability_score: rebuildBreakdown('scalability', scores.scalability),
          green_score: rebuildBreakdown('green', scores.green)
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to compile scores', details: err.message });
    }
  });

  app.post('/api/scoring/recalculate', (req, res) => {
    try {
      const { profile_id } = req.body;
      if (!profile_id) {
        return res.status(400).json({ error: 'profile_id is required' });
      }

      let profile = profilesDb[profile_id] || Object.values(profilesDb).find(p => p._meta.session_id === profile_id);
      if (!profile) {
        profile = createDefaultProfile(profile_id, 'Guest Startup', 'fr');
        profilesDb[profile_id] = profile;
      }

      const oldScores = previousScoresDb[profile_id] || {
        market: { score: Math.max(0, (profile.scores.market.score || 50) - 15) },
        commercial: { score: Math.max(0, (profile.scores.commercial.score || 45) - 10) },
        innovation: { score: Math.max(0, (profile.scores.innovation.score || 60) - 20) },
        scalability: { score: Math.max(0, (profile.scores.scalability.score || 40) - 15) },
        green: { score: Math.max(0, (profile.scores.green.score || 50) - 10) }
      };

      const currentScores = computeScores(profile);
      profile.scores = currentScores;
      previousScoresDb[profile_id] = JSON.parse(JSON.stringify(currentScores));

      res.json({
        success: true,
        current_scores: currentScores,
        previous_scores: oldScores
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Recalculation failed', details: err.message });
    }
  });

  // Helper to enrich roadmap steps with explanatory json metadata
  function enrichRoadmapItemsWithExplanations(items: any[]): any[] {
    try {
      const explanationsPath = path.join(process.cwd(), 'src', 'data', 'roadmap_explanations.json');
      if (!fs.existsSync(explanationsPath)) return items;
      
      const fileContent = fs.readFileSync(explanationsPath, 'utf-8');
      const explanations = JSON.parse(fileContent);
      const rationales = explanations.resource_rationales || {};
      
      return items.map(step => {
        const enriched = { ...step };
        const rationale = rationales[step.resourceId];
        if (rationale) {
          enriched.rationaleFr = rationale.why_recommended.fr;
          enriched.rationaleAr = rationale.why_recommended.ar;
          enriched.concreteStepFr = rationale.concrete_next_step.fr;
          enriched.concreteStepAr = rationale.concrete_next_step.ar;
          enriched.triggerConditionFr = rationale.trigger_condition.fr;
          enriched.triggerConditionAr = rationale.trigger_condition.ar;
        }
        return enriched;
      });
    } catch (err) {
      console.error('Error enriching roadmap items with explanations:', err);
      return items;
    }
  }

  // 7.4 Feature 3 — Dynamic RAG-Grounded Endpoints
  app.get('/api/roadmap', async (req, res) => {
    try {
      const profileId = req.query.profile_id as string;
      if (!profileId) {
        return res.status(400).json({ error: 'profile_id query parameter is required' });
      }

      let profile = profilesDb[profileId] || Object.values(profilesDb).find(p => p._meta.session_id === profileId);
      if (!profile) {
        try {
          profile = await loadProfile(profileId);
          profilesDb[profile._meta.profile_id] = profile;
        } catch {
          profile = Object.values(profilesDb)[0] || createDefaultProfile(profileId, 'Guest Startup', 'fr');
        }
      }

      // Check current fingerprint (based on diagnostic stage, scores, blockers, language, and diagnostic version)
      const currentFingerprint = JSON.stringify({
        stage: profile.diagnosis.stage_assigned,
        scores: profile.scores,
        blockers: profile.diagnosis.blockers_detected,
        language: profile._meta.language || 'fr',
        diagnostic_version: (profile as any).diagnostic_version || 1
      });

      // Serve from cache if nothing changed
      if ((profile as any).roadmap && (profile as any).roadmap_fingerprint === currentFingerprint) {
        return res.json({
          status: "ready",
          items: enrichRoadmapItemsWithExplanations((profile as any).roadmap),
          cached: true,
          isFallbackMode: false
        });
      }

      const result = await ragEngine.generateRoadmap(profile);
      
      if (result.success) {
        // Cache roadmap on profile objects so other parts of the app can use it
        (profile as any).roadmap = result.items;
        cleanupStaleCompletedSteps(profile);
        (profile as any).roadmap_fingerprint = currentFingerprint;
        await saveProfileState(profile._meta.profile_id, profile);
        res.json({
          status: "ready",
          items: enrichRoadmapItemsWithExplanations(result.items),
          cached: false,
          isFallbackMode: false
        });
      } else {
        res.status(500).json({ error: 'Failed to generate roadmap', details: result.error });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Feuille de route generation failed', details: err.message });
    }
  });

  app.post('/api/roadmap/regenerate', async (req, res) => {
    try {
      const { profile_id } = req.body;
      if (!profile_id) {
        return res.status(400).json({ error: 'profile_id is required' });
      }

      let profile = profilesDb[profile_id] || Object.values(profilesDb).find(p => p._meta.session_id === profile_id);
      if (!profile) {
        try {
          profile = await loadProfile(profile_id);
          profilesDb[profile._meta.profile_id] = profile;
        } catch {
          profile = Object.values(profilesDb)[0] || createDefaultProfile(profile_id, 'Guest Startup', 'fr');
        }
      }

      // Force cache invalidation
      delete (profile as any).roadmap;
      delete (profile as any).roadmap_fingerprint;

      const result = await ragEngine.generateRoadmap(profile);
      if (result.success) {
        const currentFingerprint = JSON.stringify({
          stage: profile.diagnosis.stage_assigned,
          scores: profile.scores,
          blockers: profile.diagnosis.blockers_detected,
          language: profile._meta.language || 'fr',
          diagnostic_version: (profile as any).diagnostic_version || 1
        });
        (profile as any).roadmap = result.items;
        cleanupStaleCompletedSteps(profile);
        (profile as any).roadmap_fingerprint = currentFingerprint;
        await saveProfileState(profile._meta.profile_id, profile);
        res.json({
          status: "ready",
          items: enrichRoadmapItemsWithExplanations(result.items),
          cached: false,
          isFallbackMode: false
        });
      } else {
        res.status(500).json({ error: 'Failed to regenerate roadmap', details: result.error });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Feuille de route regeneration failed', details: err.message });
    }
  });

  // Serve roadmap explanations directly from files
  app.get('/api/roadmap/explanations', (req, res) => {
    try {
      const explanationsPath = path.join(process.cwd(), 'src', 'data', 'roadmap_explanations.json');
      if (fs.existsSync(explanationsPath)) {
        const fileContent = fs.readFileSync(explanationsPath, 'utf-8');
        res.json(JSON.parse(fileContent));
      } else {
        res.status(404).json({ error: 'Roadmap explanations file not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to read roadmap explanations', details: err.message });
    }
  });

const stageKeysToEnglishNames: Record<string, string> = {
  'S1': 'Ideation',
  'S2': 'Market Validation',
  'S3': 'Structuration',
  'S4': 'Fundraising',
  'S5': 'Launch Planning',
  'S6': 'Growth',
  'Ideation': 'Ideation',
  'Market Validation': 'Market Validation',
  'Structuration': 'Structuration',
  'Fundraising': 'Fundraising',
  'Launch Planning': 'Launch Planning',
  'Growth': 'Growth',
  'validation': 'Market Validation',
  'validation de marché': 'Market Validation',
  'lancement': 'Launch Planning',
  'croissance': 'Growth'
};

function recordDiagnosticHistory(profile: ProjectProfile) {
  if (!profile) return;
  
  if (!(profile as any).stage_history) {
    (profile as any).stage_history = [];
  }
  if (!(profile as any).score_history) {
    (profile as any).score_history = [];
  }
  if (!(profile as any).history) {
    (profile as any).history = [];
  }

  const currentStageCode = profile.diagnosis?.stage_assigned || 'S1';
  const stageName = stageKeysToEnglishNames[currentStageCode] || currentStageCode;

  const currentScores = profile.scores || computeScores(profile);
  const currentDateStr = new Date().toISOString().split('T')[0];

  // Prepopulate/backfill initial entry if history list is completely empty
  if ((profile as any).stage_history.length === 0) {
    const initialSelfAssessedCode = profile.entrepreneur?.stage_self_assessed || 'S1';
    const initialSelfAssessedName = stageKeysToEnglishNames[initialSelfAssessedCode] || initialSelfAssessedCode;
    // Backfill to 30 days ago
    const initialDateStr = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    
    (profile as any).stage_history.push({
      stage: initialSelfAssessedName,
      reached_at: initialDateStr,
      self_assessed_at_time: initialSelfAssessedName
    });

    (profile as any).score_history.push({
      date: initialDateStr,
      market_score: Math.max(10, Math.round((currentScores.market?.score || 50) * 0.5)),
      commercial_score: Math.max(10, Math.round((currentScores.commercial?.score || 40) * 0.5)),
      innovation_score: Math.max(10, Math.round((currentScores.innovation?.score || 60) * 0.5)),
      scalability_score: Math.max(10, Math.round((currentScores.scalability?.score || 35) * 0.5)),
      green_score: Math.max(10, Math.round((currentScores.green?.score || 50) * 0.5))
    });
  }

  const lastStageEntry = (profile as any).stage_history[(profile as any).stage_history.length - 1];
  const lastScoreEntry = (profile as any).score_history[(profile as any).score_history.length - 1];

  const selfAssessedCode = profile.entrepreneur?.stage_self_assessed || 'S1';
  const selfAssessedName = stageKeysToEnglishNames[selfAssessedCode] || selfAssessedCode;

  const isDuplicateStage = lastStageEntry && lastStageEntry.stage === stageName && lastStageEntry.reached_at === currentDateStr;
  if (!isDuplicateStage) {
    (profile as any).stage_history.push({
      stage: stageName,
      reached_at: currentDateStr,
      self_assessed_at_time: selfAssessedName
    });
  }

  const m = currentScores.market?.score ?? 0;
  const c = currentScores.commercial?.score ?? 0;
  const i = currentScores.innovation?.score ?? 0;
  const s = currentScores.scalability?.score ?? 0;
  const g = currentScores.green?.score ?? 0;

  const isDuplicateScore = lastScoreEntry &&
    lastScoreEntry.market_score === m &&
    lastScoreEntry.commercial_score === c &&
    lastScoreEntry.date === currentDateStr;

  if (!isDuplicateScore) {
    (profile as any).score_history.push({
      date: currentDateStr,
      market_score: m,
      commercial_score: c,
      innovation_score: i,
      scalability_score: s,
      green_score: g
    });
  }

  // F7: Maintain a clean scores.history array for the line chart
  if (!profile.scores) {
    profile.scores = currentScores;
  }
  if (!(profile.scores as any).history) {
    (profile.scores as any).history = [];
  }
  const prevHistory = (profile.scores as any).history;
  const lastScoreHistoryEntry = prevHistory[prevHistory.length - 1];
  const currentOverallScoreValue = currentScores.overall?.score ?? 0;
  
  if (!lastScoreHistoryEntry || lastScoreHistoryEntry.score !== currentOverallScoreValue) {
    const activeVer = (profile as any).diagnostic_version || 1;
    prevHistory.push({
      timestamp: new Date().toISOString(),
      score: currentOverallScoreValue,
      version_descriptor: `v${activeVer}`,
      reason: lastScoreHistoryEntry ? "Ré-évaluation périodique" : "Évaluation initiale"
    });
  }

  // Also record a complete assessment snapshot
  const hasSnapshot = (profile as any).history.some((h: any) => h.date?.split('T')[0] === currentDateStr);
  if (!hasSnapshot) {
    (profile as any).history.push({
      assessment_number: (profile as any).history.length + 1,
      date: new Date().toISOString(),
      profile_snapshot: JSON.parse(JSON.stringify({
        startup: profile.startup,
        entrepreneur: profile.entrepreneur,
        answers: profile.answers
      })),
      diagnosis: JSON.parse(JSON.stringify(profile.diagnosis || {})),
      scores: JSON.parse(JSON.stringify(currentScores))
    });
  }
}

  app.get('/api/mon-parcours', async (req, res) => {
    try {
      const profileId = req.query.profile_id as string;
      if (!profileId) {
        return res.status(400).json({ error: 'profile_id is required' });
      }

      let profile = profilesDb[profileId] || Object.values(profilesDb).find(p => p._meta.session_id === profileId);
      if (!profile) {
        try {
          profile = await loadProfile(profileId);
          profilesDb[profile._meta.profile_id] = profile;
        } catch {
          profile = createDefaultProfile(profileId, 'Guest Startup', 'fr');
        }
      }

      // Record first to ensure history exists
      recordDiagnosticHistory(profile);
      await saveProfileState(profile._meta.profile_id, profile);

      const currentStage = profile.diagnosis?.stage_assigned || 'S1';
      const currentStageName = stageKeysToEnglishNames[currentStage] || currentStage;
      const confidence = Math.round((profile.scores?.overall?.diagnosis_confidence ?? profile.diagnosis?.confidence_score ?? 0.85) * 100);

      // Fetch or generate roadmap items
      let roadmapItems = (profile as any).roadmap || [];
      if (roadmapItems.length === 0) {
        const result = await ragEngine.generateRoadmap(profile);
        if (result.success) {
          (profile as any).roadmap = result.items;
          cleanupStaleCompletedSteps(profile);
          roadmapItems = result.items;
          await saveProfileState(profile._meta.profile_id, profile);
        }
      }

      cleanupStaleCompletedSteps(profile);
      const completedSteps = (profile as any).completed_steps || [];
      const totalSteps = roadmapItems.length;
      const progress = computeProgress(completedSteps, totalSteps);

      // Dynamic chronological activity feed logs & motivational banners
      const activityLog = buildActivityLog((profile as any).history || []);
      const motivationalBanner = getMotivationBanner((profile as any).history || [], (profile._meta.language as any) === 'ar' ? 'ar' : 'fr');

      res.json({
        entrepreneur_name: profile.startup.name || 'Startup Compass',
        current_stage: currentStageName,
        diagnosis_confidence: confidence,
        stage_history: (profile as any).stage_history || [],
        score_history: (profile as any).score_history || [],
        roadmap_status: "ready",
        items: roadmapItems,
        completed_steps: completedSteps,
        progress_summary: {
          completed: progress.completed,
          total: progress.total || 1
        },
        activity_log: activityLog,
        motivational_banner: motivationalBanner
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch tracking history', details: err.message });
    }
  });

interface ChatItem {
  role: string;
  parts: any[];
}
const chatHistoryDb: Record<string, ChatItem[]> = {};

  app.post('/api/action-status', async (req, res) => {
    try {
      const { profile_id, step_id, completed } = req.body;
      if (!profile_id || !step_id) {
        return res.status(400).json({ error: 'profile_id and step_id are required' });
      }

      let profile = profilesDb[profile_id] || Object.values(profilesDb).find(p => p._meta.session_id === profile_id);
      if (!profile) {
        try {
          profile = await loadProfile(profile_id);
          profilesDb[profile._meta.profile_id] = profile;
        } catch {
          return res.status(404).json({ error: 'Profile not found' });
        }
      }

      if (!(profile as any).completed_steps) {
        (profile as any).completed_steps = [];
      }

      if (completed) {
        if (!(profile as any).completed_steps.includes(step_id)) {
          (profile as any).completed_steps.push(step_id);
        }
      } else {
        (profile as any).completed_steps = (profile as any).completed_steps.filter((id: string) => id !== step_id);
      }

      await saveProfileState(profile._meta.profile_id, profile);
      res.json({ success: true, completed_steps: (profile as any).completed_steps });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update action status', details: err.message });
    }
  });

  app.post('/api/diagnostic/simulate', async (req, res) => {
    try {
      const { profile_id, hypothetical_actions } = req.body;
      if (!profile_id) {
        return res.status(400).json({ error: 'profile_id is required' });
      }

      let profile = profilesDb[profile_id] || Object.values(profilesDb).find(p => p._meta.session_id === profile_id);
      if (!profile) {
        try {
          profile = await loadProfile(profile_id);
          profilesDb[profile._meta.profile_id] = profile;
        } catch {
          return res.status(404).json({ error: 'Profile not found' });
        }
      }

      // Deep copy profile in memory for simulation
      const simulated = JSON.parse(JSON.stringify(profile)) as ProjectProfile;

      const actionMap: Record<string, () => void> = {
        "interviews_10": () => {
          simulated.startup.customer_interviews_conducted = true;
          simulated.startup.customer_interviews_count = 10;
          simulated.answers['Q_interviews_conducted'] = 'yes';
          simulated.answers['Q_interviews_count'] = 10;
        },
        "prototype": () => {
          simulated.startup.has_prototype = true;
          simulated.startup.product_stage = 'prototype';
          simulated.answers['Q_has_prototype'] = 'yes';
          simulated.answers['Q_product_stage'] = 'prototype';
        },
        "pricing": () => {
          simulated.startup.pricing_defined = true;
          simulated.startup.has_business_model = true;
          simulated.answers['Q_pricing_defined'] = 'yes';
          simulated.answers['Q_has_business_model'] = 'yes';
        },
        "growth_plan": () => {
          simulated.startup.has_growth_plan = true;
          simulated.answers['Q_has_growth_plan'] = 'yes';
        },
        "register_company": () => {
          simulated.startup.legal_form = 'S.A.R.L. / S.U.A.R.L.';
          simulated.answers['Q_legal_form'] = 'S.A.R.L. / S.U.A.R.L.';
        }
      };

      if (Array.isArray(hypothetical_actions)) {
        for (const actionId of hypothetical_actions) {
          if (actionMap[actionId]) {
            actionMap[actionId]();
          }
        }
      }

      const currentClass = classifyMaturity(profile);
      const currentScores = profile.scores?.overall?.score !== null ? profile.scores : computeScores(profile);

      const predictedClass = classifyMaturity(simulated);
      const predictedScores = computeScores(simulated);

      res.json({
        current_overall_score: currentScores?.overall?.score || 0,
        predicted_overall_score: predictedScores?.overall?.score || 0,
        stage_unlocked: predictedClass.stageId !== currentClass.stageId,
        predicted_stage: predictedClass.stageId,
        current_stage: currentClass.stageId,
        score_deltas: {
          market: (predictedScores.market?.score || 0) - (currentScores?.market?.score || 0),
          commercial: (predictedScores.commercial?.score || 0) - (currentScores?.commercial?.score || 0),
          innovation: (predictedScores.innovation?.score || 0) - (currentScores?.innovation?.score || 0),
          scalability: (predictedScores.scalability?.score || 0) - (currentScores?.scalability?.score || 0),
          green: (predictedScores.green?.score || 0) - (currentScores?.green?.score || 0),
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Simulation calculation failed', details: err.message });
    }
  });

  app.use('/api', chatRouter);
  app.use('/api', roadmapRouter);

  // Setup Vite Dev server or Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CompassIQ Full stack Server running on http://localhost:${PORT}`);
  });
}

startServer();
