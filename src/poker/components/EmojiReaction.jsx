import React from 'react';
import { useT } from '../i18n/index.js';

export const EMOJIS = ['😂', '😎', '🔥', '😱', '😡', '👏', '💰', '❤️'];

/** แถบเลือก Emoji (เปิดเมื่อแตะ avatar ของตัวเอง) */
export function EmojiPicker({ open, onPick, onClose }) {
  const t = useT();
  if (!open) return null;
  return (
    <div className="emoji-picker" role="dialog" aria-label={t.aria.react}>
      {EMOJIS.map((emoji) => (
        <button key={emoji} type="button" className="emoji-picker__btn" onClick={() => onPick(emoji)}>
          {emoji}
        </button>
      ))}
      <button type="button" className="emoji-picker__close" onClick={onClose} aria-label={t.aria.close}>
        ×
      </button>
    </div>
  );
}

/** Emoji ลอยขึ้นจากผู้เล่นแล้วหายไป (scale + translateY + opacity) */
export default function EmojiReaction({ reactions, resolveSeat }) {
  return (
    <div className="emoji-layer" aria-hidden="true">
      {reactions.map((r) => {
        const pos = resolveSeat(r.seatIndex);
        if (!pos) return null;
        return (
          <span
            key={r.id}
            className="emoji-float"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, '--drift': `${r.drift}px` }}
          >
            {r.emoji}
          </span>
        );
      })}
    </div>
  );
}
