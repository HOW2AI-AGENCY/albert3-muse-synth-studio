import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrackDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle: string;
  onConfirm: () => void;
}

export const TrackDeleteDialog = ({
  open,
  onOpenChange,
  trackId,
  trackTitle,
  onConfirm,
}: TrackDeleteDialogProps) => {
  const [versionsCount, setVersionsCount] = useState(0);
  const [stemsCount, setStemsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    if (open) {
      loadRelatedData();
      setCountdown(3);
      setCanDelete(false);
    }
  }, [open, trackId]);

  useEffect(() => {
    if (open && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanDelete(true);
    }
  }, [open, countdown]);

  const loadRelatedData = async () => {
    setIsLoading(true);
    try {
      // Load versions count
      const { count: vCount } = await supabase
        .from('track_versions')
        .select('*', { count: 'exact', head: true })
        .eq('parent_track_id', trackId);

      // Load stems count
      const { count: sCount } = await supabase
        .from('track_stems')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId);

      setVersionsCount(vCount || 0);
      setStemsCount(sCount || 0);
    } catch (error) {
      console.error('Error loading related data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (canDelete) {
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-left">
              Удалить трек?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <p className="font-medium text-foreground">
              Вы собираетесь удалить трек "{trackTitle}"
            </p>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Загрузка информации...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">
                  Это действие удалит:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Основной трек</li>
                  {versionsCount > 0 && (
                    <li className="text-orange-500 font-medium">
                      {versionsCount} {versionsCount === 1 ? 'версию' : versionsCount < 5 ? 'версии' : 'версий'}
                    </li>
                  )}
                  {stemsCount > 0 && (
                    <li className="text-orange-500 font-medium">
                      {stemsCount} {stemsCount === 1 ? 'стем' : stemsCount < 5 ? 'стема' : 'стемов'}
                    </li>
                  )}
                  <li>Все связанные данные (лайки, аналитика)</li>
                </ul>
                <p className="text-sm font-medium text-destructive pt-2">
                  ⚠️ Это действие нельзя отменить
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canDelete || isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {!canDelete ? `Удалить (${countdown})` : 'Удалить трек'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
