import { useState, useMemo, useEffect } from "react";

// ─── BU Hub Curriculum Requirements ───────────────────────────────────────────
// Each entry maps a Hub code to its display label, category, and badge color.
// Categories are used to group checkboxes in the HUB Finder sidebar.
const HUB_REQUIREMENTS = [
  { code: "HUB-PLM", label: "Philosophical Inquiry and Life's Meanings", category: "Philosophical, Aesthetic & Historical Interpretation", color: "#3b82f6" },
  { code: "HUB-AEX", label: "Aesthetic Exploration", category: "Philosophical, Aesthetic & Historical Interpretation", color: "#3b82f6" },
  { code: "HUB-HCO", label: "Historical Consciousness", category: "Philosophical, Aesthetic & Historical Interpretation", color: "#3b82f6" },
  { code: "HUB-SI1", label: "Scientific Inquiry I", category: "Scientific & Social Inquiry", color: "#22c55e" },
  { code: "HUB-SI2", label: "Scientific Inquiry II", category: "Scientific & Social Inquiry", color: "#22c55e" },
  { code: "HUB-SO1", label: "Social Inquiry I", category: "Scientific & Social Inquiry", color: "#22c55e" },
  { code: "HUB-SO2", label: "Social Inquiry II", category: "Scientific & Social Inquiry", color: "#22c55e" },
  { code: "HUB-QR1", label: "Quantitative Reasoning I", category: "Quantitative Reasoning", color: "#f59e0b" },
  { code: "HUB-QR2", label: "Quantitative Reasoning II", category: "Quantitative Reasoning", color: "#f59e0b" },
  { code: "HUB-IIC", label: "The Individual in Community", category: "Diversity, Civic Engagement & Global Citizenship", color: "#ec4899" },
  { code: "HUB-GCI", label: "Global Citizenship & Intercultural Literacy", category: "Diversity, Civic Engagement & Global Citizenship", color: "#ec4899" },
  { code: "HUB-ETR", label: "Ethical Reasoning", category: "Diversity, Civic Engagement & Global Citizenship", color: "#ec4899" },
  { code: "HUB-FYW", label: "First-Year Writing Seminar", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-WRI", label: "Writing, Research, and Inquiry", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-WIN", label: "Writing-Intensive Course", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-OSC", label: "Oral and/or Signed Communication", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-DME", label: "Digital/Multimedia Expression", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-CRT", label: "Critical Thinking", category: "Intellectual Toolkit", color: "#6366f1" },
  { code: "HUB-RIL", label: "Research and Information Literacy", category: "Intellectual Toolkit", color: "#6366f1" },
  { code: "HUB-TWC", label: "Teamwork/Collaboration", category: "Intellectual Toolkit", color: "#6366f1" },
  { code: "HUB-CRI", label: "Creativity/Innovation", category: "Intellectual Toolkit", color: "#6366f1" },
];

// O(1) lookup from Hub code → Hub metadata (avoids linear scans in render loops).
const HUB_MAP = Object.fromEntries(HUB_REQUIREMENTS.map((h) => [h.code, h]));

// Pre-group Hubs by category so the sidebar can render one section per category
// without recomputing this structure on every render.
const HUB_BY_CATEGORY = HUB_REQUIREMENTS.reduce((acc, hub) => {
  if (!acc[hub.category]) acc[hub.category] = [];
  acc[hub.category].push(hub);
  return acc;
}, {});

// The calendar grid covers Mon–Fri, 7 AM – 10 PM (hours 7–22).
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

// Rotating palette used to distinguish courses on the calendar.
// Each entry has a light background, a saturated border, and a dark text color.
const SECTION_COLORS = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" },
  { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
  { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
];

// ─── Utility Functions ─────────────────────────────────────────────────────────

// Converts "HH:MM" strings to total minutes since midnight for arithmetic comparisons.
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Formats an integer hour (e.g., 13) into a readable label (e.g., "1 PM").
function fmtHour(h) {
  if (h === 12) return "12 PM";
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

// Returns the meeting object from a section that falls on the given day, or null.
function meetingForDay(section, day) {
  return (section.meetings ?? []).find((m) => m.days.includes(day)) ?? null;
}

// Returns all days a section meets across all its meetings.
function allDaysForSection(section) {
  return (section.meetings ?? []).flatMap((m) => m.days);
}

// Checks whether newSection overlaps with any section already on the schedule.
// Uses the standard interval-overlap test: two intervals [aStart,aEnd) and
// [bStart,bEnd) overlap iff aStart < bEnd && bStart < aEnd.
function hasConflict(existing, newSection) {
  for (const { section } of existing) {
    for (const aMeeting of (section.meetings ?? [])) {
      for (const bMeeting of (newSection.meetings ?? [])) {
        const sharedDay = aMeeting.days.some((d) => bMeeting.days.includes(d));
        if (!sharedDay) continue;
        const aStart = timeToMinutes(aMeeting.startTime);
        const aEnd   = timeToMinutes(aMeeting.endTime);
        const bStart = timeToMinutes(bMeeting.startTime);
        const bEnd   = timeToMinutes(bMeeting.endTime);
        if (aStart < bEnd && bStart < aEnd) return true;
      }
    }
  }
  return false;
}

// Groups preview sections that share the same time slot into a single calendar block.
// The key includes section.type so Lecture and Discussion at the same time each get
// their own block and dropdown rather than being merged together.
function groupPreviewsBySlot(previewsForDay) {
  const groups = {};
  for (const ps of previewsForDay) {
    const m = ps.meeting ?? ps.section.meetings?.[0];
    const key = `${ps.courseId}|${ps.section.type}|${m?.startTime}|${m?.endTime}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ps);
  }
  return Object.values(groups);
}

// ─── NavBar ────────────────────────────────────────────────────────────────────
// Top navigation bar with the BU logo, app title, and a page switcher dropdown.
function NavBar({ page, onPageChange }) {
  return (
    <div style={{
      height: 48, background: "#fff", borderBottom: "1px solid #e5e7eb",
      display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
      flexShrink: 0, zIndex: 10,
    }}>
      {/* BU logo badge */}
      <div style={{
        background: "#cc0000", color: "#fff", borderRadius: 6,
        width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>BU</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Schedule Builder
        <div style={{ fontSize: 11, fontWeight: 500, color: "#575656" }}>Fall 2026</div>
      </div>
      {/* Vertical divider */}
      <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />
      {/* Page switcher — drives the top-level view in BUScheduleBuilder */}
      <select
        value={page}
        onChange={(e) => onPageChange(e.target.value)}
        style={{
          padding: "4px 8px", fontSize: 12, border: "1px solid #e5e7eb",
          borderRadius: 6, background: "#fff", cursor: "pointer", color: "#374151", outline: "none",
        }}
      >
        <option value="schedule">📅  Schedule Builder</option>
        <option value="hub">🎓  HUB Finder</option>
      </select>
    </div>
  );
}

// ─── CourseCard ────────────────────────────────────────────────────────────────
// Sidebar card for a single course. Shows course metadata and one button per
// section. Clicking the card header enters "preview" mode, which shows ghost
// blocks on the calendar for all unselected sections of this course.
//
// Props:
//   course           – course object from the API
//   selectedSections – map of courseId → [sectionId, ...]
//   colorMap         – map of courseId → SECTION_COLORS entry
//   onToggleSection  – callback(course, section) to add/remove a section
//   previewCourseId  – the course currently being previewed (or null)
//   onPreviewCourse  – callback(courseId | null) to enter/exit preview mode
function CourseCard({ course, selectedSections, colorMap, onToggleSection, previewCourseId, onPreviewCourse }) {
  const color = colorMap[course.id];
  const selected = selectedSections[course.id] ?? [];
  const isAnySelected = selected.length > 0;

  // Determine which section *types* (Lecture, Discussion, Lab…) exist and which
  // have been selected, so we can warn when a type is still missing.
  const allTypes = new Set(course.sections.map((s) => s.type));
  const selectedTypes = new Set(
    course.sections.filter((s) => selected.includes(s.sectionId)).map((s) => s.type)
  );
  // allTypesCovered is true when every required type has at least one selected section.
  const allTypesCovered = isAnySelected && allTypes.size === selectedTypes.size;
  // Preview mode is active for this card only when the course is being previewed
  // AND there are still uncovered section types to pick.
  const isPreviewing = previewCourseId === course.id && !allTypesCovered;

  return (
    <div style={{
      border: `1.5px solid ${isPreviewing ? color?.border ?? "#6366f1" : isAnySelected ? color?.border ?? "#d1d5db" : "#e5e7eb"}`,
      borderRadius: 10, marginBottom: 10, overflow: "hidden",
      background: isAnySelected ? color?.bg ?? "#fff" : "#fff",
      transition: "border-color 0.15s, box-shadow 0.15s",
      boxShadow: isPreviewing ? `0 0 0 2px ${(color?.border ?? "#6366f1")}33` : "none",
    }}>
      {/* Card header — click to toggle preview mode for this course */}
      <div
        onClick={() => {
          // Once all types are covered, clicking the header does nothing.
          if (allTypesCovered && !isPreviewing) return;
          onPreviewCourse(isPreviewing ? null : course.id);
        }}
        style={{
          padding: "10px 12px", cursor: allTypesCovered ? "default" : "pointer",
          transition: "background 0.12s",
          background: isPreviewing ? `${color?.border ?? "#6366f1"}11` : "transparent",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{course.code}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* "Preview" badge shown when ghost blocks are active on the calendar */}
            {isPreviewing && (
              <span style={{
                fontSize: 9, fontWeight: 600, color: color?.border ?? "#6366f1",
                background: `${color?.border ?? "#6366f1"}18`,
                padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em",
              }}>Preview</span>
            )}
            <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 4, padding: "2px 6px" }}>{course.credits} cr</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#374151", marginTop: 2, lineHeight: 1.4 }}>{course.name}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{course.college}</div>
      </div>

      {/* Section list — one button per section */}
      <div style={{ borderTop: "1px solid #f3f4f6" }}>
        {course.sections.map((sec) => {
          const isSelected = selected.includes(sec.sectionId);
          // isMissing: another section type is selected but this type isn't — show warning.
          const isMissing = isAnySelected && !selectedTypes.has(sec.type) && !isSelected;
          // isDisabled: a different section of the same type is already selected.
          const isDisabled = !isSelected && selectedTypes.has(sec.type);
          return (
            <button
              key={sec.sectionId}
              onClick={() => { if (!isDisabled) onToggleSection(course, sec); }}
              style={{
                display: "flex", width: "100%", alignItems: "center",
                justifyContent: "space-between", padding: "7px 12px",
                background: isSelected ? color?.bg ?? "#eff6ff" : isMissing ? "#fff7ed" : "transparent",
                border: "none", borderBottom: "1px solid #f9fafb",
                cursor: isDisabled ? "default" : "pointer", textAlign: "left", gap: 8,
                transition: "background 0.12s, opacity 0.15s",
                opacity: isDisabled ? 0.4 : 1,
                pointerEvents: isDisabled ? "none" : "auto",
              }}
            >
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? color?.text : isDisabled ? "#9ca3af" : "#374151" }}>
                  {sec.type} {sec.sectionId}{sec.topic ? ` – ${sec.topic}` : ""}
                </span>
                <div style={{ fontSize: 11, color: isDisabled ? "#d1d5db" : "#6b7280", marginTop: 1 }}>
                  {(sec.meetings ?? []).map(m => `${m.days.join("/")} ${m.startTime}–${m.endTime} · ${m.room}`).join(" | ")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Warn when a section type still needs to be chosen */}
                {isMissing && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, color: "#c2410c",
                    background: "#fff7ed", border: "1px solid #fed7aa",
                    padding: "1px 5px", borderRadius: 4, whiteSpace: "nowrap",
                  }}>⚠ Missing</span>
                )}
                {/* Radio-style indicator dot */}
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: `2px solid ${isSelected ? color?.border : isDisabled ? "#e5e7eb" : "#d1d5db"}`,
                  background: isSelected ? color?.border : "transparent", flexShrink: 0,
                }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── WeekGrid ──────────────────────────────────────────────────────────────────
// The main calendar view: a Mon–Fri grid from 7 AM to 10 PM. Renders two layers:
//   1. Confirmed blocks – solid-border cards for sections already on the schedule.
//   2. Preview / ghost blocks – dashed-border cards for sections available to add.
//
// Blocks are positioned with percentage-based top/height derived from minute
// offsets within [gridStart, gridEnd] so the layout scales with the container.
//
// Props:
//   schedule              – array of { courseId, courseCode, section, … } entries
//   colorMap              – map of courseId → SECTION_COLORS entry
//   previewSections       – array of { courseId, courseCode, section } for ghost blocks
//   onAddPreviewSection   – callback(ps) to confirm a previewed section
//   previewCourseId       – which course's ghosts are shown (used to detect clicks on confirmed blocks)
//   onRemovePreviewSection – callback(ps) to deselect a confirmed section while in preview mode
function WeekGrid({ schedule, colorMap, previewSections, onAddPreviewSection, previewCourseId, onRemovePreviewSection }) {
  // Grid covers 7:00 AM (420 min) to 9:00 PM (1260 min) = 840 total minutes.
  const gridStart = 7 * 60;
  const gridEnd = 21 * 60;
  const totalMinutes = gridEnd - gridStart;

  // selectedBlock: the confirmed block currently showing its detail popup.
  const [selectedBlock, setSelectedBlock] = useState(null);
  // openPickerKey: the preview group whose section-picker dropdown is open.
  const [openPickerKey, setOpenPickerKey] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", userSelect: "none" }}>
      {/* Day-of-week header row */}
      <div style={{ display: "grid", gridTemplateColumns: "44px repeat(5, 1fr)", borderBottom: "1px solid #e5e7eb" }}>
        <div />
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#374151", padding: "6px 0" }}>{d}</div>
        ))}
      </div>

      {/* Scrollable grid body */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "44px repeat(5, 1fr)", position: "relative", minHeight: 840, paddingTop: 8 }}>

          {/* Hour labels column */}
          <div style={{ position: "relative" }}>
            {HOURS.map((h) => (
              <div key={h} style={{
                position: "absolute", top: `${((h * 60 - gridStart) / totalMinutes) * 100}%`,
                fontSize: 10, color: "#9ca3af", right: 4, transform: "translateY(-50%)", whiteSpace: "nowrap",
              }}>
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* One column per day */}
          {DAYS.map((day) => (
            <div key={day} style={{ position: "relative", borderLeft: "1px solid #f3f4f6" }}>

              {/* Horizontal hour-divider lines */}
              {HOURS.map((h) => (
                <div key={h} style={{
                  position: "absolute", top: `${((h * 60 - gridStart) / totalMinutes) * 100}%`,
                  left: 0, right: 0, borderTop: "1px solid #f3f4f6", pointerEvents: "none",
                }} />
              ))}

              {/* ── Confirmed section blocks ── */}
              {schedule
                .filter(({ section }) => allDaysForSection(section).includes(day))
                .map((entry) => {
                  const { courseId, courseCode, courseName, credits, instructor, college, section } = entry;
                  const color = colorMap[courseId] ?? SECTION_COLORS[0];
                  const meeting = meetingForDay(section, day) ?? (section.meetings?.[0] ?? {});

                  // Convert start/end times to percentage offsets within the grid.
                  const top = ((timeToMinutes(meeting.startTime) - gridStart) / totalMinutes) * 100;
                  const height = ((timeToMinutes(meeting.endTime) - timeToMinutes(meeting.startTime)) / totalMinutes) * 100;

                  const isSelected = selectedBlock?.courseId === courseId && selectedBlock?.sectionId === section.sectionId && selectedBlock?.day === day;
                  // isHighlighted is true for ALL blocks of the same section across all days,
                  // so the entire section lights up when any one of its blocks is clicked.
                  const isHighlighted = selectedBlock?.courseId === courseId && selectedBlock?.sectionId === section.sectionId;
                  // isPreviewTarget: this block belongs to the course being previewed —
                  // clicking it removes the section instead of opening the detail popup.
                  const isPreviewTarget = previewCourseId === courseId;

                  return (
                    <div key={`${courseId}-${section.sectionId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPreviewTarget) {
                          // In preview mode, click a confirmed block to deselect it.
                          onRemovePreviewSection?.({ courseId, section });
                        } else {
                          setSelectedBlock(isSelected ? null : { courseId, sectionId: section.sectionId, day, type: section.type });
                        }
                      }}
                      style={{
                        position: "absolute", top: `${top}%`, left: 2, right: 2, height: `${height}%`,
                        background: isPreviewTarget ? `${color.bg}cc` : color.bg,
                        border: isPreviewTarget ? `2px dashed ${color.border}` : `1.5px solid ${color.border}`,
                        borderRadius: 6,
                        padding: "3px 5px", overflow: "visible", boxSizing: "border-box",
                        cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
                        boxShadow: isHighlighted ? `0 2px 12px ${color.border}66` : "none",
                        transform: isHighlighted ? "scale(1.02)" : "none",
                        zIndex: isSelected ? 20 : (isHighlighted ? 10 : 1),
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: color.text, lineHeight: 1.3 }}>{courseCode}</div>
                        {isPreviewTarget && (
                          <span style={{ fontSize: 8, color: color.border, opacity: 0.7, fontStyle: "italic" }}>× Remove</span>
                        )}
                      </div>
                      <div style={{ fontSize: 9, color: color.text, opacity: 0.75 }}>{section.type}{section.topic ? ` – ${section.topic}` : ""}</div>
                      <div style={{ fontSize: 9, color: color.text, opacity: 0.65 }}>{meeting.startTime}–{meeting.endTime}</div>

                      {/* Detail popup — shown when this specific block is clicked */}
                      {isSelected && (
                        <div onClick={(e) => e.stopPropagation()} style={{
                          position: "absolute", top: "100%", left: 0, marginTop: 4,
                          width: 220, background: "#fff", borderRadius: 10,
                          border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                          padding: "12px 14px", zIndex: 30,
                        }}>
                          <button
                            onClick={() => setSelectedBlock(null)}
                            style={{
                              position: "absolute", top: 6, right: 8,
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: 14, color: "#9ca3af", lineHeight: 1,
                            }}
                          >×</button>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{courseCode}</div>
                          <div style={{ fontSize: 11, color: "#374151", marginBottom: 8, lineHeight: 1.4 }}>{courseName}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Section</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{section.type} {section.sectionId}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Time</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{meeting.startTime} – {meeting.endTime}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Days</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{meeting.days?.join(", ")}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Room</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{meeting.room}</span>
                            </div>
                            <div style={{ height: 1, background: "#f3f4f6", margin: "2px 0" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Instructor</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{instructor}</span>
                            </div>
                            {section.topic && (
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                <span style={{ color: "#9ca3af" }}>Topic</span>
                                <span style={{ color: "#374151", fontWeight: 500, textAlign: "right", maxWidth: 140 }}>{section.topic}</span>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Credits</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{credits}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>College</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{college}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* ── Preview / ghost blocks ──────────────────────────────────────
                  Ghost blocks represent unselected sections the user can add.
                  Multiple ghost blocks can overlap (e.g., two discussion sections
                  at the same time). The layout algorithm below:
                    1. groupPreviewsBySlot groups blocks by (courseId, type, time).
                    2. A BFS clusters groups that overlap in time.
                    3. Within each cluster, greedy column assignment ensures
                       overlapping blocks are rendered side-by-side without hiding
                       each other. Column widths are expressed as calc() percentages
                       so they work at any container width.
                  When a group contains multiple sections, clicking opens a picker
                  dropdown. When there's only one, clicking adds it immediately. ── */}
              {(() => {
                // Filter and annotate preview sections for this specific day.
                const previewGroupsForDay = groupPreviewsBySlot(
                  (previewSections ?? [])
                    .filter((ps) => allDaysForSection(ps.section).includes(day))
                    .map((ps) => ({ ...ps, meeting: meetingForDay(ps.section, day) ?? ps.section.meetings?.[0] }))
                );

                // ── Step 1: BFS clustering ──────────────────────────────────
                // Groups that overlap in time belong to the same cluster so we
                // can compute how many side-by-side columns a cluster needs.
                const n = previewGroupsForDay.length;
                const clusterOf = new Array(n).fill(-1);
                let clusterCount = 0;
                for (let i = 0; i < n; i++) {
                  if (clusterOf[i] !== -1) continue;
                  const queue = [i];
                  clusterOf[i] = clusterCount;
                  let qi = 0;
                  while (qi < queue.length) {
                    const cur = queue[qi++];
                    const aM = previewGroupsForDay[cur][0].meeting ?? previewGroupsForDay[cur][0].section.meetings?.[0] ?? {};
                    const aS = timeToMinutes(aM.startTime);
                    const aE = timeToMinutes(aM.endTime);
                    for (let j = 0; j < n; j++) {
                      if (clusterOf[j] !== -1) continue;
                      const bM = previewGroupsForDay[j][0].meeting ?? previewGroupsForDay[j][0].section.meetings?.[0] ?? {};
                      const bS = timeToMinutes(bM.startTime);
                      const bE = timeToMinutes(bM.endTime);
                      if (aS < bE && bS < aE) { clusterOf[j] = clusterCount; queue.push(j); }
                    }
                  }
                  clusterCount++;
                }

                // ── Step 2: Greedy column assignment ───────────────────────
                // Process groups in start-time order. Assign each group to the
                // lowest column whose previous occupant has already ended.
                const sortedIdxs = Array.from({ length: n }, (_, i) => i)
                  .sort((a, b) => {
                    const mA = previewGroupsForDay[a][0].meeting ?? previewGroupsForDay[a][0].section.meetings?.[0] ?? {};
                    const mB = previewGroupsForDay[b][0].meeting ?? previewGroupsForDay[b][0].section.meetings?.[0] ?? {};
                    return timeToMinutes(mA.startTime) - timeToMinutes(mB.startTime);
                  });
                const colOf = new Array(n).fill(0);
                // clusterColEnds[clusterId][col] = end-minute of the last group assigned to that column.
                const clusterColEnds = {};
                for (const i of sortedIdxs) {
                  const c = clusterOf[i];
                  if (!clusterColEnds[c]) clusterColEnds[c] = [];
                  const mI = previewGroupsForDay[i][0].meeting ?? previewGroupsForDay[i][0].section.meetings?.[0] ?? {};
                  const s = timeToMinutes(mI.startTime);
                  const e = timeToMinutes(mI.endTime);
                  let col = clusterColEnds[c].findIndex(et => et <= s);
                  if (col === -1) { col = clusterColEnds[c].length; clusterColEnds[c].push(0); }
                  clusterColEnds[c][col] = e;
                  colOf[i] = col;
                }

                // ── Step 3: Render each ghost block ────────────────────────
                return previewGroupsForDay.map((group, groupIdx) => {
                  const rep = group[0];
                  const repMeeting = rep.meeting ?? rep.section.meetings?.[0] ?? {};
                  const color = colorMap[rep.courseId] ?? SECTION_COLORS[0];
                  const top = ((timeToMinutes(repMeeting.startTime) - gridStart) / totalMinutes) * 100;
                  const height = ((timeToMinutes(repMeeting.endTime) - timeToMinutes(repMeeting.startTime)) / totalMinutes) * 100;
                  const isSingle = group.length === 1;

                  // Include section type in the key so Lecture and Discussion
                  // pickers at the same time slot remain independent.
                  const pickerKey = `${rep.courseId}|${rep.section.type}|${repMeeting.startTime}|${repMeeting.endTime}|${day}`;
                  const isPickerOpen = openPickerKey === pickerKey;

                  const col = colOf[groupIdx];
                  const totalCols = clusterColEnds[clusterOf[groupIdx]].length;

                  // Translate column index to CSS left/right offsets.
                  // totalCols=1, col=0  → full width (left: 2px, right: 2px).
                  // totalCols=2, col=0  → left half.
                  // totalCols=2, col=1  → right half.
                  const leftStyle  = `calc(${(col / totalCols) * 100}% + 2px)`;
                  const rightStyle = `calc(${((totalCols - col - 1) / totalCols) * 100}% + 2px)`;

                  return (
                    <div
                      key={`preview-group-${pickerKey}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSingle) {
                          // Only one option — add it directly.
                          onAddPreviewSection?.(rep);
                        } else {
                          // Multiple options — toggle the section-picker dropdown.
                          setOpenPickerKey(isPickerOpen ? null : pickerKey);
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: `${top}%`,
                        left: leftStyle,
                        right: rightStyle,
                        height: `${height}%`,
                        background: `${color.border}12`,
                        border: `2px dashed ${color.border}`,
                        borderRadius: 6,
                        padding: "3px 5px",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        zIndex: isPickerOpen ? 25 : 2,
                        animation: "previewPulse 2s ease-in-out infinite",
                        transition: "background 0.15s, border-color 0.15s",
                        overflow: "visible",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${color.border}28`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = `${color.border}12`; }}
                    >
                      {/* Block label — clipped to never push the block wider */}
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{
                            fontSize: 10, fontWeight: 700, color: color.border, opacity: 0.7,
                            lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {rep.courseCode}
                          </div>
                          {/* Badge showing how many sections are available in this slot */}
                          {!isSingle && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: "#fff",
                              background: color.border, borderRadius: 8,
                              padding: "1px 6px", lineHeight: 1.4, flexShrink: 0,
                            }}>{group.length}</span>
                          )}
                        </div>
                        {isSingle ? (
                          <>
                            <div style={{ fontSize: 9, color: color.border, opacity: 0.55, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rep.section.type} {rep.section.sectionId}{rep.section.topic ? ` – ${rep.section.topic}` : ""}
                            </div>
                            <div style={{ fontSize: 9, color: color.border, opacity: 0.45 }}>
                              {repMeeting.startTime}–{repMeeting.endTime}
                            </div>
                            <div style={{ fontSize: 8, color: color.border, opacity: 0.5, marginTop: 1, fontStyle: "italic" }}>
                              Click to add
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 9, color: color.border, opacity: 0.55, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rep.section.type} · {repMeeting.startTime}–{repMeeting.endTime}
                            </div>
                            <div style={{ fontSize: 8, color: color.border, opacity: 0.5, marginTop: 1, fontStyle: "italic" }}>
                              {isPickerOpen ? "Pick a section ↓" : "Click to choose"}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Section picker dropdown — rendered when multiple sections share a slot.
                          minWidth keeps it readable even when the ghost block is narrow. */}
                      {isPickerOpen && !isSingle && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute", top: "100%", left: 0,
                            minWidth: 160,
                            marginTop: 4, background: "#1f2937", borderRadius: 8,
                            border: `1.5px solid ${color.border}`,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                            maxHeight: 160, overflowY: "auto", zIndex: 30,
                          }}
                          className="section-picker-scroll"
                        >
                          <div style={{
                            padding: "6px 8px 4px", fontSize: 9, fontWeight: 700,
                            color: "#9ca3af", textTransform: "uppercase",
                            letterSpacing: "0.05em", borderBottom: "1px solid #374151",
                          }}>
                            {group.length} sections available
                          </div>
                          {group.map((ps) => (
                            <div
                              key={ps.section.sectionId}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddPreviewSection?.(ps);
                                setOpenPickerKey(null);
                              }}
                              style={{
                                padding: "6px 8px", cursor: "pointer",
                                borderBottom: "1px solid #374151",
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#374151"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#f3f4f6" }}>
                                {ps.section.type} {ps.section.sectionId}{ps.section.topic ? ` – ${ps.section.topic}` : ""}
                              </div>
                              <div style={{ fontSize: 10, color: "#9ca3af" }}>{(ps.meeting ?? ps.section.meetings?.[0])?.room}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ))}
        </div>

        {/* Invisible overlay to dismiss any open popup/picker when clicking outside */}
        {(selectedBlock || openPickerKey) && (
          <div
            onClick={() => { setSelectedBlock(null); setOpenPickerKey(null); }}
            style={{ position: "absolute", inset: 0, zIndex: 0 }}
          />
        )}
      </div>
    </div>
  );
}

// ─── SchedulePage ──────────────────────────────────────────────────────────────
// The main schedule-building view. Manages selected sections, conflict detection,
// credit counting, and preview mode. Renders a sidebar (CourseCard list) and the
// WeekGrid calendar.
//
// Props:
//   courses        – search-result courses (filtered by the current query)
//   allCourses     – full course list, used to keep already-selected courses
//                    visible even after the search query changes
//   search         – current search string
//   onSearchChange – callback to update the search string
//   loading        – true while a search request is in flight
function SchedulePage({ courses, allCourses, search, onSearchChange, loading }) {
  // Map of courseId → [sectionId, …] for every section the user has chosen.
  const [selectedSections, setSelectedSections] = useState({});
  // Array of human-readable conflict warning strings shown at the bottom of the sidebar.
  const [conflicts, setConflicts] = useState([]);
  // Drives a CSS fade-out transition on the conflict banner before clearing it.
  const [conflictFading, setConflictFading] = useState(false);
  const [showCreditInfo, setShowCreditInfo] = useState(false);
  const [creditTooltip, setCreditTooltip] = useState(null);
  // The courseId currently being previewed (ghost blocks shown on calendar), or null.
  const [previewCourseId, setPreviewCourseId] = useState(null);

  // Build the list of ghost-block preview sections for the previewed course.
  // Excludes section types already chosen and sections that conflict with
  // already-selected sections of the same course.
  const previewSections = useMemo(() => {
    if (!previewCourseId) return [];
    const course = courses.find((c) => c.id === previewCourseId);
    if (!course) return [];
    const alreadySelected = selectedSections[previewCourseId] ?? [];
    const coveredTypes = new Set(
      course.sections
        .filter((s) => alreadySelected.includes(s.sectionId))
        .map((s) => s.type)
    );
    // Wrap already-selected sections in { section } so hasConflict() can consume them.
    const selectedEntries = course.sections
      .filter((s) => alreadySelected.includes(s.sectionId))
      .map((s) => ({ section: s }));

    return course.sections
      .filter((sec) =>
        !alreadySelected.includes(sec.sectionId) &&
        !coveredTypes.has(sec.type) &&
        !hasConflict(selectedEntries, sec) // drop previews that clash with a picked section
      )
      .map((sec) => ({ courseId: course.id, courseCode: course.code, section: sec }));
  }, [previewCourseId, courses, selectedSections]);

  // Automatically exit preview mode once all section types for the previewed
  // course have been selected (nothing left to preview).
  useEffect(() => {
    if (!previewCourseId) return;
    const course = courses.find((c) => c.id === previewCourseId);
    if (!course) return;
    const selected = selectedSections[previewCourseId] ?? [];
    if (selected.length === 0) return;
    const allTypes = new Set(course.sections.map((s) => s.type));
    const selectedTypes = new Set(
      course.sections.filter((s) => selected.includes(s.sectionId)).map((s) => s.type)
    );
    if (allTypes.size === selectedTypes.size) {
      setPreviewCourseId(null);
    }
  }, [previewCourseId, selectedSections, courses]);

  // Auto-dismiss the conflict banner: fade after 4 s, clear after 5 s.
  useEffect(() => {
    if (conflicts.length === 0) return;
    setConflictFading(false);
    const fadeTimer = setTimeout(() => setConflictFading(true), 4000);
    const clearTimer = setTimeout(() => { setConflicts([]); setConflictFading(false); }, 5000);
    return () => { clearTimeout(fadeTimer); clearTimeout(clearTimer); };
  }, [conflicts]);

  // Merge search-result courses with allCourses so that courses selected before
  // a new search was typed stay in the colorMap and schedule even if they no
  // longer appear in the current search results.
  const knownCourses = useMemo(() => {
    const map = new Map();
    allCourses.forEach((c) => map.set(c.id, c));
    courses.forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  }, [allCourses, courses]);

  // Assign a stable color from SECTION_COLORS to each course by insertion order.
  const colorMap = useMemo(() => {
    const map = {};
    let i = 0;
    knownCourses.forEach((c) => { map[c.id] = SECTION_COLORS[i++ % SECTION_COLORS.length]; });
    return map;
  }, [knownCourses]);

  // Flatten selectedSections into a list of schedule entries for WeekGrid.
  const schedule = useMemo(() => {
    const out = [];
    knownCourses.forEach((c) => {
      (selectedSections[c.id] ?? []).forEach((sid) => {
        const sec = c.sections.find((s) => s.sectionId === sid);
        if (sec) out.push({ courseId: c.id, courseCode: c.code, courseName: c.name, credits: c.credits, instructor: c.instructor, college: c.college, section: sec });
      });
    });
    return out;
  }, [selectedSections, knownCourses]);

  // Sum credits only for courses that have at least one section selected.
  const totalCredits = useMemo(() => {
    return Object.keys(selectedSections).reduce((sum, cid) => {
      if ((selectedSections[cid] ?? []).length > 0) {
        const c = knownCourses.find((x) => x.id === cid);
        return sum + (c?.credits ?? 0);
      }
      return sum;
    }, 0);
  }, [selectedSections, knownCourses]);

  // Add or remove a section from the schedule with conflict validation.
  function handleToggleSection(course, section) {
    const prev = selectedSections[course.id] ?? [];
    const isSelected = prev.includes(section.sectionId);

    if (isSelected) {
      // Deselect: remove the section and clear any conflict warnings for this course.
      setSelectedSections((s) => ({ ...s, [course.id]: prev.filter((id) => id !== section.sectionId) }));
      setConflicts((c) => { const f = c.filter((msg) => !msg.startsWith(course.code)); return f.length === c.length ? c : f; });
    } else {
      // Guard: can't select two sections of the same type (e.g. two Lectures).
      const sameTypeSelected = course.sections.find(
        (s) => s.sectionId !== section.sectionId && s.type === section.type && prev.includes(s.sectionId)
      );
      if (sameTypeSelected) {
        setConflicts((c) => [...c, `${course.code}: a ${section.type} section is already selected (${sameTypeSelected.sectionId}).`]);
        return;
      }
      // Guard: can't overlap with any other already-scheduled section.
      // Exclude this course's own sections from the conflict check so switching
      // a Discussion doesn't falsely conflict with the course's own Lecture.
      const rest = schedule.filter((e) => !(e.courseId === course.id && prev.includes(e.section.sectionId)));
      if (hasConflict(rest, section)) {
        setConflicts((c) => [...c, `${course.code} ${section.sectionId} conflicts with an existing section.`]);
        return;
      }
      // Clear stale warnings for this course then add the section.
      setConflicts((c) => { const f = c.filter((msg) => !msg.startsWith(course.code)); return f.length === c.length ? c : f; });
      setSelectedSections((s) => ({ ...s, [course.id]: [...prev, section.sectionId] }));
    }
  }

  function handleClear() {
    setSelectedSections({});
    setConflicts([]);
  }

  console.log("courses:", courses.length, "loading:", loading, "search:", search);

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: 280, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#fff", borderRight: "1px solid #e5e7eb", overflowY: "hidden",
      }}>
        {/* Search box */}
        <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #f3f4f6" }}>
          <input
            type="text" placeholder="Search courses..."
            value={search} onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", padding: "6px 10px",
              fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 7,
              outline: "none", color: "#111827", background: "#f9fafb",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          />
        </div>

        {/* Course list — shows skeletons while loading, a prompt before 2 chars,
            an empty-state when no results, or up to 50 CourseCard components. */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
          {loading ? (
            // Skeleton cards while the API request is in flight
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                border: "1.5px solid #e5e7eb", borderRadius: 10,
                marginBottom: 10, padding: "10px 12px", background: "#fff",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ height: 12, width: "40%", background: "#f3f4f6", borderRadius: 4 }} />
                  <div style={{ height: 12, width: "15%", background: "#f3f4f6", borderRadius: 4 }} />
                </div>
                <div style={{ height: 11, width: "80%", background: "#f3f4f6", borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 10, width: "25%", background: "#f3f4f6", borderRadius: 4 }} />
              </div>
            ))
          ) : search.trim().length < 2 ? (
            // Prompt to type more characters before we fire the API
            <div style={{ textAlign: "center", marginTop: 40, color: "#9ca3af" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Search for a course</div>
              <div style={{ fontSize: 12 }}>Type at least 2 characters<br />to find courses</div>
            </div>
          ) : courses.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 24 }}>No courses match.</div>
          ) : (
            // Cap at 50 results to keep the sidebar responsive
            courses.slice(0, 50).map((c) => (
              <CourseCard
                key={c.id} course={c}
                selectedSections={selectedSections}
                colorMap={colorMap}
                onToggleSection={handleToggleSection}
                previewCourseId={previewCourseId}
                onPreviewCourse={setPreviewCourseId}
              />
            ))
          )}
        </div>

        {/* Sidebar footer: conflict banner, credit counter, and Clear button */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", background: "#fff" }}>
          {conflicts.length > 0 && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6,
              padding: "6px 8px", marginBottom: 8,
              opacity: conflictFading ? 0 : 1,
              transition: "opacity 1s ease",
            }}>
              {conflicts.map((msg, i) => (
                <div key={i} style={{ fontSize: 11, color: "#dc2626" }}>⚠ {msg}</div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              {/* Credit counter — turns orange at 18 credits (overload) and red at 20 (over max) */}
              <div
                onClick={() => setShowCreditInfo((v) => !v)}
                style={{
                  fontSize: 12,
                  color: totalCredits > 20 ? "#dc2626" : totalCredits > 18 ? "#ea580c" : "#374151",
                  cursor: "pointer", userSelect: "none",
                  transition: "color 0.2s",
                }}
              >
                <b>{totalCredits}</b> credit{totalCredits !== 1 ? "s" : ""} selected
                {totalCredits > 18 && (
                  <span
                    onMouseEnter={() => setCreditTooltip(totalCredits > 20 ? "overmax" : "overload")}
                    onMouseLeave={() => setCreditTooltip(null)}
                    style={{
                      marginLeft: 4, fontSize: 10, fontWeight: 600,
                      color: totalCredits > 20 ? "#dc2626" : "#ea580c",
                      background: totalCredits > 20 ? "#fef2f2" : "#fff7ed",
                      border: `1px solid ${totalCredits > 20 ? "#fecaca" : "#fed7aa"}`,
                      borderRadius: 4, padding: "1px 5px",
                      position: "relative", cursor: "default",
                    }}
                  >
                    {totalCredits > 20 ? "⊘ Over max" : "⚠ Overload"}
                    {/* Tooltip explaining the overload/over-max threshold */}
                    {creditTooltip && (
                      <span style={{
                        position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
                        transform: "translateX(-50%)", whiteSpace: "nowrap",
                        background: "#1f2937", color: "#fff", fontSize: 11, fontWeight: 500,
                        padding: "5px 10px", borderRadius: 6,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none",
                        zIndex: 50,
                      }}>
                        {creditTooltip === "overmax"
                          ? "Max credit per term exceeded."
                          : "Additional provisions may apply."}
                        {/* Tooltip caret */}
                        <span style={{
                          position: "absolute", top: "100%", left: "50%",
                          transform: "translateX(-50%)",
                          borderLeft: "5px solid transparent",
                          borderRight: "5px solid transparent",
                          borderTop: "5px solid #1f2937",
                        }} />
                      </span>
                    )}
                  </span>
                )}
              </div>
              {/* Expandable credit-limit info panel */}
              {showCreditInfo && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                  width: 220, background: "#fff", borderRadius: 8,
                  border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  padding: "10px 12px", zIndex: 30, fontSize: 11, color: "#374151", lineHeight: 1.5,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: "#111827", fontSize: 12 }}>Credit Limits</div>
                  Students can take a maximum of <b>20 credits</b> per term. Exceeding <b>18 credits</b> is classified as overloading. Check with your advisor for more information.
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCreditInfo(false); }}
                    style={{
                      position: "absolute", top: 4, right: 6,
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 14, color: "#9ca3af", lineHeight: 1,
                    }}
                  >×</button>
                </div>
              )}
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                {schedule.length} section{schedule.length !== 1 ? "s" : ""} on schedule
              </div>
            </div>
            <button onClick={handleClear} style={{
              fontSize: 11, padding: "5px 10px", borderRadius: 6,
              border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", color: "#6b7280",
            }}>
              Clear all
            </button>
          </div>
        </div>
      </div>

      {/* ── Right panel: weekly calendar ────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Weekly Schedule</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Select sections from the sidebar to build your schedule</div>
        </div>
        <div style={{ flex: 1, padding: 16, overflow: "hidden" }}>
          <div style={{
            background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb",
            height: "100%", overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            <WeekGrid schedule={schedule} colorMap={colorMap} previewSections={previewSections}
              previewCourseId={previewCourseId}
              // Clicking a ghost block adds the section to the schedule.
              onAddPreviewSection={(ps) => {
                const course = knownCourses.find((c) => c.id === ps.courseId);
                if (course) handleToggleSection(course, ps.section);
              }}
              // Clicking a confirmed block while in preview mode removes it.
              onRemovePreviewSection={(ps) => {
                const course = knownCourses.find((c) => c.id === ps.courseId);
                if (course) handleToggleSection(course, ps.section);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HubFinderPage ─────────────────────────────────────────────────────────────
// Lets students check off BU Hub requirements they still need, then see which
// courses cover the most of them. Results can be sorted by match count or name.
//
// Props:
//   courses – full course list (from allCourses in the root component)
function HubFinderPage({ courses }) {
  // Set of Hub codes the student still needs to fulfill.
  const [neededHubs, setNeededHubs] = useState(new Set());
  // "match" sorts by number of selected Hubs covered; "name" sorts alphabetically.
  const [sortMode, setSortMode] = useState("match");

  function toggleHub(code) {
    setNeededHubs((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function clearAll() { setNeededHubs(new Set()); }
  function selectAll() { setNeededHubs(new Set(HUB_REQUIREMENTS.map((h) => h.code))); }

  // Filter and rank courses by how many of the selected Hubs they satisfy.
  const results = useMemo(() => {
    if (neededHubs.size === 0) return [];
    return courses
      .map((course) => {
        const matched = (course.hubCodes ?? []).filter((code) => neededHubs.has(code));
        return { course, matched, matchCount: matched.length };
      })
      .filter((r) => r.matchCount > 0)
      .sort((a, b) => {
        if (sortMode === "match") return b.matchCount - a.matchCount;
        return a.course.name.localeCompare(b.course.name);
      });
  }, [neededHubs, courses, sortMode]);

  // The union of Hubs covered by at least one result course — used to show a
  // green checkmark on Hub checkboxes that are satisfiable by the current data.
  const coveredHubs = useMemo(() => {
    const covered = new Set();
    results.forEach((r) => r.matched.forEach((code) => covered.add(code)));
    return covered;
  }, [results]);

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* ── Left sidebar: Hub requirement checklist ───────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#fff", borderRight: "1px solid #e5e7eb", overflowY: "hidden",
      }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>HUB Requirements</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>
            Check off the HUBs you still need to fulfill
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={selectAll} style={{
              flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 5,
              border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", color: "#374151",
            }}>Select all</button>
            <button onClick={clearAll} style={{
              flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 5,
              border: "1px solid #e5e7eb", background: "#f9fafb",
              cursor: "pointer", color: "#374151",
            }}>Clear all</button>
          </div>
        </div>

        {/* Grouped Hub checkboxes — one section per category */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
          {Object.entries(HUB_BY_CATEGORY).map(([category, hubs]) => {
            const catColor = hubs[0].color;
            return (
              <div key={category} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: catColor,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  marginBottom: 6, paddingLeft: 2,
                }}>
                  {category}
                </div>
                {hubs.map((hub) => {
                  const checked = neededHubs.has(hub.code);
                  // covered means at least one result course satisfies this Hub.
                  const covered = coveredHubs.has(hub.code);
                  return (
                    <label key={hub.code} style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "6px 8px", borderRadius: 6, marginBottom: 2,
                      // Green tint when a course can fulfill this Hub; blue tint when checked but uncovered.
                      background: checked ? (covered ? "#f0fdf4" : "#eff6ff") : "transparent",
                      cursor: "pointer", transition: "background 0.1s",
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleHub(hub.code)}
                        style={{ marginTop: 1, cursor: "pointer", accentColor: catColor }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "#111827", lineHeight: 1.3 }}>{hub.label}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace", marginTop: 1 }}>{hub.code}</div>
                      </div>
                      {/* Checkmark badge when a result course covers this Hub */}
                      {checked && covered && (
                        <span style={{
                          fontSize: 10, background: "#dcfce7", color: "#15803d",
                          padding: "1px 5px", borderRadius: 99, fontWeight: 600, flexShrink: 0,
                        }}>✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Summary line: how many Hubs are selected and how many are covered */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", fontSize: 12, color: "#6b7280" }}>
          {neededHubs.size === 0
            ? "No HUBs selected"
            : `${neededHubs.size} HUB${neededHubs.size !== 1 ? "s" : ""} selected · ${coveredHubs.size} covered`
          }
        </div>
      </div>

      {/* ── Right panel: matching course results ──────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #e5e7eb",
          background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Matching Courses</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {neededHubs.size === 0
                ? "Select HUB requirements on the left to find courses"
                : `${results.length} course${results.length !== 1 ? "s" : ""} cover at least one of your selected HUBs`
              }
            </div>
          </div>
          {/* Sort toggle — only shown when there are results */}
          {results.length > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              {[["match", "Best match"], ["name", "A–Z"]].map(([mode, label]) => (
                <button key={mode} onClick={() => setSortMode(mode)} style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                  border: `1px solid ${sortMode === mode ? "#6366f1" : "#e5e7eb"}`,
                  background: sortMode === mode ? "#eef2ff" : "#fff",
                  color: sortMode === mode ? "#4f46e5" : "#6b7280",
                  fontWeight: sortMode === mode ? 600 : 400,
                }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {/* Empty state: no Hubs selected yet */}
          {neededHubs.size === 0 && (
            <div style={{ textAlign: "center", marginTop: 60, color: "#9ca3af" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Pick your HUBs</div>
              <div style={{ fontSize: 13 }}>Check the requirements you need on the left,<br />and we'll find the courses that cover the most of them.</div>
            </div>
          )}

          {/* Empty state: Hubs selected but no courses cover any of them */}
          {neededHubs.size > 0 && results.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 60, color: "#9ca3af" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No matches found</div>
              <div style={{ fontSize: 13 }}>No courses in the dataset cover the selected HUBs.</div>
            </div>
          )}

          {/* Result cards — one per matching course */}
          {results.map(({ course, matched, matchCount }) => {
            // Percentage of selected Hubs covered by this course, for the progress bar.
            const pct = Math.round((matchCount / neededHubs.size) * 100);
            return (
              <div key={course.id} style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
                padding: "14px 16px", marginBottom: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{course.code}</span>
                      <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 4, padding: "2px 6px" }}>
                        {course.credits} cr
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#374151", marginTop: 2 }}>{course.name}</div>
                  </div>
                  {/* Match score badge — green when all selected Hubs are covered */}
                  <div style={{
                    textAlign: "center", background: matchCount === neededHubs.size ? "#dcfce7" : "#eff6ff",
                    border: `1px solid ${matchCount === neededHubs.size ? "#86efac" : "#bfdbfe"}`,
                    borderRadius: 8, padding: "6px 12px", flexShrink: 0,
                  }}>
                    <div style={{
                      fontSize: 18, fontWeight: 800,
                      color: matchCount === neededHubs.size ? "#15803d" : "#1d4ed8",
                    }}>
                      {matchCount}/{neededHubs.size}
                    </div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>HUBs covered</div>
                  </div>
                </div>

                {/* Progress bar representing Hub coverage percentage */}
                <div style={{ height: 4, background: "#f3f4f6", borderRadius: 99, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99, transition: "width 0.3s",
                    width: `${pct}%`,
                    background: pct === 100 ? "#22c55e" : "#6366f1",
                  }} />
                </div>

                {/* Hub tags — matched ones are highlighted green, others are greyed out */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(course.hubCodes ?? []).map((code) => {
                    const isMatch = matched.includes(code);
                    const hubInfo = HUB_MAP[code];
                    return (
                      <span key={code} style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 99, fontWeight: 600,
                        background: isMatch ? "#dcfce7" : "#f3f4f6",
                        color: isMatch ? "#15803d" : "#9ca3af",
                        border: `1px solid ${isMatch ? "#86efac" : "#e5e7eb"}`,
                      }}>
                        {hubInfo?.label ?? code}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── BUScheduleBuilder (root component) ───────────────────────────────────────
// Owns top-level state: the full course list, search query, loading flag, and
// which page is active. Fetches data from the local API server on mount and
// debounces search queries to avoid hammering the endpoint on every keystroke.
export default function BUScheduleBuilder() {
  // allCourses: the complete unfiltered course list, loaded once on mount.
  const [allCourses, setAllCourses] = useState([]);
  // courses: the current search results (empty until the user types 2+ chars).
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("schedule");
  const [search, setSearch] = useState("");

  // Load the full course catalog on mount. Used by HubFinderPage and as a
  // fallback in SchedulePage so previously-selected courses stay visible.
  useEffect(() => {
    fetch("http://localhost:8080/api/courses")
      .then(res => res.json())
      .then(data => {
        setAllCourses(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Debounced search: wait 400 ms after the user stops typing before fetching.
  // This avoids a network request on every keypress.
  useEffect(() => {
    console.log("search effect fired, search:", JSON.stringify(search));
    if (search.trim().length < 2) {
      setCourses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const url = `http://localhost:8080/api/courses?q=${encodeURIComponent(search)}`;
      console.log("fetching:", url);
      fetch(url)
        .then(res => {
          console.log("response status:", res.status);
          return res.json();
        })
        .then(data => {
          console.log("got data, length:", data.length, "first:", data[0]?.name);
          setCourses(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("fetch failed:", err);
          setLoading(false);
        });
    }, 400);
    // Cancel the pending fetch if the search changes before the delay fires.
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: "#f9fafb" }}>
      <NavBar page={page} onPageChange={setPage} />
      {page === "schedule" && (
        <SchedulePage
          courses={courses}
          allCourses={allCourses}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
        />
      )}
      {page === "hub" && <HubFinderPage courses={allCourses} />}
    </div>
  );
}
