package scheduleBuild;

import java.io.File;
import java.util.Scanner;
import java.util.HashMap;
import java.util.ArrayList;

public class Main {

    public static void main(String[] args) {
        ArrayList<Course> courseCatalog = new ArrayList<>();
        HashMap<String, Course> courseMap = new HashMap<>();
        
        System.out.println("BU SBUILDER_BACKEND PROCESS --started");
        System.out.println("LOAD_STARTED");
        System.out.println("ACTION | COURSE_ID | SUB-ACTION (if any)"); //will prob not even see these
        
        try {
            File fileParse = new File("bu_classes.json"); 
            Scanner myScanner = new Scanner(fileParse);
            
            Course currentCourse = new Course();
            Section currentSection = new Section();
            String currentCrseId = null;

            // State flags
            String currentBlock = "ROOT"; 
            Section.Meeting currentMeeting = null;
            Section.Instructor currentInstructor = null;

            while(myScanner.hasNextLine()) {
                String line = myScanner.nextLine().trim();
                if (line.isEmpty()) continue;

                // --- BLOCK DETECTION ---
                if (line.contains("\"instructors\": [")) { currentBlock = "INSTRUCTORS"; continue; }
                if (line.contains("\"meetings\": ["))    { currentBlock = "MEETINGS";    continue; }
                if (line.contains("\"reserve_caps\": [")) { currentBlock = "RESERVE_CAPS"; continue; }
                if (line.equals("],") || line.equals("]")) { currentBlock = "ROOT"; continue; }

                // --- THE LANDMARK: NEW SECTION ---
                if (line.startsWith("\"index\":")) {
                    if (currentCrseId != null) {
                        saveToMap(currentCourse, currentSection, courseCatalog, courseMap);
                    }
                    currentCourse = new Course();
                    currentSection = new Section();
                    currentBlock = "ROOT";
                    currentCrseId = null;
                    currentSection.setIndex(safeParseInt(line));
                    continue;
                }

                // --- DATA PARSING ---
                if (currentBlock.equals("ROOT")) {
                    // Course Fields
                    if (line.startsWith("\"crse_id\":")) {
                        currentCrseId = safeParseString(line);
                        currentCourse.setCrseId(currentCrseId);
                    }
                    else if (line.startsWith("\"acad_group\":")) currentCourse.setCollege(safeParseString(line));
                    else if (line.startsWith("\"subject\":") && !line.contains("_descr")) currentCourse.setSubject(safeParseString(line));
                    else if (line.startsWith("\"catalog_nbr\":")) currentCourse.setCatalogNbr(safeParseString(line));
                    else if (line.startsWith("\"descr\":") && !line.contains("_descr")) currentCourse.setDescr(safeParseString(line));
                    else if (line.startsWith("\"units\":")) currentCourse.setUnits(safeParseString(line));
                    
                    // Section Fields
                    else if (line.startsWith("\"class_section\":")) currentSection.setClassSection(safeParseString(line));
                    else if (line.startsWith("\"class_nbr\":")) currentSection.setClassNbr(safeParseInt(line));
                    else if (line.startsWith("\"component\":")) currentSection.setComponent(safeParseString(line));
                    else if (line.startsWith("\"instruction_mode_descr\":")) currentSection.setInstructionModeDescr(safeParseString(line));
                    else if (line.startsWith("\"class_capacity\":")) currentSection.setClassCapacity(safeParseInt(line));
                    else if (line.startsWith("\"crse_attr\":")) currentSection.setCrseAttr(safeParseString(line));
                    else if (line.startsWith("\"crse_attr_value\":")) currentSection.setCrseAttrValue(safeParseString(line));
                } 
                else if (currentBlock.equals("MEETINGS")) {
                    if (line.equals("{")) {
                        currentMeeting = new Section.Meeting();
                    } else if (line.startsWith("}") || line.startsWith("},")) {
                        if (currentMeeting != null) {
                            if (currentSection.getMeetings() == null) currentSection.setMeetings(new ArrayList<>());
                            currentSection.getMeetings().add(currentMeeting);
                        }
                    } else if (currentMeeting != null) {
                        if (line.startsWith("\"days\":")) currentMeeting.setDays(safeParseString(line));
                        else if (line.contains("\"meet_start_tm\":") || line.contains("\"start_time\":")) currentMeeting.setStartTime(safeParseString(line));
                        else if (line.contains("\"meet_end_tm\":") || line.contains("\"end_time\":")) currentMeeting.setEndTime(safeParseString(line));
                        else if (line.startsWith("\"room\":")) currentMeeting.setRoom(safeParseString(line));
                    }
                }
                else if (currentBlock.equals("INSTRUCTORS")) {
                    if (line.equals("{")) {
                        currentInstructor = new Section.Instructor();
                    } else if (line.startsWith("}") || line.startsWith("},")) {
                        if (currentInstructor != null) {
                            if (currentSection.getInstructors() == null) currentSection.setInstructors(new ArrayList<>());
                            currentSection.getInstructors().add(currentInstructor);
                        }
                    } else if (currentInstructor != null) {
                        if (line.startsWith("\"name\":")) currentInstructor.setName(safeParseString(line));
                        if (line.startsWith("\"email\":")) currentInstructor.setEmail(safeParseString(line));
                    }
                }
            }
            
            saveToMap(currentCourse, currentSection, courseCatalog, courseMap);
            myScanner.close();
            
            System.out.println("--Process Completed!");
            System.out.println("LOAD_COMPLETE | " + courseCatalog.size() + " Unique Courses Loaded.");
            
            // --- TEST BLOCK ---
            String testId = "109223"; // CLASS

            if (courseMap.containsKey(testId)) {
                Course c = courseMap.get(testId);
                
                System.out.println("\n========================================");
                System.out.println("COURSE DETAILS: " + c.getSubject() + " " + c.getCatalogNbr());
                System.out.println("Title: " + c.getDescr());
                System.out.println("Total Sections Found: " + c.getSections().size());
                System.out.println("========================================");

                for (Section s : c.getSections()) {
                    System.out.println("\n  [Section " + s.getClassSection() + " - Nbr: " + s.getClassNbr() + "]");
                    System.out.println("  Mode: " + s.getInstructionModeDescr());
                    System.out.println("  Capacity: " + s.getClassCapacity());
                    System.out.println("  Course ATTR" + s.getCrseAttr());
                    System.out.println("  Course ATTR_VAL" + s.getCrseAttrValue());

                    if (s.getMeetings() != null && !s.getMeetings().isEmpty()) {
                        System.out.println("  Meetings:");
                        for (Section.Meeting m : s.getMeetings()) {
                            System.out.println("    - " + m.getDays() + " | " + m.getStartTime() + " to " + m.getEndTime());
                            System.out.println("      Room: " + m.getRoom());
                        }
                    }
                    
                    if (s.getInstructors() != null && !s.getInstructors().isEmpty()) {
                        System.out.println("  Instructors:");
                        for (Section.Instructor inst : s.getInstructors()) {
                            System.out.println("    - " + inst.getName() + " (" + inst.getEmail() + ")");
                        }
                    }
                    System.out.println("  ------------------------------------");
                }
            } else {
                System.out.println("Error: Course ID " + testId + " not found.");
            }
            //END TEST CASE /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
            //END TEST CASE /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void saveToMap(Course c, Section s, ArrayList<Course> cat, HashMap<String, Course> map) {
        if (c.getCrseId() == null) return;
        if (map.containsKey(c.getCrseId())) {
            map.get(c.getCrseId()).addSection(s);
            System.out.println("DUPLICATED_ENTRY | " + c.getCrseId() + " | SECTION_ADDED"); //debug
        } else {
            c.addSection(s);
            cat.add(c);
            map.put(c.getCrseId(), c);
            System.out.println("ADD_ENTRY | " + c.getCrseId()); //debug
        }
    }

    private static String safeParseString(String line) {
        String[] parts = line.split(":", 2);
        if (parts.length < 2) return ""; 
        String val = parts[1].trim();
        if (val.endsWith(",")) val = val.substring(0, val.length() - 1).trim();
        if (val.length() >= 2 && val.startsWith("\"") && val.endsWith("\"")) {
            val = val.substring(1, val.length() - 1);
        }
        return val.trim();
    }

    private static int safeParseInt(String line) {
        String val = safeParseString(line).replaceAll("[^0-9]", "");
        return val.isEmpty() ? 0 : Integer.parseInt(val);
    }
}