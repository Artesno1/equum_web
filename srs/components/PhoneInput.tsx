import React from 'react';
import InputMask from 'react-input-mask';
import { PhoneCall } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = React.memo(({ value, onChange, error }) => {
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);
  
  return ( 
    <div className="mb-4">
      <div className="relative">
        {/* Prevent functionality in Telegram Web Mini App */}
        {window.Telegram && window.Telegram.WebApp ? null : (
          <label htmlFor="phone-input" className="sr-only">Номер телефона</label>
        )}
        <label htmlFor="phone-input" className="sr-only">Номер телефона</label>

      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-onyx/40">
          <PhoneCall className="w-5 h-5" aria-hidden="true" />
        </div>
        <InputMask
          mask="+7 (999) 999-99-99"
          value={value}
          onChange={handleChange}
          placeholder="Ваш номер телефона"
          className={`uber-input pl-12 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
          aria-label="Номер телефона"
          aria-invalid={!!error}
          aria-describedby={error ? "phone-error" : "phone-hint"}
        />
      </div>
      {error && <p id="phone-error" className="text-red-500 text-sm mt-1" role="alert">{error}</p>}
      <p id="phone-hint" className="text-onyx/60 text-xs mt-1">
        Введите номер телефона в формате +7 (XXX) XXX-XX-XX
      </p>
      <p id="phone-hint" className="text-onyx/60 text-xs mt-1">
        Введите номер телефона в формате +7 (XXX) XXX-XX-XX
      </p>
    </div>
  );












});

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
