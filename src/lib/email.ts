import nodemailer from 'nodemailer';

const transporter = (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) 
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

export async function sendVerificationRequestEmail(email: string, itemTitle: string, claimId: string, baseUrl?: string) {
  if (!transporter) {
    console.warn('Gmail SMTP credentials not configured. Skipping email.');
    return;
  }

  const url = `${baseUrl || 'https://fast-isb-exams.vercel.app'}/lost-found?verifyClaimId=${claimId}`;

  try {
    await transporter.sendMail({
      from: `"Lost & Found" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Action Required: Verify your claim for "${itemTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; padding: 12px; background-color: #fff7ed; border-radius: 50%; margin-bottom: 16px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h2 style="color: #1a202c; margin: 0;">Found Your Item?</h2>
            <p style="color: #64748b; font-size: 14px;">Verification request for "${itemTitle}"</p>
          </div>
          
          <p style="color: #4a5568; line-height: 1.6;">
            Hello, we've matched your lost report with a found item! To help us keep the campus records accurate, please humbly take a few seconds to verify if you have successfully collected this item.
          </p>
          
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #ea580c;">
            <p style="margin: 0; font-size: 14px; color: #475569; font-style: italic;">
              "Verifying ensures that the finder is notified of your success and the platform record stays clean for other students."
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="background-color: #ea580c; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2);">
              Verify Collection Now
            </a>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
              If this wasn't you, or if you've realized this isn't your item, please help us by clicking <strong>unclaim</strong> on the platform so we can stop sending you these reminders.
            </p>
          </div>
          
          <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin-top: 30px;">
            FAST ISB Schedule Platform &middot; Lost & Found Service
          </p>
        </div>
      `,
    });
    console.log(`Verification email successfully sent to ${email}`);
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }
}

export async function sendUnclaimNotification(email: string, itemTitle: string) {
  if (!transporter) return;

  try {
    await transporter.sendMail({
      from: `"Lost & Found" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Claim Removed for "${itemTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px;">
          <h2 style="color: #1a202c;">Claim Cancelled</h2>
          <p style="color: #4a5568; line-height: 1.6;">
            You have successfully removed your claim for <strong>${itemTitle}</strong>. We appreciate you keeping the platform records accurate.
          </p>
          <p style="color: #4a5568;">
            You will no longer receive verification reminders for this item.
          </p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">
            FAST ISB Schedule Platform &middot; Lost & Found Service
          </p>
        </div>
      `,
    });
    console.log(`Unclaim email successfully sent to ${email}`);
  } catch (err) {
    console.error('Failed to send unclaim email:', err);
  }
}

export async function sendClaimRecordedEmail(email: string, itemTitle: string, claimId: string, totalCount: number, allEmails: string[], baseUrl?: string) {
  if (!transporter) return;

  const url = `${baseUrl || 'https://fast-isb-exams.vercel.app'}/lost-found?verifyClaimId=${claimId}`;
  const emailsListHtml = allEmails.map(e => `<li style="margin-bottom: 6px; font-weight: 500; color: #1e293b;">${e}</li>`).join('');

  try {
    await transporter.sendMail({
      from: `"Lost & Found" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Claim Successfully Recorded: "${itemTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; padding: 12px; background-color: #fff7ed; border-radius: 50%; margin-bottom: 16px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h2 style="color: #1a202c; margin: 0;">Claim Successfully Recorded!</h2>
            <p style="color: #64748b; font-size: 14px;">"${itemTitle}"</p>
          </div>
          
          <p style="color: #4a5568; line-height: 1.6;">
            Hello, your claim for <strong>"${itemTitle}"</strong> has been successfully recorded. 
          </p>
          
          <p style="color: #4a5568; line-height: 1.6;">
            Once you successfully retrieve/collect this item, please verify your hold using the link below so the platform record can be resolved.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="background-color: #ea580c; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2);">
              Verify & Resolve Status
            </a>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 30px;">
            <h3 style="color: #0f172a; margin-top: 0; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              Active Claims Transparency Panel
            </h3>
            <p style="color: #475569; font-size: 13px;">
              Total active claimers so far: <strong style="color: #ea580c; font-size: 15px;">${totalCount}</strong>
            </p>
            <p style="color: #475569; font-size: 13px; margin-bottom: 8px;">
              Registered Claimant Emails:
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${emailsListHtml}
            </ul>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">
            FAST ISB Schedule Platform &middot; Lost & Found Service
          </p>
        </div>
      `,
    });
    console.log(`Claim recorded email sent to ${email}`);
  } catch (err) {
    console.error('Failed to send claim recorded email:', err);
  }
}

