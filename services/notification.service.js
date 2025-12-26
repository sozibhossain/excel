import { NotificationLog } from "../model/notificationLog.model.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendSms } from "../utils/sendSms.js";
import { renderParcelNotification } from "../utils/templates/parcelNotificationTemplates.js";

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
