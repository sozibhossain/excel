const logLevels = ["debug", "info", "warn", "error"];

const log = (level, message, metadata = {}) => {
  if (!logLevels.includes(level)) {
    level = "info";
  }
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...metadata,
  };
  console.log(JSON.stringify(payload));
};

export default {
  debug: (msg, meta) => log("debug", msg, meta),
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
};
