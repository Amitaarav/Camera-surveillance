import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { camerasApi } from "./api";
import type { CreateCameraPayload, UpdateCameraPayload } from "./api";

const CAMERAS_KEY = ["cameras"] as const;

export function useCameras() {
  return useQuery({
    queryKey: CAMERAS_KEY,
    queryFn: camerasApi.list,
  });
}

export function useCamera(id: string) {
  return useQuery({
    queryKey: [...CAMERAS_KEY, id],
    queryFn: () => camerasApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCameraPayload) => camerasApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMERAS_KEY }),
  });
}

export function useUpdateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCameraPayload }) =>
      camerasApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMERAS_KEY }),
  });
}

export function useDeleteCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => camerasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMERAS_KEY }),
  });
}

export function useStartCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => camerasApi.start(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMERAS_KEY }),
  });
}

export function useStopCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => camerasApi.stop(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMERAS_KEY }),
  });
}
