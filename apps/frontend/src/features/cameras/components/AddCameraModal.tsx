import { useState } from "react";
import { useCreateCamera } from "../hooks";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";

interface AddCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCameraModal({ open, onOpenChange }: AddCameraModalProps) {
  const createCamera = useCreateCamera();
  const [name, setName] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [location, setLocation] = useState("");

  const handleClose = () => {
    onOpenChange(false);
    // Slight delay to allow animation to finish before resetting
    setTimeout(() => {
      setName("");
      setRtspUrl("");
      setLocation("");
      createCamera.reset();
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCamera.mutate(
      {
        name,
        rtspUrl,
        location: location || undefined,
      },
      {
        onSuccess: handleClose,
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={handleClose} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Camera</DialogTitle>
          <DialogDescription>
            Register a new RTSP stream to your surveillance network.
          </DialogDescription>
        </DialogHeader>

        <form id="add-camera-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="camera-name" className="text-sm font-medium leading-none text-text-primary">
              Camera Name
            </label>
            <Input
              id="camera-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Front Entrance"
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="camera-rtsp" className="text-sm font-medium leading-none text-text-primary">
              RTSP URL
            </label>
            <Input
              id="camera-rtsp"
              type="url"
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              required
              placeholder="rtsp://192.168.1.100:554/stream"
              className="mt-2"
            />
            <p className="text-[11px] text-text-muted">Must be a valid RTSP protocol URL.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="camera-location" className="text-sm font-medium leading-none text-text-primary">
              Location <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <Input
              id="camera-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Building A, Floor 1"
              className="mt-2"
            />
          </div>

          {createCamera.isError && (
            <div className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger animate-fade-in mt-4">
              {(createCamera.error as any)?.response?.data?.message || "Failed to add camera. Please check the details."}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={handleClose}
            disabled={createCamera.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="add-camera-form" 
            isLoading={createCamera.isPending}
            className="w-full sm:w-auto"
          >
            Add Camera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
