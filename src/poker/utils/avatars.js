// =====================================================
// Avatar presets — SVG ที่วาดขึ้นใหม่ทั้งหมด (ไม่มีลิขสิทธิ์ภายนอก)
// เพิ่ม/แก้ Avatar ได้โดยเพิ่ม object ลงใน AVATARS
//   type: 'human' | 'robot' | 'animal' | 'fantasy'
//   category: male | female | funny | cool | robot | animal | fantasy
// =====================================================

export const AVATARS = [
  // ---- Male ----
  { id: 'm1', category: 'male', type: 'human', bg: ['#3b6fd8', '#132b61'], skin: '#f1c7a1', hair: '#2b1c12', hairStyle: 'short', eyes: 'normal', mouth: 'smile', shirt: '#1d1d22', extra: 'none' },
  { id: 'm2', category: 'male', type: 'human', bg: ['#c2563b', '#4a1a10'], skin: '#a86d46', hair: '#121212', hairStyle: 'spiky', eyes: 'normal', mouth: 'smirk', shirt: '#7a1f1f', extra: 'beard' },
  { id: 'm3', category: 'male', type: 'human', bg: ['#2f9a7a', '#0f3a2e'], skin: '#e0ac7e', hair: '#8a5a2b', hairStyle: 'curly', eyes: 'normal', mouth: 'grin', shirt: '#24504a', extra: 'none' },
  { id: 'm4', category: 'male', type: 'human', bg: ['#6b5ad6', '#22184d'], skin: '#6f4429', hair: '#0e0e0e', hairStyle: 'bald', eyes: 'glasses', mouth: 'smile', shirt: '#2c2c44', extra: 'mustache' },
  // ---- Female ----
  { id: 'f1', category: 'female', type: 'human', bg: ['#d9488a', '#4d1030'], skin: '#f4cfb0', hair: '#5a2a16', hairStyle: 'long', eyes: 'lashes', mouth: 'smile', shirt: '#8a1d4f', extra: 'earrings' },
  { id: 'f2', category: 'female', type: 'human', bg: ['#e0a03a', '#5a3508'], skin: '#c58a5c', hair: '#141010', hairStyle: 'bun', eyes: 'lashes', mouth: 'grin', shirt: '#3a2a1a', extra: 'earrings' },
  { id: 'f3', category: 'female', type: 'human', bg: ['#38a3c9', '#0d3445'], skin: '#f7d6bd', hair: '#f0c65a', hairStyle: 'bob', eyes: 'lashes', mouth: 'smirk', shirt: '#1d3e57', extra: 'blush' },
  { id: 'f4', category: 'female', type: 'human', bg: ['#9b4dd6', '#2e0f47'], skin: '#8a5634', hair: '#d24a6a', hairStyle: 'long', eyes: 'shades', mouth: 'smile', shirt: '#222', extra: 'none' },
  // ---- Funny ----
  { id: 'x1', category: 'funny', type: 'human', bg: ['#f1d23a', '#6b5208'], skin: '#ffd9b3', hair: '#e2572b', hairStyle: 'curly', eyes: 'wink', mouth: 'tongue', shirt: '#2a7a3a', extra: 'blush' },
  { id: 'x2', category: 'funny', type: 'human', bg: ['#ff7b54', '#5c1e0a'], skin: '#e8b48a', hair: '#3a2416', hairStyle: 'mohawk', eyes: 'crazy', mouth: 'o', shirt: '#2c58a0', extra: 'none' },
  { id: 'x3', category: 'funny', type: 'human', bg: ['#7ed957', '#1f4a10'], skin: '#f2c49b', hair: '#ffffff', hairStyle: 'bald', eyes: 'happy', mouth: 'grin', shirt: '#6a3a8a', extra: 'partyhat' },
  // ---- Cool ----
  { id: 'c1', category: 'cool', type: 'human', bg: ['#1b1b1f', '#000000'], skin: '#d8a27a', hair: '#0b0b0b', hairStyle: 'slick', eyes: 'shades', mouth: 'smirk', shirt: '#0e0e10', extra: 'chain' },
  { id: 'c2', category: 'cool', type: 'human', bg: ['#d9a441', '#3d2a05'], skin: '#7b4a2c', hair: '#151515', hairStyle: 'short', eyes: 'shades', mouth: 'smile', shirt: '#1a1a1a', extra: 'cap' },
  { id: 'c3', category: 'cool', type: 'human', bg: ['#e04848', '#3f0b0b'], skin: '#f0c19c', hair: '#c9c9c9', hairStyle: 'slick', eyes: 'normal', mouth: 'smirk', shirt: '#121212', extra: 'beard' },
  // ---- Robot ----
  { id: 'r1', category: 'robot', type: 'robot', bg: ['#4fc3f7', '#0b2f45'], metal: '#c9d3dc', visor: '#0a1a24', glow: '#5ef0ff' },
  { id: 'r2', category: 'robot', type: 'robot', bg: ['#ff9f43', '#4a2306'], metal: '#e2b36a', visor: '#1c1208', glow: '#ff5e5e' },
  // ---- Animal ----
  { id: 'a1', category: 'animal', type: 'animal', species: 'cat', bg: ['#f78fb3', '#4d1a2c'], fur: '#9a9aa6', inner: '#f7b9c8' },
  { id: 'a2', category: 'animal', type: 'animal', species: 'fox', bg: ['#2ec4b6', '#0b3a35'], fur: '#e8792b', inner: '#fff3e6' },
  { id: 'a3', category: 'animal', type: 'animal', species: 'bear', bg: ['#a3cb38', '#2c3d0a'], fur: '#8b5a34', inner: '#d9b08c' },
  { id: 'a4', category: 'animal', type: 'animal', species: 'panda', bg: ['#45aaf2', '#0c2b45'], fur: '#f5f5f5', inner: '#1b1b1b' },
  { id: 'a5', category: 'animal', type: 'animal', species: 'frog', bg: ['#fed330', '#5c4a05'], fur: '#5fbf4a', inner: '#e8f7c8' },
  // ---- Fantasy ----
  { id: 'z1', category: 'fantasy', type: 'fantasy', kind: 'wizard', bg: ['#4b3fb5', '#140f3d'], skin: '#f1c7a1', accent: '#6a3fd1' },
  { id: 'z2', category: 'fantasy', type: 'fantasy', kind: 'elf', bg: ['#26de81', '#0a3d24'], skin: '#f6dcc4', accent: '#f3e08a' },
  { id: 'z3', category: 'fantasy', type: 'fantasy', kind: 'alien', bg: ['#8854d0', '#1f0d3a'], skin: '#7ee081', accent: '#111' },
  { id: 'z4', category: 'fantasy', type: 'fantasy', kind: 'vampire', bg: ['#b33939', '#2a0606'], skin: '#e9e4f0', accent: '#141414' },
];
