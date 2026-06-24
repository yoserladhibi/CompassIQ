/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Language, ProjectProfile, Question, Option } from '../types';
import { getTranslation } from '../localization';
import questionsData from '../data/questions.json';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';

interface IntakeFormProps {
  language: Language;
  profile: ProjectProfile;
  onUpdateProfile: (profile: ProjectProfile) => void;
  onDiagnose: () => void;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({
  language,
  profile,
  onUpdateProfile,
  onDiagnose
}) => {
  const questionsList: Question[] = questionsData.questions as Question[];
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('Q02'); // Q01 is sector, set at register
  const [history, setHistory] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<any>('');
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [multipleAnswers, setMultipleAnswers] = useState<string[]>([]);

  const currentQuestion = questionsList.find(q => q.id === currentQuestionId);

  // Initialize previous saved answer for current question
  useEffect(() => {
    if (!currentQuestion) return;
    const mapsTo = currentQuestion.maps_to;
    const savedVal = profile.answers[currentQuestionId] || getNestedValue(profile, mapsTo);

    if (currentQuestion.type === 'multiple_choice') {
      if (Array.isArray(savedVal)) {
        setMultipleAnswers(savedVal);
      } else if (typeof savedVal === 'string' && savedVal) {
        setMultipleAnswers(savedVal.split(','));
      } else {
        setMultipleAnswers([]);
      }
    } else if (currentQuestion.type === 'yes_no') {
      if (savedVal === true || savedVal === 'yes') {
        setSelectedOption('yes');
      } else if (savedVal === false || savedVal === 'no') {
        setSelectedOption('no');
      } else {
        setSelectedOption('');
      }
    } else if (currentQuestion.type === 'single_choice') {
      setSelectedOption(savedVal || '');
    } else {
      setTextAnswer(savedVal || '');
    }
  }, [currentQuestionId]);

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center" id="intake-error">
        <p className="text-red-500 font-bold">Error loading question bank.</p>
      </div>
    );
  }

  // Nested property set helper
  function setNestedValue(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    // Perform parsing for numeric fields
    const lastKey = keys[keys.length - 1];
    if (lastKey === 'customer_interviews_count' || lastKey === 'monthly_revenue_numeric' || lastKey === 'paying_customers_count') {
      current[lastKey] = value === null ? null : Number(value);
    } else {
      current[lastKey] = value;
    }
  }

  function getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return null;
      current = current[key];
    }
    return current;
  }

  const handleNext = () => {
    // 1. Gather current value
    let answerValue: any = null;
    if (currentQuestion.type === 'multiple_choice') {
      answerValue = multipleAnswers;
    } else if (currentQuestion.type === 'yes_no') {
      answerValue = selectedOption === 'yes';
    } else if (currentQuestion.type === 'single_choice') {
      // Find option to fetch numeric equivalent if present
      const opt = currentQuestion.options?.find(o => o.value === selectedOption);
      answerValue = selectedOption;
      
      // Secondary mappings (e.g. if single choice has a numeric value)
      if (opt && opt.numeric !== undefined) {
        if (currentQuestion.maps_to === 'startup.monthly_revenue') {
          setNestedValue(profile, 'startup.monthly_revenue_numeric', opt.numeric);
        }
      }
    } else {
      answerValue = textAnswer;
    }

    if (currentQuestion.required && (answerValue === null || answerValue === '' || (Array.isArray(answerValue) && answerValue.length === 0))) {
      alert(language === 'fr' ? 'S\'il vous plaît répond à cette question.' : 'يرجى الإجابة على هذا السؤال للمتابعة.');
      return;
    }

    // 2. Update Profile State
    const updatedProfile = { ...profile };
    updatedProfile.answers[currentQuestionId] = selectedOption || textAnswer || multipleAnswers;
    setNestedValue(updatedProfile, currentQuestion.maps_to, answerValue);

    // Track answered
    if (!updatedProfile.assessment.questions_answered.includes(currentQuestionId)) {
      updatedProfile.assessment.questions_answered.push(currentQuestionId);
    }

    // Solve custom branch mapping
    let nextQuestionId: string | null = null;
    const branching = currentQuestion.branching;

    if (branching.type === 'linear') {
      nextQuestionId = branching.next || branching.default_next || null;
    } else if (branching.type === 'conditional') {
      // Check yes/no code or choice value
      const matchVal = currentQuestion.type === 'yes_no' ? selectedOption : selectedOption;
      
      let matchedRule = branching.rules?.find(
        r => r.condition.answer === matchVal
      );

      if (matchedRule) {
        nextQuestionId = matchedRule.next;
      } else {
        nextQuestionId = branching.default_next || null;
      }
    }

    // Ensure we don't route back or trap ourselves, handle 'END' signals
    if (nextQuestionId === 'END' || !nextQuestionId) {
      updatedProfile.assessment.completion_rate = 1.0;
      updatedProfile._meta.questionnaire_completed = true;
      onUpdateProfile(updatedProfile);
      onDiagnose();
    } else {
      // Advance to next question
      setHistory([...history, currentQuestionId]);
      setCurrentQuestionId(nextQuestionId);
      
      // Calculate dynamic progress
      const totalEstimated = 35; // benchmark questionnaire size
      const currentRate = Math.min(0.95, updatedProfile.assessment.questions_answered.length / totalEstimated);
      updatedProfile.assessment.completion_rate = currentRate;
      updatedProfile.assessment.last_question_id = nextQuestionId;
      onUpdateProfile(updatedProfile);
    }
  };

  const handlePrev = () => {
    if (history.length === 0) return;
    const prevStory = [...history];
    const prevId = prevStory.pop() || 'Q02';
    setHistory(prevStory);
    setCurrentQuestionId(prevId);
  };

  const handleSkip = () => {
    const updatedProfile = { ...profile };
    if (!updatedProfile.assessment.questions_skipped.includes(currentQuestionId)) {
      updatedProfile.assessment.questions_skipped.push(currentQuestionId);
    }
    
    // Jump forward linearly
    let nextQuestionId = currentQuestion.branching.default_next || currentQuestion.branching.next || null;
    if (nextQuestionId === 'END' || !nextQuestionId) {
      onDiagnose();
    } else {
      setHistory([...history, currentQuestionId]);
      setCurrentQuestionId(nextQuestionId);
    }
  };

  const toggleMultipleChoice = (val: string) => {
    if (multipleAnswers.includes(val)) {
      setMultipleAnswers(multipleAnswers.filter(v => v !== val));
    } else {
      setMultipleAnswers([...multipleAnswers, val]);
    }
  };

  const totalStepsEstimated = 35;
  const progressPercent = Math.round((profile.assessment.questions_answered.length / totalStepsEstimated) * 100);

  return (
    <div className="max-w-3xl mx-auto my-8 px-6 no-print" id="intake-layout-wrapper">
      <div className="bg-white rounded-2xl shadow-xl border border-brand-marble/25 overflow-hidden">
        
        {/* Progress header */}
        <div className="bg-brand-blue/5 border-b border-brand-blue/10 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-brand-blue font-bold tracking-wide uppercase text-xs">
            <span className="bg-brand-blue text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono">
              Q
            </span>
            <span>{getTranslation('navAssessment', language)}</span>
            <span className="text-brand-marble">•</span>
            <span className="text-brand-crimson font-mono">{currentQuestion.category.toUpperCase()}</span>
          </div>
          
          <div className="w-full md:w-48 bg-gray-200 h-2 rounded-full overflow-hidden">
            <div 
              id="progress-bar-fill"
              className="bg-brand-marble h-full transition-all duration-300" 
              style={{ width: `${Math.min(100, Math.max(8, progressPercent))}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-brand-blue">{progressPercent}%</span>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <h2 id="intake-question-text" className="text-xl md:text-2xl font-extrabold text-brand-blue leading-snug">
              {language === 'fr' ? currentQuestion.text.fr : currentQuestion.text.ar}
            </h2>
            <p id="intake-question-desc" className="mt-2 text-sm text-gray-500 italic max-w-2xl leading-relaxed flex items-start gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <span>{language === 'fr' ? currentQuestion.description.fr : currentQuestion.description.ar}</span>
            </p>
          </div>

          <div id="answers-selectors-block" className="space-y-3 my-6">
            {/* 1. Yes / No Option mapping */}
            {currentQuestion.type === 'yes_no' && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  id={`opt-yes_no-yes`}
                  type="button"
                  onClick={() => setSelectedOption('yes')}
                  className={`p-4 rounded-xl border-2 text-lg font-bold transition-all cursor-pointer ${
                    selectedOption === 'yes'
                      ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-md'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {language === 'fr' ? 'Oui' : 'نعم'}
                </button>
                <button
                  id={`opt-yes_no-no`}
                  type="button"
                  onClick={() => setSelectedOption('no')}
                  className={`p-4 rounded-xl border-2 text-lg font-bold transition-all cursor-pointer ${
                    selectedOption === 'no'
                      ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-md'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {language === 'fr' ? 'Non' : 'لا'}
                </button>
              </div>
            )}

            {/* 2. Single Choice options */}
            {currentQuestion.type === 'single_choice' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedOption === opt.value
                        ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-bold shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="single_choice_group"
                      id={`opt-sc-${opt.value}`}
                      value={opt.value}
                      checked={selectedOption === opt.value}
                      onChange={() => setSelectedOption(opt.value)}
                      className="w-4 h-4 text-brand-blue mr-3 ml-3 focus:ring-brand-blue"
                    />
                    <span className="text-sm md:text-base font-sans">
                      {language === 'fr' ? opt.label.fr : opt.label.ar}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* 3. Multiple Choice checkbox selectors */}
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => {
                  const checked = multipleAnswers.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        checked
                          ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-bold shadow-sm'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`opt-mc-${opt.value}`}
                        checked={checked}
                        onChange={() => toggleMultipleChoice(opt.value)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue mr-3 ml-3"
                      />
                      <span className="text-sm md:text-base font-sans">
                        {language === 'fr' ? opt.label.fr : opt.label.ar}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* 4. Text or Number forms */}
            {(currentQuestion.type === 'text' || currentQuestion.type === 'number') && (
              <div className="space-y-2">
                <input
                  id={`field-input-${currentQuestionId}`}
                  type={currentQuestion.type === 'number' ? 'number' : 'text'}
                  required={currentQuestion.required}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder={language === 'fr' ? "Répondez ici..." : "اكتب إجابتك هنا..."}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-gray-900 bg-brand-ivory/10 font-sans"
                />
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="flex items-center justify-between pt-6 border-t border-brand-marble/10 mt-8 gap-3" id="intake-actions-box">
            <button
              id="btn-intake-prev"
              type="button"
              disabled={history.length === 0}
              onClick={handlePrev}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all focus:outline-none flex items-center ${
                history.length > 0
                  ? 'bg-white text-brand-blue border border-brand-marble/50 hover:bg-brand-ivory/30 cursor-pointer'
                  : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
              }`}
            >
              {getTranslation('btnPrev', language)}
            </button>

            {!currentQuestion.required && (
              <button
                id="btn-intake-skip"
                type="button"
                onClick={handleSkip}
                className="text-gray-400 hover:text-brand-crimson font-semibold text-xs py-2 transition-colors cursor-pointer"
              >
                {getTranslation('btnSkip', language)}
              </button>
            )}

            <button
              id="btn-intake-next"
              type="button"
              onClick={handleNext}
              className="px-6 py-3 bg-brand-blue text-white rounded-lg font-bold text-sm hover:bg-brand-blue/90 shadow-md cursor-pointer flex items-center justify-center transition-all duration-300"
            >
              {getTranslation('btnNext', language)}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
export default IntakeForm;
