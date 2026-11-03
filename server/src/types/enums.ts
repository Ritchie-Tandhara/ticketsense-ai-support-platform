// Enum-like string literal unions. SQLite's Prisma connector has no native
// enum support, so these are the single source of truth for valid values,
// enforced at the application layer by Zod schemas in the route files.

export const ROLES = ["SUPER_ADMIN", "SUPPORT_MANAGER", "SUPPORT_AGENT", "READONLY_ANALYST"] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE", "FRUSTRATED"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const MESSAGE_TYPES = ["CUSTOMER_REPLY", "AGENT_REPLY", "INTERNAL_NOTE"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const RECOMMENDATION_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "EDITED"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const ASSIGNMENT_STRATEGIES = ["ROUND_ROBIN", "LEAST_ACTIVE", "CATEGORY_BASED", "PRIORITY_ESCALATION"] as const;
export type AssignmentStrategy = (typeof ASSIGNMENT_STRATEGIES)[number];
