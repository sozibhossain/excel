const STATUS_LABELS = {
  BOOKED: { EN: "Booked", BN: "বুকড" },
  ASSIGNED: { EN: "Agent Assigned", BN: "এজেন্ট নিয়োগ" },
  PICKED_UP: { EN: "Picked Up", BN: "পিকআপ সম্পন্ন" },
  IN_TRANSIT: { EN: "In Transit", BN: "চলমান" },
  DELIVERED: { EN: "Delivered", BN: "ডেলিভারড" },
  FAILED: { EN: "Delivery Failed", BN: "ডেলিভারি ব্যর্থ" },
  CANCELLED: { EN: "Cancelled", BN: "বাতিল" },
};

const normalizeLanguage = (language) => (language?.toUpperCase() === "BN" ? "BN" : "EN");

const formatDateTime = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

const wrapEmailBody = (body) => `
  <div style="font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.5; color: #111827;">
    ${body}
    <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
      Thank you for choosing our delivery service.
    </p>
  </div>
`;

const templates = {
  PARCEL_BOOKED: {
    EN: (ctx) => {
      const pickup = ctx.pickupAddress ? `Pickup: ${ctx.pickupAddress}` : "";
      const drop = ctx.deliveryAddress ? `Delivery: ${ctx.deliveryAddress}` : "";
      const schedule = ctx.scheduledPickupAt
        ? `Scheduled pickup: ${formatDateTime(ctx.scheduledPickupAt)}`
        : "We'll notify you when a courier is assigned.";
      return {
        subject: `Shipment booked (${ctx.trackingCode})`,
        html: wrapEmailBody(`
          <p>Hi ${ctx.customerName},</p>
          <p>Your parcel booking is confirmed. ${schedule}</p>
          <p>${pickup}<br/>${drop}</p>
          <p>Tracking code: <strong>${ctx.trackingCode}</strong></p>
        `),
        sms: `Booking confirmed for parcel ${ctx.trackingCode}. ${schedule}`,
      };
    },
    BN: (ctx) => {
      const pickup = ctx.pickupAddress ? `পিকআপ ঠিকানা: ${ctx.pickupAddress}` : "";
      const drop = ctx.deliveryAddress ? `ডেলিভারি ঠিকানা: ${ctx.deliveryAddress}` : "";
      const schedule = ctx.scheduledPickupAt
        ? `নির্ধারিত পিকআপ: ${formatDateTime(ctx.scheduledPickupAt)}`
        : "এজেন্ট নিয়োগ হলেই জানানো হবে।";
      return {
        subject: `চালান নিশ্চিত (${ctx.trackingCode})`,
        html: wrapEmailBody(`
          <p>হ্যালো ${ctx.customerName},</p>
          <p>আপনার পার্সেল বুকিং নিশ্চিত হয়েছে। ${schedule}</p>
          <p>${pickup}<br/>${drop}</p>
          <p>ট্র্যাকিং কোড: <strong>${ctx.trackingCode}</strong></p>
        `),
        sms: `আপনার ${ctx.trackingCode} পার্সেল বুক হয়েছে। ${schedule}`,
      };
    },
  },
  PARCEL_STATUS_UPDATED: {
    EN: (ctx) => {
      const statusLabel = ctx.statusLabel ?? STATUS_LABELS[ctx.status]?.EN ?? ctx.status;
      const note = ctx.note ? `Note: ${ctx.note}` : "";
      return {
        subject: `Update: ${statusLabel} (${ctx.trackingCode})`,
        html: wrapEmailBody(`
          <p>Hi ${ctx.customerName},</p>
          <p>Your parcel ${ctx.trackingCode} is now <strong>${statusLabel}</strong>.</p>
          ${ctx.eta ? `<p>Next milestone: ${ctx.eta}</p>` : ""}
          ${note ? `<p>${note}</p>` : ""}
        `),
        sms: `Parcel ${ctx.trackingCode} is ${statusLabel}. ${note}`,
      };
    },
    BN: (ctx) => {
      const statusLabel = ctx.statusLabel ?? STATUS_LABELS[ctx.status]?.BN ?? ctx.status;
      const note = ctx.note ? `নোট: ${ctx.note}` : "";
      return {
        subject: `অবস্থা: ${statusLabel} (${ctx.trackingCode})`,
        html: wrapEmailBody(`
          <p>হ্যালো ${ctx.customerName},</p>
          <p>আপনার ${ctx.trackingCode} পার্সেল এখন <strong>${statusLabel}</strong>.</p>
          ${note ? `<p>${note}</p>` : ""}
        `),
        sms: `${ctx.trackingCode} এখন ${statusLabel}. ${note}`,
      };
    },
  },
};

export const renderParcelNotification = (templateKey, language, context) => {
  const languageKey = normalizeLanguage(language);
  const templateBuilder = templates[templateKey]?.[languageKey] || templates[templateKey]?.EN;

  if (!templateBuilder) {
    return { emailSubject: "", emailHtml: "", smsText: "" };
  }

  const ctx = {
    ...context,
    statusLabel: STATUS_LABELS[context.status]?.[languageKey],
  };

  const { subject, html, sms } = templateBuilder(ctx);
  return {
    emailSubject: subject,
    emailHtml: html,
    smsText: sms,
  };
};

export const getStatusLabel = (status, language = "EN") => {
  const languageKey = normalizeLanguage(language);
  return STATUS_LABELS[status]?.[languageKey] ?? status;
};
