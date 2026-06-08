import "dotenv/config";
import { PrismaClient, Priority, TaskStatus, TaskCategory, FollowUpStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const prisma = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : new PrismaClient();

const DEMO_EMAIL = "demo@aiexec.app";
const DEMO_PASSWORD = "password123";

const COMPANIES = ["Northwind", "Acme Corp", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Enterprises", "Hooli", "Pied Piper", "Soylent"];
const FIRST_NAMES = ["Jordan", "Casey", "Morgan", "Riley", "Avery", "Taylor", "Sam", "Jamie", "Drew", "Robin", "Quinn", "Reese", "Blake", "Hayden", "Skyler", "Rowan", "Emerson", "Finley", "Sage", "Elliot", "Charlie", "Dakota", "Harper", "Kendall", "Logan"];
const ROLES = ["VP of Operations", "Product Manager", "Engineering Lead", "Head of Sales", "CFO", "Marketing Director", "Founder", "Chief of Staff", "Account Executive", "Designer"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function daysFromNow(days: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log(`Seeding against ${connectionString ? "configured DATABASE_URL" : "no DATABASE_URL (will likely fail without a database)"}...`);

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Jordan Avery",
      password: hashedPassword,
      timezone: "America/New_York",
      aiProvider: "mock",
      aiTone: "Professional",
      role: "admin",
    },
  });

  console.log(`Demo user ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  // Clear existing demo data so the seed is idempotent.
  await prisma.$transaction([
    prisma.commandLog.deleteMany({ where: { userId: user.id } }),
    prisma.notification.deleteMany({ where: { userId: user.id } }),
    prisma.aILog.deleteMany({ where: { userId: user.id } }),
    prisma.memoryItem.deleteMany({ where: { userId: user.id } }),
    prisma.meetingNote.deleteMany({ where: { userId: user.id } }),
    prisma.note.deleteMany({ where: { userId: user.id } }),
    prisma.followUp.deleteMany({ where: { userId: user.id } }),
    prisma.task.deleteMany({ where: { userId: user.id } }),
    prisma.calendarEvent.deleteMany({ where: { userId: user.id } }),
    prisma.emailMessage.deleteMany({ where: { userId: user.id } }),
    prisma.contact.deleteMany({ where: { userId: user.id } }),
    prisma.integrationAccount.deleteMany({ where: { userId: user.id } }),
  ]);

  // ---- Contacts (25) ----
  const contacts = [];
  for (let i = 0; i < 25; i++) {
    const name = `${pick(FIRST_NAMES, i)} ${pick(["Chen", "Patel", "Garcia", "Smith", "Nguyen", "Brown", "Müller", "Kim", "Rossi", "Dubois"], i + 3)}`;
    const company = pick(COMPANIES, i);
    const contact = await prisma.contact.create({
      data: {
        userId: user.id,
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${company.toLowerCase().replace(/\s+/g, "")}.com`,
        company,
        role: pick(ROLES, i + 1),
        phone: `+1 (555) ${String(100 + i).padStart(3, "0")}-${String(1000 + i * 7).slice(-4)}`,
        notes: i % 3 === 0 ? `Met at the ${pick(["product summit", "investor dinner", "industry conference", "partner offsite"], i)}. Prefers ${pick(["concise updates", "weekly check-ins", "async written updates", "monthly syncs"], i)}.` : null,
        lastInteraction: daysFromNow(-(i + 1) * 2),
      },
    });
    contacts.push(contact);
  }
  console.log(`Created ${contacts.length} contacts`);

  // ---- Emails (10) ----
  const emailSubjects = [
    "Re: Q3 budget review — need your sign-off",
    "Quick question about the partnership proposal",
    "Following up on our call last week",
    "Action needed: contract renewal by Friday",
    "Notes from today's leadership sync",
    "Can we move our 1:1 to Thursday?",
    "Introduction: meet our new account lead",
    "Re: Proposal feedback — a few thoughts",
    "Heads up — client escalation on the Meridian account",
    "Thanks for the intro! Let's grab time this week",
  ];
  const emails = [];
  for (let i = 0; i < 10; i++) {
    const contact = contacts[i * 2];
    const isUnread = i < 5;
    const isImportant = i % 3 === 0;
    const email = await prisma.emailMessage.create({
      data: {
        userId: user.id,
        fromName: contact.name,
        fromEmail: contact.email ?? `${contact.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        subject: emailSubjects[i],
        snippet: `${emailSubjects[i]} — wanted to get your thoughts before we move forward...`,
        body: `Hi Jordan,\n\n${emailSubjects[i]}\n\nLet me know what you think when you have a moment — happy to hop on a call if that's easier.\n\nBest,\n${contact.name}`,
        receivedAt: daysFromNow(-(i + 1), 8 + (i % 6)),
        isUnread,
        isImportant,
        isPriority: i % 4 === 0,
        label: i % 3 === 0 ? "follow_up_needed" : i % 3 === 1 ? "waiting_reply" : null,
        contactId: contact.id,
      },
    });
    emails.push(email);
  }
  console.log(`Created ${emails.length} emails`);

  // ---- Calendar events (8) ----
  const eventTitles = [
    "Leadership weekly sync",
    "1:1 with Morgan Patel",
    "Northwind renewal review",
    "Product roadmap planning",
    "Investor update call",
    "Customer onboarding kickoff",
    "All-hands town hall",
    "Partnership strategy session",
  ];
  const events = [];
  for (let i = 0; i < 8; i++) {
    const contact = contacts[(i * 3) % contacts.length];
    const start = daysFromNow(i - 1, 9 + (i % 5), i % 2 === 0 ? 0 : 30);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title: eventTitles[i],
        description: `Discuss ${pick(["progress against goals", "open risks and blockers", "renewal terms", "next quarter priorities"], i)}.`,
        location: i % 2 === 0 ? "Conference Room A" : "Google Meet",
        startsAt: start,
        endsAt: end,
        attendees: [contact.email ?? "", user.email ?? ""].filter(Boolean) as string[],
        organizer: i % 2 === 0 ? user.name : contact.name,
        contactId: contact.id,
      },
    });
    events.push(event);
  }
  console.log(`Created ${events.length} calendar events`);

  // ---- Tasks (20) ----
  const taskTitles = [
    "Finalize Q3 budget proposal",
    "Review Northwind contract redlines",
    "Prepare slides for board meeting",
    "Approve marketing campaign brief",
    "Send follow-up to Acme Corp on pricing",
    "Schedule performance reviews for the team",
    "Draft partnership proposal for Globex",
    "Audit expense reports for last quarter",
    "Update onboarding checklist for new hires",
    "Plan offsite agenda for leadership team",
    "Respond to investor due-diligence questions",
    "Review and sign vendor agreement",
    "Prepare talking points for town hall",
    "Coordinate office relocation logistics",
    "Review customer satisfaction survey results",
    "Set OKRs for next quarter",
    "Refresh competitive analysis deck",
    "Organize quarterly all-hands",
    "Review legal terms for new SaaS vendor",
    "Plan team recognition event",
  ];
  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
  const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.WAITING, TaskStatus.DONE];
  const categories = [TaskCategory.WORK, TaskCategory.PERSONAL, TaskCategory.FOLLOW_UP, TaskCategory.MEETING, TaskCategory.FINANCE, TaskCategory.ADMIN];
  const tasks = [];
  for (let i = 0; i < 20; i++) {
    const contact = i % 2 === 0 ? contacts[(i * 5) % contacts.length] : null;
    const status = pick(statuses, i);
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: taskTitles[i],
        description: `${taskTitles[i]} — make sure to loop in stakeholders before finalizing.`,
        priority: pick(priorities, i + 1),
        status,
        category: pick(categories, i),
        dueDate: status === TaskStatus.DONE ? daysFromNow(-(i % 6) - 1) : daysFromNow((i % 10) - 3),
        aiScore: i % 3 === 0 ? 40 + ((i * 7) % 60) : null,
        aiBreakdown: i % 5 === 0 ? ["Gather inputs from stakeholders", "Draft first version", "Circulate for feedback", "Finalize and share"] : [],
        contactId: contact?.id ?? null,
      },
    });
    tasks.push(task);
  }
  console.log(`Created ${tasks.length} tasks`);

  // ---- Follow-ups (15) ----
  const followUpStatuses = [FollowUpStatus.PENDING, FollowUpStatus.WAITING, FollowUpStatus.COMPLETED, FollowUpStatus.IGNORED];
  const followUps = [];
  for (let i = 0; i < 15; i++) {
    const contact = contacts[(i * 4) % contacts.length];
    const status = pick(followUpStatuses, i);
    const followUp = await prisma.followUp.create({
      data: {
        userId: user.id,
        personName: contact.name,
        company: contact.company,
        context: `Discussed ${pick(["the renewal timeline", "the proposal scope", "next steps after the demo", "budget approval process", "the partnership terms"], i)} and agreed to circle back.`,
        lastContact: daysFromNow(-(i + 2)),
        dueDate: status === FollowUpStatus.COMPLETED ? null : daysFromNow((i % 7) - 2),
        nextAction: status === FollowUpStatus.COMPLETED ? null : `Send a recap email and confirm ${pick(["pricing", "timeline", "next meeting", "signed contract"], i)}.`,
        status,
        aiMessage: i % 4 === 0 ? `Hi ${contact.name.split(" ")[0]}, just circling back on our last conversation — wanted to see if you had any updates on your end. Happy to find time this week if useful.` : null,
        contactId: contact.id,
        emailId: i < emails.length ? emails[i].id : null,
      },
    });
    followUps.push(followUp);
  }
  console.log(`Created ${followUps.length} follow-ups`);

  // ---- Notes (10) ----
  const noteTitles = [
    "Ideas for improving onboarding",
    "Notes from customer feedback session",
    "Thoughts after the leadership offsite",
    "Renewal strategy notes — Northwind",
    "Brainstorm: Q4 marketing themes",
    "Debrief: investor call follow-ups",
    "Process notes — expense approvals",
    "Reflections on team retro",
    "Competitive landscape observations",
    "Notes on hiring plan for next quarter",
  ];
  for (let i = 0; i < 10; i++) {
    const contact = i % 3 === 0 ? contacts[(i * 6) % contacts.length] : null;
    await prisma.note.create({
      data: {
        userId: user.id,
        title: noteTitles[i],
        content: `${noteTitles[i]}.\n\nKey points:\n- ${pick(["Align on timeline before next sync", "Loop in finance for sign-off", "Share recap with the broader team", "Confirm next steps with the client"], i)}\n- ${pick(["Revisit in two weeks", "Document decisions in the shared doc", "Schedule a follow-up meeting", "Draft a summary for leadership"], i + 1)}\n- ${pick(["Watch for budget impact", "Get legal review if needed", "Validate with customer success", "Track in the project board"], i + 2)}`,
        aiSummary: i % 4 === 0 ? `Summary: ${noteTitles[i]} — key follow-ups identified and assigned, next review in two weeks.` : null,
        actionItems: i % 2 === 0 ? ["Share recap with stakeholders", "Schedule follow-up discussion", "Update tracking document"] : [],
        contactId: contact?.id ?? null,
      },
    });
  }
  console.log("Created 10 notes");

  // ---- Meeting notes (linked to events) ----
  for (let i = 0; i < Math.min(5, events.length); i++) {
    await prisma.meetingNote.create({
      data: {
        userId: user.id,
        title: `Notes: ${events[i].title}`,
        attendees: events[i].attendees,
        discussionSummary: `The team discussed ${pick(["progress against quarterly goals", "open risks on the renewal", "the upcoming product launch", "resourcing for next quarter", "feedback from recent customer calls"], i)}.`,
        decisions: [`Move forward with ${pick(["the proposed timeline", "the revised budget", "the new pricing model", "the expanded scope"], i)}`, "Schedule a follow-up review in two weeks"],
        actionItems: ["Circulate notes to attendees", "Update the project tracker", "Confirm next meeting time"],
        followUps: [`Check in with ${events[i].organizer ?? "the team"} before the next sync`],
        aiSummary: i % 2 === 0 ? `"${events[i].title}" covered key decisions and resulted in clear next steps for the team to act on this week.` : null,
        eventId: events[i].id,
        contactId: events[i].contactId,
      },
    });
  }
  console.log("Created 5 meeting notes");

  // ---- Memory items (5) ----
  await prisma.memoryItem.createMany({
    data: [
      {
        userId: user.id,
        type: "preference",
        label: "Preferred meeting times",
        content: "Prefers meetings between 10am–4pm ET and avoids Monday mornings when possible.",
        isSensitive: false,
        source: "Learned from calendar patterns",
      },
      {
        userId: user.id,
        type: "writing_style",
        label: "Email tone",
        content: "Likes concise, warm, professional emails — short paragraphs, clear next steps, minimal jargon.",
        isSensitive: false,
        source: "Derived from sent mail",
      },
      {
        userId: user.id,
        type: "person",
        label: "Key relationship: Northwind renewal lead",
        content: "Primary contact for the Northwind renewal responds best to data-driven proposals and prefers async updates over calls.",
        isSensitive: false,
        source: "Noted after renewal discussions",
      },
      {
        userId: user.id,
        type: "commitment",
        label: "Quarterly board commitment",
        content: "Committed to delivering a board-ready budget summary by the end of each quarter.",
        isSensitive: true,
        source: "Captured from leadership sync notes",
      },
      {
        userId: user.id,
        type: "instruction",
        label: "Daily briefing preferences",
        content: "Wants the daily briefing to lead with anything time-sensitive, then top 3 priorities, then anything that can wait.",
        isSensitive: false,
        source: "Set during onboarding",
      },
    ],
  });
  console.log("Created 5 memory items");

  // ---- Notifications (10) ----
  const notificationSeed: { type: string; title: string; message: string; link?: string }[] = [
    { type: "task_due", title: "Task due today", message: `"${tasks[0].title}" is due today.`, link: "/tasks" },
    { type: "follow_up_due", title: "Follow-up due", message: `Time to follow up with ${followUps[0].personName}.`, link: "/follow-ups" },
    { type: "meeting_prep", title: "Upcoming meeting", message: `"${events[0].title}" starts soon — AI meeting prep is ready.`, link: "/calendar" },
    { type: "important_email", title: "Important email received", message: `New message from ${emails[0].fromName}: "${emails[0].subject}"`, link: "/emails" },
    { type: "daily_briefing", title: "Your daily briefing is ready", message: "Catch up on what matters most today in under two minutes.", link: "/dashboard" },
    { type: "task_due", title: "Task overdue", message: `"${taskTitles[1]}" is now overdue.`, link: "/tasks" },
    { type: "follow_up_due", title: "Follow-up overdue", message: `${followUps[1].personName} is waiting on a reply from you.`, link: "/follow-ups" },
    { type: "important_email", title: "Reply requested", message: `${emails[2].fromName} is waiting on your response to "${emails[2].subject}".`, link: "/emails" },
    { type: "meeting_prep", title: "Meeting prep ready", message: `AI prep notes for "${events[2].title}" are ready to review.`, link: "/calendar" },
    { type: "daily_briefing", title: "Yesterday's briefing summary", message: "You completed 4 tasks and resolved 2 follow-ups yesterday — nice work.", link: "/dashboard" },
  ];
  await prisma.notification.createMany({
    data: notificationSeed.map((n, i) => ({
      userId: user.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: i % 3 === 0,
    })),
  });
  console.log("Created 10 notifications");

  // ---- Integration accounts (placeholders, disconnected by default) ----
  await prisma.integrationAccount.createMany({
    data: [
      { userId: user.id, provider: "google_gmail", status: "disconnected", scopes: [] },
      { userId: user.id, provider: "google_calendar", status: "disconnected", scopes: [] },
    ],
    skipDuplicates: true,
  });

  console.log("\nSeed complete!");
  console.log(`Sign in with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
