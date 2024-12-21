import React from 'react';
import { PropertyListing } from '../../types';

interface Props {
  data: PropertyListing[];
}

const Histogram: React.FC<Props> = ({ data }) => {
  const map: Record<number, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
  };

  data.forEach(x => {
    const month = x.adDate?.getMonth();
    if (x.adDate?.getFullYear() == 2024){
      if (month != undefined && map[month] !== undefined) {
        map[month]++;
      }
    }
  });

  return (
    <div className="property-list">
      <ul>
        {Object.keys(map).map((key) => {
          // Mapping numeric month to string month name
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return <li key={key}>{`${monthNames[Number(key)]}: ${map[Number(key)]}`}</li>;
        })}
      </ul>
    </div>
  );
};

export default Histogram;
