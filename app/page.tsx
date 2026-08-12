import HomeEntry from "@/components/HomeEntry";
import { getOrders, getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();
  const orders = await getOrders();
  const today = new Date();
  const isToday = (value: string) => {
    const date = new Date(value);
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  };

  const paidRevenue = orders
    .filter((order) => order.paymentStatus === "Paid" && order.status !== "Cancelled")
    .reduce((sum, order) => sum + order.total, 0);
  const stockCount = products.reduce((sum, product) => sum + product.stock, 0);
  const ordersToday = orders.filter((order) => isToday(order.createdAt) && order.status !== "Cancelled").length;
  const lowStockCount = products.filter((product) => product.stock <= 10).length;

  return (
    <HomeEntry
      productCount={products.length}
      stockCount={stockCount}
      orderCount={ordersToday}
      revenue={paidRevenue}
      lowStockCount={lowStockCount}
    />
  );
}
