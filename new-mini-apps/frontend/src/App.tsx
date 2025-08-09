import React from 'react';
import './App.css';
import ChatDialog from './components/ChatDialog';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Добро пожаловать в Mini Apps</h1>
        <p>Здесь вы можете задать вопрос администратору.</p>
        <ChatDialog />
      </header>
    </div>
  );
}

export default App;
