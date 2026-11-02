import { authHeaders } from "./paymentService";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
export interface FollowState { following: boolean; followersCount: number }
export interface ActivityItem {
  _id: string; title: string; thumbnailUrl: string; createdAt: string;
  creator: { name: string; username?: string; picture?: string };
}
async function request(path: string, method = "GET") {
  const res = await fetch(`${API}/users/${path}`, { method, headers: authHeaders(), cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || json.error || "Không thể tải dữ liệu. Vui lòng đăng nhập và thử lại.");
  return json;
}
export async function getFollow(id: string): Promise<FollowState> { return (await request(`${id}/follow`)).data; }
export async function setFollow(id: string, following: boolean): Promise<FollowState> {
  return (await request(`${id}/follow`, following ? "PUT" : "DELETE")).data;
}
export async function getActivity(page: number): Promise<{ data: ActivityItem[]; hasMore: boolean }> {
  return request(`activity?page=${page}`);
}
