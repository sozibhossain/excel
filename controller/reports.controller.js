import catchAsync from "../utils/catchAsync.js";
import { generateCsvReport, generatePdfReport } from "../services/report.service.js";

export const bookingsCsv = catchAsync(async (req, res) => {
  const csv = await generateCsvReport(req.query);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="bookings.csv"');
  return res.send(csv);
});

export const bookingsPdf = catchAsync(async (req, res) => {
  const pdf = await generatePdfReport(req.query);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="bookings.pdf"');
  return res.send(pdf);
});
