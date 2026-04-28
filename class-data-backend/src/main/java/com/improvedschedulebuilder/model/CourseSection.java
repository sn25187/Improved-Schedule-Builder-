package com.improvedschedulebuilder.model;

import com.google.gson.Gson;
import java.util.List;

/**
 * Represents one schedulable section of a course (e.g. Lecture A1, Discussion B2).
 */
public class CourseSection {
    // Course attributes
    private String sectionId;              // e.g. A1, B2
    private int classNbr;                  // BU's internal class number 
    private String type;                   // Lecture, Discussion, Lab, IND, etc.
    private List<Meeting> meetings;
    private List<String> instructors;      // Instructors
    private String topic;                  // Topic

    // Getters and setters
    public String getSectionId()                                { return sectionId; }
    public void setSectionId(String id)                         { this.sectionId = id; }
    
    public int getClassNbr()                                    { return classNbr; }
    public void setClassNbr(int nbr)                            { this.classNbr = nbr; }

    public String getType()                                     { return type; }
    public void setType(String type)                            { this.type = type; }

    public List<Meeting> getMeetings()                          { return meetings; }
    public void setMeetings(List<Meeting> meetings)             { this.meetings = meetings; }

    public List<String> getInstructors()                        { return instructors; }
    public void setInstructors(List<String> instructors)        { this.instructors = instructors; }

    public String getTopic()                                    { return topic; }
    public void setTopic(String topic)                          { this.topic = topic; }

    /**
     * Represents a single meeting time block within a section.
     * A section can have multiple meetings (e.g. a lab that meets
     * both MWF and a separate Friday recitation).
     */
    public static class Meeting {
        private List<String> days;         // e.g. ["Mon", "Wed", "Fri"]
        private String startTime;          // "HH:MM" format
        private String endTime;            // "HH:MM" format
        private String room;               // e.g. "CAS 313"
 
        public List<String> getDays()                   { return days; }
        public void setDays(List<String> days)          { this.days = days; }
 
        public String getStartTime()                    { return startTime; }
        public void setStartTime(String startTime)      { this.startTime = startTime; }
 
        public String getEndTime()                      { return endTime; }
        public void setEndTime(String endTime)          { this.endTime = endTime; }
 
        public String getRoom()                         { return room; }
        public void setRoom(String room)                { this.room = room; }
    }
}
