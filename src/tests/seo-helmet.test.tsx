import { describe, it, expect } from "vitest";
import React from "react";
import { SEO, buildDocumentTitle } from "@/components/SEO";
import { resolveRouteMeta, ROUTE_META_MAP } from "@/components/AppHelmet";

describe("SEO & React Helmet Management", () => {
  describe("buildDocumentTitle", () => {
    it("formats page title with default suffix", () => {
      expect(buildDocumentTitle("Find Verified Tutors")).toBe("Find Verified Tutors | Virtual Tutor Pro");
    });

    it("respects fullTitle without appending suffix", () => {
      expect(buildDocumentTitle("Find Verified Tutors", "Virtual Tutor Pro - Custom Landing")).toBe(
        "Virtual Tutor Pro - Custom Landing"
      );
    });

    it("falls back to default platform title when no title is provided", () => {
      expect(buildDocumentTitle()).toBe("Virtual Tutor Pro - Online Tutoring & Live Classroom Platform");
    });
  });

  describe("resolveRouteMeta dynamic route resolver", () => {
    it("resolves homepage metadata correctly as indexable", () => {
      const meta = resolveRouteMeta("/");
      expect(meta.title).toBe("Online Tutoring & Live Classroom Platform");
      expect(meta.noindex).toBe(false);
      expect(meta.description).toContain("expert educators");
    });

    it("resolves /teachers directory as public and indexable", () => {
      const meta = resolveRouteMeta("/teachers");
      expect(meta.title).toBe("Find Verified Tutors & Educators");
      expect(meta.noindex).toBe(false);
      expect(meta.keywords).toContain("verified tutors");
      expect(meta.description).toContain("monthly tuition");
    });

    it("resolves dynamic teacher profile routes (/teachers/:id) with profile ogType", () => {
      const meta = resolveRouteMeta("/teachers/prof_farhan");
      expect(meta.title).toBe("Educator Profile & Availability");
      expect(meta.ogType).toBe("profile");
      expect(meta.noindex).toBe(false);
    });

    it("resolves private student dashboard as noindex", () => {
      const meta = resolveRouteMeta("/dashboard");
      expect(meta.title).toBe("Student Dashboard");
      expect(meta.noindex).toBe(true);
    });

    it("resolves private classroom session routes as noindex", () => {
      const meta = resolveRouteMeta("/classroom/sess_live_123");
      expect(meta.title).toBe("Active Live Classroom Session");
      expect(meta.noindex).toBe(true);
    });

    it("resolves admin sub-routes dynamically with clean titles and noindex", () => {
      const metaVerif = resolveRouteMeta("/admin/verification");
      expect(metaVerif.title).toBe("Admin Console - Verification");
      expect(metaVerif.noindex).toBe(true);

      const metaAudit = resolveRouteMeta("/admin/audit-logs");
      expect(metaAudit.title).toBe("Admin Console - Audit Logs");
      expect(metaAudit.noindex).toBe(true);

      const metaOverview = resolveRouteMeta("/admin");
      expect(metaOverview.title).toBe("Admin Console - Overview");
      expect(metaOverview.noindex).toBe(true);
    });

    it("resolves unmatched 404 paths with Page Not Found and noindex", () => {
      const metaNotFound = resolveRouteMeta("/non-existent-page");
      expect(metaNotFound.title).toBe("Page Not Found");
      expect(metaNotFound.noindex).toBe(true);
    });

    it("verifies all public discovery pages in ROUTE_META_MAP are properly configured", () => {
      expect(ROUTE_META_MAP["/teachers"].noindex).toBe(false);
      expect(ROUTE_META_MAP["/community"].noindex).toBe(false);
      expect(ROUTE_META_MAP["/teacher-application"].noindex).toBe(false);
      expect(ROUTE_META_MAP["/resume-builder"].noindex).toBe(false);
    });
  });

  describe("SEO component JSX element generation", () => {
    it("instantiates SEO component with correct props", () => {
      const element = React.createElement(SEO, {
        title: "Test Page",
        description: "Test description for SEO",
        keywords: ["test", "seo"],
        noindex: true,
      });

      expect(element).toBeDefined();
      expect(element.props.title).toBe("Test Page");
      expect(element.props.description).toBe("Test description for SEO");
      expect(element.props.keywords).toEqual(["test", "seo"]);
      expect(element.props.noindex).toBe(true);
    });
  });
});
