"""
Google Calendar integration service for meal plan syncing.
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from google.oauth2.credentials import Credentials as UserCredentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from ..config import settings
from ..models.meal_plan import MealPlan

logger = logging.getLogger(__name__)


class GoogleCalendarService:
    """Service for Google Calendar integration."""
    
    def __init__(self):
        self.scopes = ['https://www.googleapis.com/auth/calendar']
        self._service = None
    
    def _get_calendar_service(self, credentials: UserCredentials):
        """Get Google Calendar service instance."""
        try:
            return build('calendar', 'v3', credentials=credentials)
        except Exception as e:
            logger.error(f"Failed to build calendar service: {e}")
            raise ValueError(f"Failed to initialize Google Calendar service: {e}")
    
    async def get_user_calendars(self, access_token: str) -> List[Dict[str, Any]]:
        """Get list of user's calendars using OAuth access token."""
        try:
            # Create credentials from access token
            credentials = UserCredentials(token=access_token)
            service = self._get_calendar_service(credentials)
            
            # Get calendar list
            calendar_list = service.calendarList().list().execute()
            
            calendars = []
            for calendar_item in calendar_list.get('items', []):
                calendars.append({
                    'id': calendar_item['id'],
                    'name': calendar_item.get('summary', 'Unnamed Calendar'),
                    'description': calendar_item.get('description', ''),
                    'primary': calendar_item.get('primary', False),
                    'access_role': calendar_item.get('accessRole', 'reader')
                })
            
            return calendars
        except HttpError as e:
            logger.error(f"HTTP error getting calendars: {e}")
            raise ValueError(f"Failed to get calendars: {e}")
        except Exception as e:
            logger.error(f"Error getting calendars: {e}")
            raise ValueError(f"Failed to get calendars: {e}")
    
    async def check_calendar_events(self, access_token: str, calendar_id: str, meal_plan: MealPlan) -> List[Dict[str, Any]]:
        """Check if there are existing events on the calendar for meal plan dates."""
        try:
            credentials = UserCredentials(token=access_token)
            service = self._get_calendar_service(credentials)
            
            # Get the date range for the meal plan
            dates_with_meals = [entry.date for entry in meal_plan.entries if entry.recipe_id]
            if not dates_with_meals:
                return []
            
            min_date = min(dates_with_meals)
            max_date = max(dates_with_meals)
            
            # Convert dates to datetime objects for the API call
            # For all-day events, we need to query the full day range
            
            # Convert min_date to datetime at start of day
            min_datetime = datetime.combine(min_date, datetime.min.time())
            # Convert max_date to datetime at end of day (next day at 00:00)
            max_datetime = datetime.combine(max_date + timedelta(days=1), datetime.min.time())
            
            # Query events in the date range
            events_result = service.events().list(
                calendarId=calendar_id,
                timeMin=min_datetime.isoformat() + 'Z',
                timeMax=max_datetime.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            # Filter events that conflict with meal plan dates
            conflicting_events = []
            for event in events:
                event_start = event.get('start', {})
                event_date_str = event_start.get('date') or event_start.get('dateTime', '')
                
                if event_date_str:
                    try:
                        if 'T' in event_date_str:
                            # DateTime event
                            event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00')).date()
                        else:
                            # All-day event
                            event_date = datetime.fromisoformat(event_date_str).date()
                        
                        # Check if this event conflicts with any meal plan date
                        if event_date in [d.date() if hasattr(d, 'date') else d for d in dates_with_meals]:
                            conflicting_events.append({
                                'id': event.get('id'),
                                'title': event.get('summary', 'Untitled Event'),
                                'date': event_date.isoformat(),
                                'description': event.get('description', '')
                            })
                    except Exception as e:
                        logger.warning(f"Failed to parse event date {event_date_str}: {e}")
            
            return conflicting_events
        except HttpError as e:
            logger.error(f"HTTP error checking calendar events: {e}")
            raise ValueError(f"Failed to check calendar events: {e}")
        except Exception as e:
            logger.error(f"Error checking calendar events: {e}")
            raise ValueError(f"Failed to check calendar events: {e}")
    
    async def sync_meal_plan_to_calendar(
        self, 
        access_token: str, 
        calendar_id: str, 
        meal_plan: MealPlan, 
        recipe_map: Dict[str, Any],
        overwrite_existing: bool = False
    ) -> Dict[str, Any]:
        """Sync meal plan to Google Calendar."""
        try:
            credentials = UserCredentials(token=access_token)
            service = self._get_calendar_service(credentials)
            
            # Check for existing events if not overwriting
            if not overwrite_existing:
                existing_events = await self.check_calendar_events(access_token, calendar_id, meal_plan)
                if existing_events:
                    return {
                        'success': False,
                        'error': 'Existing events found on calendar',
                        'conflicting_events': existing_events,
                        'events_created': 0
                    }
            
            # Create events for each meal plan entry
            events_created = 0
            created_events = []
            
            for entry in meal_plan.entries:
                if not entry.recipe_id:
                    continue
                
                recipe = recipe_map.get(entry.recipe_id)
                if not recipe:
                    continue
                
                # Ensure we have a proper date object
                event_date = entry.date.date() if hasattr(entry.date, 'date') else entry.date
                
                # Create all-day event (matching ICS format)
                event = {
                    'summary': recipe.title,
                    'start': {
                        'date': event_date.isoformat(),
                        # Don't specify timeZone for all-day events
                    },
                    'end': {
                        'date': event_date.isoformat(),
                        # Don't specify timeZone for all-day events
                    },
                    'description': self._build_event_description(recipe, entry),
                    'source': {
                        'title': 'Scherbring Family Recipe App',
                        'url': recipe.source_url if hasattr(recipe, 'source_url') and recipe.source_url else None
                    }
                }
                
                # Remove source if URL is None
                if not event['source']['url']:
                    del event['source']
                
                try:
                    created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
                    events_created += 1
                    created_events.append({
                        'id': created_event.get('id'),
                        'title': recipe.title,
                        'date': event_date.isoformat()
                    })
                except HttpError as e:
                    logger.error(f"Failed to create event for {recipe.title} on {event_date}: {e}")
                    # Continue with other events even if one fails
            
            return {
                'success': True,
                'events_created': events_created,
                'created_events': created_events,
                'total_entries': len([e for e in meal_plan.entries if e.recipe_id])
            }
            
        except HttpError as e:
            logger.error(f"HTTP error syncing to calendar: {e}")
            raise ValueError(f"Failed to sync to calendar: {e}")
        except Exception as e:
            logger.error(f"Error syncing to calendar: {e}")
            raise ValueError(f"Failed to sync to calendar: {e}")
    
    def _build_event_description(self, recipe: Any, entry: Any) -> str:
        """Build event description with recipe details."""
        description_parts = []
        
        # Add meal plan notes if any
        if entry.notes:
            description_parts.append(f"Notes: {entry.notes}")
            description_parts.append("")
        
        # Add ingredients
        ingredient_texts = recipe.get_all_ingredients_text() if hasattr(recipe, 'get_all_ingredients_text') else []
        if ingredient_texts:
            description_parts.append("INGREDIENTS:")
            for ingredient in ingredient_texts:
                description_parts.append(f"• {ingredient}")
            description_parts.append("")
        
        # Add cooking instructions
        if hasattr(recipe, 'steps') and recipe.steps:
            description_parts.append("INSTRUCTIONS:")
            for i, step in enumerate(recipe.steps, 1):
                description_parts.append(f"{i}. {step}")
            description_parts.append("")
        
        # Add recipe URL
        if hasattr(recipe, 'source_url') and recipe.source_url:
            description_parts.append(f"Recipe URL: {recipe.source_url}")
        
        return "\n".join(description_parts)


# Global service instance
google_calendar_service = GoogleCalendarService()
