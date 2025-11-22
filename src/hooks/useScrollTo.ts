import { useState, useEffect } from 'react';

const useScrollTo = (target: React.RefObject<HTMLDivElement>) => {
  const [scrollPosition, setScrollPosition] = useState(0);

  const scrollTo = () => {
    if (target.current) {
      target.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { scrollTo };
};

export default useScrollTo;