#!/usr/bin/env python3
"""
reconstruct_courses.py

Transforms BU class scraper output (pages of flat section objects)
into a grouped course list matching the target courses.json structure.

Usage:
    python reconstruct_courses.py bu_classes.json output.json
    python reconstruct_courses.py bu_classes.json          # writes bu_classes_courses.json
"""

import json
import sys
from collections import OrderedDict
from pathlib import Path

# ── Day string parsing ────────────────────────────────────────────────────────

DAY_TOKENS = [
    ("Mo", "Mon"), ("Tu", "Tue"), ("We", "Wed"),
    ("Th", "Thu"), ("Fr", "Fri"), ("Sa", "Sat"), ("Su", "Sun"),
]

def parse_days(day_str: str) -> list:
    if not day_str or day_str.strip().upper() == "TBA":
        return []
    result = []
    remaining = day_str
    while remaining:
        for token, full in DAY_TOKENS:
            if remaining.startswith(token):
                result.append(full)
                remaining = remaining[len(token):]
                break
        else:
            remaining = remaining[1:]
    return result


# ── Time string parsing ───────────────────────────────────────────────────────

def parse_time(t: str) -> str:
    """'13.25.00.000000' -> '13:25'"""
    if not t:
        return ""
    parts = t.split(".")
    if len(parts) >= 2:
        return f"{parts[0]}:{parts[1]}"
    return t


# ── Component -> section type ─────────────────────────────────────────────────

COMPONENT_TYPE = {
    "LEC": "Lecture",
    "DIS": "Discussion",
    "LAB": "Laboratory",
}

def component_to_type(component: str) -> str:
    return COMPONENT_TYPE.get(component, component)


# ── Subject -> (college, dept_code) ──────────────────────────────────────────

COLLEGE_PREFIXES = {
    "ENG": "ENG", "COM": "COM", "MET": "MET", "QST": "QST",
    "SAR": "SAR", "SHA": "SHA", "SPH": "SPH", "SSW": "SSW",
    "STH": "STH", "WED": "WED", "LAW": "LAW", "MED": "MED",
    "CGS": "CGS", "CFA": "CFA", "CDS": "CDS", "GMS": "MED",
    "HUB": "BU1", "KHC": "BU1", "OTP": "BU1", "BUA": "BU1",
    "BU1": "BU1",
}

def subject_to_college_and_dept(subject: str):
    # CAS subjects: strip 3-char prefix, use remaining as dept code
    if subject.startswith("CAS") and len(subject) > 3:
        return "CAS", subject[3:]
    # All others: keep full subject as dept code
    college = COLLEGE_PREFIXES.get(subject[:3], subject[:3])
    return college, subject


# ── Hub codes ─────────────────────────────────────────────────────────────────

def parse_hub_codes(crse_attr: str, crse_attr_value: str) -> list:
    if crse_attr != "HUB" or not crse_attr_value:
        return []
    return [c.strip() for c in crse_attr_value.split(",") if c.strip()]


# ── Section builder ───────────────────────────────────────────────────────────

def build_meeting(m: dict) -> dict:
    """Convert a single raw meeting object into the output meeting format."""
    return {
        "days":      parse_days(m.get("days", "")),
        "startTime": parse_time(m.get("start_time", "")),
        "endTime":   parse_time(m.get("end_time", "")),
        "room":      m.get("facility_id", "") or "",
    }


def build_section(cls: dict) -> dict:
    raw_meetings = cls.get("meetings") or []
    meetings = [build_meeting(m) for m in raw_meetings]

    EXCLUDED_INSTRUCTORS = {"To Be Announced", "-", ""}
    instructors = [
        i["name"] for i in (cls.get("instructors") or [])
        if i.get("name") and i["name"] not in EXCLUDED_INSTRUCTORS
    ]

    section = {
        "sectionId":   cls.get("class_section", ""),
        "classNbr":    cls.get("class_nbr"),
        "meetings":    meetings,
        "type":        component_to_type(cls.get("component", "")),
        "instructors": instructors,
        "enrlStat":    cls.get("enrl_stat", ""),
    }

    # Per-section topic (e.g. WR120 where each section has a different topic)
    topic = (cls.get("topic") or "").strip()
    if topic:
        section["topic"] = topic

    return section



