/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'fr' | 'ar';

export interface MultilingualText {
  fr: string;
  ar: string;
}

export interface MultilingualList {
  fr: string[];
  ar: string[];
}

export interface Option {
  value: string;
  label: MultilingualText;
  numeric?: number;
}

export interface QuestionBranchingRule {
  condition: {
    answer: string;
    and?: {
      field: string;
      operator: string;
      value: any;
    };
  };
  next: string;
}

export interface QuestionBranching {
  type: 'linear' | 'conditional';
  next?: string;
  default_next?: string;
  rules?: QuestionBranchingRule[];
}

export interface Question {
  id: string;
  category: string;
  text: MultilingualText;
  description: MultilingualText;
  type: 'single_choice' | 'multiple_choice' | 'yes_no' | 'text' | 'number';
  required: boolean;
  maps_to: string;
  used_by: string[];
  validation: {
    max_length?: number;
    min?: number;
    max?: number;
    min_selected?: number;
  };
  options?: Option[];
  branching: QuestionBranching;
}

export interface StageRequirement {
  field: string;
  operator: 'eq' | 'neq' | 'gte' | 'lte' | 'gt' | 'lt' | 'in' | 'not_in' | 'is_null' | 'is_not_null' | 'contains';
  value: any;
  label: MultilingualText;
  and?: {
    field: string;
    operator: string;
    value: any;
  };
}

export interface Stage {
  id: string;
  name: MultilingualText;
  label: MultilingualText;
  description: MultilingualText;
  hard_requirements: StageRequirement[];
  soft_requirements: StageRequirement[];
  min_soft_met: number;
  blocker_conditions: StageRequirement[];
  is_fallback: boolean;
  minimum_thresholds?: Record<string, any>;
  explanation: MultilingualText;
  recommended_next_stage: string | null;
  priority_actions: MultilingualList;
}

export interface ProfileMeta {
  schema_version: string;
  description: string;
  profile_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  completion_rate: number;
  questionnaire_completed: boolean;
  language: string;
}

export interface EntrepreneurInfo {
  sector: string | null;
  location: string | null;
  stage_self_assessed: string | null;
}

export interface StartupInfo {
  name: string | null;
  problem_defined: boolean | null;
  target_customer: string | null;
  solution_description: string | null;
  legal_form: string | null;
  prior_accompaniment: boolean | null;
  team_size: string | null;
  has_cofounders: boolean | null;
  team_skills: string[];
  has_mentors: boolean | null;
  has_prototype: boolean | null;
  product_stage: string | null;
  launched_to_market: boolean | null;
  active_users: string | null;
  customer_interviews_conducted: boolean | null;
  customer_interviews_count: number | null;
  has_survey_data: boolean | null;
  has_pilot_users: boolean | null;
  has_loi: boolean | null;
  has_business_model: boolean | null;
  revenue_model: string | null;
  pricing_defined: boolean | null;
  has_business_plan: boolean | null;
  has_financial_projection: boolean | null;
  monthly_revenue: string | null;
  monthly_revenue_numeric: number | null;
  has_paying_customers: boolean | null;
  paying_customers_count: number | null;
  has_funding: boolean | null;
  funding_type: string | null;
  has_growth_plan: boolean | null;
  solution_replicable: boolean | null;
  manual_dependency_level: string | null;
  international_expansion: boolean | null;
  local_competition_level: string | null;
  technology_intensity: string | null;
  has_env_impact: boolean | null;
  has_env_assessment: boolean | null;
  env_practices: string[];
  agri_land_use: boolean | null;
  agri_water_efficiency: boolean | null;
}

export interface AssessmentInfo {
  questions_answered: string[];
  questions_skipped: string[];
  branching_path: string[];
  completion_rate: number;
  last_question_id: string | null;
}

export interface PerceptionGap {
  detected: boolean;
  self_assessed_stage: string | null;
  actual_stage: string | null;
  gap_direction: 'overestimation' | 'underestimation' | 'aligned' | null;
  gap_explanation: MultilingualText | null;
}

export interface DiagnosisInfo {
  stage_assigned: string | null;
  stage_label: MultilingualText | null;
  stage_self_assessed: string | null;
  perception_gap: PerceptionGap;
  classification_evidence: Array<{
    criteria: MultilingualText;
    status: boolean;
    is_hard: boolean;
  }>;
  confidence_score: number | null;
  blockers_detected: Blocker[];
}

export interface SubScores {
  [key: string]: number | null;
}

export interface DimensionScore {
  score: number | null;
  raw_score: number | null;
  gating_applied: boolean;
  cap_value: number | null;
  gating_rule: string | null;
  sub_scores: SubScores;
  primary_gap: MultilingualText | null;
  explanation: MultilingualText | null;
  recommendation: MultilingualText | null;
}

export interface ScoresInfo {
  market: DimensionScore;
  commercial: DimensionScore;
  innovation: DimensionScore;
  scalability: DimensionScore;
  green: DimensionScore;
  overall: {
    score: number | null;
    diagnosis_confidence: number | null;
    computed_at: string | null;
  };
}

export interface Blocker {
  id: string;
  dimension: 'market' | 'commercial' | 'innovation' | 'scalability' | 'green' | 'legal' | 'team' | null;
  severity: 'high' | 'medium' | 'low' | null;
  title: MultilingualText | null;
  description: MultilingualText | null;
  action: MultilingualText | null;
}

export interface ProjectProfile {
  _meta: ProfileMeta;
  entrepreneur: EntrepreneurInfo;
  startup: StartupInfo;
  assessment: AssessmentInfo;
  diagnosis: DiagnosisInfo;
  scores: ScoresInfo;
  blockers: Blocker[];
  answers: Record<string, any>; // maps_to keys and values
}
