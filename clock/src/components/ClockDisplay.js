import React from 'react';

export default function ClockDisplay(props) {
  return (
    <div className="main-clock">{
      props.date.toLocaleTimeString().split(":").slice(0, 2).join(":")
    }</div>
  );
}
