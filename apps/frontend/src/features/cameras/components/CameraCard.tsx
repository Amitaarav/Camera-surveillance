import { useState } from "react";
import { Play, Square, Trash2, MapPin } from "lucide-react";
import { useStartCamera, useStopCamera, useDeleteCamera } from "../hooks";
import type { Camera } from "../api";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { CameraTile } from "./CameraTile";

interface CameraCardProps {
  camera: Camera;
}

export function CameraCard({ camera }: CameraCardProps) {
  const startCamera = useStartCamera();
  const stopCamera = useStopCamera();
  const deleteCamera = useDeleteCamera();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isStarted = camera.desiredState === "started";

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border-hover">
      {/* Stream preview area */}
      <CameraTile cameraId={camera.id} desiredState={camera.desiredState} />

      <CardHeader className="px-5 py-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="overflow-hidden">
            <CardTitle className="truncate text-base" title={camera.name}>
              {camera.name}
            </CardTitle>
            {camera.location ? (
              <CardDescription className="mt-1 flex items-center gap-1 truncate text-xs">
                <MapPin className="h-3 w-3 shrink-0" />
                {camera.location}
              </CardDescription>
            ) : (
              <CardDescription className="mt-1 text-xs">No location set</CardDescription>
            )}
          </div>
          <span className="shrink-0 text-[10px] font-medium text-text-muted tabular-nums uppercase tracking-wider bg-surface-hover px-1.5 py-0.5 rounded">
            ID: {camera.id.slice(0, 4)}
          </span>
        </div>
      </CardHeader>

      <CardFooter className="px-5 py-4 pt-3 flex gap-2">
        {isStarted ? (
          <Button
            variant="outline"
            className="flex-1 text-text-secondary hover:text-warning hover:border-warning/50 hover:bg-warning/5"
            onClick={() => stopCamera.mutate(camera.id)}
            isLoading={stopCamera.isPending}
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => startCamera.mutate(camera.id)}
            isLoading={startCamera.isPending}
          >
            <Play className="mr-2 h-4 w-4 fill-current" />
            Start
          </Button>
        )}

        <Button
          variant="outline"
          className="w-11 px-0 text-text-muted hover:text-danger hover:border-danger/50 hover:bg-danger/5"
          onClick={() => setShowDeleteDialog(true)}
          isLoading={deleteCamera.isPending}
          title="Delete camera"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </CardFooter>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete camera"
        description={`Are you sure you want to delete "${camera.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteCamera.isPending}
        onConfirm={() => {
          deleteCamera.mutate(camera.id, {
            onSuccess: () => setShowDeleteDialog(false),
          });
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </Card>
  );
}