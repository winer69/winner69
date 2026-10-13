import React from 'react';
import { formatChips } from '../utils/format.js';
import { useT } from '../i18n/index.js';

/** Gold badge กลางโต๊ะ — เด้งเบา ๆ ทุกครั้งที่ยอด pot เปลี่ยน */
export default function PotDisplay({ amount, blinds }) {
  const t = useT();
  return (
    <div className="pot" data-pot>
      <div key={amount} className={`pot__badge ${amount > 0 ? 'is-active' : ''}`}>
        <span className="pot__label">{t.pot}</span>
        <span className="pot__amount">{formatChips(amount)}</span>
      </div>
      {blinds && (
        <div className="pot__blinds">
          SB {blinds.small} / BB {blinds.big}
        </div>
      )}
    </div>
  );
}
