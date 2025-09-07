import React from 'react';

const AppTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: 'blue' }}>React is Working!</h1>
      <p>If you can see this text, React is mounting correctly.</p>
      <button onClick={() => alert('Button clicked!')}>
        Click Me to Test
      </button>
      <hr />
      <p>Timestamp: {new Date().toLocaleString()}</p>
    </div>
  );
};

export default AppTest;
