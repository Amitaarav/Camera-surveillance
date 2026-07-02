import { api } from "../../lib/axios";

export interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  location: string | null;
  enabled: boolean;
  desiredState: "started" | "stopped";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCameraPayload {
  name: string;
  rtspUrl: string;
  location?: string;
  enabled?: boolean;
}

export interface UpdateCameraPayload {
  name?: string;
  rtspUrl?: string;
  location?: string;
  enabled?: boolean;
}

export const camerasApi = {
  list: () =>
    api.get<{ cameras: Camera[] }>("/cameras").then((r) => r.data.cameras),

  get: (id: string) =>
    api.get<{ camera: Camera }>(`/cameras/${id}`).then((r) => r.data.camera),

  create: (data: CreateCameraPayload) =>
    api.post<{ camera: Camera }>("/cameras", data).then((r) => r.data.camera),

  update: (id: string, data: UpdateCameraPayload) =>
    api.patch<{ camera: Camera }>(`/cameras/${id}`, data).then((r) => r.data.camera),

  remove: (id: string) =>
    api.delete(`/cameras/${id}`),

  start: (id: string) =>
    api.post<{ camera: Camera }>(`/cameras/${id}/start`).then((r) => r.data.camera),

  stop: (id: string) =>
    api.post<{ camera: Camera }>(`/cameras/${id}/stop`).then((r) => r.data.camera),
};
