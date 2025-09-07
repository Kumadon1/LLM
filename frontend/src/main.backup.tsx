import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Simple working app for testing
const SimpleApp = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <h1 style={{ color: '#0068c9' }}>🤖 James LLM 1</h1>
      <p>Welcome! The application is running correctly.</p>
      <p>Build: Production Bundle</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#0068c9',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Count: {count}
      </button>
      <hr style={{ margin: '20px 0' }} />
      <p style={{ color: '#666' }}>If you can see this, React is working!</p>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SimpleApp />
  </React.StrictMode>
);
