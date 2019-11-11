import React from 'react';

const daysOfWeek = [
  'Sun',
  'Mon',
  'Tues',
  'Wed',
  'Thurs',
  'Fri',
  'Sat',
];

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sept',
  'Oct',
  'Nov',
  'Dec',
];

export default function DateDisplay(props) {
  const dateString = `${daysOfWeek[props.date.getDay()]} ${months[props.date.getMonth()]} ${props.date.getDate()}`;
  return (
    <div className="main-date">{
      dateString
    }</div>
  );
}
