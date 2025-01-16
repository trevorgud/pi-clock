import React from 'react';
import axios from 'axios';

import WeatherIcon from './WeatherIcon';
import daysOfWeek from './daysOfWeek';

const apiKey = `${process.env.REACT_APP_WEATHER_API_KEY}`;

const geoApiUrl = 'https://ipapi.co/json';
const apiPrefix = 'https://api.openweathermap.org';
const resourcePrefix = 'https://openweathermap.org';

const currentWeatherUrl = '/data/2.5/weather';
const forecastWeatherUrl = '/data/2.5/forecast';
const currentPollutionUrl = '/data/2.5/air_pollution';
const forecastPollutionUrl = '/data/2.5/air_pollution/forecast';

const geoRetryMillis = 60 * 1000;
const queryIntervalMillis = 5 * 60 * 1000;
const firstForecastThresholdSecs = 1 * 60 * 60;

// The pollution thresholds that define what is an 'unhealthy' level.
const pollutionThresholds = {
  aqi: 3,
  no2: 100,
  pm10: 50,
  o3: 120,
  pm2_5: 30,
}

function iconUrl(iconStr) {
  const iconNightStr = iconStr.slice(0, 2) + 'n';
  return `${resourcePrefix}/img/wn/${iconNightStr}@2x.png`;
}

