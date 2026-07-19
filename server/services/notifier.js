// server/services/notifier.js

const nodemailer = require('nodemailer');
const pool = require('../config/db');

// ── Email Transporter ─────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

// ── Helper: Severity Color ────────────────────
const getSeverityColor = (severity) => {
    switch (severity) {
        case 'critical': return '#E63946';
        case 'warning':  return '#F4A261';
        case 'positive': return '#52B788';
        default:         return '#4361EE';
    }
};

// ── Helper: Severity Icon ─────────────────────
const getSeverityIcon = (severity) => {
    switch (severity) {
        case 'critical': return '🔴';
        case 'warning':  return '⚠️';
        case 'positive': return '✅';
        default:         return 'ℹ️';
    }
};

// ==============================================
// Send Alert Email to Farmer
// ==============================================
const sendAlertEmail = async (userId, alerts) => {
    try {
        // Get user email and name
        const userResult = await pool.query(
            `SELECT u.name, u.email,
                    np.email_alerts, np.alert_types
             FROM users u
             JOIN notification_preferences np ON np.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) return;

        const user = userResult.rows[0];

        // Check email alerts enabled
        if (!user.email_alerts) {
            console.log(`[NOTIFIER] Email alerts disabled for user ${userId}`);
            return;
        }

        // Filter alerts by user preferences
        const userAlertTypes = user.alert_types.split(',');
        const filteredAlerts = alerts.filter(a =>
            userAlertTypes.includes(a.alert_type)
        );

        if (filteredAlerts.length === 0) {
            console.log(`[NOTIFIER] No matching alerts for user ${userId}`);
            return;
        }

        // Build alert rows HTML
        const alertRows = filteredAlerts.map(alert => `
            <div style="border-left: 4px solid ${getSeverityColor(alert.severity)};
                        padding: 12px 16px;
                        margin-bottom: 12px;
                        background: #f9f9f9;
                        border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a1a2e;">
                    ${getSeverityIcon(alert.severity)} ${alert.title}
                </p>
                <p style="margin: 0; color: #444; font-size: 14px;">
                    ${alert.message}
                </p>
            </div>
        `).join('');

        // Send email
        await transporter.sendMail({
            from:    '"FarmSense AI" <noreply@farmsense.com>',
            to:      user.email,
            subject: `FarmSense AI — ${filteredAlerts.length} Weather Alert(s) for Your Farm`,
            html: `
                <div style="font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;">

                    <div style="background: #2D6A4F;
                                padding: 20px;
                                border-radius: 8px 8px 0 0;
                                text-align: center;">
                        <h2 style="color: white; margin: 0;">
                            🌾 FarmSense AI
                        </h2>
                        <p style="color: #D8F3DC; margin: 4px 0 0 0;
                                  font-size: 14px;">
                            Smart Farming Assistant
                        </p>
                    </div>

                    <div style="background: white;
                                padding: 24px;
                                border: 1px solid #eee;
                                border-top: none;">

                        <p style="color: #333;">
                            Hello <strong>${user.name}</strong>,
                        </p>

                        <p style="color: #333;">
                            Here are your weather alerts for today:
                        </p>

                        ${alertRows}

                        <div style="margin-top: 24px;
                                    padding: 16px;
                                    background: #D8F3DC;
                                    border-radius: 8px;
                                    text-align: center;">
                            <p style="margin: 0; color: #2D6A4F;
                                      font-size: 14px;">
                                Open FarmSense AI for detailed suggestions
                                and your complete farming plan.
                            </p>
                        </div>
                    </div>

                    <div style="text-align: center;
                                padding: 16px;
                                color: #999;
                                font-size: 12px;">
                        <p style="margin: 0;">
                            FarmSense AI — Smart Farming Assistant
                        </p>
                        <p style="margin: 4px 0 0 0;">
                            Sent at ${new Date().toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            `
        });

        console.log(`[NOTIFIER] Alert email sent to ${user.email}`);

        // Update is_sent_email in alerts table
        const alertIds = filteredAlerts.map(a => a.id).filter(Boolean);
        if (alertIds.length > 0) {
            await pool.query(
                `UPDATE alerts
                 SET is_sent_email = TRUE
                 WHERE id = ANY($1)`,
                [alertIds]
            );
        }

    } catch (err) {
        console.error('[NOTIFIER] Email error:', err.message);
        // Don't throw — notification failure should not crash the app
    }
};

// ==============================================
// Send Verification Email
// ==============================================
const sendVerificationEmail = async (email, name, token) => {
    try {
        const verifyUrl = `http://localhost:5000/api/auth/verify-email?token=${token}`;

        await transporter.sendMail({
            from:    '"FarmSense AI" <noreply@farmsense.com>',
            to:      email,
            subject: 'Verify your FarmSense AI account',
            html: `
                <div style="font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;">

                    <div style="background: #2D6A4F;
                                padding: 20px;
                                border-radius: 8px 8px 0 0;
                                text-align: center;">
                        <h2 style="color: white; margin: 0;">
                            🌾 FarmSense AI
                        </h2>
                    </div>

                    <div style="background: white;
                                padding: 24px;
                                border: 1px solid #eee;
                                border-top: none;">

                        <h3 style="color: #2D6A4F;">
                            Welcome, ${name}!
                        </h3>

                        <p style="color: #333;">
                            Thank you for registering.
                            Please verify your email to activate your account.
                        </p>

                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${verifyUrl}"
                               style="background: #2D6A4F;
                                      color: white;
                                      padding: 14px 32px;
                                      text-decoration: none;
                                      border-radius: 8px;
                                      font-size: 16px;
                                      display: inline-block;">
                                Verify Email Address
                            </a>
                        </div>

                        <p style="color: #666; font-size: 13px;">
                            This link expires in 24 hours.
                            If you did not create this account,
                            ignore this email.
                        </p>
                    </div>
                </div>
            `
        });

        console.log(`[NOTIFIER] Verification email sent to ${email}`);

    } catch (err) {
        console.error('[NOTIFIER] Verification email error:', err.message);
    }
};

// ==============================================
// Send Daily Summary Email
// ==============================================
const sendDailySummaryEmail = async (userId, summary) => {
    try {
        const userResult = await pool.query(
            `SELECT u.name, u.email, np.email_alerts
             FROM users u
             JOIN notification_preferences np ON np.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) return;
        const user = userResult.rows[0];
        if (!user.email_alerts) return;

        await transporter.sendMail({
            from:    '"FarmSense AI" <noreply@farmsense.com>',
            to:      user.email,
            subject: `FarmSense AI — Your Daily Farm Summary`,
            html: `
                <div style="font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;">

                    <div style="background: #2D6A4F;
                                padding: 20px;
                                border-radius: 8px 8px 0 0;
                                text-align: center;">
                        <h2 style="color: white; margin: 0;">
                            🌾 Daily Farm Summary
                        </h2>
                        <p style="color: #D8F3DC; margin: 4px 0 0 0;">
                            ${new Date().toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>

                    <div style="background: white;
                                padding: 24px;
                                border: 1px solid #eee;
                                border-top: none;">

                        <p>Hello <strong>${user.name}</strong>,</p>

                        <!-- Weather Summary -->
                        <div style="background: #f0f9ff;
                                    padding: 16px;
                                    border-radius: 8px;
                                    margin-bottom: 16px;">
                            <h4 style="margin: 0 0 8px 0; color: #2D6A4F;">
                                🌦️ Today's Weather
                            </h4>
                            <p style="margin: 0; color: #333;">
                                Temperature: ${summary.weather?.temp_max || '--'}°C |
                                Humidity: ${summary.weather?.humidity || '--'}% |
                                Rain: ${summary.weather?.rainfall_mm || 0}mm
                            </p>
                        </div>

                        <!-- AI Recommendation -->
                        <div style="background: #f0fdf4;
                                    padding: 16px;
                                    border-radius: 8px;
                                    margin-bottom: 16px;">
                            <h4 style="margin: 0 0 8px 0; color: #2D6A4F;">
                                🌾 Crop Recommendation
                            </h4>
                            <p style="margin: 0; color: #333;">
                                Best crop for your farm:
                                <strong>${summary.recommended_crop || '--'}</strong>
                                (${summary.suitability_score || '--'}% match)
                            </p>
                        </div>

                        <!-- Alerts Count -->
                        <div style="background: #fff8f0;
                                    padding: 16px;
                                    border-radius: 8px;">
                            <h4 style="margin: 0 0 8px 0; color: #F4A261;">
                                ⚠️ Active Alerts
                            </h4>
                            <p style="margin: 0; color: #333;">
                                You have
                                <strong>${summary.alert_count || 0}</strong>
                                active weather alerts.
                                Open the app for details.
                            </p>
                        </div>
                    </div>

                    <div style="text-align: center;
                                padding: 16px;
                                color: #999;
                                font-size: 12px;">
                        FarmSense AI — Smart Farming Assistant
                    </div>
                </div>
            `
        });

        console.log(`[NOTIFIER] Daily summary sent to ${user.email}`);

    } catch (err) {
        console.error('[NOTIFIER] Daily summary error:', err.message);
    }
};

module.exports = {
    sendAlertEmail,
    sendVerificationEmail,
    sendDailySummaryEmail,
};