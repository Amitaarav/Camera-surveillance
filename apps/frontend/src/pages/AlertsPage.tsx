import { useState } from "react";
import { AlertFeed } from "../features/alerts/components/AlertFeed";
import { useCameras } from "../features/cameras/hooks";
import { Filter } from "lucide-react";

export function AlertsPage() {
  const { data: cameras } = useCameras();
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  return (
    <div className="animate-fade-in space-y-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Alert History</h1>
          <p className="text-sm text-text-secondary mt-1">
            Browse and filter historical detection events across all active cameras.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center bg-card border border-border rounded-global px-3 py-1.5 text-xs text-text-secondary">
            <Filter className="h-3.5 w-3.5 mr-2 text-text-muted" />
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-gray-900 border-none text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="">All Cameras</option>
              {cameras?.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-card border border-border rounded-card p-6 shadow-card">
        <AlertFeed cameraId={selectedCameraId || undefined} maxItems={50} />
      </div>
    </div>
  );
}
