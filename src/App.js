// React itself doesn't need to be imported in modern React (17+), but we do need
// to import any specific "hooks" we use. Hooks are special React functions that
// let you add features (like state or caching) to your components.
//
// useState  → lets a component remember data that can change over time (like
//             which sections the user has selected). When state changes, React
//             automatically re-renders the component so the UI stays in sync.
//
// useMemo   → lets you cache an expensive computed value so it only re-runs
//             when its dependencies change, not on every render. Think of it
//             like memoization in Java.
import {useState, useMemo} from "react";

// Imports sample courses
//import courses from "1.JSON";

// --- Constants ------------------------------------------------------------------------------------

// Array for all days of the week
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Color palettes for each section
const SECTION_COLORS = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" }, // blue
  { bg: "#dcfce7", border: "#22c55e", text: "#15803d" }, // green
  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" }, // amber
  { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" }, // pink
  { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" }, // purple
  { bg: "#ffedd5", border: "#f97316", text: "#9a3412" }, // orange
];

// --- Main App Component ---------------------------------------------------------------------------
export default function BUScheduleBuilder() {
  // Stores the current text in the search/filter input box
  const [search, setSearch] = useState("");

  return (
    <div style = {{display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: "#f9fafb"}}>
      {/* Left sidebar with logo, search bar, course list */}
      <div style = {{
        width: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRight: "1px solid #000000",
        overflowY: "hidden",
      }}>

        {/* Logo + Search (top of left sidebar) */}
        <div style = {{padding: "16px 16px 10px", borderBottom: "1px solid #f3f4f6"}}>
          {/* BU logo badge */}
          <div style = {{display: "flex", alignItems: "center", gap: 8, marginBottom: 8}}>
            <div style = {{
              background: "#d10000", color: "#fff", borderRadius: 6,
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, flexShrink: 0,
            }}>BU</div>

            {/* Title & Subtitle */}
            <div>
              <div style = {{fontSize: 14, fontWeight: 700, color: "#000000"}}>Schedule Builder</div>
              <div style = {{fontSize: 11, fontWeight: 700, color: "#9ca3af"}}>Boston University</div>
            </div>
          </div>

          {/*
            Controlled input: in React, form inputs are "controlled" when their
            value is bound to state. Here, `value={search}` ties the input's
            displayed text to the `search` state variable, and `onChange` updates
            that state whenever the user types. This keeps React in charge of the
            input's value at all times — the opposite of vanilla JS where you'd
            read `input.value` whenever you need it.
          */}
          <input
            type = "text"
            placeholder = "Search courses..."
            value = {search}
            onChange = {(e) => setSearch(e.target.value)} // e.target.value is the new text
            style = {{
              width: "100%", boxSizing: "border-box", padding: "6px 10px",
              fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 7,
              outline: "none", color: "#111827", background: "#f9fafb",
            }}/>
        </div>
      </div>
    </div> 
  )
}