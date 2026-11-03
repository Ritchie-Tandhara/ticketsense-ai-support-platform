/* eslint-disable no-console */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { classifyTicket } from "../src/ai/deterministicClassifier";
import { addBusinessMinutes, addCalendarMinutes } from "../src/lib/businessHours";

const prisma = new PrismaClient();

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(days: number, hourJitter = true) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  if (hourJitter) {
    d.setHours(randInt(8, 19), randInt(0, 59), 0, 0);
  }
  return d;
}

const FIRST_NAMES = ["Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Rahul", "Ishita", "Karan", "Meera", "Aditya", "Divya", "Nikhil", "Pooja", "Sahil", "Tanya", "Varun", "Neha", "Yash", "Riya", "Siddharth", "Aisha", "Manish"];
const LAST_NAMES = ["Sharma", "Verma", "Patel", "Gupta", "Mehta", "Iyer", "Kapoor", "Nair", "Reddy", "Joshi", "Chawla", "Malhotra", "Bose", "Khanna", "Rao"];
const DOMAINS = ["acme-corp.com", "brightleaf.io", "nimbuscloud.com", "vertexsystems.net", "clearpath.co", "gmail.com", "outlook.com"];

function randomCustomer() {
  const first = rand(FIRST_NAMES);
  const last = rand(LAST_NAMES);
  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 99)}@${rand(DOMAINS)}`,
  };
}

const TICKET_TEMPLATES: { subject: string; description: string }[] = [
  { subject: "Cannot log into my account", description: "I have been trying to log in since this morning but it keeps saying invalid password. I reset it twice already. This is urgent, I cannot access my dashboard." },
  { subject: "Charged twice for the same invoice", description: "I was charged twice for invoice #4521 this month. Please refund the duplicate charge as soon as possible, this is unacceptable." },
  { subject: "App crashes when exporting report", description: "Every time I click export on the reports page the app crashes with an error. This is blocking my entire team from getting data out." },
  { subject: "Feature request: dark mode", description: "It would be great if you could add a dark mode option to the dashboard. Not urgent, just a nice to have suggestion." },
  { subject: "API integration returning 500 errors", description: "Our webhook integration started returning 500 errors in production an hour ago. This is affecting all users downstream, please help urgently." },
  { subject: "How do I change my billing email", description: "Just wondering how I can update the email address used for invoices. Thanks in advance." },
  { subject: "Extremely slow dashboard loading", description: "The dashboard has been painfully slow and laggy for the past two days, timing out frequently. Please investigate the performance issue." },
  { subject: "Please delete my account", description: "I would like to close and deactivate my account permanently. Please confirm once done." },
  { subject: "Thank you for the quick fix", description: "Just wanted to say thank you, your team resolved my previous issue quickly and I really appreciate the excellent support." },
  { subject: "Production outage - system down", description: "Our entire team is blocked, the system is down in production. This is a critical emergency affecting all users and revenue, please escalate immediately." },
  { subject: "Minor UI glitch on settings page", description: "There's a small visual bug where the save button overlaps the text field on the settings page. Not a big deal." },
  { subject: "Request to add new team member", description: "Could you help me understand how to add a new teammate to our workspace? Thanks." },
  { subject: "Payment failed during checkout", description: "My card was declined during checkout even though it has sufficient balance. Tried three times, getting frustrated with this payment error." },
  { subject: "Data sync issue with integration", description: "Our CRM integration sync failed last night and data is now out of sync across the whole company. Please help resolve this broken integration." },
  { subject: "Love the new analytics feature", description: "The new analytics charts are awesome, really love the new look. Great work from the team!" },
  { subject: "Need help understanding SLA policy", description: "Just have a question about how your SLA policy works for enterprise plans. Appreciate any info." },
  { subject: "Two factor authentication locked me out", description: "I am locked out after losing access to my 2FA device. I cannot access my account at all, please help urgently." },
  { subject: "Invoice missing tax breakdown", description: "The latest invoice is missing a line-item tax breakdown that we need for our accounting. Could you send a corrected receipt?" },
  { subject: "Suggestion for bulk edit feature", description: "It would really help if we could bulk edit multiple records at once. Just a suggestion/feature request for a future enhancement." },
  { subject: "Worst experience, nothing works", description: "This is honestly the worst experience, nothing on this platform works and I am furious. Everything is broken and the team seems unresponsive." },
];

async function main() {
  console.log("Seeding TicketSense...");

  // Reset in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.aIRecommendation.deleteMany();
  await prisma.ticketEvent.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.sLAInstance.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.assignmentRule.deleteMany();
  await prisma.sLAPolicy.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  // ---- Teams ----
  const teamNames = ["Tier 1 Support", "Tier 2 Technical", "Billing Operations", "Escalations"];
  const teams = await Promise.all(
    teamNames.map((name, i) =>
      prisma.team.create({ data: { name, description: `${name} team`, isEscalation: name === "Escalations" } })
    )
  );
  const [tier1, tier2, billing, escalations] = teams;

  // ---- Categories ----
  const categoryDefs = [
    { name: "Technical", description: "Bugs, performance, integrations, login issues" },
    { name: "Billing", description: "Invoices, refunds, payments" },
    { name: "Account", description: "Account setup, deletion, profile" },
    { name: "Feature Request", description: "Enhancement suggestions" },
    { name: "General", description: "General inquiries" },
  ];
  const categories = await Promise.all(categoryDefs.map((c) => prisma.ticketCategory.create({ data: c })));
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  // ---- Users ----
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const superAdmin = await prisma.user.create({
    data: { name: "Asha Admin", email: "admin@ticketsense.io", passwordHash, role: "SUPER_ADMIN", teamId: tier1.id },
  });
  const manager = await prisma.user.create({
    data: { name: "Manoj Manager", email: "manager@ticketsense.io", passwordHash, role: "SUPPORT_MANAGER", teamId: tier1.id },
  });
  const analyst = await prisma.user.create({
    data: { name: "Reena Analyst", email: "analyst@ticketsense.io", passwordHash, role: "READONLY_ANALYST", teamId: tier1.id },
  });

  const agentDefs = [
    { name: "Agent Aarav Kumar", team: tier1, senior: true },
    { name: "Agent Bhavna Singh", team: tier1, senior: false },
    { name: "Agent Chetan Rao", team: tier1, senior: false },
    { name: "Agent Diya Mehta", team: tier1, senior: false },
    { name: "Agent Esha Nair", team: tier2, senior: true },
    { name: "Agent Farhan Ali", team: tier2, senior: false },
    { name: "Agent Gauri Joshi", team: tier2, senior: false },
    { name: "Agent Harish Patel", team: billing, senior: true },
    { name: "Agent Ira Kapoor", team: billing, senior: false },
    { name: "Agent Jatin Verma", team: billing, senior: false },
    { name: "Agent Kiran Bose", team: escalations, senior: true },
    { name: "Agent Leela Chawla", team: escalations, senior: true },
  ];

  const agents = [];
  for (let i = 0; i < agentDefs.length; i++) {
    const def = agentDefs[i];
    const email = `agent${i + 1}@ticketsense.io`;
    const agent = await prisma.user.create({
      data: {
        name: def.name,
        email,
        passwordHash,
        role: "SUPPORT_AGENT",
        teamId: def.team.id,
        isSeniorAgent: def.senior,
        maxLoad: 12,
      },
    });
    agents.push(agent);
  }

  console.log(`Created ${agents.length} agents, 3 non-agent users, ${teams.length} teams, ${categories.length} categories.`);

  // ---- SLA Policies ----
  const slaDefs = [
    { name: "Low Priority SLA", priority: "LOW", firstResponseTargetMin: 480, resolutionTargetMin: 4320, businessHoursOnly: true },
    { name: "Medium Priority SLA", priority: "MEDIUM", firstResponseTargetMin: 240, resolutionTargetMin: 1440, businessHoursOnly: true },
    { name: "High Priority SLA", priority: "HIGH", firstResponseTargetMin: 60, resolutionTargetMin: 480, businessHoursOnly: true },
    { name: "Critical Priority SLA", priority: "CRITICAL", firstResponseTargetMin: 15, resolutionTargetMin: 240, businessHoursOnly: false },
  ];
  await Promise.all(slaDefs.map((s) => prisma.sLAPolicy.create({ data: s })));

  // ---- Assignment Rules ----
  await prisma.assignmentRule.create({
    data: { name: "Critical -> Escalation / Senior", order: 1, strategy: "PRIORITY_ESCALATION", conditionPriority: "CRITICAL", targetTeamId: tier1.id },
  });
  await prisma.assignmentRule.create({
    data: { name: "Billing category -> Billing Ops (least active)", order: 2, strategy: "LEAST_ACTIVE", conditionCategoryId: catByName["Billing"].id, targetTeamId: billing.id },
  });
  await prisma.assignmentRule.create({
    data: { name: "Technical category -> Tier 2 (category based)", order: 3, strategy: "CATEGORY_BASED", conditionCategoryId: catByName["Technical"].id, targetTeamId: tier2.id },
  });
  await prisma.assignmentRule.create({
    data: { name: "Default -> Tier 1 round robin", order: 99, strategy: "ROUND_ROBIN", isDefault: true, targetTeamId: tier1.id },
  });

  // ---- Knowledge base ----
  const kbDefs = [
    { title: "How to reset your password", body: "Go to the login page and click 'Forgot password'. Follow the emailed link to set a new password. If you do not receive the email within 10 minutes check your spam folder.", tags: "login,password,access,authentication" },
    { title: "Understanding your invoice", body: "Each invoice includes a line-item breakdown of charges, applicable taxes, and payment method used. Refunds for duplicate charges are typically processed within 5-7 business days.", tags: "billing,invoice,refund,payment" },
    { title: "Troubleshooting slow dashboard performance", body: "Clear your browser cache, disable heavy browser extensions, and ensure you are on a supported browser version. If the dashboard is still slow, check our status page for ongoing incidents.", tags: "performance,slow,dashboard,technical" },
    { title: "Setting up API webhooks", body: "Webhooks can be configured under Settings > Integrations. Ensure your endpoint returns a 200 status within 5 seconds, otherwise the webhook will be retried and may eventually fail.", tags: "api,webhook,integration,technical" },
    { title: "How to close or delete your account", body: "Account deletion is permanent. Navigate to Settings > Account > Delete Account. All data is purged within 30 days per our data retention policy.", tags: "account,deletion,delete,close" },
    { title: "Submitting a feature request", body: "We welcome feature requests via the in-app feedback widget or by emailing feedback@ticketsense.io. Popular requests are reviewed quarterly by product.", tags: "feature,request,enhancement,suggestion" },
  ];
  for (const kb of kbDefs) {
    await prisma.knowledgeArticle.create({ data: { ...kb, isPublished: true, authorId: manager.id } });
  }
  await prisma.knowledgeArticle.create({
    data: { title: "DRAFT: Upcoming SSO rollout notes", body: "Internal draft notes about SSO rollout, not ready for publishing yet.", tags: "sso,draft", isPublished: false, authorId: manager.id },
  });

  // ---- Tickets (~120, spread over ~60 days) ----
  const allPolicies = await prisma.sLAPolicy.findMany();
  const policyByPriority = Object.fromEntries(allPolicies.map((p) => [p.priority, p]));
  const statusPool: string[] = ["NEW", "OPEN", "OPEN", "IN_PROGRESS", "IN_PROGRESS", "PENDING", "RESOLVED", "RESOLVED", "RESOLVED", "CLOSED", "CLOSED"];

  let ticketNumber = 1001;
  const totalTickets = 120;

  for (let i = 0; i < totalTickets; i++) {
    const template = rand(TICKET_TEMPLATES);
    const customer = randomCustomer();
    const ageInDays = Math.floor((i / totalTickets) * 60) + randInt(0, 1); // spread across ~60 days
    const createdAt = daysAgo(60 - ageInDays);

    const classification = classifyTicket(template.subject, template.description);
    const category = catByName[classification.category] ?? catByName["General"];

    const status = rand(statusPool) as string;
    const team = rand(teams);
    const agent = Math.random() > 0.08 ? rand(agents.filter((a) => a.teamId === team.id) || agents) : null;
    const assignedAgent = agent ?? (Math.random() > 0.5 ? rand(agents) : null);

    const reopenCount = status === "CLOSED" && Math.random() < 0.15 ? 1 : 0;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: ticketNumber++,
        subject: template.subject,
        description: template.description,
        status,
        priority: classification.priority,
        sentiment: classification.sentiment,
        requesterName: customer.name,
        requesterEmail: customer.email,
        categoryId: category.id,
        teamId: team.id,
        assignedAgentId: assignedAgent?.id,
        createdById: manager.id,
        reopenCount,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // SLA instance
    const policy = policyByPriority[classification.priority];
    if (policy) {
      const firstResponseDueAt = policy.businessHoursOnly
        ? addBusinessMinutes(createdAt, policy.firstResponseTargetMin)
        : addCalendarMinutes(createdAt, policy.firstResponseTargetMin);
      const resolutionDueAt = policy.businessHoursOnly
        ? addBusinessMinutes(createdAt, policy.resolutionTargetMin)
        : addCalendarMinutes(createdAt, policy.resolutionTargetMin);

      const isResolved = status === "RESOLVED" || status === "CLOSED";
      // ~30% chance of a breach for realism, more likely for older/critical tickets
      const breachRoll = Math.random();
      const firstResponseBreached = !isResolved ? breachRoll < 0.2 && new Date() > firstResponseDueAt : breachRoll < 0.15;
      const resolutionBreached = isResolved ? breachRoll < 0.25 : breachRoll < 0.2 && new Date() > resolutionDueAt;

      await prisma.sLAInstance.create({
        data: {
          ticketId: ticket.id,
          slaPolicyId: policy.id,
          firstResponseDueAt,
          resolutionDueAt,
          firstResponseBreached,
          resolutionBreached,
          firstResponseMetAt: !firstResponseBreached && Math.random() > 0.3 ? new Date(createdAt.getTime() + randInt(5, 120) * 60000) : null,
          resolvedMetAt: isResolved ? new Date(createdAt.getTime() + randInt(60, 2000) * 60000) : null,
        },
      });
    }

    // first response + resolved/closed timestamps on the ticket itself
    const firstRespondedAt = Math.random() > 0.15 ? new Date(createdAt.getTime() + randInt(5, 180) * 60000) : null;
    const resolvedAt = status === "RESOLVED" || status === "CLOSED" ? new Date(createdAt.getTime() + randInt(60, 4000) * 60000) : null;
    const closedAt = status === "CLOSED" ? new Date((resolvedAt ?? createdAt).getTime() + randInt(60, 500) * 60000) : null;
    await prisma.ticket.update({ where: { id: ticket.id }, data: { firstRespondedAt, resolvedAt, closedAt } });

    // messages
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, type: "CUSTOMER_REPLY", body: template.description, createdAt },
    });
    if (firstRespondedAt && assignedAgent) {
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: assignedAgent.id, type: "AGENT_REPLY", body: "Thanks for reaching out, we're looking into this now.", createdAt: firstRespondedAt },
      });
      if (Math.random() > 0.6) {
        await prisma.ticketMessage.create({
          data: { ticketId: ticket.id, authorId: assignedAgent.id, type: "INTERNAL_NOTE", body: "Checked logs, escalating if not resolved by EOD.", createdAt: new Date(firstRespondedAt.getTime() + 30 * 60000) },
        });
      }
    }

    // events
    await prisma.ticketEvent.create({ data: { ticketId: ticket.id, type: "CREATED", message: "Ticket created.", createdAt } });
    if (assignedAgent) {
      await prisma.ticketEvent.create({
        data: { ticketId: ticket.id, type: "ASSIGNMENT", message: `Assigned to ${assignedAgent.name}.`, createdAt: new Date(createdAt.getTime() + 2 * 60000) },
      });
    }
    if (reopenCount > 0) {
      await prisma.ticketEvent.create({
        data: { ticketId: ticket.id, type: "REOPEN", message: "Ticket reopened by customer after closure.", createdAt: new Date((resolvedAt ?? createdAt).getTime() + 100 * 60000) },
      });
    }

    // AI recommendation history, mix of accepted/rejected/edited/pending
    const decisionRoll = Math.random();
    let recStatus = "PENDING";
    let reviewedById: string | null = null;
    let editedValue: string | null = null;
    if (decisionRoll < 0.45) {
      recStatus = "ACCEPTED";
      reviewedById = assignedAgent?.id ?? manager.id;
    } else if (decisionRoll < 0.65) {
      recStatus = "REJECTED";
      reviewedById = assignedAgent?.id ?? manager.id;
    } else if (decisionRoll < 0.85) {
      recStatus = "EDITED";
      reviewedById = assignedAgent?.id ?? manager.id;
      editedValue = JSON.stringify({ suggestedPriority: rand(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) });
    }

    await prisma.aIRecommendation.create({
      data: {
        ticketId: ticket.id,
        suggestedCategory: classification.category,
        suggestedSubcategory: classification.subcategory,
        suggestedPriority: classification.priority,
        suggestedSentiment: classification.sentiment,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        status: recStatus,
        reviewedById,
        editedValue,
        reviewedAt: recStatus !== "PENDING" ? new Date(createdAt.getTime() + 10 * 60000) : null,
        createdAt,
      },
    });
  }

  console.log(`Created ${totalTickets} tickets with messages, events, SLA instances, and AI recommendations.`);

  // ---- Audit log sample entries ----
  await prisma.auditLog.create({ data: { actorId: superAdmin.id, action: "LOGIN", entity: "User", entityId: superAdmin.id } });
  await prisma.auditLog.create({ data: { actorId: manager.id, action: "CREATE", entity: "AssignmentRule", details: JSON.stringify({ name: "Critical escalation rule" }) } });
  await prisma.auditLog.create({ data: { actorId: manager.id, action: "UPDATE", entity: "SLAPolicy", details: JSON.stringify({ priority: "CRITICAL" }) } });

  console.log("Seed complete.");
  console.log("\nLogin credentials (password for all: Password123!):");
  console.log("  Super Admin:      admin@ticketsense.io");
  console.log("  Support Manager:  manager@ticketsense.io");
  console.log("  Support Agent:    agent1@ticketsense.io");
  console.log("  Readonly Analyst: analyst@ticketsense.io");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
