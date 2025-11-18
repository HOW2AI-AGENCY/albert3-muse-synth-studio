import { useRef, useEffect } from 'react';

/**
 * A custom hook that returns the latest value of a variable.
 * This is useful for keeping track of the latest value of a prop or state
 * without causing re-renders when the value changes.
 * @param value The value to track.
 * @returns A ref object with the latest value.
 */
export const useLatest = <T>(value: T) => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};
