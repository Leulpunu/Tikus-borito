export type Role = "Manager" | "Waiter" | "Kitchen" | "Cashier";

export function canManageProducts(role: Role) {
  return role === "Manager";
}

export function canCreateOrders(role: Role) {
  return role === "Manager" || role === "Waiter";
}

export function canMarkPayment(role: Role) {
  return role === "Manager" || role === "Cashier";
}

export function canManageOrders(role: Role) {
  return role === "Manager";
}

export function canUpdateOrderStatus(role: Role) {
  return role === "Manager" || role === "Kitchen";
}

export function canDeleteProduct(role: Role) {
  return role === "Manager";
}
