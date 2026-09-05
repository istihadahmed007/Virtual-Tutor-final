import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Shield,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PenTool,
  Lock,
  Unlock,
  UserX,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  History,
  Users,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { ParticipantPresence } from "./ClassroomVideoGrid";

interface ClassroomHostControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  isLocked: boolean;
  allowAnnotation: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowFileUpload: boolean;
  participants: ParticipantPresence[];
  attendanceRecords: any[];
  auditLogs: any[];
  onToggleLock: (locked: boolean) => void;
  onToggleAnnotation: (allowed: boolean) => void;
  onToggleScreenShare: (allowed: boolean) => void;
  onToggleChat: (allowed: boolean) => void;
  onToggleFileUpload: (allowed: boolean) => void;
  onManageParticipant: (
    targetUserId: string,
    action:
      | "mute"
      | "unmute"
      | "disable_cam"
      | "allow_cam"
      | "grant_annotate"
      | "revoke_annotate"
      | "grant_screen"
      | "revoke_screen"
      | "remove_participant",
  ) => void;
  onMuteAll: () => void;
  onDisableAllCams: () => void;
  onUpdateAttendance: (attendanceId: string, status: "present" | "late" | "absent", notes?: string) => void;
  onFinalizeAttendance: () => void;
}

export function ClassroomHostControlsModal({
  isOpen,
  onClose,
  sessionId,
  isLocked,
  allowAnnotation,
  allowScreenShare,
  allowChat,
  allowFileUpload,
  participants,
  attendanceRecords,
  auditLogs,
  onToggleLock,
  onToggleAnnotation,
  onToggleScreenShare,
  onToggleChat,
  onToggleFileUpload,
  onManageParticipant,
  onMuteAll,
  onDisableAllCams,
  onUpdateAttendance,
  onFinalizeAttendance,
}: ClassroomHostControlsModalProps) {
  const [activeTab, setActiveTab] = useState<"permissions" | "participants" | "attendance" | "audit">("permissions");

  if (!isOpen) return null;

  const students = participants.filter((p) => p.role === "student");

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Teacher Host Controls</h2>
              <p className="text-[11px] text-slate-400">Classroom permissions, moderation & attendance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/60 px-5 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold">
          {[
            { id: "permissions" as const, label: "Room Permissions", icon: Settings2 },
            { id: "participants" as const, label: `Students (${students.length})`, icon: Users },
            { id: "attendance" as const, label: "Attendance", icon: FileSpreadsheet },
            { id: "audit" as const, label: "Audit Log", icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-teal-500 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. ROOM PERMISSIONS */}
          {activeTab === "permissions" && (
            <div className="space-y-4">
              {/* Lock Classroom */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isLocked ? "bg-red-500/20 text-red-400" : "bg-slate-800 text-slate-400"}`}>
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Lock Classroom</p>
                    <p className="text-[11px] text-slate-400">Prevent new students from entering without approval</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onToggleLock(!isLocked)}
                  className={`text-xs h-7 px-3 rounded-lg ${
                    isLocked ? "bg-red-600 hover:bg-red-700 text-white" : "bg-slate-800 border border-slate-700 text-slate-300"
                  }`}
                >
                  {isLocked ? "Locked" : "Unlock"}
                </Button>
              </div>

              {/* Student Whiteboard Annotation */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${allowAnnotation ? "bg-teal-500/20 text-teal-400" : "bg-slate-800 text-slate-400"}`}>
                    <PenTool className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Allow Student Whiteboard Annotation</p>
                    <p className="text-[11px] text-slate-400">Default OFF. When enabled, students can write & draw on board</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onToggleAnnotation(!allowAnnotation)}
                  className={`text-xs h-7 px-3 rounded-lg ${
                    allowAnnotation ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-slate-800 border border-slate-700 text-slate-300"
                  }`}
                >
                  {allowAnnotation ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {/* Student Screen Sharing */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${allowScreenShare ? "bg-teal-500/20 text-teal-400" : "bg-slate-800 text-slate-400"}`}>
                    <MonitorUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Allow Student Screen Sharing</p>
                    <p className="text-[11px] text-slate-400">Default OFF. Permit learners to broadcast desktop display</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onToggleScreenShare(!allowScreenShare)}
                  className={`text-xs h-7 px-3 rounded-lg ${
                    allowScreenShare ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-slate-800 border border-slate-700 text-slate-300"
                  }`}
                >
                  {allowScreenShare ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {/* Student Chat Access */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Classroom Chat Stream</p>
                  <p className="text-[11px] text-slate-400">Allow student text messages in live chat</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onToggleChat(!allowChat)}
                  className={`text-xs h-7 px-3 rounded-lg ${
                    allowChat ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-slate-800 border border-slate-700 text-slate-300"
                  }`}
                >
                  {allowChat ? "Allowed" : "Restricted"}
                </Button>
              </div>

              {/* Batch Actions */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMuteAll}
                  className="flex-1 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-8 gap-1.5"
                >
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                  <span>Mute All Students</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDisableAllCams}
                  className="flex-1 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-8 gap-1.5"
                >
                  <VideoOff className="w-3.5 h-3.5 text-red-400" />
                  <span>Disable All Video</span>
                </Button>
              </div>
            </div>
          )}

          {/* 2. INDIVIDUAL PARTICIPANT MODERATION */}
          {activeTab === "participants" && (
            <div className="space-y-3">
              {students.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                  No students currently connected to this session.
                </div>
              ) : (
                students.map((student) => (
                  <div
                    key={student.userId}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center font-bold text-xs text-white">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{student.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className={student.micOn ? "text-emerald-400 font-medium" : "text-slate-500"}>
                            {student.micOn ? "Mic On" : "Muted"}
                          </span>
                          <span>·</span>
                          <span className={student.camOn ? "text-emerald-400 font-medium" : "text-slate-500"}>
                            {student.camOn ? "Cam On" : "Cam Off"}
                          </span>
                          {student.canAnnotate && (
                            <>
                              <span>·</span>
                              <span className="text-teal-400 font-semibold">Annotation OK</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Moderation Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Mute / Unmute */}
                      <button
                        onClick={() =>
                          onManageParticipant(student.userId, student.micOn ? "mute" : "unmute")
                        }
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          student.micOn
                            ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-red-400"
                            : "bg-red-500/20 border-red-500/30 text-red-400"
                        }`}
                        title={student.micOn ? "Mute student" : "Allow microphone"}
                      >
                        {student.micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Video On/Off */}
                      <button
                        onClick={() =>
                          onManageParticipant(student.userId, student.camOn ? "disable_cam" : "allow_cam")
                        }
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          student.camOn
                            ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-red-400"
                            : "bg-slate-800 border-slate-700 text-slate-500"
                        }`}
                        title={student.camOn ? "Disable camera" : "Allow camera"}
                      >
                        {student.camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Annotation Grant/Revoke */}
                      <button
                        onClick={() =>
                          onManageParticipant(
                            student.userId,
                            student.canAnnotate ? "revoke_annotate" : "grant_annotate",
                          )
                        }
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          student.canAnnotate
                            ? "bg-teal-500/20 border-teal-500/30 text-teal-400"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:text-teal-400"
                        }`}
                        title={student.canAnnotate ? "Revoke whiteboard drawing" : "Grant whiteboard drawing"}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove / Kick */}
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${student.name} from the classroom?`)) {
                            onManageParticipant(student.userId, "remove_participant");
                          }
                        }}
                        className="p-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
                        title="Remove student from session"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. ATTENDANCE ROSTER */}
          {activeTab === "attendance" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Track and finalize student attendance for records & compliance.</p>
                <Button
                  size="sm"
                  onClick={onFinalizeAttendance}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-3 rounded-lg"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Finalize Roster
                </Button>
              </div>

              {attendanceRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                  No attendance records logged yet.
                </div>
              ) : (
                attendanceRecords.map((att) => (
                  <div
                    key={att._id}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{att.studentName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Joined: {new Date(att.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {att.isFinalized && <span className="text-emerald-400 font-semibold">(Finalized)</span>}
                      </div>
                    </div>

                    {/* Status Toggles */}
                    <div className="flex items-center gap-1">
                      {(["present", "late", "absent"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => onUpdateAttendance(att._id, st)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                            att.status === st
                              ? st === "present"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : st === "late"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 4. AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-2">Immutable timeline of host commands and classroom events.</p>
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                  No audit logs recorded yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-teal-400 text-[11px]">{log.action}</span>
                        <span className="text-[10px] text-slate-500">by {log.actorName}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] mt-0.5">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex justify-end">
          <Button onClick={onClose} size="sm" className="bg-slate-800 hover:bg-slate-700 text-white text-xs">
            Close Panel
          </Button>
        </div>
      </div>
    </div>
  );
}
