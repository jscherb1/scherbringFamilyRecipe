import React, { useState } from 'react';
import './App.css';

function App() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dynamic API base URL detection
  const getApiBaseUrl = () => {
    // Check runtime environment first (for Azure deployment)
    if (window._env_ && window._env_.REACT_APP_API_BASE_URL) {
      return window._env_.REACT_APP_API_BASE_URL;
    }
    
    // Check if we have an environment variable set (for local development)
    if (process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }
    
    // Auto-detect Codespaces environment
    if (process.env.CODESPACE_NAME) {
      return `https://${process.env.CODESPACE_NAME}-8000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    }
    
    // Check if we're in a forwarded port environment
    if (window.location.hostname.includes('app.github.dev')) {
      const hostname = window.location.hostname;
      const baseUrl = hostname.replace('-3000.', '-8000.');
      return `https://${baseUrl}`;
    }
    
    // Fallback to localhost for local development
    return 'http://localhost:8000';
  };

  const API_BASE_URL = getApiBaseUrl();

  // Debug logging
  console.log('API Base URL:', API_BASE_URL);
  console.log('Environment:', {
    CODESPACE_NAME: process.env.CODESPACE_NAME,
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
    REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
    hostname: window.location.hostname,
    origin: window.location.origin
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Call the FastAPI backend
      const response = await fetch(`${API_BASE_URL}/?name=${encodeURIComponent(name || 'Guest')}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch message');
      }
      
      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      setError('Error connecting to server. Make sure the FastAPI backend is running.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setName('');
    setMessage('');
    setError('');
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🚀 FastAPI + React Demo</h1>
          <p>Enter your name to get a personalized greeting from the FastAPI backend</p>
        </header>

        <div className="form-section">
          <form onSubmit={handleSubmit} className="greeting-form">
            <div className="input-group">
              <label htmlFor="nameInput" className="input-label">
                Your Name:
              </label>
              <input
                id="nameInput"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name (optional)"
                className="name-input"
                disabled={loading}
              />
            </div>
            
            <div className="button-group">
              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? '🔄 Loading...' : '✨ Get Greeting'}
              </button>
              
              <button 
                type="button" 
                onClick={handleClear}
                className="clear-btn"
                disabled={loading}
              >
                🗑️ Clear
              </button>
            </div>
          </form>
        </div>

        <div className="result-section">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          {message && !error && (
            <div className="success-message">
              <span className="success-icon">🎉</span>
              <div className="message-content">
                <h3>Response from FastAPI:</h3>
                <p>{message}</p>
              </div>
            </div>
          )}
          
          {!message && !error && !loading && (
            <div className="placeholder-message">
              <span className="placeholder-icon">💭</span>
              <p>Enter a name and click "Get Greeting" to see the magic happen!</p>
            </div>
          )}
        </div>

        <footer className="footer">
          <p>Backend running on <code>{API_BASE_URL}</code></p>
          <p>Frontend running on <code>{window.location.origin}</code></p>
        </footer>
      </div>
    </div>
  );
}

export default App;
