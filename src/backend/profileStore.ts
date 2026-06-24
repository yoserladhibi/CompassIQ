/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ProjectProfile } from "../types";

const DATA_DIR = path.join(process.cwd(), "data");
const SCHEMAS_DIR = path.join(DATA_DIR, "schema");
const PROFILES_DIR = path.join(DATA_DIR, "profiles");
const STORAGE_DIR = path.join(process.cwd(), "backend", "storage", "users");
const USERS_INDEX_PATH = path.join(DATA_DIR, "users_index.json");
const USERS_PATH = path.join(DATA_DIR, "users.json");
const STARTUP_PROJECTS_PATH = path.join(DATA_DIR, "startup_projects.json");
const REPORTS_DIR = path.join(process.cwd(), "reports");

export function toFrontendProfile(diskData: any): ProjectProfile {
  const profile: ProjectProfile = {
    _meta: {
      schema_version: diskData._meta?.schema_version || "2.0",
      description: "Profile loaded from storage",
      profile_id: diskData._meta?.project_id || "",
      session_id: `SESSION-${(diskData._meta?.project_id || "").substring(0, 8)}`,
      created_at: diskData._meta?.created_at || new Date().toISOString(),
      updated_at: diskData._meta?.updated_at || new Date().toISOString(),
      completion_rate: diskData.profile?.assessment?.completion_rate ?? 0.0,
      questionnaire_completed: (diskData.profile?.assessment?.completion_rate ?? 0.0) >= 1.0 || (diskData.profile?.assessment?.last_question_id === null && (diskData.profile?.assessment?.questions_answered || []).length > 0),
      language: diskData._meta?.language || "fr"
    },
    entrepreneur: diskData.profile?.entrepreneur || {},
    startup: diskData.profile?.startup || {},
    assessment: diskData.profile?.assessment || {},
    diagnosis: {
      stage_assigned: diskData.diagnosis?.stage_assigned || null,
      stage_label: diskData.diagnosis?.stage_label || null,
      stage_self_assessed: diskData.diagnosis?.stage_self_assessed || null,
      perception_gap: diskData.diagnosis?.perception_gap || {
        detected: false,
        self_assessed_stage: null,
        actual_stage: null,
        gap_direction: null,
        gap_explanation: null
      },
      classification_evidence: diskData.diagnosis?.classification_evidence || [],
      confidence_score: diskData.diagnosis?.confidence_score || null,
      blockers_detected: diskData.diagnosis?.blockers_detected || []
    },
    scores: {
      market: diskData.scores?.market || { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      commercial: diskData.scores?.commercial || { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      innovation: diskData.scores?.innovation || { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      scalability: diskData.scores?.scalability || { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      green: diskData.scores?.green || { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      overall: diskData.scores?.overall || { score: null, diagnosis_confidence: null, computed_at: null }
    },
    blockers: diskData.diagnosis?.blockers_detected || [],
    answers: diskData.profile?.answers || {}
  };

  // Add extra properties for backwards-compatibility with some UI views
  (profile as any).user = diskData.profile?.user || {};
  (profile as any).completed_steps = Array.from(new Set(diskData.progress?.completed_actions || []));
  (profile as any).stage_history = diskData.diagnosis?.history || [];
  (profile as any).score_history = diskData.scores?.history || [];
  (profile as any).achievements_unlocked = diskData.profile?.achievements_unlocked || [];
  (profile as any).history = diskData.profile?.history || [];
  (profile as any).roadmap = diskData.roadmap?.steps || [];
  (profile as any).diagnostic_version = diskData._meta?.diagnostic_version || 1;

  return profile;
}

export function fromFrontendProfile(frontendProfile: any, existingDiskData: any): any {
  const diskData = { ...existingDiskData };
  
  if (!diskData._meta) diskData._meta = {};
  diskData._meta.project_id = frontendProfile._meta?.profile_id || diskData._meta?.project_id;
  diskData._meta.user_id = frontendProfile.user?.id || diskData._meta?.user_id || "";
  diskData._meta.created_at = frontendProfile._meta?.created_at || diskData._meta?.created_at || new Date().toISOString();
  diskData._meta.updated_at = new Date().toISOString();
  diskData._meta.language = frontendProfile._meta?.language || diskData._meta?.language || "fr";
  diskData._meta.diagnostic_version = frontendProfile.diagnostic_version || diskData._meta?.diagnostic_version || 1;
  diskData._meta.schema_version = "2.0";

  diskData.profile = {
    entrepreneur: frontendProfile.entrepreneur || {},
    startup: frontendProfile.startup || {},
    assessment: frontendProfile.assessment || {},
    answers: frontendProfile.answers || {},
    user: frontendProfile.user || {},
    achievements_unlocked: frontendProfile.achievements_unlocked || [],
    history: frontendProfile.history || []
  };

  diskData.diagnosis = {
    stage_assigned: frontendProfile.diagnosis?.stage_assigned || null,
    stage_label: frontendProfile.diagnosis?.stage_label || null,
    stage_self_assessed: frontendProfile.diagnosis?.stage_self_assessed || null,
    perception_gap: frontendProfile.diagnosis?.perception_gap || null,
    classification_evidence: frontendProfile.diagnosis?.classification_evidence || [],
    confidence_score: frontendProfile.diagnosis?.confidence_score || null,
    blockers_detected: frontendProfile.diagnosis?.blockers_detected || frontendProfile.blockers || [],
    history: frontendProfile.stage_history || diskData.diagnosis?.history || []
  };

  diskData.scores = {
    market: frontendProfile.scores?.market || {},
    commercial: frontendProfile.scores?.commercial || {},
    innovation: frontendProfile.scores?.innovation || {},
    scalability: frontendProfile.scores?.scalability || {},
    green: frontendProfile.scores?.green || {},
    overall: frontendProfile.scores?.overall || {},
    history: frontendProfile.score_history || diskData.scores?.history || []
  };

  diskData.roadmap = {
    steps: frontendProfile.roadmap || diskData.roadmap?.steps || []
  };

  diskData.progress = {
    completed_actions: Array.from(new Set(frontendProfile.completed_steps || diskData.progress?.completed_actions || [])),
    in_progress_actions: diskData.progress?.in_progress_actions || [],
    activity_log: diskData.progress?.activity_log || []
  };

  diskData.chat_history = diskData.chat_history || [];
  diskData.notifications = diskData.notifications || [];

  return diskData;
}

function getEmptyDiskSchema(projectId: string): any {
  return {
    _meta: {
      project_id: projectId,
      user_id: "",
      diagnostic_version: 1,
      schema_version: "2.0",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    profile: {
      entrepreneur: { sector: null, location: null, stage_self_assessed: null },
      startup: { name: null },
      assessment: { questions_answered: [], questions_skipped: [], branching_path: [], completion_rate: 0.0, last_question_id: null },
      answers: {}
    },
    diagnosis: {
      stage_assigned: null,
      stage_label: null,
      stage_self_assessed: null,
      perception_gap: { detected: false, self_assessed_stage: null, actual_stage: null, gap_direction: null, gap_explanation: null },
      classification_evidence: [],
      confidence_score: null,
      blockers_detected: [],
      history: []
    },
    scores: {
      market: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      commercial: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      innovation: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      scalability: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      green: { score: null, raw_score: null, gating_applied: false, cap_value: null, gating_rule: null, sub_scores: {}, primary_gap: null, explanation: null, recommendation: null },
      overall: { score: null, diagnosis_confidence: null, computed_at: null },
      history: []
    },
    roadmap: {
      steps: []
    },
    progress: {
      completed_actions: [],
      in_progress_actions: [],
      activity_log: []
    },
    chat_history: [],
    notifications: []
  };
}

export async function loadDiskUserFile(projectId: string): Promise<any> {
  const filePath = path.join(STORAGE_DIR, `${projectId}.json`);
  if (!(await fileExists(filePath))) {
    const oldPath = path.join(PROFILES_DIR, `${projectId}.json`);
    if (await fileExists(oldPath)) {
      const oldRaw = await fs.readFile(oldPath, "utf-8");
      const oldData = JSON.parse(oldRaw);
      const newDiskData = fromFrontendProfile(oldData, {
        _meta: { project_id: projectId },
        chat_history: [],
        notifications: [],
        progress: { completed_actions: [], in_progress_actions: [], activity_log: [] }
      });
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      await atomicWriteJson(filePath, newDiskData);
      return newDiskData;
    }
    const defaultNewDisk = getEmptyDiskSchema(projectId);
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await atomicWriteJson(filePath, defaultNewDisk);
    return defaultNewDisk;
  }
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function saveDiskUserFile(projectId: string, data: any): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const filePath = path.join(STORAGE_DIR, `${projectId}.json`);
  await atomicWriteJson(filePath, data);
}

// Simple interface for user registration entries in users_index.json
interface UsersIndexEntry {
  profile_id: string;
  password_hash: string;
  name: string;
}

export interface UserRecord {
  id: string; // UUID
  email: string;
  password_hash: string;
  full_name: string;
  language_preference: 'fr' | 'ar';
  created_at: string;
}

export interface StartupProjectRecord {
  id: string; // UUID
  user_id: string; // UUID
  startup_name: string;
  region_code: string;
  sector_code: string;
  self_assessed_stage_code: string;
  created_at: string;
  updated_at: string;
}

export const STAGE_CODE_TO_ID: Record<string, string> = {
  'IDEATION': 'S1',
  'MARKET_VALIDATION': 'S2',
  'STRUCTURATION': 'S3',
  'FUNDRAISING': 'S4',
  'LAUNCH_PLANNING': 'S5',
  'GROWTH': 'S6',
};

export const STAGE_ID_TO_CODE: Record<string, string> = {
  'S1': 'IDEATION',
  'S2': 'MARKET_VALIDATION',
  'S3': 'STRUCTURATION',
  'S4': 'FUNDRAISING',
  'S5': 'LAUNCH_PLANNING',
  'S6': 'GROWTH',
};

// Memory lock dictionary for ensuring write serialization on the same profile_id
const profileLocks = new Map<string, Promise<unknown>>();

/**
 * Runs an asynchronous operation with an exclusive lock on the given profile_id
 * to ensure no concurrent writes result in race conditions.
 */
export async function withProfileLock<T>(profileId: string, fn: () => Promise<T>): Promise<T> {
  const previous = profileLocks.get(profileId) ?? Promise.resolve();
  let result!: T;
  const current = previous.catch(() => {}).then(async () => {
    result = await fn();
  });
  profileLocks.set(profileId, current);
  await current;
  return result;
}

/**
 * Set up initial database directories and populate schema files from canonical blueprints.
 */
export async function initializeStore(): Promise<void> {
  try {
    // 1. Create directories
    await fs.mkdir(SCHEMAS_DIR, { recursive: true });
    await fs.mkdir(PROFILES_DIR, { recursive: true });
    await fs.mkdir(REPORTS_DIR, { recursive: true });

    // 2. Safely copy schema/canonical blueprints
    const copies = [
      { src: "questions.json", dest: path.join(SCHEMAS_DIR, "questions.json") },
      { src: "maturity_rules.json", dest: path.join(SCHEMAS_DIR, "maturity_rules.json") },
      { src: "project_profile.json", dest: path.join(SCHEMAS_DIR, "project_profile_template.json") },
      { src: path.join("src", "data", "CompassIQ_knowledge_base_v2.json"), dest: path.join(SCHEMAS_DIR, "CompassIQ_knowledge_base_v2.json") }
    ];

    for (const copy of copies) {
      try {
        if (await fileExists(copy.src)) {
          // Only write if doesn't exist, preventing overwrite of any manual schema tweaks
          if (!(await fileExists(copy.dest))) {
            const content = await fs.readFile(copy.src, "utf-8");
            await atomicWriteJson(copy.dest, JSON.parse(content));
          }
        }
      } catch (err) {
        console.warn(`Could not copy canonical blueprint ${copy.src} to schema folder:`, err);
      }
    }

    // 3. Initialize users index, users data, and projects data if missing
    if (!(await fileExists(USERS_INDEX_PATH))) {
      await atomicWriteJson(USERS_INDEX_PATH, {});
    }
    if (!(await fileExists(USERS_PATH))) {
      await atomicWriteJson(USERS_PATH, {});
    }
    if (!(await fileExists(STARTUP_PROJECTS_PATH))) {
      await atomicWriteJson(STARTUP_PROJECTS_PATH, {});
    }
  } catch (err) {
    console.error("Failed to initialize profile storage directories:", err);
  }
}

/**
 * Atomic file writer using tmp files and renaming
 */
async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  const tempFile = path.join(dir, `.${path.basename(filePath)}.${crypto.randomUUID()}.tmp`);
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tempFile, filePath);
}

/**
 * Returns whether a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hash plain text password
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Verify plain text password against hash
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Loads the central users registry index
 */
export async function loadUsersIndex(): Promise<Record<string, UsersIndexEntry>> {
  try {
    const raw = await fs.readFile(USERS_INDEX_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Find profile id by a user's email address
 */
export async function getProfileIdByEmail(email: string): Promise<string | null> {
  const index = await loadUsersIndex();
  const entry = index[email.toLowerCase().trim()];
  return entry ? entry.profile_id : null;
}

/**
 * Load a consolidated profile document from file
 */
export async function loadProfile(profileId: string): Promise<ProjectProfile> {
  const diskData = await loadDiskUserFile(profileId);
  return toFrontendProfile(diskData);
}

/**
 * Save a consolidated profile document atomically
 */
export async function saveProfile(profileId: string, data: ProjectProfile): Promise<void> {
  const existingDiskData = await loadDiskUserFile(profileId);
  const updatedDiskData = fromFrontendProfile(data, existingDiskData);
  await saveDiskUserFile(profileId, updatedDiskData);
}

/**
 * Create a brand new consolidated profile document and index the user
 */
export async function createProfile(
  name: string,
  email: string,
  passwordHash: string,
  language: "fr" | "ar"
): Promise<string> {
  const profileId = `PROFILE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Load clean baseline template if possible, or build custom layout
  let defaultProfile: ProjectProfile;
  try {
    const templatePath = path.join(SCHEMAS_DIR, "project_profile_template.json");
    if (await fileExists(templatePath)) {
      const content = await fs.readFile(templatePath, "utf-8");
      defaultProfile = JSON.parse(content) as ProjectProfile;
    } else {
      defaultProfile = getEmptyTemplate();
    }
  } catch {
    defaultProfile = getEmptyTemplate();
  }

  // Inject user specific fields
  defaultProfile._meta.profile_id = profileId;
  defaultProfile._meta.created_at = now;
  defaultProfile._meta.updated_at = now;
  defaultProfile._meta.language = language;
  defaultProfile.startup.name = name;
  (defaultProfile as any).user = {
    name,
    email: email.toLowerCase().trim(),
    language_preference: language
  };
  (defaultProfile as any).completed_steps = [];
  (defaultProfile as any).stage_history = [];
  (defaultProfile as any).score_history = [];
  (defaultProfile as any).achievements_unlocked = [];
  (defaultProfile as any).history = [];

  // Write profile details securely
  await atomicWriteJson(path.join(PROFILES_DIR, `${profileId}.json`), defaultProfile);

  // Update central index registry
  const index = await loadUsersIndex();
  index[email.toLowerCase().trim()] = {
    profile_id: profileId,
    password_hash: passwordHash,
    name
  };
  await atomicWriteJson(USERS_INDEX_PATH, index);

  return profileId;
}

/**
 * Helper to produce default template structure
 */
function getEmptyTemplate(): ProjectProfile {
  return {
    _meta: {
      schema_version: '1.1',
      description: 'Profile created at registration',
      profile_id: '',
      session_id: `SESSION-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completion_rate: 0.0,
      questionnaire_completed: false,
      language: 'fr'
    },
    entrepreneur: {
      sector: 'agritech',
      location: 'Tunis',
      stage_self_assessed: 'S1'
    },
    startup: {
      name: '',
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

export async function loadUsers(): Promise<Record<string, UserRecord>> {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveUsers(users: Record<string, UserRecord>): Promise<void> {
  await atomicWriteJson(USERS_PATH, users);
}

export async function loadStartupProjects(): Promise<Record<string, StartupProjectRecord>> {
  try {
    const raw = await fs.readFile(STARTUP_PROJECTS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveStartupProjects(projects: Record<string, StartupProjectRecord>): Promise<void> {
  await atomicWriteJson(STARTUP_PROJECTS_PATH, projects);
}

export async function createUserAndProject(
  fullName: string,
  email: string,
  passwordHash: string,
  languagePreference: 'fr' | 'ar',
  startupName: string,
  regionCode: string,
  sectorCode: string,
  selfAssessedStageCode: string
): Promise<{ user_id: string; project_id: string }> {
  // Load existing records
  const users = await loadUsers();
  const projects = await loadStartupProjects();

  const emailKey = email.toLowerCase().trim();
  let user = Object.values(users).find(u => u.email === emailKey);
  let userId: string;

  if (!user) {
    userId = crypto.randomUUID();
    user = {
      id: userId,
      email: emailKey,
      password_hash: passwordHash,
      full_name: fullName,
      language_preference: languagePreference,
      created_at: new Date().toISOString()
    };
    users[userId] = user;
    await saveUsers(users);
  } else {
    userId = user.id;
  }

  // Generate startup project ID
  const projectId = crypto.randomUUID();
  const project: StartupProjectRecord = {
    id: projectId,
    user_id: userId,
    startup_name: startupName,
    region_code: regionCode,
    sector_code: sectorCode,
    self_assessed_stage_code: selfAssessedStageCode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  projects[projectId] = project;
  await saveStartupProjects(projects);

  // Initialize the baseline template ProjectProfile
  let defaultProfile: ProjectProfile;
  try {
    const templatePath = path.join(SCHEMAS_DIR, "project_profile_template.json");
    if (await fileExists(templatePath)) {
      const content = await fs.readFile(templatePath, "utf-8");
      defaultProfile = JSON.parse(content) as ProjectProfile;
    } else {
      defaultProfile = getEmptyTemplate();
    }
  } catch {
    defaultProfile = getEmptyTemplate();
  }

  const now = new Date().toISOString();

  // Map codes properly for internal intake questions structure
  const stageId = STAGE_CODE_TO_ID[selfAssessedStageCode] || 'S1';
  // Standard formatted values for the legacy code compatibility
  const formattedLocation = regionCode.charAt(0).toUpperCase() + regionCode.slice(1).toLowerCase();
  const formattedSector = sectorCode.toLowerCase();

  // Inject metadata & entrepreneur info
  defaultProfile._meta.profile_id = projectId; // compatibility mapping
  defaultProfile._meta.created_at = now;
  defaultProfile._meta.updated_at = now;
  defaultProfile._meta.language = languagePreference;
  
  defaultProfile.entrepreneur = {
    sector: formattedSector,
    location: formattedLocation,
    stage_self_assessed: stageId
  };
  defaultProfile.startup.name = startupName;
  
  // Custom non-standard user block (stored for UI compatibility)
  (defaultProfile as any).user = {
    id: userId,
    name: fullName,
    email: emailKey,
    language_preference: languagePreference
  };
  (defaultProfile as any).completed_steps = [];
  (defaultProfile as any).stage_history = [];
  (defaultProfile as any).score_history = [];
  (defaultProfile as any).achievements_unlocked = [];
  (defaultProfile as any).history = [];

  // Populate basic onboarding question answers
  defaultProfile.answers = {
    'Q1': formattedSector,
    'Q01': formattedSector,
    'Q02': formattedLocation,
    'Q03': stageId
  };

  // Write profile details securely using project_id
  const initialDiskData = fromFrontendProfile(defaultProfile, {
    _meta: { project_id: projectId, user_id: userId, language: languagePreference },
    chat_history: [],
    notifications: [],
    progress: { completed_actions: [], in_progress_actions: [], activity_log: [] }
  });
  await saveDiskUserFile(projectId, initialDiskData);

  // Update central index registry for backward compatibility
  const index = await loadUsersIndex();
  index[emailKey] = {
    profile_id: projectId,
    password_hash: passwordHash,
    name: fullName
  };
  await atomicWriteJson(USERS_INDEX_PATH, index);

  return { user_id: userId, project_id: projectId };
}