# ── Course key ────────────────────────────────────────────────────────────────

def make_course_key(cls: dict):
    crse_id = cls.get("crse_id")
    if crse_id:
        return crse_id
    subject     = cls.get("subject")
    catalog_nbr = cls.get("catalog_nbr")
    if subject and catalog_nbr:
        return f"{subject}:{catalog_nbr}"
    return None


# ── Credits ──────────────────────────────────────────────────────────────────

def parse_credits(units):
    """Returns credits as an int. Variable-credit courses (e.g. "0.5 - 8") default to 0."""
    try:
        return int(float(units))
    except (ValueError, TypeError):
        return 0


# ── Main reconstruction ───────────────────────────────────────────────────────

def reconstruct_courses(raw: list) -> list:
    courses = OrderedDict()
    skipped = 0
    section_count = 0

    for page in raw:
        if not isinstance(page, dict):
            skipped += 1
            continue

        classes = page.get("classes") or []
        if not isinstance(classes, list):
            skipped += 1
            continue

        for cls in classes:
            if not isinstance(cls, dict):
                skipped += 1
                continue

            key = make_course_key(cls)
            if key is None:
                skipped += 1
                continue

            if key not in courses:
                subject     = cls.get("subject", "")
                catalog_nbr = cls.get("catalog_nbr", "")
                college, dept = subject_to_college_and_dept(subject)
                code = f"{dept} {catalog_nbr}".strip() if dept else catalog_nbr

                courses[key] = {
                    "id":       cls.get("crse_id", ""),
                    "code":     code,
                    "name":     cls.get("descr", ""),
                    "credits":  parse_credits(cls.get("units", "")),
                    "college":  college,
                    "subject":  subject,
                    "hubCodes": parse_hub_codes(
                        cls.get("crse_attr", ""),
                        cls.get("crse_attr_value", ""),
                    ),
                    "notes":    cls.get("notes") or [],
                    "sections": [],
                    # scratch fields, removed before output
                    "_all_instructors": [],
                    "_section_topics":  [],
                }

            section = build_section(cls)
            courses[key]["sections"].append(section)

            # Accumulate unique course-level instructors
            for name in section["instructors"]:
                if name not in courses[key]["_all_instructors"]:
                    courses[key]["_all_instructors"].append(name)

            # Track per-section topics for promotion logic
            courses[key]["_section_topics"].append((cls.get("topic") or "").strip())

            section_count += 1

    # Finalize
    result = []
    for course in courses.values():
        course["instructors"] = course.pop("_all_instructors")
        topics = course.pop("_section_topics")

        non_empty = [t for t in topics if t]
        if non_empty:
            unique_topics = set(non_empty)
            all_have_topic = len(non_empty) == len(topics)
            if len(unique_topics) == 1 and all_have_topic:
                # Every section shares the same topic -> promote to course level only
                course["topic"] = unique_topics.pop()
                for s in course["sections"]:
                    s.pop("topic", None)
            # else: topics differ per section (e.g. WR120) -> already embedded per section

        result.append(course)

    print(f"[reconstruct] Pages processed : {len(raw)}", file=sys.stderr)
    print(f"[reconstruct] Sections grouped: {section_count}", file=sys.stderr)
    print(f"[reconstruct] Entries skipped : {skipped}", file=sys.stderr)
    print(f"[reconstruct] Courses output  : {len(result)}", file=sys.stderr)
    return result


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <input.json> [output.json]", file=sys.stderr)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f"Error: not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_path = (
        Path(sys.argv[2]) if len(sys.argv) >= 3
        else input_path.with_name(input_path.stem + "_courses.json")
    )

    print(f"[reconstruct] Reading {input_path} ...", file=sys.stderr)
    with open(input_path, encoding="utf-8") as f:
        raw = json.load(f)

    if not isinstance(raw, list):
        print("Error: expected a top-level JSON array.", file=sys.stderr)
        sys.exit(1)

    courses = reconstruct_courses(raw)

    print(f"[reconstruct] Writing {output_path} ...", file=sys.stderr)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)

    print("[reconstruct] Done.", file=sys.stderr)


if __name__ == "__main__":
    main()