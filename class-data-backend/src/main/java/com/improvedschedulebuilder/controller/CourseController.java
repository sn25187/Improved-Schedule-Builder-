package com.improvedschedulebuilder.controller;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.improvedschedulebuilder.model.Course;
import com.improvedschedulebuilder.repository.CourseRepository;

@RestController // @Controller + @ResponseBody --> Spring MVC component that handles HTTP requests and return value is serialized to JSON
@RequestMapping("/api") // Every endpoint in this class is prefixed with /api.
@CrossOrigin(origins = "${cors.allowed-origins}") // Reads the allowed origins from application.properties
public class CourseController {
    @Autowired // Injects the CourseRepository 
    private CourseRepository courseRepository;

    /**
     * GET /api/courses
     * Optional query param: ?q=searchTerm
     * 
     * Returns no courses, or a filtered subset if ?q= is provided.
     */
    @GetMapping("/courses") 
    public ResponseEntity<List<Course>> getCourse(
            @RequestParam(required = false) String q) {

        List<Course> result = (q != null && !q.isBlank())
            ? courseRepository.search(q)
            : courseRepository.findAll();

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/courses/hub?codes=HUB-CRT,HUB-SO1
     * 
     * Returns courses that cover at least one of the provided HUB codes.
     */
    @GetMapping("/courses/hub")
    public ResponseEntity<List<Course>> getCoursesByHub(
            @RequestParam(required = false) String codes) {

        if (codes == null || codes.isBlank()) {
            return ResponseEntity.ok(List.of());
        }

        List<String> hubCodes = Arrays.stream(codes.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());

        return ResponseEntity.ok(courseRepository.findByHubCodes(hubCodes));
    }

    /**
     * GET /api/courses/{id}
     * 
     * Returns a single course by its course id.
     */
    @GetMapping("/courses/{id}")
    public ResponseEntity<Course> getCourseById(@PathVariable String id) {
        return courseRepository.findAll().stream()
                    .filter(c -> id.equals(c.getId()))
                    .findFirst()
                    .map(ResponseEntity::ok)                          // found -> 200 OK
                    .orElse(ResponseEntity.notFound().build());       // not found -> 404
    }

    /**
     * GET /api/health
     * 
     * Simple health-check endpoint. Useful for confirming the server is running 
     */
    @GetMapping("/health")
    public ResponseEntity<Object> health() {
        return ResponseEntity.ok(new Object() {
            public final String status = "ok";
            public final int courses = courseRepository.findAll().size();
        });
    }
}
