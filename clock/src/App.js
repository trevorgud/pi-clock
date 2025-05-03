import React from 'react';
import './App.css';

import ClockDate from './components/ClockDate';
import WeatherIconRow from './components/WeatherIconRow';

export default function App() {
  return (
    <div className="App">
      <ClockDate />
      <WeatherIconRow />
    </div>
  );
}
