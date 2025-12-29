let ioInstance;
const USER_NOTIFICATION_EVENT = "notification:user";

export const registerSocketServer = (io) => {
  ioInstance = io;
};

export const emitParcelStatus = ({ parcelId, customerId, agentId, payload }) => {
  if (!ioInstance || !parcelId) return;
  const enrichedPayload = { parcelId, ...(payload ?? {}) };
  ioInstance.to(`parcel:${parcelId}`).emit("parcel:status", enrichedPayload);
  ioInstance.to(`customer:${customerId}`).emit("parcel:status", enrichedPayload);
  if (agentId) {
    ioInstance.to(`agent:${agentId}`).emit("parcel:status", enrichedPayload);
  }
};

export const emitTrackingPoint = (parcelId, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`parcel:${parcelId}`).emit("parcel:tracking", payload);
};

export const emitUserNotification = ({ userId, role, payload }) => {
  if (!ioInstance || !userId) return;
  const targetId = userId.toString();
  const normalizedRole = role?.toUpperCase();
  ioInstance.to(`user:${targetId}`).emit(USER_NOTIFICATION_EVENT, payload);
  if (normalizedRole === "CUSTOMER") {
    ioInstance.to(`customer:${targetId}`).emit(USER_NOTIFICATION_EVENT, payload);
  }
  if (normalizedRole === "AGENT") {
    ioInstance.to(`agent:${targetId}`).emit(USER_NOTIFICATION_EVENT, payload);
  }
};
