import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: process.env.FRONTEND_URL || "http://localhost:5173",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  const emailHtml = mailGenerator.generate(options.mailgenContent);

  // ==========================================
  // MAILTRAP (sirf testing ke liye) - band kiya hai
  // Wapas testing karni ho to ye block uncomment karo
  // aur neeche wala Gmail transporter comment kar do
  // ==========================================
  // const transporter = nodemailer.createTransport({
  //   host: process.env.MAILTRAP_SMTP_HOST,
  //   port: process.env.MAILTRAP_SMTP_PORT,
  //   auth: {
  //     user: process.env.MAILTRAP_SMTP_USER,
  //     pass: process.env.MAILTRAP_SMTP_PASS,
  //   },
  // });

  // ==========================================
  // GMAIL SMTP (real emails)
  // ==========================================
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mail = {
    // from: "mail.taskmanager@example.com", // Mailtrap wala
    from: `"Task Manager" <${process.env.GMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      "Email service failed silently. Make sure GMAIL_USER and GMAIL_APP_PASSWORD are set in the .env file",
    );
    console.error("Error: ", error);
  }
};

const emailVerificationMailgenContent = (username, verficationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we'are excited to have you on board.",
      action: {
        instructions:
          "To verify your email please click on the following button",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verficationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account",
      action: {
        instructions:
          "To reset your password click on the following button or link",
        button: {
          color: "#22BC66",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

// Roz ka deadline digest: kal / aaj due + overdue tasks
const deadlineReminderMailgenContent = (name, { dueSoon = [], overdue = [] }) => {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const toRows = (items) =>
    items.map((t) => ({
      Task: t.title,
      Project: t.projectName,
      Due: t.dueLabel,
      Priority: t.priority,
    }));

  const table = [];
  if (overdue.length) {
    table.push({
      title: `⚠️ Overdue (${overdue.length})`,
      data: toRows(overdue),
    });
  }
  if (dueSoon.length) {
    table.push({
      title: `⏰ Due soon (${dueSoon.length})`,
      data: toRows(dueSoon),
    });
  }

  return {
    body: {
      name,
      intro: [
        "Here is a quick reminder about your task deadlines.",
        overdue.length
          ? `${overdue.length} task${overdue.length > 1 ? "s are" : " is"} overdue.`
          : "Some of your tasks are due soon.",
      ],
      table,
      action: {
        instructions: "See all your tasks in one place:",
        button: {
          color: "#2563eb",
          text: "Open My Tasks",
          link: `${appUrl}/my-tasks`,
        },
      },
      outro:
        "Don't want these emails? Turn off 'Deadline reminder emails' on your Profile page.",
    },
  };
};

export {
  deadlineReminderMailgenContent,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