export default class WeatherIconRow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      geo: {
        lat: null,
        lon: null,
      },
      currentWeatherData: null,
      forecastWeatherData: null,
      currentPollutionData: null,
      forecastPollutionData: null
    };
  }

  componentDidMount() {
    this.startApis();
  }

  startApis() {
    // Fetch and store the latitude and longitude before doing anything else.
    // Retry until we can successfully get the geolocation.
    axios
      .get(geoApiUrl)
      .then((response) => {
        this.setState(
          {
            geo: {
              lat: response.data.latitude,
              lon: response.data.longitude,
            }
          },
          // Use the setState callback to ensure API calls can access updated state, avoid race conditions.
          () => {
            this.axiosGet();
            // Periodically update the weather state data.
            setInterval(() => { this.axiosGet(); }, queryIntervalMillis);
          }
        )
      })
      .catch((e) => {
        console.error('Failed to fetch location:', e);
        this.scheduleStartupRetry()
      });
  }

  scheduleStartupRetry = () => {
    // Try to startup again after a brief timeout.
    this.retryTimeout = setTimeout(() => {
      console.log('Retrying location fetch...');
      this.startApis();
    }, geoRetryMillis);
  }

  /** Query the weather API and update the state holding the weather data. */
  axiosGet() {
    axios
      .get(`${apiPrefix}${currentWeatherUrl}`, { params: this.weatherParams() })
      .then((response) => { this.setState({ currentWeatherData: response.data }); })
      .catch((e) => {
        console.log(`Unable to access weather API: ${e.toString}`);
        this.setState({ currentWeatherData: null });
      });
    axios
      .get(`${apiPrefix}${forecastWeatherUrl}`, { params: this.weatherParams() })
      .then((response) => { this.setState({ forecastWeatherData: response.data }); })
      .catch((e) => {
        console.log(`Unable to access weather forecast API: ${e.toString()}`);
        this.setState({ forecastWeatherData: null });
      });
    axios
      .get(`${apiPrefix}${currentPollutionUrl}`, { params: this.pollutionParams() })
      .then((response) => { this.setState({ currentPollutionData: response.data.list[0] }); })
      .catch((e) => {
        console.log(`Unable to access pollution API: ${e.toString()}`);
        this.setState({ currentPollutionData: null });
      });
    axios
      .get(`${apiPrefix}${forecastPollutionUrl}`, { params: this.pollutionParams() })
      .then((response) => { this.setState({ forecastPollutionData: response.data }); })
      .catch((e) => {
        console.log(`Unable to access pollution forecast API: ${e.toString()}`);
        this.setState({ forecastPollutionData: null });
      });
  }

  baseParams() {
    return {
      lat: this.state.geo.lat,
      lon: this.state.geo.lon,
      APPID: apiKey
    };
  }

  weatherParams() {
    return { ...this.baseParams(), units: 'imperial' };
  }

  pollutionParams() {
    return this.baseParams();
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

  /** Get the pollution items for the specified day. Ex: 1 days ahead is tomorrow. */
  pollutionsForDay(daysAhead) {
    const currentDayOfWeek = new Date().getDay();
    return this.state.forecastPollutionData.list.filter((weather) => {
      const timestamp = new Date(weather.dt * 1000);
      const dayOfWeek = timestamp.getDay();
      return dayOfWeek === (currentDayOfWeek + daysAhead) % 7;
    });
  }

  /** Given the weather data for a single point in time, return the icon element for that data. */
  singleWeatherIcon(weatherData, pollutionData, title) {
    const timestamp = new Date(weatherData.dt * 1000);
    const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: 'numeric' });
    const pollution = this.consolidatedPollutionMetrics(pollutionData);
    return (
      <WeatherIcon
        title={title || formattedTime}
        iconUrl={iconUrl(weatherData.weather[0].icon)}
        temp={weatherData.main.temp.toFixed(0)}
        pollutionText={this.pollutionText(pollution)}
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

  /** The first upcoming weather data point. Should be at most a few hours in the future. */
  firstForecastPollutionData() {
    const epochSecs = Math.floor(new Date().getTime() / 1000);
    const datas = this.state
      .forecastPollutionData
      .list
      .slice()
      .filter(forecast => forecast.dt > epochSecs + firstForecastThresholdSecs);
    datas.sort((a, b) => a.dt - b.dt);
    return datas[0];
  }

  /** Given multiple weather data points, return the icon element for that data. */
  multiWeatherIcon(weatherDatas, pollutionDatas) {
    // Get min and max temperatures.
    const minTemp = Math.min(...weatherDatas.map(data => data.main.temp_min));
    const maxTemp = Math.max(...weatherDatas.map(data => data.main.temp_max));
    // Get the median icon.
    const icons = weatherDatas.map(data => data.weather[0].icon);
    icons.sort();
    const icon = icons[Math.ceil(icons.length / 2)];

    const timestamp = new Date(weatherDatas[0].dt * 1000);
    const title = daysOfWeek[timestamp.getDay()];

    const pollutionMetrics = pollutionDatas.map(this.consolidatedPollutionMetrics)
    const maxPollutions = this.pollutionMaxMetrics(pollutionMetrics)

    return (
      <WeatherIcon
        key={title}
        title={title}
        iconUrl={iconUrl(icon)}
        temp={maxTemp.toFixed(0)}
        lowTemp={minTemp.toFixed(0)}
        pollutionText={this.pollutionText(maxPollutions)}
      />
    );
  }

  /** Given a list of pollution metrics objects, return a max aggregation of those metrics. */
  pollutionMaxMetrics(pollutionMetrics) {
    const maxMetrics = {};
    // Only the fields in pollutionThresholds will be considered. Find the max for each metric in the thresholds.
    Object.keys(pollutionThresholds).map((key) => {
      const foundMax = Math.max(...pollutionMetrics.map(data => data[key]));
      maxMetrics[key] = foundMax;
    })
    return maxMetrics;
  }

  /** Take an instance of pollutionData and extract+consolidate only the metrics data. */
  consolidatedPollutionMetrics(pollutionData) {
    return pollutionData ? { ...pollutionData.main, ...pollutionData.components } : undefined;
  }

  /** Given some pollution metrics, return them in textual format. */
  pollutionText(metrics) {
    if(!metrics) return '';
    return Object.entries(pollutionThresholds)
      .filter(([key, value]) => metrics[key] && metrics[key] >= value) // Check that key exists and surpasses threshold
      .sort(([aKey, aValue], [bKey, bValue]) => {
        // Sort metrics by ratio of current pollution to threshold pollution (descending).
        return  metrics[bKey] / bValue - metrics[aKey] / aValue
      })
      .slice(0, 2) // Take first N
      .map(([key]) => `${key}=${metrics[key].toFixed(0)}`)
      .join(', ')
  }

  render() {
    const daysAhead = [1, 2, 3];
    return (
      <div>
        { this.state.currentWeatherData && this.state.currentPollutionData !== null &&
          this.singleWeatherIcon(this.state.currentWeatherData, this.state.currentPollutionData, 'Now')
        }
        { this.state.forecastWeatherData !== null && this.state.forecastPollutionData !== null &&
          this.singleWeatherIcon(this.firstForecastWeatherData(), this.firstForecastPollutionData())
        }
        { this.state.forecastWeatherData !== null && this.state.forecastPollutionData !== null &&
          daysAhead.map((day) => {
            const forecasts = this.forecastsForDay(day);
            const pollutions = this.pollutionsForDay(day);
            return this.multiWeatherIcon(forecasts, pollutions);
          })
        }
      </div>
    );
  }
}
