import { motion } from 'framer-motion';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ReactNode } from 'react';

interface AnimatedCollapsibleProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const AnimatedCollapsible = ({ children, ...props }: AnimatedCollapsibleProps) => {
  return <Collapsible {...props}>{children}</Collapsible>;
};

interface AnimatedCollapsibleContentProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedCollapsibleContent = ({ children, className }: AnimatedCollapsibleContentProps) => {
  return (
    <CollapsibleContent className={className}>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </CollapsibleContent>
  );
};

export { CollapsibleTrigger };
