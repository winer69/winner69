import { createContext, useContext } from 'react';
import { STRINGS } from './strings.js';

export { STRINGS, LANGUAGES, formatLog, translateError } from './strings.js';

export const LanguageContext = createContext(STRINGS.th);

/** ดึงชุดข้อความของภาษาปัจจุบัน: const t = useT(); t.actions.fold */
export const useT = () => useContext(LanguageContext);

export const getStrings = (code) => STRINGS[code] || STRINGS.th;
