import React from "react";
import { Helmet } from "react-helmet-async";

export interface SEOProps {
  /** The page title (will be suffixed with " | Virtual Tutor Pro" unless fullTitle is provided) */
  title?: string;
  /** Complete override for document title without suffix */
  fullTitle?: string;
  /** Meta description for search engine snippets and social sharing */
  description?: string;
  /** Comma-separated list or array of keywords */
  keywords?: string | string[];
  /** Canonical URL for the page */
  canonical?: string;
  /** Open Graph type (website, profile, article, etc.) */
  ogType?: "website" | "profile" | "article" | "book";
  /** URL to the preview image for Open Graph and Twitter cards */
  ogImage?: string;
  /** Prevent search engines from indexing this page (useful for private portals, classrooms, admin) */
  noindex?: boolean;
  /** JSON-LD structured data schema (object or array of schema objects) */
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** Custom extra children elements inside Helmet (e.g. extra meta or link tags) */
  children?: React.ReactNode;
}

export const DEFAULT_TITLE = "Virtual Tutor Pro";
export const DEFAULT_DESCRIPTION =
  "Virtual Tutor (ভার্চুয়াল টিউটর) - Modern live education platform connecting students and educators with interactive classrooms, academic scheduling, assignments, and AI tutoring.";
export const SITE_NAME = "Virtual Tutor Pro";
export const DEFAULT_OG_IMAGE = "/logo.svg";

export function buildDocumentTitle(title?: string, fullTitle?: string): string {
  if (fullTitle) return fullTitle;
  if (title) return `${title} | ${DEFAULT_TITLE}`;
  return `${DEFAULT_TITLE} - Online Tutoring & Live Classroom Platform`;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  fullTitle,
  description = DEFAULT_DESCRIPTION,
  keywords,
  canonical,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  structuredData,
  children,
}) => {
  const documentTitle = buildDocumentTitle(title, fullTitle);

  const keywordsString = Array.isArray(keywords) ? keywords.join(", ") : keywords;

  // Resolve canonical URL if provided, otherwise fallback to window origin if available
  const canonicalUrl =
    canonical ||
    (typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : undefined);

  // Fully-qualified image URL if relative
  const absoluteOgImage =
    ogImage && !ogImage.startsWith("http") && typeof window !== "undefined"
      ? `${window.location.origin}${ogImage.startsWith("/") ? "" : "/"}${ogImage}`
      : ogImage;

  return (
    <Helmet>
      {/* Primary Document Title */}
      <title>{documentTitle}</title>

      {/* Standard Meta Tags */}
      <meta name="description" content={description} />
      {keywordsString && <meta name="keywords" content={keywordsString} />}

      {/* Search Engine Robots Directives */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      {/* Canonical Link */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph Meta Tags (Facebook, LinkedIn, Discord, Slack) */}
      <meta property="og:title" content={documentTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {absoluteOgImage && <meta property="og:image" content={absoluteOgImage} />}

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={documentTitle} />
      <meta name="twitter:description" content={description} />
      {absoluteOgImage && <meta name="twitter:image" content={absoluteOgImage} />}

      {/* Optional Structured Data (Schema.org JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(structuredData)
              ? structuredData
              : { "@context": "https://schema.org", ...structuredData },
          )}
        </script>
      )}

      {children}
    </Helmet>
  );
};

export default SEO;
