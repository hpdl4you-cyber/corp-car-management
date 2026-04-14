import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  date,
  numeric,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "confirmed",
  "cancelled",
  "completed",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entraObjectId: text("entra_object_id").unique(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    department: text("department"),
    role: userRoleEnum("role").notNull().default("member"),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plate: text("plate").notNull().unique(),
    model: text("model").notNull(),
    year: integer("year"),
    vehicleType: text("vehicle_type"),
    department: text("department"),
    colorHex: text("color_hex").notNull().default("#3b82f6"),
    photoUrl: text("photo_url"),
    insuranceExpiry: date("insurance_expiry"),
    notes: text("notes"),
    lastLat: numeric("last_lat", { precision: 10, scale: 7 }),
    lastLng: numeric("last_lng", { precision: 10, scale: 7 }),
    lastLocationText: text("last_location_text"),
    lastLocationUpdatedAt: timestamp("last_location_updated_at", {
      withTimezone: true,
    }),
    lastLocationUpdatedBy: uuid("last_location_updated_by").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    lastReturnLocation: text("last_return_location").default("창원본사"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    plateIdx: uniqueIndex("vehicles_plate_idx").on(t.plate),
    activeIdx: index("vehicles_active_idx").on(t.isActive),
  }),
);

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    purpose: text("purpose"),
    destination: text("destination"),
    passengers: text("passengers"),
    status: reservationStatusEnum("status").notNull().default("confirmed"),
    checkinAt: timestamp("checkin_at", { withTimezone: true }),
    checkoutAt: timestamp("checkout_at", { withTimezone: true }),
    returnLocation: text("return_location"),
    checkinToken: text("checkin_token").unique(),
    checkoutToken: text("checkout_token").unique(),
    notificationSentAt: timestamp("notification_sent_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    vehicleTimeIdx: index("reservations_vehicle_time_idx").on(
      t.vehicleId,
      t.startAt,
      t.endAt,
    ),
    userIdx: index("reservations_user_idx").on(t.userId),
    statusIdx: index("reservations_status_idx").on(t.status),
  }),
);

export const tripLogs = pgTable("trip_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  reservationId: uuid("reservation_id")
    .notNull()
    .unique()
    .references(() => reservations.id, { onDelete: "cascade" }),
  startKm: integer("start_km").notNull(),
  endKm: integer("end_km").notNull(),
  fuelCost: integer("fuel_cost").default(0),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const maintenanceRecords = pgTable(
  "maintenance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: text("type").notNull(),
    cost: integer("cost").default(0),
    nextDueDate: date("next_due_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    vehicleIdx: index("maintenance_vehicle_idx").on(t.vehicleId),
    nextDueIdx: index("maintenance_next_due_idx").on(t.nextDueDate),
  }),
);

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  reservations: many(reservations),
  maintenanceRecords: many(maintenanceRecords),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [reservations.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
  tripLog: one(tripLogs, {
    fields: [reservations.id],
    references: [tripLogs.reservationId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations),
}));

export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type TripLog = typeof tripLogs.$inferSelect;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type NewTripLog = typeof tripLogs.$inferInsert;
