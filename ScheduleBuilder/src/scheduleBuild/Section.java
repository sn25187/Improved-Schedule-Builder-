package scheduleBuild;

import java.util.List;

/**
 * Represents a single section of a university course (e.g. a lecture, lab,
 * or independent study). Contains scheduling, enrollment, and instructor data.
 */
public class Section {

    //Identification
    private int index;               // e.g. 1700
    private int classNbr;            // e.g. 3020
    private String classSection;     // e.g. "A3"
    private String component;        // e.g. "IND", "LEC", "LAB"
    private String classType;        // e.g. "E"

    //Location
    private String locationDescr;    // e.g. "Charles River"

    //Instruction
    private String instructionModeDescr;  // e.g. "In-Person"

    //Enrollment
    private int classCapacity;
    private int waitCap;

    //Instructors & Meetings
    private List<Instructor> instructors;
    private List<Meeting> meetings;

    //Misc
    private String topic;
    private String crseAttr;
    private String crseAttrValue;
    private String combinedSection;  // "Y" or "N"
    private List<ReserveCap> reserveCaps;
    private List<String> notes;
    private List<String> icons;

    // -------------------------------------------------------------------------
    // Inner classes for nested JSON objects
    // --------------------- ----------------------------------------------------

    /**
     * An instructor assigned to this section.
     */
    public static class Instructor {
        private String name;
        private String email;

        public Instructor() {}

        public Instructor(String name, String email) {
            this.name = name;
            this.email = email;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        @Override
        public String toString() {
            return "Instructor{name='" + name + "', email='" + email + "'}";
        }
    }

    /**
     * A scheduled meeting time and place for this section.
     */
    public static class Meeting {
        private String days;            // e.g. "Tu"
        private String startTime;       // e.g. "13.30.00.000000"
        private String endTime;         // e.g. "15.15.00.000000"
        private String startDt;
        private String endDt;
        private String bldgCd;          // e.g. "EPC"
        private boolean bldgHasCoordinates;
        private String facilityDescr;   // e.g. "750 Commonwealth Ave EPC 102"
        private String room;            // e.g. "102"
        private String facilityId;      // e.g. "EPC 102"
        private String instructor;      // Instructor name for this meeting

        public Meeting() {}

        public Meeting(String days, String startTime, String endTime, String startDt,
                       String endDt, String bldgCd, boolean bldgHasCoordinates,
                       String facilityDescr, String room, String facilityId, String instructor) {
            this.days = days;
            this.startTime = startTime;
            this.endTime = endTime;
            this.startDt = startDt;
            this.endDt = endDt;
            this.bldgCd = bldgCd;
            this.bldgHasCoordinates = bldgHasCoordinates;
            this.facilityDescr = facilityDescr;
            this.room = room;
            this.facilityId = facilityId;
            this.instructor = instructor;
        }

        public String getDays() { return days; }

        public String getStartTime() { return startTime; }

        public String getEndTime() { return endTime; }

        public String getStartDt() { return startDt; }

        public String getEndDt() { return endDt; }

        public String getBldgCd() { return bldgCd; }

        public boolean isBldgHasCoordinates() { return bldgHasCoordinates; }

        public String getFacilityDescr() { return facilityDescr; }

        public String getRoom() { return room; }

        public String getFacilityId() { return facilityId; }

        public String getInstructor() { return instructor; }
        
        public void setDays(String days) { this.days = days; }

        public void setStartTime(String startTime) { this.startTime = startTime; }

        public void setEndTime(String endTime) { this.endTime = endTime; }

        public void setStartDt(String startDt) { this.startDt = startDt; }

        public void setEndDt(String endDt) { this.endDt = endDt; }

        public void setBldgCd(String bldgCd) { this.bldgCd = bldgCd; }

        public void isBldgHasCoordinates(boolean bldgHasCoordinates) { this.bldgHasCoordinates = bldgHasCoordinates; }

        public void setFacilityDescr(String facilityDescr) { this.facilityDescr = facilityDescr; }

        public void setRoom(String room) { this.room = room; }

        public void setFacilityId(String facilityId) { this.facilityId = facilityId; }

        public void setInstructor(String instructor) { this.instructor = instructor; }

        @Override
        public String toString() {
            return "Meeting{days='" + days + "', startTime='" + startTime +
                    "', endTime='" + endTime + "', facilityId='" + facilityId + "'}";
        }
    }

