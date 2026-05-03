import { createContext, useCallback, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { SectionSpec } from '../data/preassessment';

export interface SectionStat { done: number; total: number; na: number; }
export interface MacroValidationEntry { by: { id: string; name: string; ruolo: string }; at: string; }
export interface GroupedMacro { id: string; label: string; color: string; sections: SectionSpec[]; }

export interface PreassessmentNavState {
  grouped: GroupedMacro[];
  sections: SectionSpec[];
  sectionStats: Record<string, SectionStat>;
  macroValidations: Record<string, MacroValidationEntry>;
  chatCount: number;
  ticketCount: number;
  alertCount: number;
  clientId: string | null;
  hasAssessment: boolean;
  isClient: boolean;
  questionnaireLabel?: string;
}

interface PreassessmentNavContextValue {
  navState: PreassessmentNavState | null;
  setNavState: Dispatch<SetStateAction<PreassessmentNavState | null>>;
  collapsed: Record<string, boolean>;
  setCollapsed: Dispatch<SetStateAction<Record<string, boolean>>>;
  search: string;
  setSearch: (v: string) => void;
  onSectionClick: ((idx: number) => void) | null;
  registerSectionClick: (fn: (idx: number) => void) => void;
  unregisterSectionClick: () => void;
}

const PreassessmentNavContext = createContext<PreassessmentNavContextValue>({
  navState: null,
  setNavState: () => {},
  collapsed: {},
  setCollapsed: () => {},
  search: '',
  setSearch: () => {},
  onSectionClick: null,
  registerSectionClick: () => {},
  unregisterSectionClick: () => {},
});

export function PreassessmentNavProvider({ children }: { children: ReactNode }) {
  const [navState, setNavState] = useState<PreassessmentNavState | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [onSectionClick, setOnSectionClick] = useState<((idx: number) => void) | null>(null);

  const registerSectionClick = useCallback((fn: (idx: number) => void) => {
    setOnSectionClick(() => fn);
  }, []);

  const unregisterSectionClick = useCallback(() => {
    setOnSectionClick(null);
  }, []);

  return (
    <PreassessmentNavContext.Provider
      value={{
        navState,
        setNavState,
        collapsed,
        setCollapsed,
        search,
        setSearch,
        onSectionClick,
        registerSectionClick,
        unregisterSectionClick,
      }}
    >
      {children}
    </PreassessmentNavContext.Provider>
  );
}

export function usePreassessmentNav() {
  return useContext(PreassessmentNavContext);
}
