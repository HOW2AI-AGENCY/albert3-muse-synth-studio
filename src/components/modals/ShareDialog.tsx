/**
 * ShareDialog Component
 *
 * Modal for sharing tracks via links, embeds, and social networks
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useState, useCallback } from 'react';
import { Check, Copy, Code, Share2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ShareDialogProps, ShareNetwork } from '@/types/suno-ui.types';

// Social network configurations
const SOCIAL_NETWORKS: Record<
  ShareNetwork,
  { name: string; icon: string; color: string; bgColor: string }
> = {
  twitter: {
    name: 'Twitter / X',
    icon: '𝕏',
    color: 'text-black dark:text-white',
    bgColor: 'bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-white/90',
  },
  tiktok: {
    name: 'TikTok',
    icon: '♪',
    color: 'text-white',
    bgColor: 'bg-[#000000] hover:bg-[#000000]/90',
  },
  youtube: {
    name: 'YouTube',
    icon: '▶',
    color: 'text-white',
    bgColor: 'bg-[#FF0000] hover:bg-[#FF0000]/90',
  },
  vk: {
    name: 'VK',
    icon: 'VK',
    color: 'text-white',
    bgColor: 'bg-[#0077FF] hover:bg-[#0077FF]/90',
  },
  facebook: {
    name: 'Facebook',
    icon: 'f',
    color: 'text-white',
    bgColor: 'bg-[#1877F2] hover:bg-[#1877F2]/90',
  },
  telegram: {
    name: 'Telegram',
    icon: '✈',
    color: 'text-white',
    bgColor: 'bg-[#0088cc] hover:bg-[#0088cc]/90',
  },
};

export const ShareDialog = memo<ShareDialogProps>(({
  open,
  onOpenChange,
  trackId,
  trackTitle,
  link,
  embedCode,
  networks = ['twitter', 'tiktok', 'youtube', 'vk', 'telegram'],
  onCopyLink,
  onShareNetwork,
  onGenerateEmbed,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [generatedEmbed, setGeneratedEmbed] = useState(embedCode || '');

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success('Link copied to clipboard!');
      if (onCopyLink) onCopyLink();
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  }, [link, onCopyLink]);

  const handleCopyEmbed = useCallback(async () => {
    if (!generatedEmbed) return;
    try {
      await navigator.clipboard.writeText(generatedEmbed);
      setCopiedEmbed(true);
      toast.success('Embed code copied!');
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (err) {
      toast.error('Failed to copy embed code');
    }
  }, [generatedEmbed]);

  const handleGenerateEmbed = useCallback(() => {
    if (onGenerateEmbed) {
      onGenerateEmbed();
    }
    // Generate default embed if not provided
    if (!generatedEmbed) {
      const defaultEmbed = `<iframe src="${link}?embed=true" width="100%" height="166" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
      setGeneratedEmbed(defaultEmbed);
    }
  }, [link, generatedEmbed, onGenerateEmbed]);

  const handleShareNetwork = useCallback(
    (network: ShareNetwork) => {
      if (onShareNetwork) {
        onShareNetwork(network);
      }
      toast.success(`Sharing to ${SOCIAL_NETWORKS[network].name}...`);
    },
    [onShareNetwork]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Track
          </DialogTitle>
          <DialogDescription>
            {trackTitle
              ? `Share "${trackTitle}" with your audience`
              : 'Share this track with your audience'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="embed">Embed</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-link">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  value={link}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can listen to your track
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(link, '_blank')}
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Embed Tab */}
          <TabsContent value="embed" className="space-y-4">
            {!generatedEmbed ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate an embed code to display this track on your website
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateEmbed}
                >
                  <Code className="w-4 h-4 mr-2" />
                  Generate Embed Code
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="embed-code">Embed Code</Label>
                <Textarea
                  id="embed-code"
                  value={generatedEmbed}
                  readOnly
                  className="font-mono text-xs min-h-[120px]"
                />
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleCopyEmbed}
                >
                  {copiedEmbed ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Embed Code
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="space-y-2">
              <Label>Share on Social Media</Label>
              <div className="grid grid-cols-2 gap-2">
                {networks.map((network) => {
                  const config = SOCIAL_NETWORKS[network];
                  return (
                    <Button
                      key={network}
                      variant="outline"
                      className={cn(
                        'h-auto py-3 flex-col gap-1',
                        config.bgColor,
                        config.color
                      )}
                      onClick={() => handleShareNetwork(network)}
                    >
                      <span className="text-xl font-bold">{config.icon}</span>
                      <span className="text-xs">{config.name}</span>
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share your track and engage with your audience on social platforms
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 pt-4 border-t">
          <div className="flex-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Share2 className="w-3.5 h-3.5" />
            <span>Track ID: {trackId.slice(0, 8)}...</span>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ShareDialog.displayName = 'ShareDialog';
