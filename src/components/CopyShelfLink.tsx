import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CopyShelfLinkProps {
  shareId: string;
  compact?: boolean;
}

export function CopyShelfLink({ shareId, compact = false }: CopyShelfLinkProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = `${window.location.origin}/shelf/${shareId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 font-sans">
          <Share2 className="w-4 h-4" />
          {!compact && "Share"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="center">
        <div className="space-y-2">
          <p className="text-sm font-medium font-sans">Share this shelf</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="font-mono text-xs flex-1"
            />
            <Button 
              size="icon" 
              variant="outline" 
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
