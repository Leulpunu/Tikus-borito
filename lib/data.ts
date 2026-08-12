import "server-only";

import fs from "fs/promises";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";

export const ORDER_STATUSES = ["Confirmed", "Preparing", "Ready", "Served", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = "Pending" | "Paid";

export type Product = {
  id: string;
  name: string;
  category: string;
  image: string;
  unitPrice: number;
  stock: number;
};

export type Order = {
  id: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
};

export type Note = {
  id: string;
  authorId: string;
  authorName: string;
  role: string;
  message: string;
  createdAt: string;
};

type Store = {
  products: Product[];
  orders: Order[];
  notes: Note[];
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  image: string;
  unit_price: number | string;
  stock: number;
};

type OrderRow = {
  id: string;
  customer_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  total: number | string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
};

type NoteRow = {
  id: string;
  author_id: string;
  author_name: string;
  role: string;
  message: string;
  created_at: string;
};

const filePath = path.join(process.cwd(), "data", "store.json");
let mutationQueue: Promise<void> = Promise.resolve();

const initialProducts: Product[] = [
  { id: "prod-burrito", name: "Burrito", category: "Wraps", image: "/images/wraps.svg", unitPrice: 450, stock: 20 },
  { id: "prod-chicken-wrap", name: "Chicken Wrap", category: "Wraps", image: "/images/wraps.svg", unitPrice: 400, stock: 25 },
  { id: "prod-tuna-wrap", name: "Tuna Wrap", category: "Wraps", image: "/images/wraps.svg", unitPrice: 400, stock: 18 },
  { id: "prod-beef-wrap", name: "Beef Wrap", category: "Wraps", image: "/images/wraps.svg", unitPrice: 400, stock: 15 },
  { id: "prod-club-wrap", name: "Club Wrap", category: "Wraps", image: "/images/wraps.svg", unitPrice: 400, stock: 12 },
  { id: "prod-club-sandwich", name: "Club Sandwich", category: "Sandwiches", image: "/images/sandwiches.svg", unitPrice: 450, stock: 10 },
  { id: "prod-pita-special", name: "Pita Special", category: "Sandwiches", image: "/images/sandwiches.svg", unitPrice: 350, stock: 20 },
  { id: "prod-pita-normal", name: "Pita Normal", category: "Sandwiches", image: "/images/sandwiches.svg", unitPrice: 250, stock: 30 },
  { id: "prod-omelette", name: "Omelette", category: "Breakfast", image: "/images/breakfast.svg", unitPrice: 300, stock: 22 },
  { id: "prod-shakshuka", name: "Shakshuka", category: "Breakfast", image: "/images/breakfast.svg", unitPrice: 300, stock: 16 },
  { id: "prod-cheese-beef-samosa", name: "Cheese Beef Samosa (3 pcs)", category: "Samosas", image: "/images/samosas.svg", unitPrice: 250, stock: 40 },
  { id: "prod-fasting-wrap", name: "Fasting Wrap", category: "Wraps", image: "/images/wraps.svg", unitPrice: 300, stock: 20 },
  { id: "prod-tea", name: "Tea", category: "Drinks", image: "/images/drinks.svg", unitPrice: 60, stock: 80 },
  { id: "prod-coffee", name: "Coffee", category: "Drinks", image: "/images/drinks.svg", unitPrice: 90, stock: 60 },
  { id: "prod-sprite", name: "Sprite", category: "Drinks", image: "/images/drinks.svg", unitPrice: 60, stock: 70 },
  { id: "prod-milk", name: "Milk", category: "Drinks", image: "/images/drinks.svg", unitPrice: 90, stock: 50 },
  { id: "prod-biscuit", name: "Biscuit", category: "Snacks", image: "/images/snacks.svg", unitPrice: 40, stock: 100 },
  { id: "prod-bonbolino", name: "Bonbolino", category: "Snacks", image: "/images/snacks.svg", unitPrice: 35, stock: 90 },
  { id: "prod-macchiato", name: "Macchiato", category: "Snacks", image: "/images/snacks.svg", unitPrice: 85, stock: 55 },
];

function createInitialStore(): Store {
  return { products: initialProducts, orders: [], notes: [] };
}

async function ensureStore() {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(createInitialStore(), null, 2), "utf8");
  }
}

async function readStore(): Promise<Store> {
  await ensureStore();
  const fileContents = await fs.readFile(filePath, "utf8");
  const rawStore = JSON.parse(fileContents) as Partial<Store>;
  return {
    products: Array.isArray(rawStore.products) ? rawStore.products : [],
    orders: Array.isArray(rawStore.orders) ? rawStore.orders : [],
    notes: Array.isArray(rawStore.notes) ? rawStore.notes : [],
  };
}

