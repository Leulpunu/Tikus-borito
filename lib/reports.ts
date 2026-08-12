export type ReportOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  productName: string;
  quantity: number;
  total: number;
  status: string;
  paymentStatus: string;
};

export type ReportSummary = {
  orders: number;
  paidOrders: number;
  revenue: number;
};

export type SalesReport = {
  daily: ReportSummary;
  weekly: ReportSummary;
  monthly: ReportSummary;
  total: ReportSummary;
  bestSeller: [string, number] | null;
  average: number;
  statuses: Array<{ status: string; count: number }>;
};

const statuses = ["Confirmed", "Preparing", "Ready", "Served", "Cancelled"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function summarizeOrders(orders: ReportOrder[], now = new Date()): SalesReport {
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const validOrders = orders.filter((order) => order.status !== "Cancelled");

  const summarize = (from?: Date): ReportSummary => {
    const matching = validOrders.filter((order) => !from || new Date(order.createdAt) >= from);
    const paid = matching.filter((order) => order.paymentStatus === "Paid");
    return {
      orders: matching.length,
      paidOrders: paid.length,
      revenue: paid.reduce((sum, order) => sum + order.total, 0),
    };
  };

  const productSales = new Map<string, number>();
  validOrders.forEach((order) => {
    productSales.set(order.productName, (productSales.get(order.productName) ?? 0) + order.quantity);
  });
  const bestSeller = Array.from(productSales.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
  const total = summarize();

  return {
    daily: summarize(todayStart),
    weekly: summarize(weekStart),
    monthly: summarize(monthStart),
    total,
    bestSeller,
    average: total.paidOrders ? total.revenue / total.paidOrders : 0,
    statuses: statuses.map((status) => ({
      status,
      count: orders.filter((order) => order.status === status).length,
    })),
  };
}

function reportRows(orders: ReportOrder[]): Array<Array<string | number>> {
  return [
    ["Order ID", "Created at", "Customer", "Product", "Quantity", "Total (ETB)", "Order status", "Payment status"],
    ...orders.map((order) => [
      order.id,
      order.createdAt,
      order.customerName,
      order.productName,
      order.quantity,
      order.total,
      order.status,
      order.paymentStatus,
    ]),
  ];
}

export function buildOrdersCsv(orders: ReportOrder[]) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return reportRows(orders).map((row) => row.map(escape).join(",")).join("\r\n");
}

function escapeXml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function worksheet(name: string, rows: Array<Array<string | number>>) {
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rows.map((row, rowIndex) => (
    `<Row>${row.map((value) => {
      const type = typeof value === "number" ? "Number" : "String";
      const style = rowIndex === 0 ? ' ss:StyleID="Header"' : "";
      return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
    }).join("")}</Row>`
  )).join("")}</Table></Worksheet>`;
}

export function buildExcelWorkbook(orders: ReportOrder[], generatedAt = new Date()) {
  const report = summarizeOrders(orders, generatedAt);
  const summaryRows: Array<Array<string | number>> = [
    ["Tikus Borito Report", "Value"],
    ["Generated at", generatedAt.toISOString()],
    ["Total orders", report.total.orders],
    ["Paid orders", report.total.paidOrders],
    ["Paid revenue (ETB)", report.total.revenue],
    ["Average order value (ETB)", report.average],
    ["Best seller", report.bestSeller ? `${report.bestSeller[0]} (${report.bestSeller[1]} units)` : "No sales data"],
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#FDE68A" ss:Pattern="Solid"/></Style></Styles>
  ${worksheet("Summary", summaryRows)}
  ${worksheet("Orders", reportRows(orders))}
</Workbook>`;
}
