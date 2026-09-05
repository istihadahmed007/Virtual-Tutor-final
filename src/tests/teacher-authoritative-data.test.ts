import { describe, it, expect } from "vitest";
import { 
  normalizeTeacherData, 
  AUTHORITATIVE_SEED_TEACHERS 
} from "@/lib/teacher-authoritative-data";

describe("Authoritative Teacher Data Normalization", () => {
  it("preserves authoritative rating and review count from seed data", () => {
    const rawTeacherFromListing = {
      userId: "teacher_prof_farhan",
      name: "Dr. Farhan Ahmed",
      rating: 5.0, // Listing was previously hardcoding 5.0
      totalReviews: 12, // Listing was previously hardcoding 12
    };

    const normalized = normalizeTeacherData(rawTeacherFromListing);

    // Dr. Farhan's authoritative rating is 4.96 with 124 reviews
    expect(normalized.rating).toBe(4.96);
    expect(normalized.reviewCount).toBe(124);
    expect(normalized.totalStudents).toBe(280);
    expect(normalized.hourlyRate).toBe(40);
  });

  it("handles unknown/newly created teachers with safe defaults", () => {
    const newTeacher = {
      userId: "usr_new_educator_99",
      name: "Sarah Jenkins",
      subjects: ["Biology"],
      hourlyRate: 35,
    };

    const normalized = normalizeTeacherData(newTeacher);

    expect(normalized.userId).toBe("usr_new_educator_99");
    expect(normalized.name).toBe("Sarah Jenkins");
    expect(normalized.rating).toBe(5.0);
    expect(normalized.reviewCount).toBe(0);
    expect(normalized.hourlyRate).toBe(35);
  });

  it("ensures seed teachers have valid weekly availability schedules", () => {
    for (const teacher of AUTHORITATIVE_SEED_TEACHERS) {
      expect(teacher.availableDays.length).toBeGreaterThan(0);
      expect(teacher.availableTimeSlots.length).toBeGreaterThan(0);
      expect(teacher.subjects.length).toBeGreaterThan(0);
      expect(teacher.hourlyRate).toBeGreaterThan(0);
      expect(teacher.rating).toBeGreaterThanOrEqual(4.5);
      expect(teacher.reviewCount).toBeGreaterThan(0);
    }
  });
});
