import { useCameras } from "../hooks";
import { CameraCard } from "./CameraCard";
import { Camera } from "lucide-react";
import { Skeleton } from "../../../components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "../../../components/ui/card";

export function CameraGrid() {
  const { data: cameras, isLoading, isError } = useCameras();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-border/50">
            <div className="aspect-video w-full p-2">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
            <CardHeader className="py-4 pb-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardFooter className="py-4 pt-2 flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-danger/30 bg-danger-bg/50 p-8 text-center animate-fade-in">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <Camera className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-danger">Failed to load cameras</h3>
        <p className="mt-2 text-sm text-text-secondary max-w-sm">
          There was an error communicating with the surveillance server. Please check your connection and try again.
        </p>
      </div>
    );
  }

  if (!cameras || cameras.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-hover/50 p-8 text-center animate-fade-in">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-border text-text-secondary">
          <Camera className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">No cameras found</h3>
        <p className="mt-2 text-sm text-text-secondary max-w-sm mb-6">
          You haven't added any cameras to your surveillance network yet. Add a camera to start monitoring.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-2">
      {cameras.map((camera, i) => (
        <div key={camera.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in fill-mode-both">
          <CameraCard camera={camera} />
        </div>
      ))}
    </div>
  );
}
