import * as alertsService from "./alerts.service";
import type { ListAlertsQuery } from "./alerts.schema";

export const list = async (c: any) => {
  const { sub } = c.get("user");
  const query = c.req.valid("query") as ListAlertsQuery;
  const result = await alertsService.getAlerts(sub, query);
  return c.json(result);
};

export const get = async (c: any) => {
  const { sub } = c.get("user");
  const { id } = c.req.valid("param");
  const result = await alertsService.getAlert(id, sub);
  return c.json(result);
};