    /**
     * A reserve enrollment cap restricting seats to a specific academic population.
     */
    public static class ReserveCap {
        private int rsrvCapNbr;
        private String startDt;
        private int enrlCap;
        private String descr;
        private int enrlTot;

        public ReserveCap() {}

        public ReserveCap(int rsrvCapNbr, String startDt, int enrlCap, String descr, int enrlTot) {
            this.rsrvCapNbr = rsrvCapNbr;
            this.startDt = startDt;
            this.enrlCap = enrlCap;
            this.descr = descr;
            this.enrlTot = enrlTot;
        }

        public int getRsrvCapNbr() { return rsrvCapNbr; }
        public void setRsrvCapNbr(int rsrvCapNbr) { this.rsrvCapNbr = rsrvCapNbr; }

        public String getStartDt() { return startDt; }
        public void setStartDt(String startDt) { this.startDt = startDt; }

        public int getEnrlCap() { return enrlCap; }
        public void setEnrlCap(int enrlCap) { this.enrlCap = enrlCap; }

        public String getDescr() { return descr; }
        public void setDescr(String descr) { this.descr = descr; }

        public int getEnrlTot() { return enrlTot; }
        public void setEnrlTot(int enrlTot) { this.enrlTot = enrlTot; }

        @Override
        public String toString() {
            return "ReserveCap{rsrvCapNbr=" + rsrvCapNbr + ", descr='" + descr +
                    "', enrlCap=" + enrlCap + ", enrlTot=" + enrlTot + '}';
        }
    }

    // -------------------------------------------------------------------------
    // Section constructors
    // -------------------------------------------------------------------------

    public Section() {}

    public Section(int index, int classNbr, String classSection, String component,
                   String instructionModeDescr, int classCapacity, List<Instructor> instructors,
                   List<Meeting> meetings) {
        this.index = index;
        this.classNbr = classNbr;
        this.classSection = classSection;
        this.component = component;
        this.instructionModeDescr = instructionModeDescr;
        this.classCapacity = classCapacity;
        this.instructors = instructors;
        this.meetings = meetings;
    }

    // -------------------------------------------------------------------------
    // Getters and Setters
    // -------------------------------------------------------------------------

    public int getIndex() { return index; }
    public void setIndex(int index) { this.index = index; }

    public int getClassNbr() { return classNbr; }
    public void setClassNbr(int classNbr) { this.classNbr = classNbr; }

    public String getClassSection() { return classSection; }
    public void setClassSection(String classSection) { this.classSection = classSection; }

    public String getComponent() { return component; }
    public void setComponent(String component) { this.component = component; }

    public String getClassType() { return classType; }
    public void setClassType(String classType) { this.classType = classType; }

    public String getLocationDescr() { return locationDescr; }
    public void setLocationDescr(String locationDescr) { this.locationDescr = locationDescr; }

    public String getInstructionModeDescr() { return instructionModeDescr; }
    public void setInstructionModeDescr(String instructionModeDescr) { this.instructionModeDescr = instructionModeDescr; }

    public int getClassCapacity() { return classCapacity; }
    public void setClassCapacity(int classCapacity) { this.classCapacity = classCapacity; }

    public int getWaitCap() { return waitCap; }
    public void setWaitCap(int waitCap) { this.waitCap = waitCap; }

    public List<Instructor> getInstructors() { return instructors; }
    public void setInstructors(List<Instructor> instructors) { this.instructors = instructors; }

    public List<Meeting> getMeetings() { return meetings; }
    public void setMeetings(List<Meeting> meetings) { this.meetings = meetings; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getCrseAttr() { return crseAttr; }
    public void setCrseAttr(String crseAttr) { this.crseAttr = crseAttr; }

    public String getCrseAttrValue() { return crseAttrValue; }
    public void setCrseAttrValue(String crseAttrValue) { this.crseAttrValue = crseAttrValue; }

    public String getCombinedSection() { return combinedSection; }
    public void setCombinedSection(String combinedSection) { this.combinedSection = combinedSection; }

    public List<ReserveCap> getReserveCaps() { return reserveCaps; }
    public void setReserveCaps(List<ReserveCap> reserveCaps) { this.reserveCaps = reserveCaps; }

    public List<String> getNotes() { return notes; }
    public void setNotes(List<String> notes) { this.notes = notes; }

    public List<String> getIcons() { return icons; }
    public void setIcons(List<String> icons) { this.icons = icons; }
    
}