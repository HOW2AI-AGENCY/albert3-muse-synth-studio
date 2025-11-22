import React, { useRef, useState } from 'react';
import Autosuggest, { type InputProps } from 'react-autosuggest';
import { logger } from '@/utils/logger';

const MobileInput: React.FC = () => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [value, setValue] = useState<string>('');
  const controllerRef = useRef<AbortController | null>(null);

  const onChange: InputProps<string>['onChange'] = (_event, { newValue }) => {
    setValue(newValue);
  };

  const onSuggestionsFetchRequested = async ({ value }: { value: string }) => {
    const q = value.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    try {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      controllerRef.current = new AbortController();
      const response = await fetch(`https://example.com/suggestions?q=${encodeURIComponent(q)}`, {
        signal: controllerRef.current.signal,
      });
      if (!response.ok) {
        setSuggestions([]);
        return;
      }
      const data = (await response.json()) as unknown;
      const list = Array.isArray(data) ? (data.filter((x) => typeof x === 'string') as string[]) : [];
      setSuggestions(list);
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') return;
      logger.error('MobileInput suggestions fetch failed', err, 'MobileInput', { query: q });
      setSuggestions([]);
    }
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  return (
    <Autosuggest
      suggestions={suggestions}
      onSuggestionsFetchRequested={onSuggestionsFetchRequested}
      onSuggestionsClearRequested={onSuggestionsClearRequested}
      shouldRenderSuggestions={() => true}
      getSuggestionValue={(suggestion: string) => suggestion}
      renderSuggestion={(suggestion: string) => <div>{suggestion}</div>}
      inputProps={{
        placeholder: 'Мобильное поле ввода',
        className: 'w-full p-4 text-lg font-medium text-white bg-primary rounded-lg shadow-lg',
        value,
        onChange,
      }}
    />
  );
};

export default MobileInput;