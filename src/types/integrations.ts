export type UserIntegration = {
  id: string;
  userId: string;
  provider: 'google';
  kind: 'gmail' | 'calendar';
  email?: string;
  accountId?: string;
  googleClientId: string;
  googleClientSecret: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scopes: string[];
  connectedAt: string;
  updatedAt: string;
};

export type UserIntegrationCreate = Omit<UserIntegration, 'id' | 'connectedAt' | 'updatedAt'>;

export type UserIntegrationUpdate = Partial<Omit<UserIntegration, 'id' | 'userId' | 'connectedAt' | 'updatedAt'>>;

// Google OAuth scopes
export const GOOGLE_SCOPES = {
  GMAIL: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
  ],
  CALENDAR: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ]
} as const;

export type GoogleScope = typeof GOOGLE_SCOPES.GMAIL[number] | typeof GOOGLE_SCOPES.CALENDAR[number];
