import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Checkbox } from './Checkbox';
import { X, Calendar, Download, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { googleAuthService } from '../../lib/googleAuth';
import { GoogleCalendar, GoogleCalendarConflictingEvent, GoogleCalendarSyncResult } from '../../lib/types';

interface CalendarSyncModalProps {
  mealPlanId: string;
  mealPlanName: string;
  onClose: () => void;
  onIcsDownload: () => void;
}

export function CalendarSyncModal({ mealPlanId, mealPlanName, onClose, onIcsDownload }: CalendarSyncModalProps) {
  const [step, setStep] = useState<'options' | 'calendar-selection' | 'conflict-check' | 'syncing' | 'result'>('options');
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [conflicts, setConflicts] = useState<GoogleCalendarConflictingEvent[]>([]);
  const [syncResult, setSyncResult] = useState<GoogleCalendarSyncResult | null>(null);

  useEffect(() => {
    // Check if Google OAuth is available
    if (!googleAuthService.isAvailable()) {
      setError('Google Calendar integration is not available. Please check your internet connection.');
    }
  }, []);

  const handleGoogleCalendarSync = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get Google access token
      const token = await googleAuthService.requestAccessToken();
      setAccessToken(token);
      
      // Get user's calendars
      const calendarsResponse = await apiClient.getGoogleCalendars(token);
      setCalendars(calendarsResponse.calendars);
      setStep('calendar-selection');
      
    } catch (err: any) {
      console.error('Failed to authenticate with Google:', err);
      setError(err.message || 'Failed to authenticate with Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarSelection = async () => {
    if (!selectedCalendarId) {
      setError('Please select a calendar');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Check for conflicts unless overwriting
      if (!overwriteExisting) {
        const conflictCheck = await apiClient.checkGoogleCalendarConflicts(mealPlanId, accessToken, selectedCalendarId);
        
        if (conflictCheck.has_conflicts) {
          setConflicts(conflictCheck.conflicting_events);
          setStep('conflict-check');
          return;
        }
      }
      
      // No conflicts or overwriting enabled, proceed with sync
      await performSync();
      
    } catch (err: any) {
      console.error('Failed to check calendar conflicts:', err);
      setError(err.message || 'Failed to check calendar for conflicts');
    } finally {
      setLoading(false);
    }
  };

  const performSync = async () => {
    try {
      setLoading(true);
      setStep('syncing');
      
      const result = await apiClient.syncToGoogleCalendar(mealPlanId, accessToken, selectedCalendarId, overwriteExisting);
      setSyncResult(result);
      setStep('result');
      
    } catch (err: any) {
      console.error('Failed to sync to Google Calendar:', err);
      setError(err.message || 'Failed to sync to Google Calendar');
      setStep('calendar-selection'); // Go back to calendar selection
    } finally {
      setLoading(false);
    }
  };

  const handleConflictResolution = async (forceSync: boolean) => {
    if (forceSync) {
      setOverwriteExisting(true);
    }
    await performSync();
  };

  const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Calendar Export</span>
              </CardTitle>
              <CardDescription>
                Export "{mealPlanName}" to your calendar
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-3">Choose Export Option</h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={handleGoogleCalendarSync}
                    disabled={loading || !googleAuthService.isAvailable()}
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Sync with Google Calendar</div>
                        <div className="text-sm text-muted-foreground">
                          Add meal plan events directly to your Google Calendar
                        </div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={onIcsDownload}
                  >
                    <div className="flex items-center space-x-3">
                      <Download className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Download .ics file</div>
                        <div className="text-sm text-muted-foreground">
                          Download calendar file to import manually
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'calendar-selection' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-3">Select Calendar</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {calendars.map((calendar) => (
                    <label
                      key={calendar.id}
                      className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                        selectedCalendarId === calendar.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="calendar"
                        value={calendar.id}
                        checked={selectedCalendarId === calendar.id}
                        onChange={(e) => setSelectedCalendarId(e.target.value)}
                        className="text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{calendar.name}</div>
                        {calendar.primary && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Primary</span>
                        )}
                        {calendar.description && (
                          <div className="text-sm text-gray-600">{calendar.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                  />
                  <span className="text-sm">Overwrite existing events</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  By default, we'll check for existing events and warn you about conflicts. 
                  Check this option to overwrite any existing events on the selected dates.
                </p>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep('options')}>
                  Back
                </Button>
                <Button 
                  onClick={handleCalendarSelection} 
                  disabled={!selectedCalendarId || loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'conflict-check' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span>Conflicts Found</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Found {conflicts.length} existing event(s) on "{selectedCalendar?.name}" that conflict with your meal plan dates:
                </p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="border border-yellow-200 bg-yellow-50 rounded-md p-3">
                      <div className="font-medium">{conflict.title}</div>
                      <div className="text-sm text-gray-600">{conflict.date}</div>
                      {conflict.description && (
                        <div className="text-xs text-gray-500 mt-1">{conflict.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep('calendar-selection')}>
                  Back
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleConflictResolution(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleConflictResolution(true)} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Overwrite and Continue'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'syncing' && (
            <div className="text-center py-8">
              <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Syncing to Google Calendar</h3>
              <p className="text-sm text-gray-600">
                Adding your meal plan events to "{selectedCalendar?.name}"...
              </p>
            </div>
          )}

          {step === 'result' && syncResult && (
            <div className="space-y-4">
              {syncResult.success ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Successfully Synced!</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Created {syncResult.events_created} event(s) in "{selectedCalendar?.name}"
                  </p>
                  
                  {syncResult.created_events && syncResult.created_events.length > 0 && (
                    <div className="text-left">
                      <h4 className="font-medium mb-2">Created Events:</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {syncResult.created_events.map((event, index) => (
                          <div key={index} className="text-sm bg-green-50 border border-green-200 rounded p-2">
                            <div className="font-medium">{event.title}</div>
                            <div className="text-gray-600">{event.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sync Failed</h3>
                  <p className="text-sm text-gray-600">
                    {syncResult.error || 'Failed to sync meal plan to Google Calendar'}
                  </p>
                </div>
              )}

              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
