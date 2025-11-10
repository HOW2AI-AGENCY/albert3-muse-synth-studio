import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateTrackVersionDetails } from '@/features/tracks/api/trackVersions';
import { useQueryClient } from '@tanstack/react-query';
import { trackVersionsQueryKeys } from '@/features/tracks/api/trackVersions';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().max(100, "Название не может быть длиннее 100 символов").optional(),
  comment: z.string().max(500, "Комментарий не может быть длиннее 500 символов").optional(),
});

interface EditVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: {
    id: string;
    name?: string | null;
    comment?: string | null;
  };
}

export const EditVersionDialog = ({ open, onOpenChange, version }: EditVersionDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: version.name || '',
      comment: version.comment || '',
    },
  });

  useEffect(() => {
    form.reset({
      name: version.name || '',
      comment: version.comment || '',
    });
  }, [version, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await updateTrackVersionDetails(version.id, values);
      toast({
        title: "Версия обновлена",
        description: "Название и комментарий были успешно сохранены.",
      });
      queryClient.invalidateQueries({ queryKey: trackVersionsQueryKeys.lists() });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить детали версии.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать детали версии</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name">Название</label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="comment">Комментарий</label>
            <Textarea id="comment" {...form.register('comment')} />
            {form.formState.errors.comment && <p className="text-red-500 text-sm">{form.formState.errors.comment.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
