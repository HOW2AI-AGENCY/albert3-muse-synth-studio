

const useScrollTo = (target: React.RefObject<HTMLDivElement>) => {

  const scrollTo = () => {
    if (target.current) {
      target.current.scrollIntoView({ behavior: 'smooth' });
    }
  };


  return { scrollTo };
};

export default useScrollTo;