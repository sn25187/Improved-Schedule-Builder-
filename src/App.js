import { useState, useMemo, useEffect } from "react";

// ─── HUB Requirement Definitions ──────────────────────────────────────────────
// Complete BU HUB curriculum map. Each entry has:
//   code     → the short code used in crse_attr_value (e.g. "HUB-CRT")
//   label    → the full BU HUB requirement name
//   category → the HUB pillar this belongs to (for grouping in the UI)
//   color    → a visual accent for this category
const HUB_REQUIREMENTS = [
  // Philosophical, Aesthetic, and Historical Interpretation        
  { code: "HUB-PLM", label: "Philosophical Inquiry and Life's Meanings", category: "Philosophical, Aesthetic & Historical Interpretation", color: "#3b82f6" },
  { code: "HUB-AEX", label: "Aesthetic Exploration", category: "Philosophical, Aesthetic & Historical Interpretation", color: "#3b82f6" },
  { code: "HUB-HCO", label: "Historical Consciousness", category: "Philosophical, Aesthetic & Historical Interpretation", color: "#3b82f6" },
  // Scientific & Social Inquiry
  { code: "HUB-SI1", label: "Scientific Inquiry I", category: "Scientific & Social Inquiry", color: "#22c55e" },
  { code: "HUB-SI2", label: "Scientific Inquiry II", category: "Scientific & Social Inquiry", color: "#22c55e" },
  { code: "HUB-SO1", label: "Social Inquiry I", category: "Scientific & Social Inquiry", color: "#22c55e" },
  { code: "HUB-SO2", label: "Social Inquiry II", category: "Scientific & Social Inquiry", color: "#22c55e" },
  // Quantitative Reasoning
  { code: "HUB-QR1", label: "Quantitative Reasoning I", category: "Quantitative Reasoning", color: "#f59e0b" },
  { code: "HUB-QR2", label: "Quantitative Reasoning II", category: "Quantitative Reasoning", color: "#f59e0b" },
  // Diversity, Civic Engagement & Global Citizenship
  { code: "HUB-IIC", label: "The Individual in Community", category: "Diversity, Civic Engagement & Global Citizenship", color: "#ec4899" },
  { code: "HUB-GCI", label: "Global Citizenship & Intercultural Literacy", category: "Diversity, Civic Engagement & Global Citizenship", color: "#ec4899" },
  { code: "HUB-ETR", label: "Ethical Reasoning", category: "Diversity, Civic Engagement & Global Citizenship", color: "#ec4899" },
  // Communication
  { code: "HUB-FYW", label: "First-Year Writing Seminar", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-WRI", label: "Writing, Research, and Inquiry", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-WIN", label: "Writing-Intensive Course", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-OSC", label: "Oral and/or Signed Communication", category: "Communication", color: "#8b5cf6" },
  { code: "HUB-DME", label: "Digital/Multimedia Expression", category: "Communication", color: "#8b5cf6" },
  // Intellectual Toolkit
  { code: "HUB-CTR", label: "Critical Thinking", category: "Intellectual Toolkit", color: "#6366f1" },
  { code: "HUB-RIL", label: "Research and Information Literacy", category: "Intellectual Toolkit", color: "#6366f1" },
  { code: "HUB-TWC", label: "Teamwork/Collaboration", category: "Intellectual Toolkit", color: "#6366f1" },
  { code: "HUB-CRI", label: "Creativity/Innovation", category: "Intellectual Toolkit", color: "#6366f1" },
];

// Build a quick lookup map: code → full HUB object
const HUB_MAP = Object.fromEntries(HUB_REQUIREMENTS.map((h) => [h.code, h]));

// Group HUB requirements by category for the selector UI
const HUB_BY_CATEGORY = HUB_REQUIREMENTS.reduce((acc, hub) => {
  if (!acc[hub.category]) acc[hub.category] = [];
  acc[hub.category].push(hub);
  return acc;
}, {});

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const SECTION_COLORS = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" },
  { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
  { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
];

// ─── Utility Functions ────────────────────────────────────────────────────────
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmtHour(h) {
  if (h === 12) return "12 PM";
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

function hasConflict(existing, newSection) {
  for (const { section } of existing) {
    const sharedDay = section.days.some((d) => newSection.days.includes(d));
    if (!sharedDay) continue;
    const aStart = timeToMinutes(section.startTime);
    const aEnd = timeToMinutes(section.endTime);
    const bStart = timeToMinutes(newSection.startTime);
    const bEnd = timeToMinutes(newSection.endTime);
    if (aStart < bEnd && bStart < aEnd) return true;
  }
  return false;
}

// Group preview sections that share the same (courseId, startTime, endTime) into one slot.
// Returns an array of arrays – each inner array is a group of preview entries.
function groupPreviewsBySlot(previewsForDay) {
  const groups = {};
  for (const ps of previewsForDay) {
    const key = `${ps.courseId}|${ps.section.startTime}|${ps.section.endTime}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ps);
  }
  return Object.values(groups);
}

// ─── NavBar Component ─────────────────────────────────────────────────────────
// Renders the top navigation bar with BU branding and a page-switcher dropdown.
// `page` is the current active page; `onPageChange` is called when the user picks a new one.
function NavBar({ page, onPageChange }) {
  return (
    <div style={{
      height: 48, background: "#fff", borderBottom: "1px solid #e5e7eb",
      display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
      flexShrink: 0, zIndex: 10,
    }}>
      {/* BU badge */}
      <div style={{
        background: "#cc0000", color: "#fff", borderRadius: 6,
        width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>BU</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Schedule Builder
        <div style={{ fontSize: 11, fontWeight: 500, color: "#575656" }}>Fall 2026</div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />

      {/* Page selector dropdown.
          In React, <select> is a controlled input — its value is tied to `page` state,
          and onChange fires whenever the user picks a different option. */}
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

// ─── CourseCard Component ─────────────────────────────────────────────────────
function CourseCard({ course, selectedSections, colorMap, onToggleSection, previewCourseId, onPreviewCourse }) {
  const color = colorMap[course.id];
  const selected = selectedSections[course.id] ?? [];
  const isAnySelected = selected.length > 0;

  // Check for incomplete selection: which section types are covered
  const allTypes = new Set(course.sections.map((s) => s.type));
  const selectedTypes = new Set(
    course.sections.filter((s) => selected.includes(s.sectionId)).map((s) => s.type)
  );
  const allTypesCovered = isAnySelected && allTypes.size === selectedTypes.size;
  const isPreviewing = previewCourseId === course.id && !allTypesCovered;

  return (
    <div style={{
      border: `1.5px solid ${isPreviewing ? color?.border ?? "#6366f1" : isAnySelected ? color?.border ?? "#d1d5db" : "#e5e7eb"}`,
      borderRadius: 10, marginBottom: 10, overflow: "hidden",
      background: isAnySelected ? color?.bg ?? "#fff" : "#fff",
      transition: "border-color 0.15s, box-shadow 0.15s",
      boxShadow: isPreviewing ? `0 0 0 2px ${(color?.border ?? "#6366f1")}33` : "none",
    }}>
      {/* Clickable course banner for preview */}
      <div
        onClick={() => {
          // Don't allow toggling preview on when all section types are already covered
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

      <div style={{ borderTop: "1px solid #f3f4f6" }}>
        {course.sections.map((sec) => {
          const isSelected = selected.includes(sec.sectionId);
          // Show warning if this section's type is missing AND at least one other type is selected
          const isMissing = isAnySelected && !selectedTypes.has(sec.type) && !isSelected;
          // Disable if another section of the same type is already selected (but not this one)
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
                  {sec.type} {sec.sectionId}
                </span>
                <div style={{ fontSize: 11, color: isDisabled ? "#d1d5db" : "#6b7280", marginTop: 1 }}>
                  {sec.days.join("/")} · {sec.startTime}–{sec.endTime} · {sec.room}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {isMissing && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, color: "#c2410c",
                    background: "#fff7ed", border: "1px solid #fed7aa",
                    padding: "1px 5px", borderRadius: 4, whiteSpace: "nowrap",
                  }}>⚠ Missing</span>
                )}
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

// ─── WeekGrid Component ───────────────────────────────────────────────────────
function WeekGrid({ schedule, colorMap, previewSections, onAddPreviewSection, previewCourseId, onRemovePreviewSection }) {
  const gridStart = 7 * 60;
  const gridEnd = 21 * 60;
  const totalMinutes = gridEnd - gridStart;
  const [selectedBlock, setSelectedBlock] = useState(null); // { courseId, sectionId, day }
  const [openPickerKey, setOpenPickerKey] = useState(null); // key string for the currently-open section picker

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", userSelect: "none" }}>
      <div style={{ display: "grid", gridTemplateColumns: "44px repeat(5, 1fr)", borderBottom: "1px solid #e5e7eb" }}>
        <div />
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#374151", padding: "6px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "44px repeat(5, 1fr)", position: "relative", minHeight: 840, paddingTop: 8 }}>
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
          {DAYS.map((day) => (
            <div key={day} style={{ position: "relative", borderLeft: "1px solid #f3f4f6" }}>
              {HOURS.map((h) => (
                <div key={h} style={{
                  position: "absolute", top: `${((h * 60 - gridStart) / totalMinutes) * 100}%`,
                  left: 0, right: 0, borderTop: "1px solid #f3f4f6", pointerEvents: "none",
                }} />
              ))}
              {schedule
                .filter(({ section }) => section.days.includes(day))
                .map((entry) => {
                  const { courseId, courseCode, courseName, credits, instructor, college, section } = entry;
                  const color = colorMap[courseId] ?? SECTION_COLORS[0];
                  const top = ((timeToMinutes(section.startTime) - gridStart) / totalMinutes) * 100;
                  const height = ((timeToMinutes(section.endTime) - timeToMinutes(section.startTime)) / totalMinutes) * 100;
                  const isSelected = selectedBlock?.courseId === courseId && selectedBlock?.sectionId === section.sectionId && selectedBlock?.day === day;
                  const isHighlighted = selectedBlock?.courseId === courseId && selectedBlock?.sectionId === section.sectionId;
                  const isPreviewTarget = previewCourseId === courseId;
                  return (
                    <div key={`${courseId}-${section.sectionId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPreviewTarget) {
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
                      <div style={{ fontSize: 9, color: color.text, opacity: 0.75 }}>{section.type}</div>
                      <div style={{ fontSize: 9, color: color.text, opacity: 0.65 }}>{section.startTime}–{section.endTime}</div>

                      {/* Detail popup */}
                      {isSelected && (
                        <div onClick={(e) => e.stopPropagation()} style={{
                          position: "absolute", top: "100%", left: 0, marginTop: 4,
                          width: 220, background: "#fff", borderRadius: 10,
                          border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                          padding: "12px 14px", zIndex: 30,
                        }}>
                          {/* Close button */}
                          <button
                            onClick={() => setSelectedBlock(null)}
                            style={{
                              position: "absolute", top: 6, right: 8,
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: 14, color: "#9ca3af", lineHeight: 1,
                            }}
                          >×</button>

                          {/* Course title */}
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{courseCode}</div>
                          <div style={{ fontSize: 11, color: "#374151", marginBottom: 8, lineHeight: 1.4 }}>{courseName}</div>

                          {/* Detail rows */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Section</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{section.type} {section.sectionId}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Time</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{section.startTime} – {section.endTime}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Days</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{section.days.join(", ")}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Room</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{section.room}</span>
                            </div>
                            <div style={{ height: 1, background: "#f3f4f6", margin: "2px 0" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#9ca3af" }}>Instructor</span>
                              <span style={{ color: "#374151", fontWeight: 500 }}>{instructor}</span>
                            </div>
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
              {/* Preview / ghost blocks — grouped by time slot to avoid overlap */}
              {groupPreviewsBySlot(
                (previewSections ?? []).filter((ps) => ps.section.days.includes(day))
              ).map((group) => {
                const rep = group[0]; // representative entry for positioning
                const color = colorMap[rep.courseId] ?? SECTION_COLORS[0];
                const top = ((timeToMinutes(rep.section.startTime) - gridStart) / totalMinutes) * 100;
                const height = ((timeToMinutes(rep.section.endTime) - timeToMinutes(rep.section.startTime)) / totalMinutes) * 100;
                const isSingle = group.length === 1;
                const pickerKey = `${rep.courseId}|${rep.section.startTime}|${rep.section.endTime}|${day}`;
                const isPickerOpen = openPickerKey === pickerKey;

                return (
                  <div key={`preview-group-${pickerKey}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSingle) {
                        onAddPreviewSection?.(rep);
                      } else {
                        setOpenPickerKey(isPickerOpen ? null : pickerKey);
                      }
                    }}
                    style={{
                      position: "absolute", top: `${top}%`, left: 2, right: 2, height: `${height}%`,
                      background: `${color.border}12`, border: `2px dashed ${color.border}`,
                      borderRadius: 6, padding: "3px 5px", boxSizing: "border-box",
                      cursor: "pointer", zIndex: isPickerOpen ? 25 : 2,
                      animation: "previewPulse 2s ease-in-out infinite",
                      transition: "background 0.15s, border-color 0.15s",
                      overflow: "visible",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${color.border}28`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `${color.border}12`; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: color.border, opacity: 0.7, lineHeight: 1.3 }}>{rep.courseCode}</div>
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
                        <div style={{ fontSize: 9, color: color.border, opacity: 0.55 }}>{rep.section.type} {rep.section.sectionId}</div>
                        <div style={{ fontSize: 9, color: color.border, opacity: 0.45 }}>{rep.section.startTime}–{rep.section.endTime}</div>
                        <div style={{ fontSize: 8, color: color.border, opacity: 0.5, marginTop: 1, fontStyle: "italic" }}>Click to add</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 9, color: color.border, opacity: 0.55 }}>{rep.section.type} · {rep.section.startTime}–{rep.section.endTime}</div>
                        <div style={{ fontSize: 8, color: color.border, opacity: 0.5, marginTop: 1, fontStyle: "italic" }}>
                          {isPickerOpen ? "Pick a section ↓" : "Click to choose"}
                        </div>
                      </>
                    )}

                    {/* Section Picker Dropdown */}
                    {isPickerOpen && !isSingle && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute", top: "100%", left: 0, right: 0,
                          marginTop: 4, background: "#1f2937", borderRadius: 8,
                          border: `1.5px solid ${color.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                          maxHeight: 160, overflowY: "auto", zIndex: 30,
                        }}
                        className="section-picker-scroll"
                      >
                        <div style={{ padding: "6px 8px 4px", fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #374151" }}>
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
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#f3f4f6" }}>{ps.section.type} {ps.section.sectionId}</div>
                            <div style={{ fontSize: 10, color: "#9ca3af" }}>{ps.section.room}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Click on empty space to dismiss popup / picker */}
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

// ─── SchedulePage Component ───────────────────────────────────────────────────
// The original schedule builder, now extracted into its own component so the
// main app can swap between this and the HUB finder page.
function SchedulePage({ courses, allCourses, search, onSearchChange, loading }) {
  const [selectedSections, setSelectedSections] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const [conflictFading, setConflictFading] = useState(false);
  const [showCreditInfo, setShowCreditInfo] = useState(false);
  const [creditTooltip, setCreditTooltip] = useState(null); // "overload" | "overmax" | null
  const [previewCourseId, setPreviewCourseId] = useState(null);

  // Build preview sections: all sections from the previewed course that aren't already on the schedule
  const previewSections = useMemo(() => {
    if (!previewCourseId) return [];
    const course = courses.find((c) => c.id === previewCourseId);
    if (!course) return [];
    const alreadySelected = selectedSections[previewCourseId] ?? [];
    return course.sections
      .filter((sec) => !alreadySelected.includes(sec.sectionId))
      .map((sec) => ({ courseId: course.id, courseCode: course.code, section: sec }));
  }, [previewCourseId, courses, selectedSections]);

  // Auto-clear preview when all section types are covered (one of each type selected)
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

  // Auto-dismiss conflict warnings: fade starts at 4s, removed at 5s
  useEffect(() => {
    if (conflicts.length === 0) return;
    setConflictFading(false);
    const fadeTimer = setTimeout(() => setConflictFading(true), 4000);
    const clearTimer = setTimeout(() => { setConflicts([]); setConflictFading(false); }, 5000);
    return () => { clearTimeout(fadeTimer); clearTimeout(clearTimer); };
  }, [conflicts]);

  // Merge allCourses and search-result courses so we always have data for
  // courses the user has interacted with (even if they later change the search).
  const knownCourses = useMemo(() => {
    const map = new Map();
    allCourses.forEach((c) => map.set(c.id, c));
    courses.forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  }, [allCourses, courses]);

  const colorMap = useMemo(() => {
    const map = {};
    let i = 0;
    knownCourses.forEach((c) => { map[c.id] = SECTION_COLORS[i++ % SECTION_COLORS.length]; });
    return map;
  }, [knownCourses]);

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

  const totalCredits = useMemo(() => {
    return Object.keys(selectedSections).reduce((sum, cid) => {
      if ((selectedSections[cid] ?? []).length > 0) {
        const c = knownCourses.find((x) => x.id === cid);
        return sum + (c?.credits ?? 0);
      }
      return sum;
    }, 0);
  }, [selectedSections, knownCourses]);

  function handleToggleSection(course, section) {
    const prev = selectedSections[course.id] ?? [];
    const isSelected = prev.includes(section.sectionId);
    if (isSelected) {
      setSelectedSections((s) => ({ ...s, [course.id]: prev.filter((id) => id !== section.sectionId) }));
      setConflicts((c) => { const f = c.filter((msg) => !msg.startsWith(course.code)); return f.length === c.length ? c : f; });
    } else {
      const rest = schedule.filter((e) => !(e.courseId === course.id && prev.includes(e.section.sectionId)));
      if (hasConflict(rest, section)) {
        setConflicts((c) => [...c, `${course.code} ${section.sectionId} conflicts with an existing section.`]);
        return;
      }
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
      {/* ── Sidebar ── */}
      <div style={{
        width: 280, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#fff", borderRight: "1px solid #e5e7eb", overflowY: "hidden",
      }}>
        <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #f3f4f6" }}>
          <input
            type="text" placeholder="Search courses..."
            value={search} onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", padding: "6px 10px",
              fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 7,
              outline: "none", color: "#111827", background: "#f9fafb",
              opacity: loading ? 0.6 : 1,         // ← dims while fetching
              transition: "opacity 0.2s",
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
          {loading ? (
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
            // Don't render 2,947 cards — prompt user to search instead
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
                        {/* Tooltip arrow */}
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

      {/* ── Calendar ── */}
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
              onAddPreviewSection={(ps) => {
                const course = knownCourses.find((c) => c.id === ps.courseId);
                if (course) handleToggleSection(course, ps.section);
              }}
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

// ─── HubFinderPage Component ──────────────────────────────────────────────────
// Lets the user check off which HUB requirements they still need, then shows
// every course that satisfies at least one of them — ranked by how many of the
// user's selected requirements it covers.
function HubFinderPage({ courses }) {
  // Set of HUB codes the user has checked off as "I need this"
  const [neededHubs, setNeededHubs] = useState(new Set());

  // Which sort mode the results list uses
  const [sortMode, setSortMode] = useState("match"); // "match" | "name"

  // Toggle a single HUB requirement on/off in the neededHubs set.
  // Because Sets are mutable objects, we must create a *new* Set when updating
  // state — React won't detect the change if we mutate the existing one.
  function toggleHub(code) {
    setNeededHubs((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function clearAll() { setNeededHubs(new Set()); }
  function selectAll() { setNeededHubs(new Set(HUB_REQUIREMENTS.map((h) => h.code))); }

  // Compute results: for each course, count how many of the user's needed HUBs it covers.
  // useMemo re-runs this only when neededHubs or courses changes.
  const results = useMemo(() => {
    if (neededHubs.size === 0) return [];

    return courses
      .map((course) => {
        // Find which of the user's needed HUBs this course satisfies
        const matched = (course.hubCodes ?? []).filter((code) => neededHubs.has(code));
        return { course, matched, matchCount: matched.length };
      })
      .filter((r) => r.matchCount > 0) // Only include courses that cover at least one needed HUB
      .sort((a, b) => {
        if (sortMode === "match") return b.matchCount - a.matchCount; // Most matches first
        return a.course.name.localeCompare(b.course.name);            // Alphabetical
      });
  }, [neededHubs, courses, sortMode]);

  // How many of the user's needed HUBs are covered by at least one result course
  const coveredHubs = useMemo(() => {
    const covered = new Set();
    results.forEach((r) => r.matched.forEach((code) => covered.add(code)));
    return covered;
  }, [results]);

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* ── LEFT: HUB requirement selector ── */}
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

        {/* HUB checkboxes, grouped by category */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
          {Object.entries(HUB_BY_CATEGORY).map(([category, hubs]) => {
            // Pick the accent color from the first HUB in this category
            const catColor = hubs[0].color;
            return (
              <div key={category} style={{ marginBottom: 16 }}>
                {/* Category header */}
                <div style={{
                  fontSize: 10, fontWeight: 700, color: catColor,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  marginBottom: 6, paddingLeft: 2,
                }}>
                  {category}
                </div>

                {/* Individual HUB checkboxes */}
                {hubs.map((hub) => {
                  const checked = neededHubs.has(hub.code);
                  const covered = coveredHubs.has(hub.code);
                  return (
                    <label key={hub.code} style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "6px 8px", borderRadius: 6, marginBottom: 2,
                      background: checked ? (covered ? "#f0fdf4" : "#eff6ff") : "transparent",
                      cursor: "pointer", transition: "background 0.1s",
                    }}>
                      {/*
                        Standard HTML checkbox. In React, `checked` makes it a controlled
                        input (React owns its state), and `onChange` fires when the user clicks.
                      */}
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
                      {/* Green checkmark badge when this HUB is covered by results */}
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

        {/* Footer: summary of selection */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", fontSize: 12, color: "#6b7280" }}>
          {neededHubs.size === 0
            ? "No HUBs selected"
            : `${neededHubs.size} HUB${neededHubs.size !== 1 ? "s" : ""} selected · ${coveredHubs.size} covered`
          }
        </div>
      </div>

      {/* ── RIGHT: Results ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Results header */}
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

        {/* Results list */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {neededHubs.size === 0 && (
            // Empty state illustration
            <div style={{ textAlign: "center", marginTop: 60, color: "#9ca3af" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Pick your HUBs</div>
              <div style={{ fontSize: 13 }}>Check the requirements you need on the left,<br />and we'll find the courses that cover the most of them.</div>
            </div>
          )}

          {neededHubs.size > 0 && results.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 60, color: "#9ca3af" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No matches found</div>
              <div style={{ fontSize: 13 }}>No courses in the dataset cover the selected HUBs.</div>
            </div>
          )}

          {results.map(({ course, matched, matchCount }) => {
            // Percentage of the user's needed HUBs covered by this one course
            const pct = Math.round((matchCount / neededHubs.size) * 100);
            return (
              <div key={course.id} style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
                padding: "14px 16px", marginBottom: 10,
              }}>
                {/* Course title row */}
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
                  {/* Match badge: shows how many needed HUBs this course covers */}
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

                {/* Progress bar showing % of selected HUBs covered */}
                <div style={{ height: 4, background: "#f3f4f6", borderRadius: 99, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99, transition: "width 0.3s",
                    width: `${pct}%`,
                    background: pct === 100 ? "#22c55e" : "#6366f1",
                  }} />
                </div>

                {/* HUB tags — green if matched/needed, grey if course has it but user didn't select it */}
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
                        {/* Show the short code; hovering the full name would need a tooltip */}
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

// ─── Root App Component ───────────────────────────────────────────────────────
// This is the top-level component. It owns just one piece of state — `page` —
// which controls which page is currently visible. Everything else lives inside
// the individual page components so their state resets cleanly when you switch.
export default function BUScheduleBuilder() {
  const [allCourses, setAllCourses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("schedule");   // `page` is either "schedule" or "hub" — drives which component renders below the nav
  const [search, setSearch] = useState("");

  // Load all courses at startup for colorMap, schedule building, HUB finder, etc.
  useEffect(() => {
    fetch("http://localhost:8080/api/courses")
      .then(res => res.json())
      .then(data => {
        setAllCourses(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Debounced search — skip if search is empty (let initial load handle that)
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
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: "#f9fafb" }}>
      {/* NavBar sits above both pages and handles switching between them */}
      <NavBar page={page} onPageChange={setPage} />

      {/* Conditionally render either the schedule builder or the HUB finder.
          React re-mounts the component when you switch, which resets its internal state.
          That's intentional — your HUB selections and schedule selections are independent. */}
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
