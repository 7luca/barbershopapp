<?php
// ============================================
// EMAILS.PHP — invio email transazionali via Gmail SMTP (PHPMailer)
// L'invio è "best-effort": se fallisce, non blocca mai la prenotazione.
// ============================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendBookingConfirmationEmail(string $toEmail, string $customerName, string $date, string $time, string $service, string $icsUrl): void {
    if (empty(GMAIL_USER) || empty(GMAIL_APP_PASSWORD) || empty($toEmail)) {
        return; // Gmail non configurato o cliente senza email: si salta silenziosamente
    }

    $dateObj = new DateTime($date);
    $dateLabel = ucfirst($dateObj->format('d/m/Y')) . ' alle ' . substr($time, 0, 5);

    $html = '
    <div style="background:#0d0d0d;padding:40px 20px;font-family:Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:32px;color:#f2ede4;">
        <p style="text-align:center;color:#e0c27a;font-size:18px;margin:0 0 20px;">✦ Barber &amp; Co.</p>
        <h2 style="text-align:center;margin:0 0 8px;font-size:20px;">Prenotazione confermata</h2>
        <p style="text-align:center;color:#9a9488;margin:0 0 24px;">Ciao ' . htmlspecialchars($customerName) . ', ti aspettiamo!</p>
        <div style="background:#1e1e1e;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;"><strong>Data e ora:</strong> ' . htmlspecialchars($dateLabel) . '</p>
          <p style="margin:0;"><strong>Servizio:</strong> ' . htmlspecialchars($service ?: '—') . '</p>
        </div>
        <p style="text-align:center;">
          <a href="' . htmlspecialchars($icsUrl) . '" style="display:inline-block;background:#c9a24b;color:#1a1400;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">📅 Aggiungi al calendario</a>
        </p>
        <p style="text-align:center;color:#666;font-size:12px;margin-top:28px;">Se non hai prenotato tu, ignora questa email.</p>
      </div>
    </div>';

    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = GMAIL_USER;
        $mail->Password = GMAIL_APP_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->CharSet = 'UTF-8';
        $mail->Timeout = 10;

        $mail->setFrom(GMAIL_USER, 'Barber & Co.');
        $mail->addAddress($toEmail, $customerName);
        $mail->isHTML(true);
        $mail->Subject = 'Prenotazione confermata — ' . $dateLabel;
        $mail->Body = $html;
        $mail->AltBody = "Prenotazione confermata per {$dateLabel}. Servizio: {$service}.";

        $mail->send();
    } catch (Exception $e) {
        error_log('Invio email fallito: ' . $mail->ErrorInfo);
        // Non rilancio l'eccezione: la prenotazione resta valida anche se l'email non parte
    }
}
