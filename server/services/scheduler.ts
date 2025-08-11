import { storage } from '../storage';
import { SendGridEmailService } from './email';

// Simple scheduler that runs daily email summaries
// In production, this could be replaced with a proper cron job
export function startEmailScheduler() {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('Email scheduler not started - SENDGRID_API_KEY not provided');
    return;
  }

  const emailService = new SendGridEmailService();
  
  // Function to send daily summaries to all users
  const sendDailySummaries = async () => {
    try {
      console.log('Starting daily email summary job...');
      const users = await storage.getAllUsers();
      
      let sentCount = 0;
      let errorCount = 0;
      
      for (const user of users) {
        try {
          const success = await emailService.sendDailyChatSummary(user.id);
          if (success) {
            sentCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to send email to user ${user.name}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Daily email summary job completed. Sent: ${sentCount}, Errors: ${errorCount}`);
    } catch (error) {
      console.error('Daily email summary job failed:', error);
    }
  };

  // Schedule daily at 8 PM (20:00)
  const scheduleDaily = () => {
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(20, 0, 0, 0); // 8 PM

    // If it's already past 8 PM today, schedule for tomorrow
    if (now > scheduled) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    const msUntilScheduled = scheduled.getTime() - now.getTime();
    
    console.log(`Next daily email summary scheduled for: ${scheduled.toLocaleString()}`);
    
    setTimeout(() => {
      sendDailySummaries();
      // Schedule the next day
      setInterval(sendDailySummaries, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilScheduled);
  };

  scheduleDaily();
  console.log('Email scheduler started - daily summaries will be sent at 8 PM');
}

// Manual trigger for testing
export async function triggerDailySummaries() {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not provided');
  }
  
  const emailService = new SendGridEmailService();
  const users = await storage.getAllUsers();
  
  const results = [];
  for (const user of users) {
    try {
      const success = await emailService.sendDailyChatSummary(user.id);
      results.push({ userId: user.id, success });
    } catch (error) {
      results.push({ userId: user.id, success: false, error: error.message });
    }
  }
  
  return results;
}