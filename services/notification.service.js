import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import { NotificationLog } from "../model/notificationLog.model.js";
import { Notification } from "../model/notification.model.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendSms } from "../utils/sendSms.js";
import { renderParcelNotification } from "../utils/templates/parcelNotificationTemplates.js";
import { emitUserNotification } from "../sockets/emitter.js";
import { buildPaginationMeta } from "../utils/pagination.js";

export const logNotification = ({
  parcelId,
  channel,
  recipient,
  templateKey,
  status,
  providerMessageId,
}) =>
  NotificationLog.create({
    parcelId,
    channel,
    recipient,
    templateKey,
    status,
    providerMessageId,
  });

const dispatchChannel = async ({ parcelId, recipient, templateKey, channel, action }) => {
  try {
    const result = await action();
    await logNotification({
      parcelId,
      channel,
      recipient,
      templateKey,
      status: result?.status === "FAILED" ? "FAILED" : "SENT",
      providerMessageId: result?.providerMessageId,
    });
  } catch (error) {
    console.error(`Notification channel ${channel} failed`, error);
    await logNotification({
      parcelId,
      channel,
      recipient,
      templateKey,
      status: "FAILED",
    });
  }
};

export const notifyParcelEvent = async ({ parcel, templateKey, context = {} }) => {
  if (!parcel?.customerId) return;
  const customer = parcel.customerId;
  const rendered = renderParcelNotification(templateKey, customer.language, {
    ...context,
    status: context.status ?? parcel.status,
    trackingCode: parcel.trackingCode,
    customerName: customer.name,
    pickupAddress: parcel.pickupAddressId?.fullAddress,
    deliveryAddress: parcel.deliveryAddressId?.fullAddress,
  });

  const tasks = [];

  if (customer.email && rendered.emailSubject && rendered.emailHtml) {
    tasks.push(
      dispatchChannel({
        parcelId: parcel._id,
        recipient: customer.email,
        templateKey,
        channel: "EMAIL",
        action: () =>
          sendEmail(customer.email, rendered.emailSubject, rendered.emailHtml).then(() => ({
            status: "SENT",
          })),
      })
    );
  }

  if (customer.phone && rendered.smsText) {
    tasks.push(
      dispatchChannel({
        parcelId: parcel._id,
        recipient: customer.phone,
        templateKey,
        channel: "SMS",
        action: () => sendSms(customer.phone, rendered.smsText),
      })
    );
  }

  if (!tasks.length) return;
  await Promise.allSettled(tasks);
};

export const testNotification = async ({ parcelId, recipient }) => {
  const subject = "Notification test";
  const body = `<p>This is a test notification for parcel ${parcelId ?? "N/A"}.</p>`;
  await sendEmail(recipient, subject, body);
  return logNotification({
    parcelId,
    channel: "EMAIL",
    recipient,
    templateKey: "TEST",
    status: "SENT",
  });
};

const serializeNotification = (notification) => ({
  _id: notification._id.toString(),
  type: notification.type,
  title: notification.title,
  body: notification.body,
  data: notification.data ?? {},
  isRead: notification.isRead,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});

export const createUserNotification = async ({
  userId,
  role,
  type,
  title,
  body,
  data = {},
}) => {
  if (!userId || !role || !type || !title) return null;
  const notification = await Notification.create({
    userId,
    role,
    type,
    title,
    body,
    data,
  });

  const unreadCount = await Notification.countDocuments({
    userId,
    isRead: false,
  });

  emitUserNotification({
    userId,
    role,
    payload: {
      notification: serializeNotification(notification),
      unreadCount,
    },
  });

  return notification;
};

export const listUserNotifications = async ({ userId, page = 1, limit = 50 }) => {
  const filters = { userId };
  const query = Notification.find(filters).sort({ createdAt: -1 });
  const [data, total, unreadCount] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filters),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    data: data.map(serializeNotification),
    meta: {
      ...buildPaginationMeta({ page, limit, total }),
      unreadCount,
    },
  };
};

export const markNotificationAsRead = async ({ notificationId, userId }) => {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  const unreadCount = await Notification.countDocuments({ userId, isRead: false });

  return {
    notification: serializeNotification(notification),
    unreadCount,
  };
};

export const markAllNotificationsAsRead = async ({ userId }) => {
  await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return {
    unreadCount: 0,
  };
};
