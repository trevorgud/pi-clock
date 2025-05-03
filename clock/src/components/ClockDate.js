import React from 'react';

import ClockDisplay from './ClockDisplay';
import DateDisplay from './DateDisplay';

export default class ClockDate extends React.Component {
  constructor(props) {
    super(props);
    this.state = { date: new Date() };
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick() {
    this.setState({ date: new Date() });
  }

  render() {
    return (
      <div>
        <ClockDisplay date={this.state.date}></ClockDisplay>
        <DateDisplay date={this.state.date}></DateDisplay>
      </div>
    );
  }
}
