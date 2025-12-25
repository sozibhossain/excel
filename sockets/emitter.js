let ioInstance;

export const registerSocketServer = (io) => {
  ioInstance = io;
};

export const emitParcelStatus = ({ parcelId, customerId, agentId, payload }) => {
  if (!ioInstance) return;
  ioInstance.to(`parcel:${parcelId}`).emit("parcel:status", payload);
  ioInstance.to(`customer:${customerId}`).emit("parcel:status", payload);
  if (agentId) {
    ioInstance.to(`agent:${agentId}`).emit("parcel:status", payload);
  }
};

export const emitTrackingPoint = (parcelId, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`parcel:${parcelId}`).emit("parcel:tracking", payload);
};
