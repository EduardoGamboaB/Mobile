'use strict';

// Cloud Run function (gen2) del formulario de contacto de www.g3logistics.mx.
// Envía cada solicitud por SMTP a MAIL_TO (fletes@g3logistics.mx).
//
// Variables de entorno:
//   SMTP_HOST, SMTP_PORT (465 o 587), SMTP_USER, SMTP_PASS (desde Secret Manager)
//   MAIL_TO (default fletes@g3logistics.mx), MAIL_FROM, ALLOWED_ORIGINS

const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');
const { createHandler } = require('./handler');

const port = Number(process.env.SMTP_PORT || 465);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port,
  secure: port === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

functions.http('contacto', createHandler({ sendMail: (msg) => transporter.sendMail(msg) }));
