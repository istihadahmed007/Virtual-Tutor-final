import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  User,
  Phone,
  MessageSquare,
  Sparkles,
  Inbox,
  AlertCircle,
  Tag,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface AdminContactInquiriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ContactInquiryItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  category: string;
  subject: string;
  message: string;
  status: "new" | "read" | "in_progress" | "resolved" | "archived";
  createdAt: number;
  adminNotes?: string;
  resolvedAt?: number;
}

export function AdminContactInquiriesModal({
  open,
  onOpenChange,
}: AdminContactInquiriesModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiryItem | null>(null);

  // Queries & Mutations
  const inquiries = useQuery((api as any).contact?.listInquiries || (api as any).teachers?.list, {}) as ContactInquiryItem[] | undefined;
  const updateStatusMutation = useMutation((api as any).contact?.updateInquiryStatus || (api as any).teachers?.submitApplication);

  const filteredInquiries: ContactInquiryItem[] = (inquiries || []).filter((inq: ContactInquiryItem) => {
    const matchesStatus =
      selectedStatus === "all" ? true : inq.status === selectedStatus;
    const matchesSearch =
      searchQuery.trim() === ""
        ? true
        : inq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inq.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inq.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inq.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = async (
    inquiryId: any,
    newStatus: "new" | "read" | "in_progress" | "resolved" | "archived"
  ) => {
    try {
      await updateStatusMutation({
        inquiryId,
        status: newStatus,
      });
      toast.success(`Inquiry marked as ${newStatus.replace("_", " ")}`);
      if (selectedInquiry?._id === inquiryId) {
        setSelectedInquiry((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            New
          </span>
        );
      case "read":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Read
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
            Resolved
          </span>
        );
      case "archived":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-3xl border border-stone-200 shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Contact Messages & Inquiries
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Target Admin Mailboxes: istihadahmed1163@gmail.com, info@vartualtutor.com
              </DialogDescription>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Total Inquiries: <strong className="text-white">{inquiries?.length ?? 0}</strong>
          </div>
        </div>

        {/* Content Body: Two Pane Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 h-[600px]">
          {/* Left List Pane */}
          <div className="md:col-span-5 border-r border-stone-200 flex flex-col bg-stone-50/50">
            {/* Search & Filters */}
            <div className="p-3 border-b border-stone-200 space-y-2 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search sender, email, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs rounded-xl bg-stone-50 border-stone-200"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1">
                {["all", "new", "in_progress", "resolved", "archived"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedStatus === st
                        ? "bg-teal-600 text-white"
                        : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                    }`}
                  >
                    {st === "all" ? "All" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-200">
              {filteredInquiries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No contact messages found.
                </div>
              ) : (
                filteredInquiries.map((inq: ContactInquiryItem) => (
                  <button
                    key={inq._id}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      if (inq.status === "new") {
                        handleUpdateStatus(inq._id, "read");
                      }
                    }}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                      selectedInquiry?._id === inq._id
                        ? "bg-teal-50/80 border-l-4 border-l-teal-600"
                        : "hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {inq.name}
                      </span>
                      {getStatusBadge(inq.status)}
                    </div>
                    <div className="text-xs font-medium text-slate-700 truncate">
                      {inq.subject}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{inq.category}</span>
                      <span>{new Date(inq.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Detail Pane */}
          <div className="md:col-span-7 flex flex-col bg-white overflow-y-auto p-6">
            {selectedInquiry ? (
              <div className="space-y-5">
                {/* Header detail */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedInquiry.subject}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {selectedInquiry.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(selectedInquiry.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>{getStatusBadge(selectedInquiry.status)}</div>
                </div>

                {/* Sender Info Card */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <User className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-bold">{selectedInquiry.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                    <a
                      href={`mailto:${selectedInquiry.email}`}
                      className="text-teal-700 hover:underline font-medium"
                    >
                      {selectedInquiry.email}
                    </a>
                  </div>
                  {selectedInquiry.phone && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{selectedInquiry.phone}</span>
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Message Body
                  </label>
                  <div className="p-4 rounded-2xl bg-[#FAFAF8] border border-stone-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {selectedInquiry.message}
                  </div>
                </div>

                {/* Action Controls */}
                <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center gap-2">
                  <a
                    href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(
                      "Re: " + selectedInquiry.subject
                    )}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> Reply to Sender
                  </a>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleUpdateStatus(selectedInquiry._id, "in_progress")
                    }
                    className="text-xs rounded-xl"
                  >
                    Mark In Progress
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleUpdateStatus(selectedInquiry._id, "resolved")
                    }
                    className="text-xs text-teal-700 border-teal-300 rounded-xl"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleUpdateStatus(selectedInquiry._id, "archived")
                    }
                    className="text-xs text-slate-500 rounded-xl"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">
                  Select a Contact Message
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Click on any contact submission from the left pane to view full sender details, reply, or update status.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
