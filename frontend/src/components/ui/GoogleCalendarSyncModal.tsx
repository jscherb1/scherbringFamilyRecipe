import { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { apiClient } from '../../lib/api';
import { googleAuthService } from '../../lib/googleAuth';
import { GoogleCalendar, GoogleCalendarConflictingEvent, GoogleCalendarSyncResult } from '../../lib/types';

interface GoogleCalendarSyncModalProps {
  open: boolean;
  onClose: () => void;
  mealPlanId: string;
  mealPlanName: string;
}

type SyncStep = 'auth' | 'calendar-selection' | 'conflict-check' | 'confirm' | 'syncing' | 'success' | 'error';

export function GoogleCalendarSyncModal({ 
  open, 
  onClose, 
  mealPlanId, 
  mealPlanName 
}: GoogleCalendarSyncModalProps) {
  const [step, setStep] = useState<SyncStep>('auth');
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<GoogleCalendar | null>(null);
  const [conflicts, setConflicts] = useState<GoogleCalendarConflictingEvent[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [syncResult, setSyncResult] = useState<GoogleCalendarSyncResult | null>(null);
  const [error, setError] = useState<string>('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('auth');
      setLoading(false);
      setAccessToken('');
      setCalendars([]);
      setSelectedCalendar(null);
      setConflicts([]);
      setOverwriteExisting(false);
      setSyncResult(null);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if Google services are available
      if (!googleAuthService.isAvailable()) {
        throw new Error('Google OAuth is not available. Please make sure the Google script is loaded.');
      }
      
      const token = await googleAuthService.requestAccessToken();
      setAccessToken(token);
      
      // Fetch user's calendars
      const response = await apiClient.getGoogleCalendars(mealPlanId, token);
      setCalendars(response.calendars);
      setStep('calendar-selection');
    } catch (err: any) {
      console.error('Google auth failed:', err);
      let errorMessage = err.message || 'Failed to authenticate with Google';
      
      // Provide more helpful error messages for common issues
      if (err.message.includes('access_denied')) {
        errorMessage = 'Access denied. Please make sure you have been added as a test user in the Google Cloud Console, or contact the developer to request access.';
      } else if (err.message.includes('redirect_uri_mismatch')) {
        errorMessage = 'Configuration error: The redirect URI is not configured properly in Google Cloud Console.';
      } else if (err.message.includes('google.dev')) {
        errorMessage = 'GitHub Codespaces domain verification required. Please add your email as a test user in the Google Cloud Console OAuth consent screen.';
      }
      
      setError(errorMessage);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarSelect = async (calendar: GoogleCalendar) => {
    setSelectedCalendar(calendar);
    setLoading(true);
    setError('');

    try {
      // Check for conflicts
      const conflictCheck = await apiClient.checkGoogleCalendarConflicts(
        mealPlanId,
        accessToken,
        calendar.id
      );
      
      setConflicts(conflictCheck.conflicting_events || []);
      setStep('conflict-check');
    } catch (err: any) {
      console.error('Failed to check conflicts:', err);
      setError(err.message || 'Failed to check calendar conflicts');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedCalendar) return;
    
    setStep('syncing');
    setLoading(true);
    setError('');

    try {
      const result = await apiClient.syncMealPlanToGoogleCalendar(
        mealPlanId,
        accessToken,
        selectedCalendar.id,
        overwriteExisting
      );
      
      setSyncResult(result);
      
      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Sync failed');
        setStep('error');
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      setError(err.message || 'Failed to sync to Google Calendar');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'auth':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Connect to Google Calendar</h3>
              <p className="text-muted-foreground mt-2">
                Authorize access to sync "{mealPlanName}" to your Google Calendar
              </p>
            </div>
            <Button onClick={handleGoogleAuth} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        );

      case 'calendar-selection':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Select Calendar</h3>
              <p className="text-muted-foreground">
                Choose which calendar to sync your meal plan to
              </p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-muted cursor-pointer"
                  onClick={() => handleCalendarSelect(calendar)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{calendar.name}</h4>
                      {calendar.primary && (
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    {calendar.description && (
                      <p className="text-sm text-muted-foreground">{calendar.description}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'conflict-check':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Calendar: {selectedCalendar?.name}</h3>
              {conflicts.length > 0 ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">Found {conflicts.length} existing event(s) on selected dates</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <p className="text-sm">No conflicts found - ready to sync!</p>
                </div>
              )}
            </div>

            {conflicts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Existing Events:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {conflicts.map((event, index) => (
                    <div key={index} className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-muted-foreground">{event.date}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <input
                    type="checkbox"
                    id="overwrite-existing"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="overwrite-existing" className="text-sm text-gray-700">
                    Proceed anyway (events will be created alongside existing ones)
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('calendar-selection')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSync} 
                disabled={conflicts.length > 0 && !overwriteExisting}
                className="flex-1"
              >
                Sync to Calendar
              </Button>
            </div>
          </div>
        );

      case 'syncing':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Syncing to Google Calendar</h3>
              <p className="text-muted-foreground">
                Creating events in {selectedCalendar?.name}...
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Successfully Synced!</h3>
              <p className="text-muted-foreground">
                {syncResult?.events_created || 0} meal events have been added to {selectedCalendar?.name}
              </p>
            </div>
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Sync Failed</h3>
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('auth')} className="flex-1">
                Try Again
              </Button>
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar Sync
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              disabled={loading && step === 'syncing'}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}
