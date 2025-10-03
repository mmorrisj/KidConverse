
import nodemailer from 'nodemailer';
import { storage } from '../storage';

interface EmailService {
  sendDailyChatSummary(userId: string): Promise<boolean>;
}

export class GmailEmailService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD // Use app password, not regular password
        }
      });
    }
  }

  async sendDailyChatSummary(userId: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('Gmail credentials not configured. Email content would be sent via Gmail SMTP');
        return false;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.error('User not found for email summary:', userId);
        return false;
      }

      // Get today's chats for the user
      const chats = await storage.getChats(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysChats = chats.filter(chat => {
        const chatDate = new Date(chat.createdAt);
        chatDate.setHours(0, 0, 0, 0);
        return chatDate.getTime() === today.getTime();
      });

      if (todaysChats.length === 0) {
        console.log('No chats today for user:', user.name);
        return true; // Not an error, just no content to send
      }

      let emailContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
              .chat-summary { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 5px; }
              .chat-title { font-weight: bold; color: #1e40af; margin-bottom: 10px; }
              .message { margin: 10px 0; padding: 8px; border-radius: 5px; }
              .user-message { background: #dbeafe; text-align: right; }
              .ai-message { background: #dcfce7; }
              .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📚 StudyBuddy Daily Summary</h1>
              <p>Hi ${user.name}! Here's what we learned together today.</p>
            </div>
      `;

      for (const chat of todaysChats) {
        const messages = await storage.getMessages(chat.id);
        
        emailContent += `
          <div class="chat-summary">
            <div class="chat-title">${chat.title}</div>
        `;

        // Add messages from this chat
        for (const message of messages.slice(0, 10)) { // Limit to first 10 messages per chat
          const messageClass = message.role === 'user' ? 'user-message' : 'ai-message';
          const sender = message.role === 'user' ? user.name : 'StudyBuddy';
          
          emailContent += `
            <div class="message ${messageClass}">
              <strong>${sender}:</strong> ${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}
            </div>
          `;
        }

        emailContent += `</div>`;
      }

      emailContent += `
            <div class="footer">
              <p>🌟 Great job learning today, ${user.name}!</p>
              <p>Keep up the excellent work! Tomorrow's another day for new discoveries.</p>
              <p><small>You're receiving this because you signed up for StudyBuddy AI daily summaries.</small></p>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: user.email,
        subject: `📚 ${user.name}'s Learning Summary - ${today.toDateString()}`,
        html: emailContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Daily summary email sent successfully to ${user.email} via Gmail SMTP`);
      return true;

    } catch (error) {
      console.error('Error sending daily summary email via Gmail:', error);
      return false;
    }
  }
}

export class MockEmailService implements EmailService {
  async sendDailyChatSummary(userId: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    console.log(`Mock email: Daily summary would be sent to ${user?.email} for user ${user?.name}`);
    return true;
  }
}

export const emailService = (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD)
  ? new GmailEmailService() 
  : new MockEmailService();
