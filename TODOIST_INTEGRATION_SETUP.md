# Todoist Integration Setup

## Overview
The Todoist integration allows users to sync their shopping lists directly from meal plans to their Todoist projects. This feature includes:

- **Profile Configuration**: Users can select which Todoist project to sync to
- **Duplicate Detection**: Automatically skips items that already exist in the project
- **Staple Groceries**: Option to include user-defined staple groceries
- **Real-time Feedback**: Shows how many items were added

## Setup Instructions

### 1. Backend Configuration

Add your Todoist API token to the backend environment:

```bash
# In your .env file or environment variables
TODOIST_API_KEY=your_todoist_api_token_here
```

To get a Todoist API token:
1. Go to https://todoist.com/prefs/integrations
2. Scroll down to "API token"
3. Copy your API token

### 2. Frontend Features

The integration adds:

**Profile Settings (`/settings/profile`):**
- Todoist connection status indicator
- Project selection dropdown
- Configuration instructions

**Meal Plan Export Modal:**
- "Send to Todoist" button next to "Copy to Clipboard"
- Checkbox to include staple groceries
- Real-time sync status

## Usage Workflow

1. **Configure Integration**:
   - Navigate to Profile Settings
   - If Todoist is connected, select your preferred project
   - Save your profile

2. **Export Shopping List**:
   - Open any meal plan
   - Click "Export Shopping List" 
   - Optionally check "Include staple groceries"
   - Click "Send to Todoist"
   - Receive confirmation with count of items added

## Technical Implementation

### Backend Components

- **`app/services/todoist.py`**: Core Todoist API service
- **`app/models/profile.py`**: Updated with Todoist fields
- **`app/api/profile.py`**: Todoist project endpoints
- **`app/api/mealplans.py`**: Todoist export endpoint
- **`app/config.py`**: API key configuration

### Frontend Components

- **`lib/types.ts`**: Todoist type definitions
- **`lib/api.ts`**: Todoist API client methods
- **`routes/settings/profile.tsx`**: Configuration UI
- **`routes/planner/detail.tsx`**: Export modal with Todoist button
- **`routes/planner/history.tsx`**: Historical exports with Todoist

### API Endpoints

- `GET /api/profile/todoist/projects` - List user's Todoist projects
- `GET /api/profile/todoist/test` - Test API connection
- `POST /api/mealplans/{id}/export/todoist` - Sync shopping list

## Error Handling

The system handles common scenarios:

- **No API Key**: Shows configuration message
- **Invalid API Key**: Shows connection error
- **No Project Selected**: Prompts user to configure
- **Network Issues**: Displays appropriate error messages
- **Duplicate Items**: Automatically skipped (not counted as errors)

## Security Notes

- API key is stored server-side only
- All API calls are made from backend to Todoist
- No sensitive data is exposed to frontend
- User project selection is stored in profile

## Testing

To test the integration:

1. Set up a valid Todoist API key
2. Create a test meal plan with recipes
3. Configure Todoist project in profile
4. Export shopping list to Todoist
5. Verify items appear in selected project

## Future Enhancements

Potential improvements:
- Support for multiple users with individual API keys
- OAuth integration for more secure authentication
- Bulk operations (delete old items, mark as complete)
- Custom task labeling and due dates
- Integration with other task management platforms
