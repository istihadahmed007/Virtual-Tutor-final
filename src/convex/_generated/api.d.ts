/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as assignments from "../assignments.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as authHelpers from "../authHelpers.js";
import type * as avatars from "../avatars.js";
import type * as bookings from "../bookings.js";
import type * as classroom from "../classroom.js";
import type * as community from "../community.js";
import type * as contact from "../contact.js";
import type * as emailService from "../emailService.js";
import type * as errorLogs from "../errorLogs.js";
import type * as http from "../http.js";
import type * as lessons from "../lessons.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as otp from "../otp.js";
import type * as payments from "../payments.js";
import type * as progress from "../progress.js";
import type * as recaptcha from "../recaptcha.js";
import type * as reviews from "../reviews.js";
import type * as securityAudit from "../securityAudit.js";
import type * as sessions from "../sessions.js";
import type * as studentProfiles from "../studentProfiles.js";
import type * as teachers from "../teachers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  assignments: typeof assignments;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  authHelpers: typeof authHelpers;
  avatars: typeof avatars;
  bookings: typeof bookings;
  classroom: typeof classroom;
  community: typeof community;
  contact: typeof contact;
  emailService: typeof emailService;
  errorLogs: typeof errorLogs;
  http: typeof http;
  lessons: typeof lessons;
  messages: typeof messages;
  notifications: typeof notifications;
  otp: typeof otp;
  payments: typeof payments;
  progress: typeof progress;
  recaptcha: typeof recaptcha;
  reviews: typeof reviews;
  securityAudit: typeof securityAudit;
  sessions: typeof sessions;
  studentProfiles: typeof studentProfiles;
  teachers: typeof teachers;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
