const ONE_SECOND = 1000;

const units = {
  s: ONE_SECOND,
  m: 60 * ONE_SECOND,
  h: 60 * 60 * ONE_SECOND,
  d: 24 * 60 * 60 * ONE_SECOND,
};

export const durationToDate = (input) => {
  const match = input.match(/(\d+)([smhd])/i);
  if (!match) {
    throw new Error("Invalid duration format");
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = units[unit] || ONE_SECOND;

  return new Date(Date.now() + value * multiplier);
};
