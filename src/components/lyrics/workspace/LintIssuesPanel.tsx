import React from 'react';
import { LintIssue } from '@/types/lyrics';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, AlertTriangle, Info, X } from '@/utils/iconImports';
import { cn } from '@/lib/utils';

interface LintIssuesPanelProps {
  issues: LintIssue[];
  onFixIssue?: (issueId: string) => void;
  onDismissIssue?: (issueId: string) => void;
  compact?: boolean;
}

export const LintIssuesPanel: React.FC<LintIssuesPanelProps> = ({
  issues,
  onFixIssue,
  onDismissIssue,
  compact = false
}) => {
  if (issues.length === 0) return null;

  const getSeverityIcon = (severity: LintIssue['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: LintIssue['severity']) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
    }
  };

  return (
    <ScrollArea className={cn("h-full", compact && "max-h-[200px]")}>
      <div className="space-y-2 p-2">
        {issues.map((issue) => (
          <Alert
            key={issue.id}
            variant={getSeverityVariant(issue.severity)}
            className="relative pr-8"
          >
            {getSeverityIcon(issue.severity)}
            <AlertTitle className="text-sm">
              {issue.severity === 'error' ? 'Error' : 
               issue.severity === 'warning' ? 'Warning' : 'Info'}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {issue.message}
              {issue.suggestion && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Suggestion: {issue.suggestion}
                  </span>
                  {onFixIssue && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFixIssue(issue.id)}
                      className="h-6 px-2 text-xs"
                    >
                      Fix
                    </Button>
                  )}
                </div>
              )}
            </AlertDescription>
            {onDismissIssue && (
              <button
                onClick={() => onDismissIssue(issue.id)}
                className="absolute top-2 right-2 rounded-full p-1 hover:bg-white/20 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Alert>
        ))}
      </div>
    </ScrollArea>
  );
};
