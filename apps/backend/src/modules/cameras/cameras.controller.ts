import * as camerasService from "./cameras.service";

export const create = async (c: any) => {
  const { sub } = c.get("user");
  const data = c.req.valid("json");
  const result = await camerasService.createCamera(sub, data);
  return c.json(result, 201);
};

export const list = async (c: any) => {
  const { sub } = c.get("user");
  const result = await camerasService.getCameras(sub);
  return c.json(result);
};

export const get = async (c: any) => {
  const { sub } = c.get("user");
  const { id } = c.req.valid("param");
  const result = await camerasService.getCamera(id, sub);
  return c.json(result);
};

export const update = async (c: any) => {
  const { sub } = c.get("user");
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const result = await camerasService.updateCamera(id, sub, data);
  return c.json(result);
};

export const remove = async (c: any) => {
  const { sub } = c.get("user");
  const { id } = c.req.valid("param");
  const result = await camerasService.deleteCamera(id, sub);
  return c.json(result);
};

export const start = async (c: any) => {
  const { sub } = c.get("user");
  const { id } = c.req.valid("param");
  const result = await camerasService.setCameraDesiredState(id, sub, "started");
  return c.json(result);
};

export const stop = async (c: any) => {
  const { sub } = c.get("user");
  const { id } = c.req.valid("param");
  const result = await camerasService.setCameraDesiredState(id, sub, "stopped");
  return c.json(result);
};
