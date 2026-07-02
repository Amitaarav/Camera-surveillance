import { useState } from "react";
import { CameraGrid } from "../features/cameras/components/CameraGrid";
import { AddCameraModal } from "../features/cameras/components/AddCameraModal";
import { useCameras } from "../features/cameras/hooks";
import { AlertFeed } from "../features/alerts/components/AlertFeed";
import { Plus, Video, Activity, Bell } from "lucide-react";
import { Button } from "../components/ui/button";

export function DashboardPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: cameras } = useCameras();

  const totalCameras = cameras?.length ?? 0;
  const activeCameras = cameras?.filter((c) => c.desiredState === "started").length ?? 0;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Surveillance Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Manage and monitor your camera feeds in real-time.</p>
        </div>

        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto bg-primary hover:bg-secondary text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Camera
        </Button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-card border border-border bg-card p-5 shadow-subtle">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-secondary">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">Total Cameras</p>
            <p className="text-lg font-semibold text-text-primary">{totalCameras}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-border bg-card p-5 shadow-subtle">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-bg text-success">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">Active Streams</p>
            <p className="text-lg font-semibold text-text-primary">{activeCameras}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-border bg-card p-5 shadow-subtle">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-bg text-warning">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">Alert Monitoring</p>
            <p className="text-lg font-semibold text-text-primary">Active</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left Side: Camera Grid (Takes 2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-8">
          <CameraGrid />
        </div>

        {/* Right Side: Live Alerts Sidebar (Takes 1 column) */}
        <div className="bg-card border border-border rounded-card p-5 shadow-card h-[600px] flex flex-col">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Security Alerts</h2>
          <div className="flex-1 overflow-hidden">
            <AlertFeed compact />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddCameraModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}

