// apps/frontend/src/components/ui/PhoneInput.tsx
import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from './CustomSelect';

type PhoneInputProps = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputClassName?: string;
  selectClassName?: string;
};

const PHONE_PREFIX_OPTIONS = [
  // EU
  { value: '+43', label: 'Austria (+43)' },
  { value: '+32', label: 'Belgio (+32)' },
  { value: '+359', label: 'Bulgaria (+359)' },
  { value: '+385', label: 'Croazia (+385)' },
  { value: '+357', label: 'Cipro (+357)' },
  { value: '+420', label: 'Repubblica Ceca (+420)' },
  { value: '+45', label: 'Danimarca (+45)' },
  { value: '+372', label: 'Estonia (+372)' },
  { value: '+358', label: 'Finlandia (+358)' },
  { value: '+33', label: 'Francia (+33)' },
  { value: '+49', label: 'Germania (+49)' },
  { value: '+30', label: 'Grecia (+30)' },
  { value: '+353', label: 'Irlanda (+353)' },
  { value: '+39', label: 'Italia (+39)' },
  { value: '+371', label: 'Lettonia (+371)' },
  { value: '+370', label: 'Lituania (+370)' },
  { value: '+352', label: 'Lussemburgo (+352)' },
  { value: '+356', label: 'Malta (+356)' },
  { value: '+31', label: 'Paesi Bassi (+31)' },
  { value: '+48', label: 'Polonia (+48)' },
  { value: '+351', label: 'Portogallo (+351)' },
  { value: '+40', label: 'Romania (+40)' },
  { value: '+421', label: 'Slovacchia (+421)' },
  { value: '+386', label: 'Slovenia (+386)' },
  { value: '+34', label: 'Spagna (+34)' },
  { value: '+46', label: 'Svezia (+46)' },
  { value: '+36', label: 'Ungheria (+36)' },
  // Europa extra-UE / vicini
  { value: '+44', label: 'Regno Unito (+44)' },
  { value: '+41', label: 'Svizzera (+41)' },
  { value: '+47', label: 'Norvegia (+47)' },
  { value: '+354', label: 'Islanda (+354)' },
  { value: '+355', label: 'Albania (+355)' },
  { value: '+387', label: 'Bosnia-Erzegovina (+387)' },
  { value: '+382', label: 'Montenegro (+382)' },
  { value: '+389', label: 'Macedonia del Nord (+389)' },
  { value: '+381', label: 'Serbia (+381)' },
  { value: '+373', label: 'Moldavia (+373)' },
  { value: '+375', label: 'Bielorussia (+375)' },
  { value: '+380', label: 'Ucraina (+380)' },
  { value: '+90', label: 'Turchia (+90)' },
  // USA/Canada
  { value: '+1', label: 'USA/Canada (+1)' },
  // Asia principali
  { value: '+86', label: 'Cina (+86)' },
  { value: '+91', label: 'India (+91)' },
  { value: '+81', label: 'Giappone (+81)' },
  { value: '+82', label: 'Corea del Sud (+82)' },
  { value: '+852', label: 'Hong Kong (+852)' },
  { value: '+853', label: 'Macao (+853)' },
  { value: '+886', label: 'Taiwan (+886)' },
  { value: '+65', label: 'Singapore (+65)' },
  { value: '+60', label: 'Malesia (+60)' },
  { value: '+62', label: 'Indonesia (+62)' },
  { value: '+63', label: 'Filippine (+63)' },
  { value: '+66', label: 'Thailandia (+66)' },
  { value: '+84', label: 'Vietnam (+84)' },
  { value: '+95', label: 'Myanmar (+95)' },
  { value: '+94', label: 'Sri Lanka (+94)' },
  { value: '+92', label: 'Pakistan (+92)' },
  { value: '+880', label: 'Bangladesh (+880)' },
  { value: '+977', label: 'Nepal (+977)' },
  { value: '+971', label: 'Emirati Arabi Uniti (+971)' },
  { value: '+966', label: 'Arabia Saudita (+966)' },
  { value: '+965', label: 'Kuwait (+965)' },
  { value: '+974', label: 'Qatar (+974)' },
  { value: '+968', label: 'Oman (+968)' },
  { value: '+972', label: 'Israele (+972)' },
  // Africa principali
  { value: '+20', label: 'Egitto (+20)' },
  { value: '+212', label: 'Marocco (+212)' },
  { value: '+213', label: 'Algeria (+213)' },
  { value: '+216', label: 'Tunisia (+216)' },
  { value: '+218', label: 'Libia (+218)' },
  { value: '+234', label: 'Nigeria (+234)' },
  { value: '+27', label: 'Sudafrica (+27)' },
  { value: '+254', label: 'Kenya (+254)' },
  { value: '+255', label: 'Tanzania (+255)' },
  { value: '+256', label: 'Uganda (+256)' },
  { value: '+233', label: 'Ghana (+233)' },
  { value: '+251', label: 'Etiopia (+251)' },
  { value: '+260', label: 'Zambia (+260)' },
  { value: '+263', label: 'Zimbabwe (+263)' },
  { value: '+221', label: 'Senegal (+221)' },
  { value: '+225', label: "Costa d'Avorio (+225)" },
  { value: 'custom', label: 'Altro' },
];

