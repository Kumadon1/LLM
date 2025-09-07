import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple inline app - no external dependencies
function App() {
  const [count, setCount] = React.useState(0);
  const [message, setMessage] = React.useState('');

  const testBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/health');
      if (response.ok) {
        setMessage('✅ Backend is connected!');
      } else {
        setMessage('⚠️ Backend returned: ' + response.status);
      }
    } catch (error) {
      setMessage('❌ Backend is not running');
    }
  };

  return (
    <div style={{
      padding: '40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#0068c9', fontSize: '48px' }}>
        🤖 James LLM 1
      </h1>
      
      <div style={{
        background: '#f0f8ff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>System Status</h2>
        <p>✅ Frontend is running</p>
        <p>📦 Production bundle is working</p>
        <p>⚛️ React version: {React.version}</p>
      </div>

      <div style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        marginBottom: '20px'
      }}>
        <h3>Interactive Test</h3>
        <p>Counter: {count}</p>
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            background: '#0068c9',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Increment
        </button>
        <button 
          onClick={testBackend}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Backend
        </button>
        {message && <p style={{ marginTop: '10px' }}>{message}</p>}
      </div>

      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h3>Application Features</h3>
        <ul>
          <li>Neural Network Training</li>
          <li>Text Generation</li>
          <li>Markov Chain Models</li>
          <li>Persistent Data Storage</li>
          <li>Model Checkpointing</li>
        </ul>
      </div>

      <p style={{ 
        marginTop: '40px', 
        color: '#666',
        textAlign: 'center'
      }}>
        Build Time: {new Date().toLocaleString()}
      </p>
    </div>
  );
}

// Mount the app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found!');
  document.body.innerHTML = '<h1 style="color: red;">Error: Root element not found</h1>';
}
