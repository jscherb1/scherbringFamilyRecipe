# FastAPI React Frontend

A simple React frontend that interacts with the FastAPI backend to display personalized greetings.

## Features

- Modern, responsive UI with gradient backgrounds
- Real-time interaction with FastAPI backend
- Error handling and loading states
- Input validation and user feedback
- Clear and submit functionality
- **Dynamic API endpoint detection** for local development and GitHub Codespaces

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager
- FastAPI backend running on port 8000

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000` (or the forwarded port URL in Codespaces)

### Environment Configuration

The app automatically detects the environment and sets the correct API base URL:

#### Local Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

#### GitHub Codespaces
The app automatically detects Codespaces and uses the forwarded port URLs.

#### Manual Configuration
Create a `.env` file in the frontend directory to override the API URL:
```
REACT_APP_API_BASE_URL=https://your-backend-url.com
```

### Usage

1. Enter your name in the text input (optional)
2. Click "Get Greeting" to fetch a personalized message from the FastAPI backend
3. The response will be displayed in the result section
4. Use "Clear" to reset the form and results

### API Integration

The frontend automatically determines the correct backend URL:
- **Local**: `http://localhost:8000`
- **Codespaces**: `https://{codespace-name}-8000.{domain}`
- **Custom**: Set `REACT_APP_API_BASE_URL` environment variable

### GitHub Codespaces Setup

1. Make sure both frontend (port 3000) and backend (port 8000) are forwarded
2. Set port 8000 visibility to "Public" in the Ports tab
3. The app will automatically detect and use the correct URLs

### Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Architecture

- **React 18** with functional components and hooks
- **CSS3** with modern styling (gradients, shadows, animations)
- **Fetch API** for HTTP requests
- **Error boundary** and loading states
- **Responsive design** for mobile and desktop
- **Environment-aware API endpoints**

## Troubleshooting

### Local Development
- Make sure the FastAPI backend is running on port 8000
- Check browser console for any JavaScript errors
- Verify network connectivity between frontend and backend

### GitHub Codespaces
- Ensure port 8000 is forwarded and set to "Public"
- Check that the backend is running with: `cd backend && python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0`
- If you see CORS errors, verify the backend CORS configuration includes your Codespace URL