async function writeStore(store: Store) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
  try {
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

async function mutateStore<T>(mutation: (store: Store) => T | Promise<T>): Promise<T> {
  const operation = mutationQueue.then(async () => {
    const store = await readStore();
    const result = await mutation(store);
    await writeStore(store);
    return result;
  });

  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    image: row.image,
    unitPrice: Number(row.unit_price),
    stock: row.stock,
  };
}

function orderFromRow(row: OrderRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    total: Number(row.total),
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  };
}

function noteFromRow(row: NoteRow): Note {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    role: row.role,
    message: row.message,
    createdAt: row.created_at,
  };
}

function firstRpcRow<T>(data: T[] | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (!data?.[0]) throw new Error("The database did not return the saved record.");
  return data[0];
}

function requireText(value: string, field: string, maximumLength: number) {
  const text = value.trim();
  if (!text) throw new Error(`${field} is required.`);
  if (text.length > maximumLength) throw new Error(`${field} must be ${maximumLength} characters or fewer.`);
  return text;
}

function requireMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error("Unit price must be greater than zero.");
  return Math.round(value * 100) / 100;
}

function requireStock(value: number) {
  if (!Number.isInteger(value) || value < 0) throw new Error("Stock must be a non-negative whole number.");
  return value;
}

function requireImagePath(value: string) {
  const image = value.trim() || "/images/default.svg";
  if (/^\/images\/[a-zA-Z0-9._-]+\.(svg|png|jpe?g|webp)$/.test(image)) return image;
  if (isSupabaseConfigured()) {
    try {
      const imageUrl = new URL(image);
      const projectUrl = new URL(supabaseUrl);
      if (imageUrl.origin === projectUrl.origin && imageUrl.pathname.startsWith("/storage/v1/object/public/product-images/")) return image;
    } catch {
      // The validation error below gives the caller a useful message.
    }
  }
  throw new Error("Choose a local product image or upload a JPG, PNG, or WebP image.");
}

function normalizeProduct(data: Omit<Product, "id">): Omit<Product, "id"> {
  return {
    name: requireText(data.name, "Product name", 80),
    category: requireText(data.category, "Category", 40),
    image: requireImagePath(data.image),
    unitPrice: requireMoney(data.unitPrice),
    stock: requireStock(data.stock),
  };
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}

export async function getProducts(): Promise<Product[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await createAdminClient()
      .from("products")
      .select("id,name,category,image,unit_price,stock")
      .order("name", { ascending: true })
      .returns<ProductRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(productFromRow);
  }
  const store = await readStore();
  return [...store.products].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createProduct(data: Omit<Product, "id">): Promise<Product> {
  if (isSupabaseConfigured()) {
    const product = { id: nextId("prod"), ...normalizeProduct(data) };
    const { data: row, error } = await createAdminClient()
      .from("products")
      .insert({
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        unit_price: product.unitPrice,
        stock: product.stock,
      })
      .select("id,name,category,image,unit_price,stock")
      .single<ProductRow>();
    if (error || !row) throw new Error(error?.message || "Unable to save product.");
    return productFromRow(row);
  }
  return mutateStore((store) => {
    const newProduct: Product = { id: nextId("prod"), ...normalizeProduct(data) };
    store.products.push(newProduct);
    return newProduct;
  });
}

