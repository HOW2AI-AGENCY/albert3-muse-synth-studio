import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PersonaSelector } from './PersonaSelector';

interface PersonaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPersonaId: string | null;
  onSelectPersona: (personaId: string | null) => void;
}

export const PersonaPickerDialog = memo(({
  open,
  onOpenChange,
  selectedPersonaId,
  onSelectPersona,
}: PersonaPickerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Выбрать музыкальную персону</DialogTitle>
          <DialogDescription>
            Персона определяет стиль, голос и общее звучание трека
          </DialogDescription>
        </DialogHeader>
        
        <PersonaSelector
          value={selectedPersonaId}
          onChange={onSelectPersona}
        />
      </DialogContent>
    </Dialog>
  );
});

PersonaPickerDialog.displayName = 'PersonaPickerDialog';
