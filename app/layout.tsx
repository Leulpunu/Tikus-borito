import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UserRoleProvider } from "@/components/UserRoleProvider";
import AppHeader from "@/components/AppHeader";

export const metadata: Metadata = {
  title: { default: "Tikus Borito", template: "%s · Tikus Borito" },
  description: "Inventory, orders, payments, reports, and team operations for Tikus Borito.",
};

export const viewport: Viewport = { themeColor: "#7c4a21" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserRoleProvider>
          <AppHeader />
          {children}
        </UserRoleProvider>
      </body>
    </html>
  );
}
