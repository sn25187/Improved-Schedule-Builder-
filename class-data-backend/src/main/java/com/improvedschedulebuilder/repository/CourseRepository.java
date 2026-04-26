package com.improvedschedulebuilder.repository;

import com.improvedschedulebuilder.model.Course;

import jakarta.annotation.PostConstruct;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Repository for courses for Spring to access.
 */
@Repository // Marks this as a Spring managed data access component.
public class CourseRepository {
    // Gson object
    Gson gson = new Gson();

    // Full list of courses, loaded once from courses.json at startup
    private List<Course> courses = new ArrayList<>();

    /**
     * Loads JSON file into memory, so every search request doesn't
     * re-read the file from disk.
     */
    @PostConstruct
    public void loadData() {
        try {
            // ClassPathResource looks for the file under src/main/resources/static
            InputStream inputStream = new ClassPathResource("static/courses.json").getInputStream();

            // Deserialize JSON array into a list of Course objects
            Type courseListType = new TypeToken<List<Course>>() {}.getType();
            courses = gson.fromJson(new InputStreamReader(inputStream), courseListType);

            System.out.println("Loaded " + courses.size() + " courses from courses.json");
        } catch (Exception e) {
            System.err.println("Failed to load courses.json: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Returns all courses (used by the frontend to load the initial list).
     */
    public List<Course> findAll() {
        return courses;
    }

    /**
     * Searches courses by a query string. Checks the course code, name,
     * and fields. Case-insensitive.
     * 
     * Java Streams work like a pipeline: sources -> filter -> collect.
     *  .stream()         = turn the list into a stream
     *  .filter(c -> ...) = keep only elements where the lambda returns true
     *  .collect(...)     = gather the results back into a List
     */
    public List<Course> search(String query) {
        // Return nothing if nothing is entered
        if (query == null || query.isBlank()) {
            return List.of();
        }
        
        // Turn the query to lowercase
        String q = query.toLowerCase();

        // Return the filtered results
        return courses.stream()
            .filter(c ->
                (c.getCode()    != null && c.getCode().toLowerCase().contains(q)) ||
                (c.getName()    != null && c.getName().toLowerCase().contains(q)) ||
                (c.getSubject() != null && c.getSubject().toLowerCase().contains(q)) ||
                (c.getCollege() != null && c.getCollege().toLowerCase().contains(q)) 
            )
            .collect(Collectors.toList());
    }

    /**
     * Returns courses that have AT LEAST ONE of the given HUB codes.
     */
    public List<Course> findByHubCodes(List<String> hubCodes) {
        // Returns nothing 
        if (hubCodes == null || hubCodes.isEmpty()) {
            return List.of();
        }

        return courses.stream()
            .filter(c -> c.getHubCodes() != null &&
                         c.getHubCodes().stream().anyMatch(hubCodes::contains))
            .collect(Collectors.toList());
    }
}
