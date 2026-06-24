/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppView = 'auth' | 'assessment' | 'dashboard' | 'history' | 'roadmap';

export interface CompassSession {
  project_id: string;
  user_id?: string;
  access_token?: string;
  view?: AppView;
}

const SESSION_KEY = 'compass_session';

export function loadCompassSession(): CompassSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CompassSession;
    return parsed?.project_id ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCompassSession(session: CompassSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearCompassSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function updateCompassSessionView(view: AppView): void {
  const existing = loadCompassSession();
  if (existing) {
    saveCompassSession({ ...existing, view });
  }
}
