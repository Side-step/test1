import { requireAdmin } from "@/lib/admin";
import AdminShell from "./AdminShell";

export const metadata = {
  title: "S2E Admin Panel",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 서버 사이드 권한 체크: admin이 아니면 /home으로 리다이렉트
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}
