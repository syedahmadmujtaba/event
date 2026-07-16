import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  jsonb,
  boolean,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Configurable role → permission mapping (FR-28). Permissions are a fixed
// vocabulary defined in code (src/lib/permissions.ts); a role just holds the
// subset it grants, so there's no permissions table / join table to maintain.
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false), // system roles can't be deleted
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A user can hold multiple roles, scoped globally (eventId null) or to one event
// (FR-29). FK to events is added in Phase 3 when that table exists.
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    eventId: uuid("event_id"), // null → global scope
  },
  (t) => [unique().on(t.userId, t.roleId, t.eventId)],
);

// Opaque server-side sessions — stdlib crypto token in an httpOnly cookie.
// No JWT lib, trivially revocable.
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Email-verification tokens — same opaque-token pattern as sessions.
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// An occasion the host school organizes. Only status 'open' is offered at
// delegation signup; full activity/fee config lands in a later slice.
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").notNull().default("draft"), // draft | open | closed
  maxActivitiesPerParticipant: integer("max_activities_per_participant"), // null = no cap (FR-3a)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Organizer-set fee per payer type (FR-3). Amount in whole rupees.
// day 0 = flat event fee; day 1,2,… = per-day fee for multi-day events.
// ponytail: integer rupees; switch to paisa if sub-rupee fees ever appear.
export const eventFeeRules = pgTable(
  "event_fee_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    payerType: text("payer_type").notNull(), // host_student | delegation_student | delegation_registration | visitor
    amount: integer("amount").notNull(),
    day: integer("day").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.eventId, t.payerType, t.day)],
);

// Reusable org record (NFR-1) — one school participates across many events.
export const schools = pgTable(
  "schools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.name, t.city)], // dedup key
);

// The per-event join admin approves. No global approval — approval is always
// scoped to one event (FR-5). Reviewer/timestamp cover the audit trail (NFR-2).
export const delegationRegistrations = pgTable(
  "delegation_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    coordinatorUserId: uuid("coordinator_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.schoolId, t.eventId)], // one registration per school per event
);

// A unit within an event (FR-2). teamBased → coordinators form teams for it.
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("competitive"), // competitive | noncompetitive
  teamBased: boolean("team_based").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A student. Belongs to a school, reused across events/years (NFR-1).
export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  detail: text("detail"), // class / roll no / free-form
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Links a participant to an activity; drives the approval/payment pipeline (§8).
export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.participantId, t.activityId)],
);

// A roster from one school for a team-based activity (FR-8).
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.teamId, t.participantId)],
);

// Proof-of-payment (FR-13/14/15). Polymorphic payer so host-student registrations
// and visitor tickets reuse it later. slipRef is a storage reference, never a
// public URL — the file is served through a permission-gated route (NFR-3).
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  payerType: text("payer_type").notNull(), // delegation_registration | registration | visitor_ticket
  payerId: uuid("payer_id").notNull(),
  slipRef: text("slip_ref").notNull(),
  status: text("status").notNull().default("submitted"), // submitted | approved | rejected
  rejectionReason: text("rejection_reason"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
