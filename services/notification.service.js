import { NotificationLog } from "../model/notificationLog.model.js";

export const logNotification = ({ parcelId, channel, recipient, templateKey, status }) =>
  NotificationLog.create({ parcelId, channel, recipient, templateKey, status });

export const testNotification = ({ parcelId, recipient }) =>
  logNotification({
    parcelId,
    channel: "EMAIL",
    recipient,
    templateKey: "TEST",
    status: "SENT",
  });
