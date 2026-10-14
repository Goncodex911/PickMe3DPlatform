"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CommentItem,
  fetchCommentsApi,
  fetchRepliesApi,
  createCommentApi,
  toggleLikeCommentApi,
  deleteCommentApi,
} from "@/lib/commentService";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

/* ── Single Comment Item ── */
interface CommentItemViewProps {
  comment: CommentItem;
  templateId: string;
  currentUserId?: string;
  depth?: number;
  onCommentDeleted: (id: string) => void;
}

function CommentItemView({
  comment,
  templateId,
  currentUserId,
  depth = 0,
  onCommentDeleted,
}: CommentItemViewProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => {
    if (currentUserId && comment.likedBy) {
      setLiked(comment.likedBy.includes(currentUserId));
    }
  }, [currentUserId, comment.likedBy]);

  const handleLike = async () => {
    const result = await toggleLikeCommentApi(comment._id);
    if (result.success) {
      setLiked(result.liked || false);
      setLikesCount(result.likesCount || 0);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    const result = await createCommentApi(templateId, replyText.trim(), comment._id);
    if (result.success && result.data) {
      setReplies((prev) => [...prev, result.data!]);
      setReplyText("");
      setShowReplyForm(false);
      setShowReplies(true);
    }
    setReplying(false);
  };

  const handleLoadReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    setLoadingReplies(true);
    const data = await fetchRepliesApi(comment._id);
    setReplies(data);
    setShowReplies(true);
    setLoadingReplies(false);
  };

  const handleDelete = async () => {
    const ok = await deleteCommentApi(comment._id);
    if (ok) onCommentDeleted(comment._id);
  };

  const isOwn = currentUserId === comment.user;
  const replyCount = comment.replyCount || 0;

  return (
    <div className={`${depth > 0 ? "ml-10 mt-2" : "mt-4"}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {comment.userAvatar ? (
          <img
            src={comment.userAvatar}
            alt={comment.userName}
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] text-slate-300 font-bold shrink-0">
            {comment.userName?.[0] || "?"}
          </div>
        )}

        {/* Comment body */}
        <div className="flex-1 min-w-0">
          <div className="bg-white/5 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white">{comment.userName}</span>
              <span className="text-[10px] text-slate-500">{timeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-1.5 ml-1">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-[11px] transition-colors ${
                liked ? "text-rose-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span
                className="material-symbols-rounded text-xs"
                style={liked ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                favorite
              </span>
              <span>{likesCount > 0 ? likesCount : "Thích"}</span>
            </button>

            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span className="material-symbols-rounded text-xs">reply</span>
              <span>Trả lời</span>
            </button>

            {isOwn && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-400 transition-colors"
              >
                <span className="material-symbols-rounded text-xs">delete</span>
                <span>Xóa</span>
              </button>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <div className="flex items-start gap-2 mt-2 ml-1">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
                placeholder="Viết câu trả lời..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition-colors"
                disabled={replying}
              />
              <button
                onClick={handleReply}
                disabled={replying || !replyText.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {replying ? "..." : "Gửi"}
              </button>
            </div>
          )}

          {/* View replies button */}
          {depth === 0 && replyCount > 0 && (
            <button
              onClick={handleLoadReplies}
              className="flex items-center gap-1 mt-2 ml-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              <span className="material-symbols-rounded text-xs">
                {showReplies ? "expand_less" : "expand_more"}
              </span>
              {showReplies
                ? "Ẩn câu trả lời"
                : `Xem ${replyCount} câu trả lời`}
            </button>
          )}

          {/* Replies */}
          {loadingReplies && (
            <div className="ml-10 mt-2 text-[11px] text-slate-500">Đang tải...</div>
          )}
          {showReplies &&
            replies.map((reply) => (
              <CommentItemView
                key={reply._id}
                comment={reply}
                templateId={templateId}
                currentUserId={currentUserId}
                depth={1}
                onCommentDeleted={(id) =>
                  setReplies((prev) => prev.filter((r) => r._id !== id))
                }
              />
            ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Comment Thread Component ── */
interface CommentThreadProps {
  templateId: string;
}

export default function CommentThread({ templateId }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const userStr =
    typeof window !== "undefined" ? localStorage.getItem("pickme3d_user") : null;
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currentUserId = currentUser?.id;
  const isLoggedIn =
    typeof window !== "undefined" && !!localStorage.getItem("pickme3d_token");

  const loadComments = useCallback(
    async (p: number = 1) => {
      setLoading(true);
      const result = await fetchCommentsApi(templateId, { page: p, limit: 10 });
      if (p === 1) {
        setComments(result.comments);
      } else {
        setComments((prev) => [...prev, ...result.comments]);
      }
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setLoading(false);
    },
    [templateId]
  );

  useEffect(() => {
    loadComments(1);
  }, [loadComments]);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    const result = await createCommentApi(templateId, newComment.trim());
    if (result.success && result.data) {
      setComments((prev) => [result.data!, ...prev]);
      setTotal((prev) => prev + 1);
      setNewComment("");
    }
    setPosting(false);
  };

  const handleCommentDeleted = (id: string) => {
    setComments((prev) => prev.filter((c) => c._id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-rounded text-base text-blue-400">chat_bubble</span>
        <h3 className="text-sm font-semibold text-white">
          Bình luận{total > 0 ? ` (${total})` : ""}
        </h3>
      </div>

      {/* New comment form */}
      {isLoggedIn ? (
        <div className="flex items-start gap-3 mb-4">
          {currentUser?.picture ? (
            <img
              src={currentUser.picture}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] text-slate-300 font-bold shrink-0">
              {currentUser?.name?.[0] || "?"}
            </div>
          )}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePost()}
              placeholder="Viết bình luận..."
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition-colors"
              disabled={posting}
            />
            <button
              onClick={handlePost}
              disabled={posting || !newComment.trim()}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {posting ? "Đang gửi..." : "Gửi"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 mb-4 px-2 py-3 bg-white/5 rounded-lg text-center">
          Vui lòng đăng nhập để bình luận.
        </p>
      )}

      {/* Comments list */}
      {loading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center">
          <span className="material-symbols-rounded text-2xl text-slate-600 block mb-1">
            forum
          </span>
          <p className="text-xs text-slate-500">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <>
          {comments.map((comment) => (
            <CommentItemView
              key={comment._id}
              comment={comment}
              templateId={templateId}
              currentUserId={currentUserId}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}

          {/* Load more */}
          {page < totalPages && (
            <div className="text-center mt-4">
              <button
                onClick={() => loadComments(page + 1)}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {loading ? "Đang tải..." : "Xem thêm bình luận"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
