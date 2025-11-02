/**
 * ☁️ Cloud Page - Unified File Storage
 * Единое хранилище файлов с категориями
 */

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Cloud } from '@/utils/iconImports';

export default function CloudPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Облако"
        description="Единое файловое хранилище"
        icon={Cloud}
      />
      <div className="mt-6">
        <p className="text-muted-foreground">Cloud storage coming soon (Phase 3)</p>
      </div>
    </PageContainer>
  );
}