const DEFAULT_PREFIX = '+39';
const DEFAULT_CUSTOM_PREFIX = '+';

const sortedPrefixes = [...PHONE_PREFIX_OPTIONS]
  .map((o) => o.value)
  .filter((value) => value !== 'custom')
  .sort((a, b) => b.length - a.length);

function splitPhone(value: string | undefined, fallbackPrefix: string) {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { prefix: fallbackPrefix, number: '' };
  }
  if (trimmed.startsWith('+')) {
    const prefix = sortedPrefixes.find((p) => trimmed.startsWith(p));
    if (prefix) {
      return {
        prefix,
        number: trimmed.slice(prefix.length).trim(),
      };
    }
  }
  return { prefix: fallbackPrefix, number: trimmed };
}

export function PhoneInput({
  value,
  onChange,
  disabled = false,
  placeholder = 'Numero di telefono',
  inputClassName = '',
  selectClassName = '',
}: PhoneInputProps) {
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX);
  const [customPrefix, setCustomPrefix] = useState(DEFAULT_CUSTOM_PREFIX);
  const [number, setNumber] = useState('');

  useEffect(() => {
    if (value === undefined || value === null) return;
    if (!value.trim()) {
      setNumber('');
      return;
    }
    const parsed = splitPhone(value, prefix || DEFAULT_PREFIX);
    setPrefix(parsed.prefix);
    setNumber(parsed.number);
    if (
      parsed.prefix &&
      !PHONE_PREFIX_OPTIONS.some((option) => option.value === parsed.prefix)
    ) {
      setPrefix('custom');
      setCustomPrefix(parsed.prefix);
    }
  }, [value, prefix]);

  const selectOptions = useMemo(() => PHONE_PREFIX_OPTIONS, []);

  const handlePrefixChange = (nextPrefix: string) => {
    setPrefix(nextPrefix);
    if (!number.trim()) return;
    if (nextPrefix === 'custom') {
      onChange(`${customPrefix} ${number.trim()}`);
      return;
    }
    onChange(`${nextPrefix} ${number.trim()}`);
  };

  const handleNumberChange = (nextValue: string) => {
    const sanitized = nextValue.replace(/\+/g, '');
    setNumber(sanitized);
    const trimmed = sanitized.trim();
    if (!trimmed) {
      onChange('');
      return;
    }
    const effectivePrefix = prefix === 'custom' ? customPrefix : prefix;
    onChange(`${effectivePrefix} ${trimmed}`);
  };

  return (
    <div className="flex gap-2">
      <div className={`min-w-[140px] ${selectClassName}`}>
        <CustomSelect
          options={selectOptions}
          value={prefix}
          onChange={handlePrefixChange}
          disabled={disabled}
          searchable
          searchPlaceholder="Cerca prefisso..."
        />
      </div>
      {prefix === 'custom' && (
        <input
          type="text"
          value={customPrefix}
          onChange={(e) => {
            const nextPrefix = e.target.value.trim() || DEFAULT_CUSTOM_PREFIX;
            setCustomPrefix(nextPrefix);
            if (number.trim()) {
              onChange(`${nextPrefix} ${number.trim()}`);
            }
          }}
          disabled={disabled}
          placeholder="+"
          className={[
            'w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed',
            inputClassName,
          ].join(' ')}
        />
      )}
      <input
        type="tel"
        value={number}
        onChange={(e) => handleNumberChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed',
          inputClassName,
        ].join(' ')}
      />
    </div>
  );
}
