import React from 'react';
import { formatShort } from '../utils/format.js';

// มูลค่า chip → สี (ใช้ทั้ง stack และ chip ที่บิน)
const DENOMS = [
  { value: 5000, cls: 'chip--black' },
  { value: 1000, cls: 'chip--gold' },
  { value: 500, cls: 'chip--purple' },
  { value: 100, cls: 'chip--green' },
  { value: 25, cls: 'chip--red' },
];

function chipsFor(amount, max = 5) {
  const chips = [];
  let rest = amount;
  for (const d of DENOMS) {
    while (rest >= d.value && chips.length < max) {
      chips.push(d.cls);
      rest -= d.value;
    }
  }
  if (!chips.length) chips.push('chip--red');
  return chips;
}

export function Chip({ cls = 'chip--red', style }) {
  return <span className={`chip ${cls}`} style={style} />;
}

/** กอง chip หน้าผู้เล่น (bet ในรอบนี้) */
export function ChipStack({ amount, position, hidden }) {
  if (!amount || amount <= 0) return null;
  const chips = chipsFor(amount, 5);
  return (
    <div className={`bet-stack ${hidden ? 'is-hidden' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }}>
      <div className="bet-stack__chips">
        {chips.map((cls, i) => (
          <Chip key={i} cls={cls} style={{ '--i': i }} />
        ))}
      </div>
      <span className="bet-stack__amount">{formatShort(amount)}</span>
    </div>
  );
}

/**
 * ChipAnimation — layer ของ chip ที่บินระหว่าง Seat / Bet / Pot
 * flights: [{ id, from:{type,index}, to:{type,index}, amount, big }]
 * resolvePoint(ref) → {x,y} เป็น % ของพื้นที่โต๊ะ
 * การเคลื่อนที่ใช้ transform อย่างเดียว (GPU friendly)
 */
export default function ChipAnimation({ flights, resolvePoint }) {
  return (
    <div className="chip-layer" aria-hidden="true">
      {flights.map((flight) => {
        const from = resolvePoint(flight.from);
        const to = resolvePoint(flight.to);
        if (!from || !to) return null;
        const chips = chipsFor(flight.amount, flight.big ? 9 : 4);
        return (
          <div
            key={flight.id}
            className={`chip-flight ${flight.big ? 'is-big' : ''}`}
            style={{
              left: `${from.x}%`,
              top: `${from.y}%`,
              '--tx': `${to.x - from.x}cqw`,
              '--ty': `${to.y - from.y}cqh`,
            }}
          >
            {chips.map((cls, i) => (
              <Chip
                key={i}
                cls={cls}
                style={{ '--i': i, '--jx': `${(i % 3) * 5 - 5}px`, '--jy': `${-i * 2}px`, animationDelay: `${i * 45}ms` }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
