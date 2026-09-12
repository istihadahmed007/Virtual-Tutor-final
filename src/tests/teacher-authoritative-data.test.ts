import { describe, it, expect } from "vitest";
import { 
  normalizeTeacherData, 
  AUTHORITATIVE_SEED_TEACHERS,
  formatTk,
} from "@/lib/teacher-authoritative-data";

describe("Authoritative Teacher Data Normalization", () => {
  it("preserves authoritative rating and review count from real record and sets monthlyTuition in Tk", () => {
    const rawTeacherFromListing = {
      userId: "teacher_prof_farhan",
      name: "Dr. Farhan Ahmed",
      rating: 5.0,
      totalReviews: 12,
      totalStudents: 15,
      hourlyRate: 40,
    };

    const normalized = normalizeTeacherData(rawTeacherFromListing);

    expect(normalized.rating).toBe(5.0);
    expect(normalized.reviewCount).toBe(12);
    expect(normalized.totalStudents).toBe(15);
    expect(normalized.hourlyRate).toBe(40);
    expect(normalized.monthlyTuition).toBe(4000);
    expect(formatTk(normalized.monthlyTuition)).toBe("৳4,000");
  });

  it("handles explicit monthly tuition in Tk", () => {
    const rawTeacher = {
      userId: "teacher_prof_rahim",
      name: "Rahim Uddin",
      monthlyTuition: 5500,
    };

    const normalized = normalizeTeacherData(rawTeacher);
    expect(normalized.monthlyTuition).toBe(5500);
    expect(formatTk(normalized.monthlyTuition)).toBe("৳5,500");
  });

  it("handles unknown/newly created teachers with honest unrated defaults", () => {
    const newTeacher = {
      userId: "usr_new_educator_99",
      name: "Sarah Jenkins",
      subjects: ["Biology"],
      hourlyRate: 35,
    };

    const normalized = normalizeTeacherData(newTeacher);

    expect(normalized.userId).toBe("usr_new_educator_99");
    expect(normalized.name).toBe("Sarah Jenkins");
    expect(normalized.rating).toBe(0);
    expect(normalized.reviewCount).toBe(0);
    expect(normalized.hourlyRate).toBe(35);
    expect(normalized.monthlyTuition).toBe(3500);
    expect(formatTk(normalized.monthlyTuition)).toBe("৳3,500");
  });

  it("properly handles tuition entered directly in BDT (e.g. 3000) without multiplying by 100", () => {
    const bdtTeacher = {
      userId: "usr_tonmoy",
      name: "Tonmoy",
      subjects: ["General Studies"],
      hourlyRate: 3000,
    };

    const normalized = normalizeTeacherData(bdtTeacher);
    expect(normalized.monthlyTuition).toBe(3000);
    expect(formatTk(normalized.monthlyTuition)).toBe("৳3,000");
  });

  it("ensures seed teachers array contains no fabricated profiles", () => {
    expect(AUTHORITATIVE_SEED_TEACHERS).toHaveLength(0);
  });
});
