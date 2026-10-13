import { useEffect, useState } from 'react';

/** 'portrait' เมื่อจอสูงกว่ากว้าง (ใช้สลับรูปทรงโต๊ะ) */
export default function useOrientation() {
  const get = () =>
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth * 1.05 ? 'portrait' : 'landscape';
  const [orientation, setOrientation] = useState(get);
  useEffect(() => {
    const onResize = () => setOrientation(get());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return orientation;
}
