import { toast } from '@/components/ui/sonner-api'

export function useNotifications() {
  return {
    success: (title: string, description?: string) => description ? toast.success(title, { description }) : toast.success(title),
    error: (title: string, description?: string) => description ? toast.error(title, { description }) : toast.error(title),
    info: (title: string, description?: string) => description ? toast(title, { description }) : toast(title),
    warning: (title: string, description?: string) => description ? toast(title, { description }) : toast(title),
  }
}
