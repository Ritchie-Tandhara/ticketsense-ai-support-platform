export type Role = "SUPER_ADMIN" | "SUPPORT_MANAGER" | "SUPPORT_AGENT" | "READONLY_ANALYST";
export type TicketStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "FRUSTRATED";
export type MessageType = "CUSTOMER_REPLY" | "AGENT_REPLY" | "INTERNAL_NOTE";
export type RecommendationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EDITED";
export type AssignmentStrategy = "ROUND_ROBIN" | "LEAST_ACTIVE" | "CATEGORY_BASED" | "PRIORITY_ESCALATION";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  teamId?: string | null;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  isEscalation: boolean;
  members?: User[];
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
}

export interface SLAInstance {
  id: string;
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  firstResponseMetAt?: string | null;
  resolvedMetAt?: string | null;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  sentiment?: Sentiment | null;
  requesterName: string;
  requesterEmail: string;
  categoryId?: string | null;
  category?: Category | null;
  teamId?: string | null;
  team?: Team | null;
  assignedAgentId?: string | null;
  assignedAgent?: User | null;
  reopenCount: number;
  firstRespondedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  slaInstance?: SLAInstance | null;
  allowedNextStatuses?: TicketStatus[];
  messages?: TicketMessage[];
  events?: TicketEvent[];
  recommendations?: AIRecommendation[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId?: string | null;
  author?: User | null;
  type: MessageType;
  body: string;
  createdAt: string;
}

export interface TicketEvent {
  id: string;
  ticketId: string;
  actorId?: string | null;
  actor?: User | null;
  type: string;
  message: string;
  createdAt: string;
}

export interface AIRecommendation {
  id: string;
  ticketId: string;
  ticket?: Ticket;
  suggestedCategory?: string | null;
  suggestedSubcategory?: string | null;
  suggestedPriority?: TicketPriority | null;
  suggestedSentiment?: Sentiment | null;
  confidence: number;
  reasoning: string;
  status: RecommendationStatus;
  reviewedBy?: User | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface AssignmentRule {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  isDefault: boolean;
  conditionPriority?: TicketPriority | null;
  conditionCategoryId?: string | null;
  conditionCategory?: Category | null;
  strategy: AssignmentStrategy;
  targetTeamId?: string | null;
  targetTeam?: Team | null;
}

export interface SLAPolicy {
  id: string;
  name: string;
  priority: TicketPriority;
  firstResponseTargetMin: number;
  resolutionTargetMin: number;
  businessHoursOnly: boolean;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  body: string;
  tags: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface KpiResponse {
  total: number;
  open: number;
  resolved: number;
  closed: number;
  pending: number;
  unassigned: number;
  critical: number;
  slaAtRisk: number;
  slaBreached: number;
  avgFirstResponseMin: number;
  avgResolutionMin: number;
  fcrRate: number;
}

export interface AuditLogEntry {
  id: string;
  actor?: User | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  createdAt: string;
}