export async function updateProduct(id: string, updates: Partial<Omit<Product, "id">>): Promise<Product> {
  if (isSupabaseConfigured()) {
    const existing = (await getProducts()).find((product) => product.id === id);
    if (!existing) throw new Error("Product not found.");
    const product = normalizeProduct({ ...existing, ...updates });
    const { data: row, error } = await createAdminClient()
      .from("products")
      .update({
        name: product.name,
        category: product.category,
        image: product.image,
        unit_price: product.unitPrice,
        stock: product.stock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,name,category,image,unit_price,stock")
      .single<ProductRow>();
    if (error || !row) throw new Error(error?.message || "Product not found.");
    return productFromRow(row);
  }
  return mutateStore((store) => {
    const existing = store.products.find((product) => product.id === id);
    if (!existing) throw new Error("Product not found.");

    const normalized = normalizeProduct({ ...existing, ...updates });
    Object.assign(existing, normalized);
    return existing;
  });
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const { data, error } = await createAdminClient().from("products").delete().eq("id", id).select("id");
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  }
  return mutateStore((store) => {
    const originalLength = store.products.length;
    store.products = store.products.filter((product) => product.id !== id);
    return store.products.length !== originalLength;
  });
}

export async function getOrders(): Promise<Order[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await createAdminClient()
      .from("orders")
      .select("id,customer_name,product_id,product_name,quantity,total,status,payment_status,created_at")
      .order("created_at", { ascending: false })
      .returns<OrderRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(orderFromRow);
  }
  const store = await readStore();
  return [...store.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createOrder(data: { customerName: string; productId: string; quantity: number }): Promise<Order> {
  if (isSupabaseConfigured()) {
    const customerName = requireText(data.customerName, "Customer name", 80);
    if (!Number.isInteger(data.quantity) || data.quantity < 1) throw new Error("Quantity must be a positive whole number.");
    const { data: rows, error } = await createAdminClient().rpc("create_order_transaction", {
        p_order_id: nextId("order"),
        p_customer_name: customerName,
        p_product_id: data.productId,
        p_quantity: data.quantity,
      });
    return orderFromRow(firstRpcRow(rows as unknown as OrderRow[] | null, error));
  }
  return mutateStore((store) => {
    const customerName = requireText(data.customerName, "Customer name", 80);
    const product = store.products.find((item) => item.id === data.productId);
    if (!product) throw new Error("Product not found.");
    if (!Number.isInteger(data.quantity) || data.quantity < 1) throw new Error("Quantity must be a positive whole number.");
    if (product.stock < data.quantity) throw new Error(`Only ${product.stock} unit(s) are available.`);

    product.stock -= data.quantity;
    const order: Order = {
      id: nextId("order"),
      customerName,
      productId: product.id,
      productName: product.name,
      quantity: data.quantity,
      total: Math.round(product.unitPrice * data.quantity * 100) / 100,
      status: "Confirmed",
      paymentStatus: "Pending",
      createdAt: new Date().toISOString(),
    };
    store.orders.unshift(order);
    return order;
  });
}

const nextOrderStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  Confirmed: "Preparing",
  Preparing: "Ready",
  Ready: "Served",
};

export async function updateOrder(
  id: string,
  updates: { status?: OrderStatus; paymentStatus?: PaymentStatus },
): Promise<Order> {
  if (isSupabaseConfigured()) {
    const { data: rows, error } = await createAdminClient().rpc("update_order_transaction", {
        p_order_id: id,
        p_status: updates.status ?? null,
        p_payment_status: updates.paymentStatus ?? null,
      });
    return orderFromRow(firstRpcRow(rows as unknown as OrderRow[] | null, error));
  }
  return mutateStore((store) => {
    const existing = store.orders.find((order) => order.id === id);
    if (!existing) throw new Error("Order not found.");
    if (existing.status === "Cancelled") throw new Error("A cancelled order cannot be updated.");

    if (updates.status) {
      if (updates.status === "Cancelled") throw new Error("Use the cancellation action to cancel an order.");
      if (nextOrderStatus[existing.status] !== updates.status) throw new Error("Invalid order status transition.");
      existing.status = updates.status;
    }
    if (updates.paymentStatus) {
      if (updates.paymentStatus !== "Pending" && updates.paymentStatus !== "Paid") throw new Error("Invalid payment status.");
      existing.paymentStatus = updates.paymentStatus;
    }
    return existing;
  });
}

export async function cancelOrder(id: string): Promise<Order> {
  if (isSupabaseConfigured()) {
    const { data: rows, error } = await createAdminClient().rpc("cancel_order_transaction", { p_order_id: id });
    return orderFromRow(firstRpcRow(rows as unknown as OrderRow[] | null, error));
  }
  return mutateStore((store) => {
    const existing = store.orders.find((order) => order.id === id);
    if (!existing) throw new Error("Order not found.");
    if (existing.status === "Cancelled") return existing;
    if (existing.paymentStatus === "Paid") throw new Error("Refund a paid order before cancelling it.");
    if (existing.status === "Served") throw new Error("A served order cannot be cancelled.");

    const product = store.products.find((item) => item.id === existing.productId);
    if (product) product.stock += existing.quantity;
    existing.status = "Cancelled";
    return existing;
  });
}

export async function getNotes(): Promise<Note[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await createAdminClient()
      .from("notes")
      .select("id,author_id,author_name,role,message,created_at")
      .order("created_at", { ascending: false })
      .returns<NoteRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(noteFromRow);
  }
  const store = await readStore();
  return [...store.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createNote(data: Omit<Note, "id" | "createdAt">): Promise<Note> {
  if (isSupabaseConfigured()) {
    const note = {
      id: nextId("note"),
      authorId: requireText(data.authorId, "Author", 100),
      authorName: requireText(data.authorName, "Author name", 80),
      role: requireText(data.role, "Role", 30),
      message: requireText(data.message, "Message", 500),
    };
    const { data: row, error } = await createAdminClient()
      .from("notes")
      .insert({
        id: note.id,
        author_id: note.authorId,
        author_name: note.authorName,
        role: note.role,
        message: note.message,
      })
      .select("id,author_id,author_name,role,message,created_at")
      .single<NoteRow>();
    if (error || !row) throw new Error(error?.message || "Unable to post message.");
    return noteFromRow(row);
  }
  return mutateStore((store) => {
    const note: Note = {
      id: nextId("note"),
      authorId: requireText(data.authorId, "Author", 100),
      authorName: requireText(data.authorName, "Author name", 80),
      role: requireText(data.role, "Role", 30),
      message: requireText(data.message, "Message", 500),
      createdAt: new Date().toISOString(),
    };
    store.notes.unshift(note);
    return note;
  });
}
