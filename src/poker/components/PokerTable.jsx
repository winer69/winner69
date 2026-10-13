import React from 'react';

/**
 * PokerTable — โต๊ะวงรี: rail โลหะเข้ม + felt เขียว + แสงจากด้านบน
 * children = ทุกอย่างที่วางบนโต๊ะ (seat, chip, pot, cards)
 * .table-area เป็น CSS container → ลูก ๆ ใช้หน่วย cqw/cqh scale ตามโต๊ะ
 */
export default function PokerTable({ orientation, center, logo, children }) {
  return (
    <main className={`table-area table-area--${orientation}`}>
      <div className="table" aria-hidden="true">
        <div className="table__rail" />
        <div className="table__felt">
          <div className="table__line" />
          {logo && (
            <div className="table__mark">
              <span>{logo}</span>
            </div>
          )}
        </div>
      </div>
      <div className="table__center">{center}</div>
      {children}
    </main>
  );
}

/** Dealer Button — element เดียว เลื่อน (slide) ไปตามตำแหน่ง dealer ทุก Hand */
export function DealerButton({ position }) {
  if (!position) return null;
  return (
    <div className="dealer-btn" style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label="Dealer button">
      D
    </div>
  );
}

