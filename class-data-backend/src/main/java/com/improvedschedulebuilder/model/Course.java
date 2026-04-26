package com.improvedschedulebuilder.model;

import com.google.gson.Gson;
import java.util.List;

/**
 * Represents a single BU course with all of its sections.
 */
public class Course {
    // Course attributes
    private String id;
    private String code;
    private String name;
    private int credits;
    private String college;
    private String subject;
    private List<String> instructors;
    private List<String> hubCodes;
    private List<String> notes;
    private List<CourseSection> sections;

    // Getters and setters
    public String getId()                                           { return id; }
    public void setId(String id)                                    { this.id = id; }

    public String getCode()                                         { return code; }
    public void setCode(String code)                                { this.code = code; }

    public String getName()                                         { return name; }
    public void setName(String name)                                { this.name = name; }

    public int getCredits()                                         { return credits; }
    public void setCredits(int credits)                             { this.credits = credits; }

    public String getCollege()                                      { return college; }
    public void setCollege(String college)                          { this.college = college; }

    public String getSubject()                                      { return subject; }
    public void setSubject(String subject)                          { this.subject = subject; }

    public List<String> getInstructors()                            { return instructors; }
    public void setInstructors(List<String> instructors)            { this.instructors = instructors; }

    public List<String> getHubCodes()                               { return hubCodes; }
    public void setHubCodes(List<String> codes)                     { this.hubCodes = codes; }

    public List<String> getNotes()                                  { return notes; }
    public void setNotes(List<String> notes)                        { this.notes = notes; }

    public List<CourseSection> getSections()                        { return sections; }
    public void setSections(List<CourseSection> sections)           { this.sections = sections; }
}
