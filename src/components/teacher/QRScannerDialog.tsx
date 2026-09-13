import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (text: string) => void;
}

export function QRScannerDialog({ open, onOpenChange, onScan }: QRScannerDialogProps) {
  const { toast } = useToast();
  const containerId = 'qr-reader-container';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const start = async () => {
      setStarting(true);
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decoded) => {
            if (cancelled) return;
            onScan(decoded);
          },
          () => {
            // ignore scan errors
          }
        );
      } catch (e: any) {
        toast({
          title: 'Camera unavailable',
          description: e?.message || 'Please allow camera access in your browser.',
          variant: 'destructive',
        });
        onOpenChange(false);
      } finally {
        if (!cancelled) setStarting(false);
      }
    };
    // small delay so the DOM node exists
    const t = setTimeout(start, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {}).finally(() => {
          s.clear();
          scannerRef.current = null;
        });
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Scan school QR
          </DialogTitle>
          <DialogDescription>
            Point your camera at the QR code displayed at school.
          </DialogDescription>
        </DialogHeader>
        <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
          <div id={containerId} className="w-full h-full" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Starting camera…
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
          <X className="h-4 w-4" /> Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
