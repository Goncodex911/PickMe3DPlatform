"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  NotificationItem,
  fetchNotificationsApi,
  fetchUnreadCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "@/lib/notificationService";

const NOTIFICATION_ICONS: Record<string, string> = {
  like: "favorite",
  fork: "content_copy",
  review: "star",
  comment: "chat_bubble",
  reply: "reply",
};

const NOTIFICATION_COLORS: Record<string, string> = {
  like: "text-rose-400",
  fork: "text-emerald-400",
  review: "text-amber-400",
  comment: "text-blue-400",
  reply: "text-purple-400",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-US");
}

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isLoggedIn =
    typeof window !== "undefined" && !!localStorage.getItem("pickme3d_token");

  // Fetch unread count on mount and periodically
  const refreshUnreadCount = useCallback(async () => {
    if (!isLoggedIn) return;
    const count = await fetchUnreadCountApi();
    setUnreadCount(count);
  }, [isLoggedIn]);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30_000); // Poll every 30s
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setLoading(true);
      const result = await fetchNotificationsApi({ limit: 20 });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadApi();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markNotificationReadApi(notification._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className={`relative ${className || ""}`} ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <span className="material-symbols-rounded text-[22px] text-slate-300">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-lg animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] overflow-hidden rounded-xl bg-[#0e1422] border border-white/10 shadow-2xl z-50 flex flex-col"
          style={{ animation: "slideInRight 0.2s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-base">notifications</span>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-red-400 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <span className="material-symbols-rounded text-3xl text-slate-600 block mb-2">
                  notifications_off
                </span>
                <p className="text-xs text-slate-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleMarkRead(notif)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${
                    !notif.isRead ? "bg-blue-500/5" : ""
                  }`}
                >
                  {/* Actor avatar */}
                  <div className="relative shrink-0">
                    {notif.actor?.picture ? (
                      <img
                        src={notif.actor.picture}
                        alt={notif.actor.name}
                        className="w-9 h-9 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[11px] text-slate-300 font-bold">
                        {notif.actor?.name?.[0] || "?"}
                      </div>
                    )}
                    {/* Type icon badge */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0e1422] border border-white/10 flex items-center justify-center`}
                    >
                      <span
                        className={`material-symbols-rounded text-[10px] ${
                          NOTIFICATION_COLORS[notif.type] || "text-slate-400"
                        }`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {NOTIFICATION_ICONS[notif.type] || "info"}
                      </span>
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
