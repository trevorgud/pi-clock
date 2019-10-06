import React from 'react';
import './App.css';

import Clock from './components/Clock';
import WeatherIconRow from './components/WeatherIconRow';

export default function App() {
  return (
    <div className="App">
      <Clock />
      <WeatherIconRow />
    </div>
  );
}
