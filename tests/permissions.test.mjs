import test from "node:test";
import assert from "node:assert/strict";
import {
  canCreateOrders,
  canManageOrders,
  canManageProducts,
  canMarkPayment,
  canUpdateOrderStatus,
} from "../lib/permissions.ts";

test("manager has every operational capability", () => {
  assert.equal(canManageProducts("Manager"), true);
  assert.equal(canCreateOrders("Manager"), true);
  assert.equal(canManageOrders("Manager"), true);
  assert.equal(canMarkPayment("Manager"), true);
  assert.equal(canUpdateOrderStatus("Manager"), true);
});

test("staff roles remain limited to their responsibilities", () => {
  assert.equal(canCreateOrders("Waiter"), true);
  assert.equal(canManageProducts("Waiter"), false);
  assert.equal(canUpdateOrderStatus("Kitchen"), true);
  assert.equal(canMarkPayment("Kitchen"), false);
  assert.equal(canMarkPayment("Cashier"), true);
  assert.equal(canManageOrders("Cashier"), false);
});
