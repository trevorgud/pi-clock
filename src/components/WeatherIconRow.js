import React from 'react';
import axios from 'axios';

import WeatherIcon from './WeatherIcon';
import daysOfWeek from './daysOfWeek';

// TODO: Don't hard code the api key.
const apiKey = '';
const zip = '95864,us';
const apiParams = { q: zip, units: 'imperial', APPID: apiKey };
const apiPrefix = 'https://api.openweathermap.org';
const resourcePrefix = 'https://openweathermap.org';
const currentWeatherUrl = '/data/2.5/weather';
const forecastWeatherUrl = '/data/2.5/forecast';
const queryIntervalMillis = 5 * 60 * 1000;
const firstForecastThresholdSecs = 1 * 60 * 60;

function iconUrl(iconStr) {
  const iconNightStr = iconStr.slice(0, 2) + 'n';
  return `${resourcePrefix}/img/wn/${iconNightStr}@2x.png`;
}

export default class WeatherIconRow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentWeatherData: null,
      forecastWeatherData: null,
    };
    this.axiosGet();
    // Periodically update the weather state data.
    setInterval(() => { this.axiosGet(); }, queryIntervalMillis);
  }

  /** Query the weather API and update the state holding the weather data. */
  axiosGet() {
    axios
      .get(`${apiPrefix}${currentWeatherUrl}`, { params: apiParams })
      .then((response) => { this.setState({ currentWeatherData: response.data }); })
      .catch(() => {
        console.log("Unable to access weather API");
        this.setState({ currentWeatherData: null });
      });
    axios
      .get(`${apiPrefix}${forecastWeatherUrl}`, { params: apiParams })
      .then((response) => { this.setState({ forecastWeatherData: response.data }); })
      .catch(() => {
        console.log("Unable to access weather API");
        this.setState({ forecastWeatherData: null });
      });
  }

  /** Get the forecast items for the specified day. Ex: 1 days ahead is tomorrow. */
  forecastsForDay(daysAhead) {
    const currentDayOfWeek = new Date().getDay();
    return this.state.forecastWeatherData.list.filter((weather) => {
      const timestamp = new Date(weather.dt * 1000);
      const dayOfWeek = timestamp.getDay();
      return dayOfWeek === (currentDayOfWeek + daysAhead) % 7;
    });
  }

  /** Given the weather data for a single point in time, return the icon element for that data. */
  singleWeatherIcon(weatherData, title) {
    const timestamp = new Date(weatherData.dt * 1000);
    const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: 'numeric' });
    return (
      <WeatherIcon
        title={title || formattedTime}
        iconUrl={iconUrl(weatherData.weather[0].icon)}
        temp={weatherData.main.temp.toFixed(0)}
      />
    );
  }

  /** The first upcoming weather data point. Should be at most a few hours in the future. */
  firstForecastWeatherData() {
    const epochSecs = Math.floor(new Date().getTime() / 1000);
    const datas = this.state
      .forecastWeatherData
      .list
      .slice()
      .filter(forecast => forecast.dt > epochSecs + firstForecastThresholdSecs);
    datas.sort((a, b) => a.dt - b.dt);
    return datas[0];
  }

  /** Given multiple weather data points, return the icon element for that data. */
  multiWeatherIcon(weatherDatas) {
    // Get min and max temperatures.
    const minTemp = Math.min(...weatherDatas.map(data => data.main.temp_min));
    const maxTemp = Math.max(...weatherDatas.map(data => data.main.temp_max));
    // Get the median icon.
    const icons = weatherDatas.map(data => data.weather[0].icon);
    icons.sort();
    const icon = icons[Math.ceil(icons.length / 2)];

    const timestamp = new Date(weatherDatas[0].dt * 1000);
    const title = daysOfWeek[timestamp.getDay()];
    return (
      <WeatherIcon
        key={title}
        title={title}
        iconUrl={iconUrl(icon)}
        temp={maxTemp.toFixed(0)}
        lowTemp={minTemp.toFixed(0)}
      />
    );
  }

  render() {
    const daysAhead = [1, 2, 3];
    return (
      <div>
        { this.state.currentWeatherData !== null &&
          this.singleWeatherIcon(this.state.currentWeatherData, 'Now')
        }
        { this.state.forecastWeatherData !== null &&
          this.singleWeatherIcon(this.firstForecastWeatherData())
        }
        { this.state.forecastWeatherData !== null &&
          daysAhead.map((day) => {
            const forecasts = this.forecastsForDay(day);
            return this.multiWeatherIcon(forecasts);
          })
        }
      </div>
    );
  }
}