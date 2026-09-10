import { redirect } from "next/navigation";

// middleware already redirects, this is a safety net
export default function RootPage() {
  redirect("/zh-CN");
}
