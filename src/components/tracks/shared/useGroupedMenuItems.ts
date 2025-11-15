import { useMemo } from 'react';
import type { MenuItem, MenuLayout } from './TrackActionsMenu.types';

export const useGroupedMenuItems = (
  menuItems: MenuItem[],
  layout: MenuLayout,
  enableAITools: boolean
) => {
  return useMemo(() => {
    if (layout === 'flat') return [{ items: menuItems }];

    const groups: { label?: string; items: MenuItem[] }[] = [];

    const creativeItems = menuItems.filter(
      (item) => ['remix', 'create', 'stems'].includes(item.id)
    );
    if (creativeItems.length > 0) {
      groups.push({ label: 'Creative', items: creativeItems });
    }

    const orgItems = menuItems.filter(
      (item) => ['queue', 'playlist', 'move'].includes(item.id)
    );
    if (orgItems.length > 0) {
      groups.push({ label: 'Organization', items: orgItems });
    }

    const pubItems = menuItems.filter(
      (item) => ['publish', 'details', 'permissions'].includes(item.id)
    );
    if (pubItems.length > 0) {
      groups.push({ label: 'Publishing', items: pubItems });
    }

    if (enableAITools) {
      const aiItems = menuItems.filter((item) => item.id === 'describe');
      if (aiItems.length > 0) {
        groups.push({ label: 'AI Инструменты', items: aiItems });
      }
    }

    const processingItems = menuItems.filter(
      (item) => ['stems', 'convertWav', 'extend', 'cover', 'addVocal', 'createPersona'].includes(item.id)
    );
    if (processingItems.length > 0) {
      groups.push({ label: 'Обработка', items: processingItems });
    }

    const shareItems = menuItems.filter(
      (item) => ['like', 'download', 'downloadWav', 'share'].includes(item.id)
    );
    if (shareItems.length > 0) {
      groups.push({ items: shareItems });
    }

    const systemItems = menuItems.filter(
      (item) => ['sync', 'retry'].includes(item.id)
    );
    if (systemItems.length > 0) {
      groups.push({ items: systemItems });
    }

    const dangerItems = menuItems.filter((item) => item.danger);
    if (dangerItems.length > 0) {
      groups.push({ label: 'Danger Zone', items: dangerItems });
    }

    return groups;
  }, [menuItems, layout, enableAITools]);
};
