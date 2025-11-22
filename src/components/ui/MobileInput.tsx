import React, { useState } from 'react';
import Autosuggest from 'react-autosuggest';

const MobileInput = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [value, setValue] = useState('');

  const onChange = (event, { newValue }) => {
    setValue(newValue);
  };

  const onSuggestionsFetchRequested = async ({ value }) => {
    const response = await fetch(`https://example.com/suggestions?q=${value}`);
    const data = await response.json();
    setSuggestions(data);
  };

  return (
    <Autosuggest
      suggestions={suggestions}
      onSuggestionsFetchRequested={onSuggestionsFetchRequested}
      shouldRenderSuggestions={() => true}
      getSuggestionValue={(suggestion) => suggestion}
      renderSuggestion={(suggestion) => <div>{suggestion}</div>}
      inputProps={{
        placeholder: 'Мобильное поле ввода',
        className: 'w-full p-4 text-lg font-medium text-white bg-primary rounded-lg shadow-lg',
        value,
        onChange: (event, { newValue }) => onChange(event, { newValue }),
      }}
    />
  );
};

export default MobileInput;