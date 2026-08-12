import test from "node:test";
import assert from "node:assert/strict";
import { buildExcelWorkbook, buildOrdersCsv, summarizeOrders } from "../lib/reports.ts";

const orders = [
  { id: "one", createdAt: "2026-08-12T08:00:00.000Z", customerName: 'A, "Guest"', productName: "Burrito & Chips", quantity: 2, total: 900, status: "Served", paymentStatus: "Paid" },
  { id: "two", createdAt: "2026-08-10T08:00:00.000Z", customerName: "B", productName: "Tea", quantity: 1, total: 60, status: "Confirmed", paymentStatus: "Pending" },
  { id: "three", createdAt: "2026-08-11T08:00:00.000Z", customerName: "C", productName: "Tea", quantity: 10, total: 600, status: "Cancelled", paymentStatus: "Pending" },
];

test("report totals exclude cancelled orders and revenue includes only paid orders", () => {
  const report = summarizeOrders(orders, new Date("2026-08-12T12:00:00.000Z"));
  assert.deepEqual(report.total, { orders: 2, paidOrders: 1, revenue: 900 });
  assert.deepEqual(report.daily, { orders: 1, paidOrders: 1, revenue: 900 });
  assert.deepEqual(report.bestSeller, ["Burrito & Chips", 2]);
  assert.equal(report.average, 900);
  assert.equal(report.statuses.find(({ status }) => status === "Cancelled")?.count, 1);
});

test("CSV escapes commas and embedded quotes", () => {
  const csv = buildOrdersCsv(orders);
  assert.match(csv, /"A, ""Guest"""/);
  assert.match(csv, /"Burrito & Chips"/);
  assert.equal(csv.split("\r\n").length, 4);
});

test("Excel workbook contains both sheets and XML-escaped customer data", () => {
  const workbook = buildExcelWorkbook(orders, new Date("2026-08-12T12:00:00.000Z"));
  assert.match(workbook, /ss:Name="Summary"/);
  assert.match(workbook, /ss:Name="Orders"/);
  assert.match(workbook, /Burrito &amp; Chips/);
  assert.match(workbook, /A, &quot;Guest&quot;/);
  assert.match(workbook, /Paid revenue \(ETB\)/);
});
