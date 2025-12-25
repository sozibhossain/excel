import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import { Parcel } from "../model/parcel.model.js";

const buildFilters = ({ dateFrom, dateTo, status, agentId }) => {
  const filters = {};
  if (status) filters.status = status;
  if (agentId) filters.assignedAgentId = agentId;
  if (dateFrom || dateTo) {
    filters.createdAt = {};
    if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filters.createdAt.$lte = new Date(dateTo);
  }
  return filters;
};

export const generateCsvReport = async (params) => {
  const rows = await Parcel.find(buildFilters(params)).populate("customerId assignedAgentId");
  const parser = new Parser({
    fields: ["trackingCode", "status", "paymentType", "codAmount", "createdAt"],
  });
  return parser.parse(rows.map((row) => row.toObject()));
};

export const generatePdfReport = async (params) => {
  const rows = await Parcel.find(buildFilters(params)).populate("customerId assignedAgentId");
  const doc = new PDFDocument({ margin: 32 });
  const buffers = [];
  doc.on("data", (data) => buffers.push(data));
  doc.fontSize(18).text("Bookings Report", { align: "center" }).moveDown();
  rows.forEach((parcel) => {
    doc
      .fontSize(12)
      .text(`Tracking: ${parcel.trackingCode}`)
      .text(`Status: ${parcel.status}`)
      .text(`COD: ${parcel.codAmount}`)
      .text(`Customer: ${parcel.customerId?.name || parcel.customerId}`)
      .moveDown();
  });
  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));
  return Buffer.concat(buffers);
};
