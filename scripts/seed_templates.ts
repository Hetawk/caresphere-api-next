/**
 * Seed: Message Templates
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds 45 faith-based and welfare message templates across categories:
 *   welcome, prayer, pastoral, evangelism, welfare, announcement,
 *   birthday, reminder, follow_up, emergency, general
 *
 * Safe to run multiple times — upserts by (name, category) pair.
 *
 * Usage:
 *   npx tsx scripts/seed_templates.ts
 */

import "dotenv/config";
import { PrismaClient, TemplateType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface TemplateInput {
  name: string;
  description: string;
  templateType: TemplateType;
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
}

const templates: TemplateInput[] = [
  // ──────────────────────────────────────────────────────────────
  // WELCOME
  // ──────────────────────────────────────────────────────────────
  {
    name: "New Member Welcome",
    description: "Warm welcome to a new member joining the community",
    templateType: TemplateType.EMAIL,
    category: "welcome",
    subject: "Welcome to {{orgName}}! 🙏",
    content: `Dear {{firstName}},

We are so glad you have joined {{orgName}}! You are a blessing to our community and we believe God has brought you here for a purpose.

"For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do." — Ephesians 2:10

Please do not hesitate to reach out if you have any questions or need anything at all. We are here for you.

In His love,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "First-Time Visitor Follow-Up",
    description: "Follow up with someone who visited for the first time",
    templateType: TemplateType.EMAIL,
    category: "welcome",
    subject: "It was wonderful to have you with us, {{firstName}}!",
    content: `Hi {{firstName}},

It was truly a blessing to have you join us at {{orgName}} this past {{dayOfWeek}}. We hope you felt the warmth of our community and the presence of the Lord.

We would love to get to know you better. Please feel free to reply to this message or visit us again — you are always welcome here.

"A new command I give you: Love one another. As I have loved you, so you must love one another." — John 13:34

Grace and peace,
{{senderName}}`,
    variables: ["firstName", "orgName", "dayOfWeek", "senderName"],
    isActive: true,
  },
  {
    name: "Baptism Congratulations",
    description: "Celebrate a member's baptism decision",
    templateType: TemplateType.EMAIL,
    category: "welcome",
    subject: "Congratulations on your baptism, {{firstName}}! 🕊️",
    content: `Dear {{firstName}},

Praise God! What a beautiful and holy moment — your baptism is a powerful declaration of your faith and new life in Christ.

"We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life." — Romans 6:4

The entire {{orgName}} family rejoices with you today. May God continue to guide your steps and fill your heart with His peace.

With great joy,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // PRAYER
  // ──────────────────────────────────────────────────────────────
  {
    name: "Prayer Request Acknowledgement",
    description: "Acknowledge and respond to a prayer request submission",
    templateType: TemplateType.EMAIL,
    category: "prayer",
    subject: "We are praying for you, {{firstName}}",
    content: `Dear {{firstName}},

Thank you for sharing your heart with us. We have received your prayer request and our prayer team is lifting you before the Lord right now.

"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." — Philippians 4:6-7

You are not alone. We are standing with you in faith.

In prayer,
{{senderName}}
{{orgName}} Prayer Team`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Sunday Service Prayer Reminder",
    description: "Invite members to Sunday corporate prayer",
    templateType: TemplateType.SMS,
    category: "prayer",
    content: `{{firstName}}, join us for prayer this Sunday at {{time}} — {{orgName}}. "For where two or three gather in my name, there am I with them." Matt 18:20 🙏`,
    variables: ["firstName", "orgName", "time"],
    isActive: true,
  },
  {
    name: "Weekly Prayer Meeting Invitation",
    description: "Invite members to the weekly prayer meeting",
    templateType: TemplateType.EMAIL,
    category: "prayer",
    subject: "Join Us for Prayer This {{dayOfWeek}} — {{orgName}}",
    content: `Hi {{firstName}},

You are warmly invited to our weekly prayer meeting this {{dayOfWeek}} at {{time}}.

Come as you are. Whether you need prayer or want to stand in the gap for others, there is power when we gather and call on the name of the Lord together.

"The prayer of a righteous person is powerful and effective." — James 5:16

We hope to see you there!

Blessings,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "dayOfWeek", "time", "senderName"],
    isActive: true,
  },
  {
    name: "Prayer Chain Request",
    description: "Urgent prayer chain notification for the congregation",
    templateType: TemplateType.EMAIL,
    category: "prayer",
    subject: "⚡ Prayer Needed — Please Pray Now",
    content: `Dear Prayer Warriors of {{orgName}},

We are activating our prayer chain for an urgent need in our community. Please stop and pray right now for {{prayerSubject}}.

Details: {{details}}

"Therefore confess your sins to each other and pray for each other so that you may be healed." — James 5:16

Please reply to let us know you have prayed. Together, we are powerful.

In faith,
{{senderName}}`,
    variables: ["orgName", "prayerSubject", "details", "senderName"],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // PASTORAL
  // ──────────────────────────────────────────────────────────────
  {
    name: "Pastoral Check-In",
    description: "Personal check-in message from a pastor or leader",
    templateType: TemplateType.EMAIL,
    category: "pastoral",
    subject: "Checking in on you, {{firstName}} 💛",
    content: `Hi {{firstName}},

I just wanted to take a moment to check in and let you know that you are on my heart. How are you doing? Is there anything you need prayer for or anything I can do to support you?

"Carry each other's burdens, and in this way you will fulfill the law of Christ." — Galatians 6:2

Please never hesitate to reach out. I am here for you.

In His service,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Bereavement Condolences",
    description: "Express condolences and offer support to grieving members",
    templateType: TemplateType.EMAIL,
    category: "pastoral",
    subject: "Our Hearts Are with You, {{firstName}}",
    content: `Dear {{firstName}},

The entire {{orgName}} family is heartbroken to hear of your loss. We want you to know that you are surrounded by love and we are holding you in prayer during this incredibly difficult time.

"Blessed are those who mourn, for they will be comforted." — Matthew 5:4

Please do not carry this grief alone. We are here — to pray, to listen, to help in any practical way we can. Please reach out to {{senderName}} at any time.

With deepest sympathy and love,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Hospital Visit Offer",
    description: "Offer a pastoral hospital or home visit to a member",
    templateType: TemplateType.EMAIL,
    category: "pastoral",
    subject: "We'd Love to Visit You, {{firstName}}",
    content: `Dear {{firstName}},

We heard that you have been going through some health challenges and our heart goes out to you. We would love to come visit you if you are comfortable with that.

"He heals the brokenhearted and binds up their wounds." — Psalm 147:3

Please let us know if you would like a visit or if there is any other way we can support you and your family right now. You are dearly loved.

In His care,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Counseling Resource Referral",
    description: "Gently offer counseling or support resources",
    templateType: TemplateType.EMAIL,
    category: "pastoral",
    subject: "Walking With You, {{firstName}}",
    content: `Hi {{firstName}},

I have been thinking about you and wanted to share some resources that I believe could be a blessing in your current season.

{{resourceDetails}}

There is no shame in seeking help — it takes great strength and wisdom. "Plans fail for lack of counsel, but with many advisers they succeed." — Proverbs 15:22

I am also available to talk anytime. Please don't hesitate to reach out.

Blessings,
{{senderName}}`,
    variables: ["firstName", "senderName", "resourceDetails"],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // WELFARE CHECKS
  // ──────────────────────────────────────────────────────────────
  {
    name: "General Welfare Check-In",
    description: "Simple, caring check-in on how a member is doing",
    templateType: TemplateType.SMS,
    category: "welfare",
    content: `Hi {{firstName}}! 👋 This is {{senderName}} from {{orgName}}. Just wanted to check in — how are you doing? We care about you and would love to hear from you. 🙏`,
    variables: ["firstName", "senderName", "orgName"],
    isActive: true,
  },
  {
    name: "Emotional Wellness Check",
    description: "Thoughtful check-in focused on emotional and mental health",
    templateType: TemplateType.EMAIL,
    category: "welfare",
    subject: "How Are You Really Doing, {{firstName}}?",
    content: `Hi {{firstName}},

In the busyness of life it can be easy to let things build up inside. I just wanted to reach out and ask — how are you really doing? Emotionally? Mentally? Spiritually?

Our community is a safe space and we genuinely care about your whole wellbeing — not just how you show up on Sunday.

"Cast all your anxiety on him because he cares for you." — 1 Peter 5:7

Feel free to reply to this message. I would love to hear from you.

With care,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Physical Health Support",
    description:
      "Reach out to a member dealing with physical health challenges",
    templateType: TemplateType.EMAIL,
    category: "welfare",
    subject: "Thinking of You and Praying for Your Health, {{firstName}}",
    content: `Dear {{firstName}},

I heard you have been dealing with some physical health challenges lately, and I wanted you to know that {{orgName}} is praying for your healing and recovery.

"Is anyone among you sick? Let them call the elders of the church to pray over them and anoint them with oil in the name of the Lord." — James 5:14

Please let us know if there is anything practical we can do — bringing meals, helping with transportation, or simply being present with you. We are here.

Praying for your full recovery,
{{senderName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Lonely/Isolated Member Reach-Out",
    description:
      "Reach out to a member who may be feeling isolated or disconnected",
    templateType: TemplateType.EMAIL,
    category: "welfare",
    subject: "We Miss You, {{firstName}} ❤️",
    content: `Hi {{firstName}},

We have been thinking about you and just wanted to say — you are missed! Community is important and we notice when you are not with us.

If anything is going on or if you just need someone to talk to, please know that we are here without any judgment.

"God sets the lonely in families" — Psalm 68:6

Would love to reconnect with you. When is a good time to chat?

In love,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Financial Hardship Support",
    description:
      "Compassionate outreach to a member facing financial difficulties",
    templateType: TemplateType.EMAIL,
    category: "welfare",
    subject: "We Are Here for You, {{firstName}}",
    content: `Dear {{firstName}},

We have heard that you may be going through a difficult financial season and we want you to know that our community cares deeply for you and your family.

"And my God will meet all your needs according to the riches of his glory in Christ Jesus." — Philippians 4:19

Please do not struggle alone. There are resources and people within {{orgName}} who want to help. Reach out to {{senderName}} in complete confidence.

With love and no condemnation,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // EVANGELISM
  // ──────────────────────────────────────────────────────────────
  {
    name: "Gospel Invitation",
    description: "Invite someone to hear the Gospel for the first time",
    templateType: TemplateType.EMAIL,
    category: "evangelism",
    subject: "An Invitation Just for You, {{firstName}}",
    content: `Hi {{firstName}},

I have been meaning to reach out because I believe you are someone very special and I would love to share something that has completely transformed my life.

You are invited to join us at {{orgName}} — a community of real, imperfect people who have found hope, purpose, and peace through faith in Jesus Christ.

No pressure, no religious performance required. Just come and see.

"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." — John 3:16

I would love to come with you. When works for you?

With love,
{{senderName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Salvation Follow-Up",
    description: "Follow up after someone makes a decision for faith/salvation",
    templateType: TemplateType.EMAIL,
    category: "evangelism",
    subject: "The Best Decision You Will Ever Make 🎉",
    content: `Dear {{firstName}},

What you did — deciding to give your life to Christ — is the most important decision anyone can ever make and all of heaven is celebrating right now!

"I tell you that in the same way there will be more rejoicing in heaven over one sinner who repents than over ninety-nine righteous persons who do not need to repent." — Luke 15:7

This is just the beginning of an incredible journey. Here are the next steps we recommend:
{{nextSteps}}

We are walking this road with you. Please do not hesitate to reach out to {{senderName}} with any questions.

In great joy,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName", "nextSteps"],
    isActive: true,
  },
  {
    name: "Outreach Event Invitation",
    description: "Invite community members to an outreach or evangelism event",
    templateType: TemplateType.EMAIL,
    category: "evangelism",
    subject: "You Are Invited: {{eventName}} — {{eventDate}}",
    content: `Hi {{firstName}},

We are hosting a special community event — {{eventName}} — on {{eventDate}} at {{eventLocation}}, and we would love to have you join us!

This is a wonderful opportunity to experience genuine community, hear an encouraging message, and enjoy great {{eventHighlight}}.

Bring a friend! Everyone is welcome.

"Go and make disciples of all nations" — Matthew 28:19

RSVP by replying to this message or contacting {{senderName}}.

See you there!
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "eventName",
      "eventDate",
      "eventLocation",
      "eventHighlight",
    ],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // ANNOUNCEMENTS
  // ──────────────────────────────────────────────────────────────
  {
    name: "Sunday Service Announcement",
    description: "Weekly Sunday service details and highlights",
    templateType: TemplateType.EMAIL,
    category: "announcement",
    subject: "Join Us This Sunday at {{orgName}} — {{serviceDate}}",
    content: `Dear {{firstName}},

We are excited to see you this Sunday, {{serviceDate}}, at {{serviceTime}}!

This week's message: "{{sermonTitle}}"
Speaker: {{speakerName}}

{{additionalDetails}}

"Let us not give up meeting together, as some are in the habit of doing, but let us encourage one another." — Hebrews 10:25

See you Sunday!

Blessings,
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "serviceDate",
      "serviceTime",
      "sermonTitle",
      "speakerName",
      "additionalDetails",
    ],
    isActive: true,
  },
  {
    name: "Special Event Announcement",
    description: "Notify members of a special upcoming event",
    templateType: TemplateType.EMAIL,
    category: "announcement",
    subject: "📣 {{eventName}} — Don't Miss It!",
    content: `Hi {{firstName}},

Mark your calendar! {{orgName}} is hosting {{eventName}} on {{eventDate}} at {{eventTime}}.

{{eventDescription}}

Location: {{eventLocation}}

This is going to be a powerful and memorable event. We hope you will join us and bring someone with you!

To register or for more information, contact {{senderName}}.

Blessings,
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "eventName",
      "eventDate",
      "eventTime",
      "eventDescription",
      "eventLocation",
    ],
    isActive: true,
  },
  {
    name: "Service Time Change Notice",
    description: "Notify members of a change in service times",
    templateType: TemplateType.SMS,
    category: "announcement",
    content: `📢 {{orgName}} Notice: Our service time is changing to {{newTime}} starting {{effectiveDate}}. Questions? Contact {{senderName}}. God bless!`,
    variables: ["orgName", "newTime", "effectiveDate", "senderName"],
    isActive: true,
  },
  {
    name: "Giving Campaign Update",
    description: "Update members on a fundraising or giving campaign",
    templateType: TemplateType.EMAIL,
    category: "announcement",
    subject: "Campaign Update: {{campaignName}} — {{orgName}}",
    content: `Dear {{firstName}},

We wanted to give you an update on our {{campaignName}} campaign. Thanks to your generous giving and faith, we have reached {{amountRaised}} toward our goal of {{goalAmount}}.

{{campaignUpdate}}

"Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver." — 2 Corinthians 9:7

Thank you for your faithfulness. Together we are making a difference.

With gratitude,
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "campaignName",
      "amountRaised",
      "goalAmount",
      "campaignUpdate",
    ],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // BIRTHDAY
  // ──────────────────────────────────────────────────────────────
  {
    name: "Birthday Blessing",
    description: "Celebrate a member's birthday with a Scripture-based message",
    templateType: TemplateType.EMAIL,
    category: "birthday",
    subject: "Happy Birthday, {{firstName}}! 🎂🙏",
    content: `Dear {{firstName}},

Happy Birthday! Today we celebrate you and give thanks to God for the gift of your life and the blessing you are to our community.

"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace." — Numbers 6:24-26

May this year be filled with God's goodness, favour, and abundant joy. You are deeply loved.

With birthday blessings,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Birthday SMS Wish",
    description: "Quick birthday text message for members",
    templateType: TemplateType.SMS,
    category: "birthday",
    content: `🎂 Happy Birthday {{firstName}}! May God pour out His blessings on you today and every day. You are loved! — {{orgName}} 🙏`,
    variables: ["firstName", "orgName"],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // REMINDERS
  // ──────────────────────────────────────────────────────────────
  {
    name: "Sunday Service Reminder",
    description: "Saturday reminder for Sunday service",
    templateType: TemplateType.SMS,
    category: "reminder",
    content: `Hi {{firstName}}! 👋 Just a reminder — service tomorrow at {{serviceTime}} at {{orgName}}. Come ready to worship! "This is the day the Lord has made; let us rejoice and be glad in it." — Ps 118:24 🙌`,
    variables: ["firstName", "orgName", "serviceTime"],
    isActive: true,
  },
  {
    name: "Meeting Reminder",
    description: "Reminder for an upcoming meeting or gathering",
    templateType: TemplateType.EMAIL,
    category: "reminder",
    subject: "Reminder: {{meetingName}} — {{meetingDate}} at {{meetingTime}}",
    content: `Hi {{firstName}},

This is a friendly reminder that {{meetingName}} is scheduled for {{meetingDate}} at {{meetingTime}}.

Location: {{meetingLocation}}

{{additionalDetails}}

Please let {{senderName}} know if you are unable to attend.

See you there!
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "meetingName",
      "meetingDate",
      "meetingTime",
      "meetingLocation",
      "additionalDetails",
    ],
    isActive: true,
  },
  {
    name: "Bible Study Reminder",
    description: "Reminder for weekly Bible study",
    templateType: TemplateType.SMS,
    category: "reminder",
    content: `📖 Bible Study reminder: {{dayOfWeek}} at {{time}} — {{location}}. This week: {{studyTopic}}. Bring your Bible! — {{orgName}}`,
    variables: ["orgName", "dayOfWeek", "time", "location", "studyTopic"],
    isActive: true,
  },
  {
    name: "Volunteer Reminder",
    description: "Remind a volunteer of their upcoming serving commitment",
    templateType: TemplateType.EMAIL,
    category: "reminder",
    subject: "Your Serve is Coming Up, {{firstName}} 🙌",
    content: `Hi {{firstName}},

Thank you so much for volunteering with the {{teamName}} team at {{orgName}}! Just a reminder that you are scheduled to serve on {{serveDate}} at {{serveTime}}.

{{volunteerInstructions}}

"Each of you should use whatever gift you have received to serve others, as faithful stewards of God's grace in its various forms." — 1 Peter 4:10

Thank you for giving of yourself. What you do matters!

Bless you,
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "teamName",
      "serveDate",
      "serveTime",
      "volunteerInstructions",
    ],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // FOLLOW-UP
  // ──────────────────────────────────────────────────────────────
  {
    name: "Missed Service Follow-Up",
    description: "Reach out to a member who has missed recent services",
    templateType: TemplateType.EMAIL,
    category: "follow_up",
    subject: "We Missed You, {{firstName}} 💛",
    content: `Hi {{firstName}},

We noticed you have not been with us for a little while and we just wanted to reach out and let you know — you are missed!

"And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together." — Hebrews 10:24-25

Is everything okay? We would love to reconnect with you. Please feel free to reply to this message or reach out to {{senderName}} directly.

No judgment — just love.

Warmly,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "New Believer Follow-Up",
    description:
      "Follow up with a new believer in the weeks after their decision",
    templateType: TemplateType.EMAIL,
    category: "follow_up",
    subject: "How Is Your Faith Journey Going, {{firstName}}?",
    content: `Hi {{firstName}},

It has been {{weeksAgo}} since you made the most important decision of your life and we could not be more excited for you!

We just wanted to check in — how is your journey going? Are you reading the Word? Any questions or struggles we can help with?

Next steps we recommend:
• Start reading the Gospel of John
• Join a small group or connect with a mentor
• Come to our New Believers orientation: {{orientationDetails}}

"Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!" — 2 Corinthians 5:17

You have a whole family cheering you on. 🙌

In His love,
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "weeksAgo",
      "orientationDetails",
    ],
    isActive: true,
  },
  {
    name: "Inactive Member Re-engagement",
    description: "Re-engage a long-term inactive member",
    templateType: TemplateType.EMAIL,
    category: "follow_up",
    subject: "We Have Been Thinking About You, {{firstName}}",
    content: `Dear {{firstName}},

It has been a long time since we have seen or heard from you and we want you to know — you have not been forgotten. You are part of this family.

Life gets complicated. Seasons change. Faith can feel distant. Whatever you have been through, you are welcome back with open arms and no questions asked.

"But while he was still a long way off, his father saw him and was filled with compassion for him; he ran to his son, threw his arms around him and kissed him." — Luke 15:20

We would love to reconnect. Please reach out to {{senderName}} or simply come through our doors.

With love always,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // EMERGENCY
  // ──────────────────────────────────────────────────────────────
  {
    name: "Emergency Community Notice",
    description: "Urgent notice to the entire congregation",
    templateType: TemplateType.EMAIL,
    category: "emergency",
    subject: "⚠️ URGENT: Message from {{orgName}} Leadership",
    content: `Dear {{orgName}} Family,

This is an urgent message from your leadership team. Please read carefully.

{{urgentMessage}}

Action needed: {{actionRequired}}

Please pray. Please look out for one another. Please contact {{senderName}} immediately if you need assistance.

"God is our refuge and strength, an ever-present help in trouble." — Psalm 46:1

In His care,
{{senderName}}
{{orgName}} Leadership`,
    variables: ["orgName", "senderName", "urgentMessage", "actionRequired"],
    isActive: true,
  },
  {
    name: "Emergency SMS Alert",
    description: "Quick emergency SMS notification",
    templateType: TemplateType.SMS,
    category: "emergency",
    content: `⚠️ URGENT from {{orgName}}: {{urgentMessage}} Contact {{senderName}} immediately. Praying for you all. — {{orgName}} Leadership`,
    variables: ["orgName", "senderName", "urgentMessage"],
    isActive: true,
  },

  // ──────────────────────────────────────────────────────────────
  // GENERAL
  // ──────────────────────────────────────────────────────────────
  {
    name: "Monthly Newsletter",
    description: "Monthly community newsletter with updates and encouragement",
    templateType: TemplateType.EMAIL,
    category: "general",
    subject: "{{monthYear}} Update from {{orgName}} 📰",
    content: `Dear {{firstName}},

Grace and peace to you from {{orgName}}! Here is your monthly update:

HIGHLIGHTS THIS MONTH:
{{monthHighlights}}

UPCOMING EVENTS:
{{upcomingEvents}}

PRAYER FOCUS:
{{prayerFocus}}

"Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom through psalms, hymns, and songs from the Spirit." — Colossians 3:16

Thank you for being part of this community. We are better because of you.

Blessings,
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "monthYear",
      "monthHighlights",
      "upcomingEvents",
      "prayerFocus",
    ],
    isActive: true,
  },
  {
    name: "General Encouragement",
    description: "Short encouragement message for any time of the year",
    templateType: TemplateType.EMAIL,
    category: "general",
    subject: "An Encouraging Word for You Today, {{firstName}} 🌟",
    content: `Hi {{firstName}},

I just felt led to send you a word of encouragement today.

God sees you. God knows your struggles. And He has not forgotten you.

"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future." — Jeremiah 29:11

Keep going. Keep trusting. The best is still ahead for you.

In His love,
{{senderName}}
{{orgName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Holiday Blessing",
    description: "Seasonal holiday greetings and Scripture",
    templateType: TemplateType.EMAIL,
    category: "general",
    subject: "{{holidayGreeting}} from {{orgName}} 🙏",
    content: `Dear {{firstName}},

On behalf of everyone at {{orgName}}, we want to wish you a joyful and blessed {{holiday}}.

May this season be a reminder of God's goodness and love poured out for each of us.

"Every good and perfect gift is from above, coming down from the Father of the heavenly lights, who does not change like shifting shadows." — James 1:17

We are grateful for you. Enjoy this season with your loved ones.

With blessings and love,
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "holidayGreeting",
      "holiday",
    ],
    isActive: true,
  },
  {
    name: "Condolences SMS",
    description: "Brief condolences text for a member experiencing loss",
    templateType: TemplateType.SMS,
    category: "general",
    content: `{{firstName}}, our hearts are with you. 💙 {{orgName}} is praying for you and your family during this time. "He heals the brokenhearted." Ps 147:3 — {{senderName}}`,
    variables: ["firstName", "orgName", "senderName"],
    isActive: true,
  },
  {
    name: "Scripture of the Week",
    description: "Weekly Scripture encouragement for the congregation",
    templateType: TemplateType.EMAIL,
    category: "general",
    subject: "📖 Scripture of the Week — {{orgName}}",
    content: `Dear {{firstName}},

Here is your Scripture of the week from the {{orgName}} family:

"{{scriptureText}}"
— {{scriptureReference}}

{{reflection}}

May this word speak to your heart today. Share it with someone who needs it!

Blessings,
{{senderName}}
{{orgName}}`,
    variables: [
      "firstName",
      "orgName",
      "senderName",
      "scriptureText",
      "scriptureReference",
      "reflection",
    ],
    isActive: true,
  },
];

async function main() {
  console.log("🌱 Seeding message templates...\n");

  // Find the admin user to set as createdBy
  const admin = await prisma.user.findFirst({
    where: { role: "KINGDOM_SUPER_ADMIN" },
    select: { id: true, email: true },
  });

  if (!admin) {
    console.error(
      "❌  No KINGDOM_SUPER_ADMIN user found. Run seed_kingdom_admin.ts first.",
    );
    process.exit(1);
  }

  console.log(`  Using admin: ${admin.email} (${admin.id})\n`);

  let created = 0;
  let updated = 0;

  for (const t of templates) {
    const variablesStr = JSON.stringify(t.variables);

    const existing = await prisma.template.findFirst({
      where: { name: t.name, category: t.category },
    });

    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          templateType: t.templateType,
          subject: t.subject ?? null,
          content: t.content,
          variables: variablesStr,
          isActive: t.isActive,
        },
      });
      updated++;
      console.log(`  ↻  Updated: [${t.category}] ${t.name}`);
    } else {
      await prisma.template.create({
        data: {
          name: t.name,
          description: t.description,
          templateType: t.templateType,
          category: t.category,
          subject: t.subject ?? null,
          content: t.content,
          variables: variablesStr,
          isActive: t.isActive,
          usageCount: 0,
          createdBy: admin.id,
        },
      });
      created++;
      console.log(`  ✓  Created: [${t.category}] ${t.name}`);
    }
  }

  console.log(`\n✅ Done! ${created} created, ${updated} updated.`);
  console.log(`   Total templates in seed: ${templates.length}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
