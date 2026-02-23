/**
 * Birthday Service
 * Finds members with upcoming or today's birthdays, generates org-type-aware
 * birthday messages, and sends alert emails to organization leaders.
 */

import { prisma } from "@/lib/prisma";
import { OrganizationType } from "@prisma/client";
import { EkdSendService } from "@/services/email/email.service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BirthdayMember {
  id: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  photoUrl: string | null;
  dateOfBirth: string; // ISO string
  daysUntil: number; // 0 = today
  birthdayDate: string; // "MMMM d" formatted
  age: number | null; // age they will turn
}

export interface UpcomingBirthdaysResult {
  today: BirthdayMember[];
  upcoming: BirthdayMember[];
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Given a DOB Date, compute days until the next occurrence of that birthday
 *  relative to `now`. Returns 0 if today, 1 if tomorrow, etc. */
function daysUntilBirthday(dob: Date, now: Date = new Date()): number {
  const thisYear = now.getFullYear();
  const candidate = new Date(thisYear, dob.getMonth(), dob.getDate());

  // Normalise both to midnight for clean day diff
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  if (candidate < todayMidnight) {
    candidate.setFullYear(thisYear + 1);
  }

  return Math.round(
    (candidate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Format a DOB date as "January 15" */
function formatBirthdayDate(dob: Date, year: number): string {
  const d = new Date(year, dob.getMonth(), dob.getDate());
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/** Calculate what age they turn this birthday */
function ageThisBirthday(dob: Date, birthdayYear: number): number | null {
  const age = birthdayYear - dob.getFullYear();
  return age >= 0 ? age : null;
}

function toBirthdayMember(
  member: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    photoUrl: string | null;
    dateOfBirth: Date;
  },
  now: Date,
): BirthdayMember {
  const dob = member.dateOfBirth;
  const days = daysUntilBirthday(dob, now);
  const birthdayYear = now.getFullYear() + (days >= 365 ? 1 : 0);
  const birthdayYearActual =
    new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) >=
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
      ? now.getFullYear()
      : now.getFullYear() + 1;

  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    fullName: [member.firstName, member.lastName].filter(Boolean).join(" "),
    email: member.email,
    phone: member.phone,
    whatsappNumber: member.whatsappNumber,
    photoUrl: member.photoUrl,
    dateOfBirth: dob.toISOString(),
    daysUntil: days,
    birthdayDate: formatBirthdayDate(dob, birthdayYearActual),
    age: ageThisBirthday(dob, birthdayYearActual),
  };
}

// ─── Core Queries ─────────────────────────────────────────────────────────────

/** Fetch all members with upcoming birthdays within `windowDays` (default 30).
 *  Returns separate `today` and `upcoming` lists. */
export async function getUpcomingBirthdays(
  organizationId: string,
  windowDays = 30,
): Promise<UpcomingBirthdaysResult> {
  const now = new Date();

  // Fetch all active members that have a DOB
  const members = await prisma.member.findMany({
    where: {
      organizationId,
      dateOfBirth: { not: null },
      memberStatus: { in: ["ACTIVE", "PENDING"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      photoUrl: true,
      dateOfBirth: true,
    },
    orderBy: { firstName: "asc" },
  });

  const withBirthday = (
    members as Array<(typeof members)[number] & { dateOfBirth: Date }>
  )
    .filter((m) => m.dateOfBirth !== null)
    .map((m) => toBirthdayMember(m, now))
    .filter((m) => m.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    today: withBirthday.filter((m) => m.daysUntil === 0),
    upcoming: withBirthday.filter((m) => m.daysUntil > 0),
    total: withBirthday.length,
  };
}

// ─── Birthday Message Generator ───────────────────────────────────────────────

const SCRIPTURES = [
  "Psalm 90:14 — Satisfy us in the morning with your steadfast love, that we may rejoice and be glad all our days.",
  "Numbers 6:24-26 — The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.",
  "Jeremiah 29:11 — For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.",
  "Philippians 4:7 — The peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.",
  "Proverbs 10:22 — The blessing of the Lord brings wealth, without painful toil for it.",
  "Isaiah 40:31 — Those who hope in the Lord will renew their strength. They will soar on wings like eagles.",
  "Romans 15:13 — May the God of hope fill you with all joy and peace as you trust in Him.",
];

function randomScripture(): string {
  return SCRIPTURES[Math.floor(Math.random() * SCRIPTURES.length)];
}

export interface BirthdayMessageOptions {
  recipientName: string;
  senderName: string; // org name or leader name
  organizationType: OrganizationType;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  age?: number | null;
}

export interface GeneratedBirthdayMessage {
  subject: string; // for email
  body: string;
}

export function generateBirthdayMessage(
  opts: BirthdayMessageOptions,
): GeneratedBirthdayMessage {
  const { recipientName, senderName, organizationType, channel, age } = opts;
  const firstName = recipientName.split(" ")[0];
  const ageLine = age ? ` as you celebrate ${age} years of life` : "";
  const scripture = randomScripture();

  if (organizationType === "CHURCH") {
    if (channel === "EMAIL") {
      return {
        subject: `🎂 Happy Birthday, ${firstName}! God's blessings be upon you today`,
        body: `Dear ${recipientName},

On behalf of everyone at ${senderName}, we want to wish you a very Happy Birthday! 🎉

Today is a day to celebrate the incredible gift that you are — to your family, to our community, and to the Kingdom of God. We thank God for the day He created you and for every year He has sovereignly guided your life.

${ageLine ? `What a blessing it is to celebrate ${age} amazing years of your journey!` : ""}

May this year be your best yet — filled with the peace that surpasses understanding, the joy of the Lord as your strength, and the abundant blessings He has promised you.

✨ A Word for You Today:
"${scripture}"

We love you and are grateful for the ways you bless us. May the Lord graciously answer your heart's desires today and throughout this new year of your life.

With great love and God's blessings,
${senderName}`,
      };
    } else {
      // SMS / WhatsApp
      return {
        subject: `Happy Birthday from ${senderName}`,
        body: `🎂 Happy Birthday, ${firstName}! 🎉 On behalf of ${senderName}, we celebrate you today! May God's blessings overflow in your life. "${scripture.split(" — ")[0]}"\n\nWe love and appreciate you! 🙏`,
      };
    }
  }

  if (organizationType === "NONPROFIT") {
    if (channel === "EMAIL") {
      return {
        subject: `Happy Birthday, ${firstName}! 🎂 From all of us at ${senderName}`,
        body: `Dear ${recipientName},

Happy Birthday from the entire ${senderName} family! 🎉

Today we celebrate YOU — your growth, your contributions, and the positive difference you make in the lives of others. You are an incredible part of what makes our community special.

${age ? `Congratulations on turning ${age}! ` : ""}We hope this birthday brings you joy, rest, and everything your heart desires.

May this new year of your life be filled with meaningful moments, good health, and continued impact.

With warmth and appreciation,
The ${senderName} Team`,
      };
    } else {
      return {
        subject: `Happy Birthday from ${senderName}`,
        body: `🎂 Happy Birthday, ${firstName}! 🎉 Everyone at ${senderName} wishes you a wonderful day. You make our community better every single day. Wishing you all the best on your special day! 💐`,
      };
    }
  }

  // Default / OTHER
  if (channel === "EMAIL") {
    return {
      subject: `Happy Birthday, ${firstName}! 🎂`,
      body: `Dear ${recipientName},

Wishing you a very Happy Birthday on behalf of ${senderName}! 🎉

We hope your day is everything you wished for and more — filled with love, laughter, and beautiful memories.

${age ? `Here's to ${age} wonderful years and many more to come! ` : ""}May this new chapter bring you everything you deserve.

Warmest wishes,
${senderName}`,
    };
  } else {
    return {
      subject: `Happy Birthday from ${senderName}`,
      body: `🎂 Happy Birthday, ${firstName}! 🎉 Everyone at ${senderName} wishes you a fantastic day filled with joy and celebration!`,
    };
  }
}

// ─── Leader Notification Emails ───────────────────────────────────────────────

export interface BirthdayAlertOptions {
  leaderEmail: string;
  leaderName: string;
  orgName: string;
  members: BirthdayMember[];
  daysAway: number; // 7, 3, or 0
}

export async function sendBirthdayAlertToLeader(
  opts: BirthdayAlertOptions,
): Promise<void> {
  const emailService = new EkdSendService();
  const { leaderEmail, leaderName, orgName, members, daysAway } = opts;

  if (members.length === 0) return;

  const subject =
    daysAway === 0
      ? `🎂 Today's Birthdays in ${orgName} — ${members.length} member${members.length > 1 ? "s" : ""}`
      : `🔔 ${daysAway}-Day Birthday Reminder for ${orgName} — ${members.length} upcoming`;

  const memberList = members
    .map((m) => {
      const daysLabel =
        m.daysUntil === 0
          ? "🎂 TODAY!"
          : `in ${m.daysUntil} day${m.daysUntil > 1 ? "s" : ""}`;
      const ageText = m.age ? ` (turning ${m.age})` : "";
      return `• ${m.fullName}${ageText} — ${m.birthdayDate} (${daysLabel})`;
    })
    .join("\n");

  const greeting =
    daysAway === 0
      ? `Today is a special day for ${members.length === 1 ? "one of your members" : `${members.length} of your members`}!`
      : `You have ${members.length} member birthday${members.length > 1 ? "s" : ""} coming up in the next ${daysAway} days.`;

  const body = `Dear ${leaderName},

${greeting} Don't forget to send them a birthday message and make them feel celebrated.

${memberList}

You can send personalized birthday messages directly from the CareSphere app.

${daysAway === 0 ? "🎉 Today is the perfect day to reach out!" : "⏰ Plan ahead and make their day special!"}

With love,
The CareSphere Team`;

  await emailService.sendEmail(leaderEmail, subject, body);
}

// ─── Get Org Leaders for Notifications ────────────────────────────────────────

export async function getOrgLeaders(
  organizationId: string,
): Promise<
  Array<{
    id: string;
    email: string | null;
    firstName: string;
    lastName: string | null;
  }>
> {
  // Org leaders are: org owners + users with SUPER_ADMIN / ADMIN / MINISTRY_LEADER role
  const orgUsers = await prisma.organizationUser.findMany({
    where: {
      organizationId,
      isActive: true,
      user: {
        role: {
          in: [
            "KINGDOM_SUPER_ADMIN",
            "SUPER_ADMIN",
            "ADMIN",
            "MINISTRY_LEADER",
          ],
        },
      },
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Also include org owners who may have the MEMBER role
  const owners = await prisma.organizationUser.findMany({
    where: { organizationId, isActive: true, isOwner: true },
    select: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  const all = [...orgUsers, ...owners].map((m) => m.user);
  // Deduplicate by id
  const seen = new Set<string>();
  return all.filter((u) => {
    if (!u || seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  }) as Array<{
    id: string;
    email: string | null;
    firstName: string;
    lastName: string | null;
  }>;
}
