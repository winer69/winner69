import React from 'react';
import PlayingCard from './PlayingCard.jsx';

/** ไพ่กองกลาง 5 ช่อง — ใบใหม่ slide + flip + golden glow */
export default function CommunityCards({ cards, winningIds, dimOthers }) {
  return (
    <div className="community" aria-label="Community cards">
      {Array.from({ length: 5 }, (_, i) => {
        const card = cards[i];
        if (!card) return <div key={`slot-${i}`} className="community__slot" />;
        // Flop: แจกทีละใบห่างกัน 140ms / Turn & River: ใบเดียว
        const delay = i < 3 ? i * 140 : 0;
        return (
          <PlayingCard
            key={card.id}
            card={card}
            size="community"
            deal={{ dx: `${-14 - i * 6}cqw`, dy: '0px', delay }}
            flipIn
            glow
            winning={winningIds?.has(card.id)}
            dim={dimOthers && !winningIds?.has(card.id)}
          />
        );
      })}
    </div>
  );
}
