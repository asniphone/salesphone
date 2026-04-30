"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CameraScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}

export function CameraScanner({ open, onOpenChange, onScan }: CameraScannerProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "camera-scanner-region";

  // Handle open/close
  useEffect(() => {
    if (open) {
      setError(null);
      
      // Initialize the scanner
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length) {
            setCameras(devices);
            
            // Prefer back camera if available
            const backCamera = devices.find(d => 
              d.label.toLowerCase().includes("back") || 
              d.label.toLowerCase().includes("environment") ||
              d.label.toLowerCase().includes("belakang")
            );
            
            const selectedCameraId = backCamera ? backCamera.id : devices[0].id;
            setActiveCameraId(selectedCameraId);
            startScanner(selectedCameraId);
          } else {
            setError("Tidak ada kamera yang terdeteksi.");
          }
        })
        .catch((err) => {
          console.error("Error getting cameras:", err);
          setError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
        });
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startScanner = (cameraId: string) => {
    if (scannerRef.current) {
      stopScanner();
    }

    // Slight delay to ensure DOM element is ready
    setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(regionId);
        scannerRef.current = html5QrCode;
        
        setIsScanning(true);
        html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Success
            stopScanner();
            onScan(decodedText);
            onOpenChange(false);
          },
          () => {
            // Ignore scan failures (happens every frame when no barcode is found)
          }
        ).catch((err) => {
          console.error("Scanner error:", err);
          setIsScanning(false);
          setError("Gagal memulai scanner: " + err);
        });
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
        scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleCameraChange = (cameraId: string) => {
    setActiveCameraId(cameraId);
    startScanner(cameraId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode / QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {error ? (
            <div className="text-center p-4 bg-destructive/10 text-destructive rounded-md w-full">
              <p>{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </Button>
            </div>
          ) : (
            <>
              {cameras.length > 1 && (
                <div className="flex gap-2 w-full overflow-x-auto pb-2">
                  {cameras.map(camera => (
                    <Button
                      key={camera.id}
                      variant={activeCameraId === camera.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCameraChange(camera.id)}
                      className="whitespace-nowrap flex-shrink-0"
                    >
                      {camera.label || `Kamera ${camera.id.substring(0, 5)}...`}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="relative w-full max-w-sm min-h-[300px] flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                {!isScanning && !error && (
                  <div className="flex flex-col items-center text-muted-foreground absolute z-10 pointer-events-none">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <span>Mempersiapkan kamera...</span>
                  </div>
                )}
                <div id={regionId} className="w-full h-full absolute inset-0" />
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Arahkan barcode / QR code ke dalam area kotak.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