export async function sendNewClaimNotificationToOthers(email: string, itemTitle: string, newClaimerEmail: string, totalCount: number, allEmails: string[], baseUrl?: string) {
  if (!transporter) return;

  const portalUrl = `${baseUrl || 'https://fast-isb-exams.vercel.app'}/lost-found`;
  const emailsListHtml = allEmails.map(e => `<li style="margin-bottom: 6px; font-weight: 500; color: #1e293b;">${e}</li>`).join('');

  try {
    await transporter.sendMail({
      from: `"Lost & Found" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `New Claim Registered: "${itemTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">
            Notification: New Claim Registered
          </h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            A new claim has been registered over the item <strong>"${itemTitle}"</strong>.
          </p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            A person with the email address <strong style="color: #ea580c;">${newClaimerEmail}</strong> has recorded their claim. 
          </p>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 24px;">
            <h3 style="color: #0f172a; margin-top: 0; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              Active Claims Transparency Panel
            </h3>
            <p style="color: #475569; font-size: 13px;">
              Total active claimers so far: <strong style="color: #ea580c; font-size: 15px;">${totalCount}</strong>
            </p>
            <p style="color: #475569; font-size: 13px; margin-bottom: 8px;">
              Registered claimers' emails (including yours):
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${emailsListHtml}
            </ul>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" style="background-color: #f1f5f9; color: #334155; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; border: 1px solid #cbd5e1;">
              Go to Lost & Found Portal
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px;">
            This system coordinates transparent claiming records. If you have already successfully collected the item, please ensure to resolve its status on the platform.
          </p>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">
            FAST ISB Schedule Platform &middot; Lost & Found Service
          </p>
        </div>
      `,
    });
    console.log(`New claim notification email sent to previous claimer ${email}`);
  } catch (err) {
    console.error('Failed to send new claim notification:', err);
  }
}

export async function sendClaimNotificationToReporter(email: string, itemTitle: string, newClaimerEmail: string, totalCount: number, allEmails: string[], baseUrl?: string) {
  if (!transporter) return;

  const portalUrl = `${baseUrl || 'https://fast-isb-exams.vercel.app'}/lost-found`;
  const emailsListHtml = allEmails.map(e => `<li style="margin-bottom: 6px; font-weight: 500; color: #1e293b;">${e}</li>`).join('');

  try {
    await transporter.sendMail({
      from: `"Lost & Found" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Claim Registered on Your Reported Item: "${itemTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">
            Claim Alert: Your Reported Item
          </h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Hello,
          </p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            A student has successfully registered a claim over the item you reported as found: <strong>"${itemTitle}"</strong>.
          </p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Claimant's Email: <strong style="color: #ea580c;">${newClaimerEmail}</strong>
          </p>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 24px;">
            <h3 style="color: #0f172a; margin-top: 0; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              Active Claims Transparency Panel
            </h3>
            <p style="color: #475569; font-size: 13px;">
              Total active claimers so far: <strong style="color: #ea580c; font-size: 15px;">${totalCount}</strong>
            </p>
            <p style="color: #475569; font-size: 13px; margin-bottom: 8px;">
              Registered claimers' emails:
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${emailsListHtml}
            </ul>
          </div>

          <div style="background-color: #f0fdf4; padding: 16px; border-radius: 10px; border: 1px solid #bbf7d0; margin-top: 20px;">
            <p style="color: #166534; font-size: 13px; margin: 0; font-weight: 600;">
              🛡️ No Action Required from Your Side
            </p>
            <p style="color: #1e3a1e; font-size: 12px; margin: 6px 0 0 0; line-height: 1.5;">
              The student who claims this item is responsible for verifying their possession/hold of the item on the platform when they retrieve it. This will automatically close the report and resolve the status. You do not need to perform any manual action.
            </p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" style="background-color: #f1f5f9; color: #334155; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; border: 1px solid #cbd5e1;">
              Go to Lost & Found Portal
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px;">
            Thank you for helping keep our campus belongings organized and returned to their owners.
          </p>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">
            FAST ISB Schedule Platform &middot; Lost & Found Service
          </p>
        </div>
      `,
    });
    console.log(`Claim alert notification email sent to found reporter ${email}`);
  } catch (err) {
    console.error('Failed to send claim notification to reporter:', err);
  }
}
