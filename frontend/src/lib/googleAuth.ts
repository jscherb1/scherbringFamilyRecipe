/**
 * Google OAuth service for calendar integration
 */

// Add type definitions for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string; error?: string }) => void;
            prompt?: string;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export interface GoogleAuthConfig {
  clientId: string;
  scope: string;
}

export class GoogleAuthService {
  private clientId: string;
  private scope: string;
  private tokenClient: any;

  constructor(config: GoogleAuthConfig) {
    this.clientId = config.clientId;
    this.scope = config.scope;
  }

  /**
   * Initialize the Google OAuth client
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkGoogleLoaded = () => {
        if (window.google?.accounts?.oauth2) {
          resolve();
        } else {
          setTimeout(checkGoogleLoaded, 100);
        }
      };
      
      // Check if Google script is already loaded
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        checkGoogleLoaded();
      }
    });
  }

  /**
   * Request access token for Google Calendar
   */
  async requestAccessToken(): Promise<string> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scope,
          prompt: '', // Don't force re-consent for returning users
          callback: (response) => {
            if (response.error) {
              console.error('Google OAuth Error:', response.error);
              reject(new Error(`Google OAuth failed: ${response.error}`));
            } else {
              resolve(response.access_token);
            }
          },
        });

        // Request access token
        this.tokenClient.requestAccessToken({
          prompt: 'consent', // Force consent screen for testing
        });
      } catch (error) {
        console.error('Failed to initialize token client:', error);
        reject(new Error('Failed to initialize Google OAuth'));
      }
    });
  }

  /**
   * Check if Google OAuth is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.google?.accounts?.oauth2;
  }
}

// Configuration - in a real app, this would come from environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

export const googleAuthService = new GoogleAuthService({
  clientId: GOOGLE_CLIENT_ID,
  scope: GOOGLE_CALENDAR_SCOPE,
});
