package scheduleBuild;

import java.util.ArrayList;
import java.util.List;
 
/**
 * Represents a university course offering, containing course-level metadata
 * and a list of its associated sections (e.g. lectures, labs, independents).
 */
public class Course {
 
    private String crseId;           // e.g. "180078"
    private String college;          // e.g  "ENG"
    private String subject;          // e.g. "EK"
    private String subjectDescr;     // e.g. "ENGEK Engineering Core"
    private String catalogNbr;       // e.g. "131"
    private String descr;            // e.g. "Introduction to Engineering: Hands On"
    private String units;            // e.g. "2"
 
    private List<Section> sections;
 
    public Course() {
        this.sections = new ArrayList<>();
    }
 
    public Course(String crseId, String college, String subject, String subjectDescr,
                  String catalogNbr, String descr, String units) {
        this.crseId = crseId;
        this.college = college;
        this.subject = subject;
        this.subjectDescr = subjectDescr;
        this.catalogNbr = catalogNbr;
        this.descr = descr;
        this.units = units;
        this.sections = new ArrayList<>();
    }
 
    //Section management
 
    public void addSection(Section section) {
        this.sections.add(section);
    }
 
    public void removeSection(Section section) {
        this.sections.remove(section);
    }
 
    //Getters and Setters
 
    public String getCrseId(){ return crseId; }
 
    public String getCollege(){ return college; }

    public String getSubject() { return subject; }
 
    public String getSubjectDescr() { return subjectDescr; }
 
    public String getCatalogNbr() { return catalogNbr; }
 
    public String getDescr() { return descr; }
 
    public String getUnits() { return units; }
 
    public List<Section> getSections() { return sections; }
    
    public void setSections(List<Section> sections) { this.sections = sections; }
    
    //SETTERS
    
    public void setCrseId(String crseId){ this.crseId = crseId; }
    
    public void setCollege(String college){ this.college = college; }

    public void setSubject(String subject) { this.subject = subject; }
 
    public void setSubjectDescr(String subjectDescr) { this.subjectDescr = subjectDescr; }
 
    public void setCatalogNbr(String catalogNbr) { this.catalogNbr = catalogNbr; }
 
    public void setDescr(String descr) { this.descr = descr; }
 
    public void setUnits(String units) { this.units = units; }

}