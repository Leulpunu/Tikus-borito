import type { Role } from "@/lib/permissions";

export type TeamMember = {
  id: string;
  name: string;
  role: Role;
  area: string;
  email: string;
  initials: string;
  color: string;
};

export function getTeam(): TeamMember[] {
  return [
    {
      id: "team-manager",
      name: "Manager",
      role: "Manager",
      area: "Operations",
      email: "manager@tikusborito.local",
      initials: "M",
      color: "#2563eb",
    },
    {
      id: "team-waiter",
      name: "Waiter",
      role: "Waiter",
      area: "Floor Service",
      email: "waiter@tikusborito.local",
      initials: "W",
      color: "#fb923c",
    },
    {
      id: "team-kitchen",
      name: "Kitchen",
      role: "Kitchen",
      area: "Food Prep",
      email: "kitchen@tikusborito.local",
      initials: "K",
      color: "#22c55e",
    },
    {
      id: "team-cashier",
      name: "Cashier",
      role: "Cashier",
      area: "Billing",
      email: "cashier@tikusborito.local",
      initials: "C",
      color: "#8b5cf6",
    },
  ];
}
