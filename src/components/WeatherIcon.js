import React from 'react';

/** A weather icon with a title, weather icon image, and temperature. (Optional high/low temp). */
export default function WeatherIcon(props) {
  return (
    <div className="weather-icon">
      <span className="weather-icon-center">{props.title}</span>
      <img src={props.iconUrl} alt="" className="weather-icon-center"></img>
      <div className="weather-icon-center">
        <span className="temperature">{props.temp}&deg;</span>
        { props.lowTemp !== undefined &&
          <span className="temperature temperature-low">{props.lowTemp}&deg;</span>
        }
      </div>
    </div>
  );
}