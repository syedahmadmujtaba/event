import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
